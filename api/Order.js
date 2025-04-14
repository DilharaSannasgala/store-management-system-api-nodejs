const express = require('express');
const router = express.Router();
const Order = require('../model/Order');
const Customer = require('../model/Customer');
const Product = require('../model/Product');
const authMiddleware = require('../middleware/auth');
const mongoose = require('mongoose');

// Add Order route with authentication
router.post('/add-order', authMiddleware, async (req, res) => {
    const { customerId, products, totalAmount } = req.body;

    if (!customerId || !products || !totalAmount) {
        return res.json({ status: "FAILED", message: "All fields are required" });
    }

    try {
        // Validate customer ID
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.json({ status: "FAILED", message: "Customer not found" });
        }

        // Validate product IDs and quantities
        for (let item of products) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.json({ status: "FAILED", message: `Product not found for ID: ${item.product}` });
            }
        }

        const newOrder = new Order({
            customer: customerId,
            products,
            totalAmount,
            deletedAt: 0
        });

        await newOrder.save();

        return res.json({ status: "SUCCESS", message: "Order added successfully", data: newOrder });

    } catch (err) {
        console.error(err);
        return res.json({ status: "FAILED", message: "Internal server error" });
    }
});

// Get All Orders (excluding soft-deleted)
router.get('/all-orders', authMiddleware, async (req, res) => {
    try {
        const orders = await Order.find({ deletedAt: 0 })
            .populate('customer')
            .populate('products.product');
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
            .populate('products.product');
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
            .populate('products.product');
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
