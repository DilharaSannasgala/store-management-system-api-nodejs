const Product = require('../model/Product');
const Category = require('../model/Category');
const mongoose = require('mongoose');
const path = require('path');

/**
 * Add a new product
 */
const addProduct = async (req, res) => {
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Files:', req.files);

    const { name, description, category } = req.body;

    if (!name || !description || !category) {
        return res.status(400).json({ status: "FAILED", message: "Name, description, and category are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ status: "FAILED", message: "Invalid category ID" });
    }

    try {
        // Get category name
        const categoryData = await Category.findOne({ _id: category, deletedAt: 0 });
        if (!categoryData) {
            return res.status(400).json({ status: "FAILED", message: "Category not found" });
        }

        // Generate product code
        const rawPrefix = categoryData.name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
        const regex = new RegExp(`^${rawPrefix}\\d{3}$`);

        // Find all products with the same prefix, including soft-deleted ones
        const productsWithPrefix = await Product.find({ productCode: { $regex: regex } });

        const maxNumber = productsWithPrefix.reduce((max, product) => {
            const match = product.productCode.match(/\d{3}$/);
            const num = match ? parseInt(match[0], 10) : 0;
            return Math.max(max, num);
        }, 0);

        const newCode = `${rawPrefix}${(maxNumber + 1).toString().padStart(3, '0')}`;

        // Image handling
        const imageUrls = req.files.map(file => `http://${req.headers.host}/uploads/${file.filename}`);

        const newProduct = new Product({
            name,
            productCode: newCode,
            description,
            category,
            images: imageUrls,
            deletedAt: 0
        });

        await newProduct.save();

        return res.status(201).json({ status: "SUCCESS", message: "Product added successfully", data: newProduct });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Get all non-deleted products
 */
const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find({ deletedAt: 0 })
            .populate('category')
            .sort({ createdAt: -1 });
        return res.json({ status: "SUCCESS", data: products });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Get all products including deleted ones
 */
const getAllProductsWithDeleted = async (req, res) => {
    try {
        const products = await Product.find()
            .populate('category')
            .sort({ createdAt: -1 });
        return res.json({ status: "SUCCESS", data: products });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Get a single product by ID
 */
const getProductById = async (req, res) => {
    const { id } = req.params;

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: "FAILED", message: "Invalid product ID" });
    }

    try {
        const product = await Product.findOne({ 
            _id: id,
            deletedAt: 0
        }).populate('category');
        
        if (!product) {
            // Check if the product exists but is soft deleted
            const softDeleted = await Product.findById(id);
            if (softDeleted && softDeleted.deletedAt !== 0) {
                return res.status(410).json({ status: "FAILED", message: "Product has been deleted" });
            }

            return res.status(404).json({ status: "FAILED", message: "Product not found" });
        }

        return res.json({ status: "SUCCESS", data: product });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Update an existing product
 */
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, description, category, existingImages, removedImages } = req.body;

    // Validate required fields
    if (!name || !description || !category) {
        return res.status(400).json({ status: "FAILED", message: "Name, description, and category are required" });
    }

    // Ensure category ID is valid
    if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ status: "FAILED", message: "Invalid category ID" });
    }

    try {
        // Find the product
        const product = await Product.findOne({ _id: id, deletedAt: 0 });
        if (!product) {
            return res.status(404).json({ status: "FAILED", message: "Product not found or has been deleted" });
        }

        // Handle image upload
        let newImageUrls = [];
        if (req.files && req.files.length > 0) {
            newImageUrls = req.files.map(file => `http://${req.headers.host}/uploads/${file.filename}`);
        }

        // Parse existing and removed images
        const parsedExistingImages = JSON.parse(existingImages);
        const parsedRemovedImages = JSON.parse(removedImages);

        // Merge new images with existing images and remove the removed images
        const mergedImages = [...parsedExistingImages, ...newImageUrls].filter(image => !parsedRemovedImages.includes(image));

        // Update fields
        product.name = name;
        product.description = description;
        product.category = category;
        product.images = mergedImages;

        await product.save();

        return res.json({
            status: "SUCCESS",
            message: "Product updated successfully",
            data: product
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
 * Soft delete a product
 */
const softDeleteProduct = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if product exists and is not already deleted
        const product = await Product.findOne({ 
            _id: id,
            deletedAt: 0
        });
        
        if (!product) {
            return res.status(404).json({ status: "FAILED", message: "Product not found or already deleted" });
        }

        // Soft delete by setting deletedAt to current timestamp
        product.deletedAt = Date.now();
        await product.save();

        return res.json({ status: "SUCCESS", message: "Product soft deleted successfully" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Restore a soft-deleted product
 */
const restoreProduct = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if product exists and is deleted
        const product = await Product.findOne({ 
            _id: id,
            deletedAt: { $ne: 0 }
        });
        
        if (!product) {
            return res.status(404).json({ status: "FAILED", message: "Product not found or is not deleted" });
        }

        // Check if product code now conflicts with an active product
        const existingProduct = await Product.findOne({ 
            productCode: product.productCode, 
            _id: { $ne: id },
            deletedAt: 0
        });
        
        if (existingProduct) {
            return res.status(400).json({ 
                status: "FAILED", 
                message: "Cannot restore product. Product code now conflicts with an active product." 
            });
        }

        // Restore by setting deletedAt back to 0
        product.deletedAt = 0;
        await product.save();

        return res.json({ status: "SUCCESS", message: "Product restored successfully", data: product });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Permanently delete a product
 */
const permanentlyDeleteProduct = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await Product.findByIdAndDelete(id);
        
        if (!result) {
            return res.status(404).json({ status: "FAILED", message: "Product not found" });
        }

        return res.json({ status: "SUCCESS", message: "Product permanently deleted" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

module.exports = {
    addProduct,
    getAllProducts,
    getAllProductsWithDeleted,
    getProductById,
    updateProduct,
    softDeleteProduct,
    restoreProduct,
    permanentlyDeleteProduct
};