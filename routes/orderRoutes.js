const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

// Add Order route with authentication
router.post('/add-order', authMiddleware, orderController.addOrder);

// Get All Orders (excluding soft-deleted)
router.get('/all-orders', authMiddleware, orderController.getAllOrders);

// Get All Orders including soft-deleted
router.get('/all-orders/with-deleted', authMiddleware, orderController.getAllOrdersWithDeleted);

// Get order counts and statistics
router.get('/order-counts', authMiddleware, orderController.countOrders);

// Get One Order by ID
router.get('/order/:id', authMiddleware, orderController.getOrderById);

// Update the status of an order
router.put('/update-order/:id', authMiddleware, orderController.updateOrderStatus);

// Soft Delete Order route
router.delete('/delete-order/:id', authMiddleware, orderController.softDeleteOrder);

// Restore soft-deleted order
router.post('/restore-order/:id', authMiddleware, orderController.restoreOrder);

// Permanently delete order
router.delete('/permanently-delete-order/:id', authMiddleware, orderController.permanentlyDeleteOrder);

module.exports = router;