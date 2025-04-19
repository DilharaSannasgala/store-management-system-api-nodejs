const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/auth');

// Category routes
// Add Category route with authentication
router.post('/add-category', authMiddleware, categoryController.addCategory);

// Get All Categories route (excluding soft deleted categories)
router.get('/all-categories', categoryController.getAllCategories);

// Optional: Get All Categories including deleted ones (admin only)
router.get('/all-categories/with-deleted', authMiddleware, categoryController.getAllCategoriesWithDeleted);

// Get Category Count route 
router.get('/category-count', categoryController.countCategories);

// Get One Category route (only active categories)
router.get('/:id', categoryController.getCategoryById);

// Update Category route with authentication
router.put('/update-category/:id', authMiddleware, categoryController.updateCategory);

// Soft Delete Category route with authentication
router.delete('/delete-category/:id', authMiddleware, categoryController.softDeleteCategory);

// Restore a soft-deleted category
router.post('/restore-category/:id', authMiddleware, categoryController.restoreCategory);

// Permanently delete a category (admin only, if needed)
router.delete('/permanently-delete-category/:id', authMiddleware, categoryController.permanentlyDeleteCategory);

module.exports = router;