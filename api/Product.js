const express = require('express');
const router = express.Router();
const Product = require('../model/Product');
const Category = require('../model/Category');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Add file filter to only accept images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter
});

// Add Product route with authentication
router.post('/add-product', authMiddleware, upload.array('images', 5), async (req, res) => {
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

        // ===== Generate product code here =====
        const rawPrefix = categoryData.name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
        const regex = new RegExp(`^${rawPrefix}\\d{3}$`);

        const productsWithPrefix = await Product.find({ productCode: { $regex: regex }, deletedAt: 0 });

        const maxNumber = productsWithPrefix.reduce((max, product) => {
            const match = product.productCode.match(/\d{3}$/);
            const num = match ? parseInt(match[0], 10) : 0;
            return Math.max(max, num);
        }, 0);

        const newCode = `${rawPrefix}${(maxNumber + 1).toString().padStart(3, '0')}`;
        // =======================================

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
});

// Get All Products route (excluding soft deleted products)
router.get('/all-products', authMiddleware, async (req, res) => {
    try {
        const products = await Product.find({ deletedAt: 0 })
            .populate('category')
            .sort({ createdAt: -1 }); // Optional: newest first
        return res.json({ status: "SUCCESS", data: products });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
});

// Optional: Get All Products including deleted ones
router.get('/all-products/with-deleted', authMiddleware, async (req, res) => {
    try {
        const products = await Product.find()
            .populate('category')
            .sort({ createdAt: -1 });
        return res.json({ status: "SUCCESS", data: products });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
});

// Get One Product route (excluding deleted products)
router.get('/product/:id', authMiddleware, async (req, res) => {
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
});

// Update Product route
router.put('/update-product/:id', authMiddleware, upload.array('images', 5), async (req, res) => {
    const { id } = req.params;
    const { name, productCode, description, size, color, price, category } = req.body;

    // Convert price to a number
    const parsedPrice = parseFloat(price);

    if (!name || !productCode || !description || !size || !color || isNaN(parsedPrice) || !category) {
        return res.status(400).json({ status: "FAILED", message: "All fields are required and price must be a number" });
    }

    if (parsedPrice <= 0) {
        return res.status(400).json({ status: "FAILED", message: "Price must be a positive number" });
    }

    // Ensure the category ID is valid
    if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ status: "FAILED", message: "Invalid category ID" });
    }

    try {
        // Check if product exists and is not deleted
        const product = await Product.findOne({ 
            _id: id,
            deletedAt: 0
        });
        
        if (!product) {
            return res.status(404).json({ status: "FAILED", message: "Product not found or has been deleted" });
        }

        // Check if the updated product code already exists on another product
        if (productCode !== product.productCode) {
            const existingProduct = await Product.findOne({ 
                productCode, 
                _id: { $ne: id },
                deletedAt: 0
            });
            
            if (existingProduct) {
                return res.status(400).json({ 
                    status: "FAILED", 
                    message: "Product code already exists on another product" 
                });
            }
        }

        // Handle file uploads if any
        let imageUrls = product.images;
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map(file => `http://${req.headers.host}/uploads/${file.filename}`);
        }

        // Update product
        product.name = name;
        product.productCode = productCode;
        product.description = description;
        product.size = size;
        product.color = color;
        product.price = parsedPrice;
        product.category = category;
        if (req.files && req.files.length > 0) {
            product.images = imageUrls;
        }

        await product.save();

        return res.json({ status: "SUCCESS", message: "Product updated successfully", data: product });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
});

// Soft Delete Product route
router.delete('/delete-product/:id', authMiddleware, async (req, res) => {
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
});

// Restore a soft-deleted product
router.post('/restore-product/:id', authMiddleware, async (req, res) => {
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
});

// Permanently delete a product (admin only, if needed)
router.delete('/permanently-delete-product/:id', authMiddleware, async (req, res) => {
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
});

// Error handling middleware for multer and other errors
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        console.error('Multer error:', err);
        return res.status(400).json({ status: "FAILED", message: `Upload error: ${err.message}` });
    } else if (err) {
        // An unknown error occurred
        console.error('Unknown error:', err);
        return res.status(500).json({ status: "FAILED", message: `Server error: ${err.message}` });
    }
    next();
});

module.exports = router;