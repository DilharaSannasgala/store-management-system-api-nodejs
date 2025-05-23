const Customer = require('../model/Customer');
const Product = require('../model/Product');
const Order = require('../model/Order');
const Stock = require('../model/Stock');
const Category = require('../model/Category');
const mongoose = require('mongoose');

/**
 * Get customer statistics
 */
const countCustomers = async (req, res) => {
    try {
        const { countDeleted } = req.query;
        
        // Base counts
        const activeCount = await Customer.countDocuments({ deletedAt: 0 });
        
        // If we only want active count
        if (countDeleted !== 'true') {
            return res.json({
                status: "SUCCESS",
                data: {
                    active: activeCount
                }
            });
        }
        
        // If we want all stats
        const deletedCount = await Customer.countDocuments({ deletedAt: { $ne: 0 } });
        const totalCount = activeCount + deletedCount;
        
        // Get count by states
        const stateCounts = await Customer.aggregate([
            { $match: { deletedAt: 0 } },
            { $group: { _id: "$state", count: { $sum: 1 } } },
            { $project: {
                _id: 1,
                count: 1,
                stateName: "$_id"
            }}
        ]);
        
        return res.json({
            status: "SUCCESS",
            data: {
                active: activeCount,
                deleted: deletedCount,
                total: totalCount,
                byState: stateCounts
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

/**
 * Get product statistics
 */
const countProducts = async (req, res) => {
    try {
        const { countDeleted } = req.query;
        
        // Base counts
        const activeCount = await Product.countDocuments({ deletedAt: 0 });
        
        // If we only want active count
        if (countDeleted !== 'true') {
            return res.json({
                status: "SUCCESS",
                data: {
                    active: activeCount
                }
            });
        }
        
        // If we want all stats
        const deletedCount = await Product.countDocuments({ deletedAt: { $ne: 0 } });
        const totalCount = activeCount + deletedCount;
        
        // Get count by categories
        const categoryCounts = await Product.aggregate([
            { $match: { deletedAt: 0 } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "categoryInfo"
            }},
            { $unwind: "$categoryInfo" },
            { $project: {
                _id: 1,
                count: 1,
                categoryName: "$categoryInfo.name"
            }}
        ]);
        
        return res.json({
            status: "SUCCESS",
            data: {
                active: activeCount,
                deleted: deletedCount,
                total: totalCount,
                byCategory: categoryCounts
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

/**
 * Get order statistics
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
            activeQuery.customer = mongoose.Types.ObjectId(customer);
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
        let deletedQuery = { ...activeQuery };
        delete deletedQuery.deletedAt;
        deletedQuery.deletedAt = { $ne: 0 };
        
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
        
        return res.json({
            status: "SUCCESS",
            data: {
                active: activeCount,
                deleted: deletedCount,
                total: totalCount,
                sales: salesStats[0] || { totalSales: 0, avgOrderValue: 0, count: 0 },
                byStatus: statusCounts
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

/**
 * Get revenue statistics
 */
const getRevenue = async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;
        
        let groupId, dateFilter = {};
        
        // Apply date filter if provided
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        }
        
        // Base match criteria - active orders
        const matchCriteria = { 
            deletedAt: 0,
            ...dateFilter
        };
        
        // Set up time grouping based on period
        switch(period) {
            case 'daily':
                groupId = { 
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" }
                };
                break;
            case 'weekly':
                groupId = { 
                    year: { $year: "$createdAt" },
                    week: { $week: "$createdAt" }
                };
                break;
            case 'monthly':
                groupId = { 
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                };
                break;
            case 'yearly':
                groupId = { 
                    year: { $year: "$createdAt" }
                };
                break;
            default:
                // Default to daily if period not specified
                groupId = { 
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" }
                };
        }
        
        // Aggregate revenue data
        const revenueData = await Order.aggregate([
            { $match: matchCriteria },
            { $group: {
                _id: groupId,
                revenue: { $sum: "$totalAmount" },
                orderCount: { $sum: 1 }
            }},
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } },
            { $project: {
                _id: 0,
                period: "$_id",
                revenue: 1,
                orderCount: 1
            }}
        ]);
        
        // Get total revenue for the period
        const totalRevenue = await Order.aggregate([
            { $match: matchCriteria },
            { $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" },
                totalOrders: { $sum: 1 },
                avgOrderValue: { $avg: "$totalAmount" }
            }}
        ]);
        
        // Format date labels based on period
        const formattedData = revenueData.map(item => {
            let dateLabel;
            
            switch(period) {
                case 'daily':
                    dateLabel = `${item.period.year}-${item.period.month.toString().padStart(2, '0')}-${item.period.day.toString().padStart(2, '0')}`;
                    break;
                case 'weekly':
                    dateLabel = `${item.period.year}-W${item.period.week}`;
                    break;
                case 'monthly':
                    dateLabel = `${item.period.year}-${item.period.month.toString().padStart(2, '0')}`;
                    break;
                case 'yearly':
                    dateLabel = `${item.period.year}`;
                    break;
                default:
                    dateLabel = `${item.period.year}-${item.period.month?.toString().padStart(2, '0')}-${item.period.day?.toString().padStart(2, '0')}`;
            }
            
            return {
                date: dateLabel,
                revenue: item.revenue,
                orderCount: item.orderCount
            };
        });
        
        return res.json({
            status: "SUCCESS",
            data: {
                revenueByPeriod: formattedData,
                summary: totalRevenue[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 }
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

/**
 * Get stock statistics
 */
const countStock = async (req, res) => {
    try {
        // Get total stock count
        const totalStockCount = await Stock.countDocuments({ deletedAt: 0 });
        
        // Get stocks with low quantity alerts
        const lowStockCount = await Stock.countDocuments({ 
            deletedAt: 0,
            $expr: { $lte: ["$quantity", "$lowStockAlert"] }
        });
        
        // Get out of stock count
        const outOfStockCount = await Stock.countDocuments({
            deletedAt: 0,
            quantity: 0
        });
        
        // Get total inventory value
        const inventoryValue = await Stock.aggregate([
            { $match: { deletedAt: 0 } },
            { $lookup: {
                from: "products",
                localField: "product",
                foreignField: "_id",
                as: "productInfo"
            }},
            { $unwind: "$productInfo" },
            { $group: {
                _id: null,
                totalValue: { 
                    $sum: { $multiply: ["$quantity", "$productInfo.price"] }
                }
            }}
        ]);
        
        return res.json({
            status: "SUCCESS",
            data: {
                totalStock: totalStockCount,
                lowStock: lowStockCount,
                outOfStock: outOfStockCount,
                inventoryValue: inventoryValue[0]?.totalValue || 0
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

/**
 * Get dashboard overview with all statistics
 */
const getDashboardOverview = async (req, res) => {
    try {
        // Get active counts
        const activeCustomers = await Customer.countDocuments({ deletedAt: 0 });
        const activeProducts = await Product.countDocuments({ deletedAt: 0 });
        const activeOrders = await Order.countDocuments({ deletedAt: 0 });
        
        // Get revenue stats for current month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const monthlyRevenue = await Order.aggregate([
            { $match: { 
                deletedAt: 0,
                createdAt: { 
                    $gte: firstDayOfMonth,
                    $lte: lastDayOfMonth
                }
            }},
            { $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" },
                orderCount: { $sum: 1 },
                avgOrderValue: { $avg: "$totalAmount" }
            }}
        ]);
        
        // Get low stock items
        const lowStockItems = await Stock.find({
            deletedAt: 0,
            $expr: { $lte: ["$quantity", "$lowStockAlert"] }
        }).populate('product').limit(5);
        
        // Get recent orders
        const recentOrders = await Order.find({ deletedAt: 0 })
            .populate('customer')
            .sort({ createdAt: -1 })
            .limit(5);
            
        // Get sales by category
        const salesByCategory = await Order.aggregate([
            { $match: { deletedAt: 0 } },
            { $unwind: "$items" },
            { $lookup: {
                from: "stocks",
                localField: "items.stock",
                foreignField: "_id",
                as: "stockInfo"
            }},
            { $unwind: "$stockInfo" },
            { $lookup: {
                from: "products",
                localField: "stockInfo.product",
                foreignField: "_id",
                as: "productInfo"
            }},
            { $unwind: "$productInfo" },
            { $lookup: {
                from: "categories",
                localField: "productInfo.category",
                foreignField: "_id",
                as: "categoryInfo"
            }},
            { $unwind: "$categoryInfo" },
            { $group: {
                _id: "$categoryInfo._id",
                categoryName: { $first: "$categoryInfo.name" },
                totalSales: { $sum: { $multiply: ["$items.quantity", "$productInfo.price"] } },
                count: { $sum: 1 }
            }},
            { $sort: { totalSales: -1 } },
            { $limit: 5 }
        ]);
            
        return res.json({
            status: "SUCCESS",
            data: {
                counts: {
                    customers: activeCustomers,
                    products: activeProducts,
                    orders: activeOrders,
                    revenue: monthlyRevenue[0]?.totalRevenue || 0
                },
                monthlyStats: monthlyRevenue[0] || { 
                    totalRevenue: 0, 
                    orderCount: 0, 
                    avgOrderValue: 0 
                },
                lowStockItems: lowStockItems.map(item => ({
                    id: item._id,
                    product: item.product.name,
                    batchNumber: item.batchNumber,
                    quantity: item.quantity,
                    lowStockAlert: item.lowStockAlert
                })),
                recentOrders: recentOrders.map(order => ({
                    id: order._id,
                    customer: {
                        id: order.customer._id,
                        firstName: order.customer.firstName,
                        lastName: order.customer.lastName,
                        name: `${order.customer.firstName} ${order.customer.lastName}`,
                        email: order.customer.email,
                        phone: order.customer.phone,
                        address: order.customer.address,
                        city: order.customer.city,
                        state: order.customer.state
                    },
                    date: order.createdAt,
                    amount: order.totalAmount,
                    status: order.status
                })),
                salesByCategory: salesByCategory
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
    countCustomers,
    countProducts,
    countOrders,
    getRevenue,
    countStock,
    getDashboardOverview
};