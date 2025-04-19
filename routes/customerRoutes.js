const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/auth');

// Customer routes
// Add Customer route with authentication
router.post('/add-customer', authMiddleware, customerController.addCustomer);

// Get All Customers route (excluding soft deleted customers)
router.get('/all-customers', authMiddleware, customerController.getAllCustomers);

// Get All Customers including deleted ones
router.get('/all-customers/with-deleted', authMiddleware, customerController.getAllCustomersWithDeleted);

// Get Customer Count route with authentication
router.get('/customer-count', authMiddleware, customerController.countCustomers);

// Get One Customer by ID
router.get('/:id', authMiddleware, customerController.getCustomerById);

// Update Customer route with authentication
router.put('/update-customer/:id', authMiddleware, customerController.updateCustomer);

// Soft Delete Customer route with authentication
router.delete('/delete-customer/:id', authMiddleware, customerController.softDeleteCustomer);

// Restore a soft-deleted customer
router.post('/restore-customer/:id', authMiddleware, customerController.restoreCustomer);

// Permanently delete a customer (admin only, if needed)
router.delete('/permanently-delete-customer/:id', authMiddleware, customerController.permanentlyDeleteCustomer);

module.exports = router;