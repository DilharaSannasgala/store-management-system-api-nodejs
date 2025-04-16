const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');
const { upload, handleMulterError } = require('../config/uploadConfig');

// Add Product route with authentication
router.post('/add-product', authMiddleware, upload.array('images', 5), productController.addProduct);

// Get All Products route (excluding soft deleted products)
router.get('/all-products', authMiddleware, productController.getAllProducts);

// Get All Products including deleted ones
router.get('/all-products/with-deleted', authMiddleware, productController.getAllProductsWithDeleted);

// Get One Product route (excluding deleted products)
router.get('/product/:id', authMiddleware, productController.getProductById);

// Update Product route
router.put('/update-product/:id', authMiddleware, upload.array('images', 5), productController.updateProduct);

// Soft Delete Product route
router.delete('/delete-product/:id', authMiddleware, productController.softDeleteProduct);

// Restore a soft-deleted product
router.post('/restore-product/:id', authMiddleware, productController.restoreProduct);

// Permanently delete a product (admin only, if needed)
router.delete('/permanently-delete-product/:id', authMiddleware, productController.permanentlyDeleteProduct);

// Error handling middleware for multer and other errors
router.use(handleMulterError);

module.exports = router;