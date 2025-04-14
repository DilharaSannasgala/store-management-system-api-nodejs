const express = require('express');
const router = express.Router();
const Category = require('../model/Category');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');

// Add Category route with authentication
router.post('/add-category', authMiddleware, async (req, res) => {
    const { name, description } = req.body;

    if (!name || !description) {
        return res.status(400).json({ status: "FAILED", message: "All fields are required" });
    }

    try {
        const existingCategory = await Category.findOne({
            name: name,
            deletedAt: 0
        });

        if (existingCategory) {
            return res.status(400).json({
                status: "FAILED",
                message: "Category name already exists"
            });
        }

        const newCategory = new Category({
            name,
            description,
            deletedAt: 0
        });

        await newCategory.save();

        return res.status(201).json({
            status: "SUCCESS",
            message: "Category added successfully",
            data: newCategory
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: "FAILED",
            message: "Internal server error",
            error: err.message
        });
    }
});

// Get All Categories route (excluding soft deleted categories)
router.get('/all-categories', async (req, res) => {
    try {
        const categories = await Category.find({ deletedAt: 0 });
        return res.json({ status: "SUCCESS", data: categories });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error" });
    }
});

// Optional: Get All Categories including deleted ones (admin only)
router.get('/all-categories/with-deleted', authMiddleware, async (req, res) => {
    try {
        const categories = await Category.find();
        return res.json({ status: "SUCCESS", data: categories });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error" });
    }
});

// Get One Category route (only active categories)
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    // Check if the provided ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: "FAILED", message: "Invalid category ID" });
    }

    try {
        const category = await Category.findOne({ 
            _id: id,
            deletedAt: 0
        });
        
        if (!category) {
            return res.status(404).json({ status: "FAILED", message: "Category not found" });
        }
        
        return res.json({ status: "SUCCESS", data: category });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error" });
    }
});

// Update Category route with authentication
router.put('/update-category/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    // Validate the ID to make sure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: "FAILED", message: "Invalid category ID" });
    }

    if (!name || !description) {
        return res.status(400).json({ status: "FAILED", message: "All fields are required" });
    }

    try {
        // Check if category exists and is active
        const category = await Category.findOne({ 
            _id: id,
            deletedAt: 0
        });
        
        if (!category) {
            return res.status(404).json({ status: "FAILED", message: "Category not found or has been deleted" });
        }

        // Check if the name already exists on another active category
        if (name !== category.name) {
            const existingCategory = await Category.findOne({ 
                name: name, 
                _id: { $ne: id },  // Ensures we're not matching the same category
                deletedAt: 0 
            });
            
            if (existingCategory) {
                return res.status(400).json({ 
                    status: "FAILED", 
                    message: "Category name already exists" 
                });
            }
        }

        // Update category fields
        category.name = name;
        category.description = description;

        // Save the updated category
        await category.save();

        // Return success response
        return res.json({ 
            status: "SUCCESS", 
            message: "Category updated successfully", 
            data: category 
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ 
            status: "FAILED", 
            message: "Internal server error", 
            error: err.message 
        });
    }
});

// Soft Delete Category route with authentication
router.delete('/delete-category/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    // Validate the ID to make sure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: "FAILED", message: "Invalid category ID" });
    }

    try {
        // Check if category exists and is active
        const category = await Category.findOne({ 
            _id: id,
            deletedAt: 0
        });
        
        if (!category) {
            return res.status(404).json({ status: "FAILED", message: "Category not found or already deleted" });
        }

        // Soft delete by setting deletedAt to current timestamp
        category.deletedAt = Date.now();
        await category.save();

        return res.json({ status: "SUCCESS", message: "Category soft deleted successfully" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
});

// Restore a soft-deleted category
router.post('/restore-category/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    // Validate the ID to make sure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: "FAILED", message: "Invalid category ID" });
    }

    try {
        // Check if category exists and is deleted
        const category = await Category.findOne({ 
            _id: id,
            deletedAt: { $ne: 0 }
        });
        
        if (!category) {
            return res.status(404).json({ status: "FAILED", message: "Category not found or is not deleted" });
        }

        // Check if name now conflicts with an active category
        const existingCategory = await Category.findOne({ 
            name: category.name, 
            _id: { $ne: id },
            deletedAt: 0
        });
        
        if (existingCategory) {
            return res.status(400).json({ 
                status: "FAILED", 
                message: "Cannot restore category. Category name now conflicts with an active category." 
            });
        }

        // Restore by setting deletedAt back to 0
        category.deletedAt = 0;
        await category.save();

        return res.json({ status: "SUCCESS", message: "Category restored successfully", data: category });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
});

// Permanently delete a category (admin only, if needed)
router.delete('/permanently-delete-category/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await Category.findByIdAndDelete(id);
        
        if (!result) {
            return res.status(404).json({ status: "FAILED", message: "Category not found" });
        }

        return res.json({ status: "SUCCESS", message: "Category permanently deleted" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
});

module.exports = router;