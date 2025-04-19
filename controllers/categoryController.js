const Category = require('../model/Category');
const mongoose = require('mongoose');

/**
 * Add a new category
 */
const addCategory = async (req, res) => {
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
};

/**
 * Get all non-deleted categories
 */
const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find({ deletedAt: 0 })
            .sort({ createdAt: -1 });
        return res.json({ status: "SUCCESS", data: categories });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Get all categories including deleted ones
 */
const getAllCategoriesWithDeleted = async (req, res) => {
    try {
        const categories = await Category.find()
            .sort({ createdAt: -1 });
        return res.json({ status: "SUCCESS", data: categories });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Get a single category by ID
 */
const getCategoryById = async (req, res) => {
    const { id } = req.params;

    // Validate category ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: "FAILED", message: "Invalid category ID" });
    }

    try {
        const category = await Category.findOne({ 
            _id: id,
            deletedAt: 0
        });
        
        if (!category) {
            // Check if the category exists but is soft deleted
            const softDeleted = await Category.findById(id);
            if (softDeleted && softDeleted.deletedAt !== 0) {
                return res.status(410).json({ status: "FAILED", message: "Category has been deleted" });
            }

            return res.status(404).json({ status: "FAILED", message: "Category not found" });
        }
        
        return res.json({ status: "SUCCESS", data: category });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Update an existing category
 */
const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    // Validate required fields
    if (!name || !description) {
        return res.status(400).json({ status: "FAILED", message: "All fields are required" });
    }

    // Validate the ID to make sure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: "FAILED", message: "Invalid category ID" });
    }

    try {
        // Find the category
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

        // Update fields
        category.name = name;
        category.description = description;

        await category.save();

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
};

/**
 * Soft delete a category
 */
const softDeleteCategory = async (req, res) => {
    const { id } = req.params;

    // Validate the ID to make sure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: "FAILED", message: "Invalid category ID" });
    }

    try {
        // Check if category exists and is not already deleted
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
};

/**
 * Restore a soft-deleted category
 */
const restoreCategory = async (req, res) => {
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
};

/**
 * Permanently delete a category
 */
const permanentlyDeleteCategory = async (req, res) => {
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
};

/**
 * Count categories with optional filters
 */
const countCategories = async (req, res) => {
    try {
        const { countDeleted } = req.query;
        
        // Base counts
        const activeCount = await Category.countDocuments({ deletedAt: 0 });
        
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
        const deletedCount = await Category.countDocuments({ deletedAt: { $ne: 0 } });
        const totalCount = activeCount + deletedCount;
        
        return res.json({
            status: "SUCCESS",
            data: {
                active: activeCount,
                deleted: deletedCount,
                total: totalCount
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
    addCategory,
    getAllCategories,
    getAllCategoriesWithDeleted,
    getCategoryById,
    updateCategory,
    softDeleteCategory,
    restoreCategory,
    permanentlyDeleteCategory,
    countCategories
};