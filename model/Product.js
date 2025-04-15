const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ProductSchema = new Schema({
    name: { type: String, required: true },
    productCode: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    images: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
    deletedAt: { type: Number, default: 0 }
});

const Product = mongoose.model('Product', ProductSchema);

module.exports = Product;
