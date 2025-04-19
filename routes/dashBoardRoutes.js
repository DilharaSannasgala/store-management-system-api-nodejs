const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashBoardController');

// Dashboard routes
router.get('/overview', dashboardController.getDashboardOverview);
router.get('/customers', dashboardController.countCustomers);
router.get('/products', dashboardController.countProducts);
router.get('/orders', dashboardController.countOrders);
router.get('/revenue', dashboardController.getRevenue);
router.get('/stock', dashboardController.countStock);

module.exports = router;