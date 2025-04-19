const Order = require('../model/Order');
const Customer = require('../model/Customer');
const Product = require('../model/Product');
const Stock = require('../model/Stock');
const User = require('../model/User');
const mongoose = require('mongoose');
const emailService = require('../services/emailService');

/**
 * Add a new order
 */
const addOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { customerId, items, totalAmount } = req.body;

        if (!customerId || !items || !Array.isArray(items) || items.length === 0 || totalAmount === undefined) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ status: "FAILED", message: "All fields are required" });
        }

        const customer = await Customer.findById(customerId).session(session);
        if (!customer) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ status: "FAILED", message: "Customer not found" });
        }

        // Validate stock and reduce quantity
        for (let item of items) {
            const stock = await Stock.findById(item.stock).populate('product').session(session);
            if (!stock) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ status: "FAILED", message: `Stock not found: ${item.stock}` });
            }

            if (stock.quantity < item.quantity) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    status: "FAILED",
                    message: `Insufficient stock for ${stock.product.name}. Available: ${stock.quantity}`
                });
            }
            
            // Deduct the quantity from stock
            stock.quantity -= item.quantity;
            await stock.save({ session });
            
            // Check if stock fell below threshold AFTER deduction
            if (stock.quantity < stock.lowStockAlert) {
                const users = await User.find();
                const userEmails = users.map(user => user.email);
            
                const productData = await Product.findById(stock.product);
                if (productData) {
                    emailService.sendLowStockAlert(productData.name, stock.batchNumber, stock.quantity, userEmails);
                }
            }
        }

        let finalTotalAmount = totalAmount;

        // Fallback if frontend doesn't pass totalAmount properly
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

        return res.status(201).json({ status: "SUCCESS", message: "Order placed successfully", data: newOrder });

    } catch (error) {
        console.error("Transaction failed:", error);
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ status: "FAILED", message: "Order creation failed due to server error.", error: error.message });
    }
};

/**
 * Get all active orders
 */
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({ deletedAt: 0 })
            .populate('customer')
            .populate({
                path: 'items.stock',
                populate: {
                    path: 'product',
                    model: 'Product'
                }
            })
            .sort({ createdAt: -1 });

        return res.json({ status: "SUCCESS", data: orders });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Get all orders including deleted ones
 */
const getAllOrdersWithDeleted = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('customer')
            .populate({
                path: 'items.stock',
                populate: {
                    path: 'product',
                    model: 'Product'
                }
            })
            .sort({ createdAt: -1 });
        return res.json({ status: "SUCCESS", data: orders });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Get an order by ID
 */
const getOrderById = async (req, res) => {
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
            // Check if the order exists but is soft deleted
            const softDeleted = await Order.findById(id);
            if (softDeleted && softDeleted.deletedAt !== 0) {
                return res.status(410).json({ status: "FAILED", message: "Order has been deleted" });
            }
            
            return res.status(404).json({ status: "FAILED", message: "Order not found" });
        }
        
        return res.json({ status: "SUCCESS", data: order });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Update order status
 */
const updateOrderStatus = async (req, res) => {
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

        return res.json({ 
            status: "SUCCESS", 
            message: "Order status updated successfully", 
            data: order 
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Soft delete an order
 */
const softDeleteOrder = async (req, res) => {
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
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Restore a soft-deleted order
 */
const restoreOrder = async (req, res) => {
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
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Permanently delete an order
 */
const permanentlyDeleteOrder = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await Order.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({ status: "FAILED", message: "Order not found" });
        }

        return res.json({ status: "SUCCESS", message: "Order permanently deleted" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Count orders with optional filters
 */
const countOrders = async (req, res) => {
    try {
        const { countDeleted, dateRange, customer } = req.query;
        
        // Base query for active orders
        let activeQuery = { deletedAt: 0 };
        
        // Add date range filter if provided
        if (dateRange) {
            const [startDate, endDate] = dateRange.split(',');
            if (startDate && endDate) {
                activeQuery.createdAt = { 
                    $gte: new Date(startDate), 
                    $lte: new Date(endDate) 
                };
            }
        }
        
        // Add customer filter if provided
        if (customer && mongoose.Types.ObjectId.isValid(customer)) {
            activeQuery.customer = customer;
        }
        
        // Get active orders count
        const activeCount = await Order.countDocuments(activeQuery);
        
        // If we only want active count
        if (countDeleted !== 'true') {
            return res.json({ 
                status: "SUCCESS", 
                data: { 
                    active: activeCount
                }
            });
        }
        
        // For deleted count, maintain same filters except for deletedAt
        let deletedQuery = { ...activeQuery, deletedAt: { $ne: 0 } };
        delete deletedQuery.deletedAt;
        
        // Get deleted count
        const deletedCount = await Order.countDocuments(deletedQuery);
        const totalCount = activeCount + deletedCount;
        
        // Get total sales amount for active orders
        const salesStats = await Order.aggregate([
            { $match: activeQuery },
            { $group: {
                _id: null,
                totalSales: { $sum: "$totalAmount" },
                avgOrderValue: { $avg: "$totalAmount" },
                minOrder: { $min: "$totalAmount" },
                maxOrder: { $max: "$totalAmount" },
                count: { $sum: 1 }
            }}
        ]);
        
        // Get orders by status
        const statusCounts = await Order.aggregate([
            { $match: { deletedAt: 0 } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $project: {
                status: "$_id",
                count: 1,
                _id: 0
            }}
        ]);
        
        // Get orders by customer (top 5)
        const customerCounts = await Order.aggregate([
            { $match: { deletedAt: 0 } },
            { $group: { _id: "$customer", count: { $sum: 1 }, totalSpent: { $sum: "$totalAmount" } } },
            { $lookup: {
                from: "customers",
                localField: "_id",
                foreignField: "_id",
                as: "customerInfo"
            }},
            { $unwind: "$customerInfo" },
            { $project: {
                _id: 1,
                count: 1,
                totalSpent: 1,
                customerName: "$customerInfo.name"
            }},
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        
        return res.json({
            status: "SUCCESS",
            data: {
                active: activeCount,
                deleted: deletedCount,
                total: totalCount,
                sales: salesStats[0] || { totalSales: 0, avgOrderValue: 0, count: 0 },
                byStatus: statusCounts,
                topCustomers: customerCounts
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ 
            status: "FAILED", 
            message: "Internal server error", 
            error: err.message 
        });
    }
};

module.exports = {
    addOrder,
    getAllOrders,
    getAllOrdersWithDeleted,
    getOrderById,
    updateOrderStatus,
    softDeleteOrder,
    restoreOrder,
    permanentlyDeleteOrder,
    countOrders
};