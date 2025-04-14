const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CategorySchema = new Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    deletedAt: { type: Number, default: 0 }
});

// Add index for faster queries based on deletedAt
CategorySchema.index({ deletedAt: 1 });

const Category = mongoose.model('Category', CategorySchema);

module.exports = Category;