const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const authMiddleware = require('../middleware/auth');

// Create Stock
router.post('/add-stock', authMiddleware, stockController.addStock);

// Get All Stocks
router.get('/all-stocks', authMiddleware, stockController.getAllStocks);

// Get All Stocks (including deleted ones)
router.get('/all-stocks/with-deleted', authMiddleware, stockController.getAllStocksWithDeleted);

// Get Single Stock
router.get('/:id', authMiddleware, stockController.getStockById);

// Update Stock
router.put('/update-stock/:id', authMiddleware, stockController.updateStock);

// Soft Delete Stock
router.delete('/delete-stock/:id', authMiddleware, stockController.softDeleteStock);

// Restore Soft Deleted Stock
router.post('/restore-stock/:id', authMiddleware, stockController.restoreStock);

// Permanently Delete Stock
router.delete('/permanent-delete-stock/:id', authMiddleware, stockController.permanentlyDeleteStock);

// Check All Stocks for Low Stock and Send Alerts
router.get('/check/low-stock', authMiddleware, stockController.checkLowStock);

module.exports = router;