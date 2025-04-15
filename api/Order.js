const express = require('express');
const router = express.Router();
const Order = require('../model/Order');
const Customer = require('../model/Customer');
const Product = require('../model/Product');
const Stock = require('../model/Stock');
const User = require('../model/User');
const authMiddleware = require('../middleware/auth');
const sendLowStockAlert = require('../utils/email');
const mongoose = require('mongoose');

// Add Order route with authentication
router.post('/add-order', authMiddleware, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { customerId, items, totalAmount } = req.body;

        if (!customerId || !items || !Array.isArray(items) || items.length === 0 || totalAmount === undefined) {
            await session.abortTransaction();
            session.endSession();
            return res.json({ status: "FAILED", message: "All fields are required" });
        }

        const customer = await Customer.findById(customerId).session(session);
        if (!customer) {
            await session.abortTransaction();
            session.endSession();
            return res.json({ status: "FAILED", message: "Customer not found" });
        }

        // Validate stock and reduce quantity
        for (let item of items) {
            const stock = await Stock.findById(item.stock).populate('product').session(session);
            if (!stock) {
                await session.abortTransaction();
                session.endSession();
                return res.json({ status: "FAILED", message: `Stock not found: ${item.stock}` });
            }

            if (stock.quantity < item.quantity) {
                await session.abortTransaction();
                session.endSession();
                return res.json({
                    status: "FAILED",
                    message: `Insufficient stock for ${stock.product.name}. Available: ${stock.quantity}`
                });
            }
            
            // Deduct the quantity from stock
            stock.quantity -= item.quantity;
            await stock.save({ session });
            
            // Check if stock fell **below** threshold AFTER deduction
            if (stock.quantity < stock.lowStockAlert) {
                const users = await User.find();
                const userEmails = users.map(user => user.email);
            
                const productData = await Product.findById(stock.product);
                if (productData) {
                    sendLowStockAlert(productData.name, stock.batchNumber, stock.quantity, userEmails);
                }
            }
        }

        let finalTotalAmount = totalAmount;

        // Fallback if frontend doesn’t pass totalAmount properly
        if (!finalTotalAmount || isNaN(finalTotalAmount)) {
            finalTotalAmount = 0;
            for (let item of items) {
                const stock = await Stock.findById(item.stock).populate('product').session(session);
                if (stock && stock.product && stock.product.price) {
                    finalTotalAmount += stock.product.price * item.quantity;
                }
            }
        }

        // Create new order
        const newOrder = new Order({
            customer: customerId,
            items,
            totalAmount: finalTotalAmount,
            deletedAt: 0
        });

        await newOrder.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.json({ status: "SUCCESS", message: "Order placed successfully", data: newOrder });

    } catch (error) {
        console.error("Transaction failed:", error);
        await session.abortTransaction();
        session.endSession();
        return res.json({ status: "FAILED", message: "Order creation failed due to server error." });
    }
});

// Get All Orders (excluding soft-deleted)
router.get('/all-orders', authMiddleware, async (req, res) => {
    try {
        const orders = await Order.find({ deletedAt: 0 })
            .populate('customer')
            .populate({
                path: 'items.stock',
                populate: {
                    path: 'product',
                    model: 'Product'
                }
            });

        return res.json({ status: "SUCCESS", data: orders });
    } catch (err) {
        console.error(err);
        return res.json({ status: "FAILED", message: "Internal server error" });
    }
});


// Get All Orders including soft-deleted
router.get('/all-orders/with-deleted', authMiddleware, async (req, res) => {
    try {
        const orders = await Order.find()
        .populate('customer')
        .populate({
            path: 'items.stock',
            populate: {
                path: 'product',
                model: 'Product'
            }
        });
        return res.json({ status: "SUCCESS", data: orders });
    } catch (err) {
        console.error(err);
        return res.json({ status: "FAILED", message: "Internal server error" });
    }
});

// Get One Order
router.get('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    // Check if the provided ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: "FAILED", message: "Invalid order ID" });
    }

    try {
        const order = await Order.findOne({ _id: id, deletedAt: 0 })
        .populate('customer')
        .populate({
            path: 'items.stock',
            populate: {
                path: 'product',
                model: 'Product'
            }
        });
        if (!order) {
            return res.json({ status: "FAILED", message: "Order not found or has been deleted" });
        }
        return res.json({ status: "SUCCESS", data: order });
    } catch (err) {
        console.error(err);
        return res.json({ status: "FAILED", message: "Internal server error" });
    }
});

// Update the status of an order
router.put('/update-order/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Validate input
    if (!status || typeof status !== "string") {
        return res.status(400).json({ status: "FAILED", message: "Status is required and must be a string" });
    }

    try {
        // Find the order and check if it's not deleted
        const order = await Order.findOne({ _id: id, deletedAt: 0 });

        if (!order) {
            return res.status(404).json({ status: "FAILED", message: "Order not found or has been deleted" });
        }

        // Only update the status
        order.status = status;
        await order.save();

        return res.json({ status: "SUCCESS", message: "Order status updated successfully", data: { _id: order._id, status: order.status } });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
});


// Soft Delete Order route
router.delete('/delete-order/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const order = await Order.findOne({ _id: id, deletedAt: 0 });
        if (!order) {
            return res.status(404).json({ status: "FAILED", message: "Order not found or already deleted" });
        }

        order.deletedAt = Date.now();
        await order.save();

        return res.json({ status: "SUCCESS", message: "Order soft deleted successfully" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error" });
    }
});

// Restore soft-deleted order
router.post('/restore-order/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const order = await Order.findOne({ _id: id, deletedAt: { $ne: 0 } });
        if (!order) {
            return res.status(404).json({ status: "FAILED", message: "Order not found or not deleted" });
        }

        order.deletedAt = 0;
        await order.save();

        return res.json({ status: "SUCCESS", message: "Order restored successfully", data: order });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error" });
    }
});

// Permanently delete order
router.delete('/permanently-delete-order/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await Order.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({ status: "FAILED", message: "Order not found" });
        }

        return res.json({ status: "SUCCESS", message: "Order permanently deleted" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error" });
    }
});


module.exports = router;
