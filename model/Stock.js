const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StockSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    batchNumber: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0},
    size: { type: String, enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], required: true },
    price: { type: Number, required: true },
    lowStockAlert: { type: Number, default: 5 },
    lastRestocked: { type: Date, default: Date.now },
    supplier: { type: String, required: true },
    deletedAt: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const Stock = mongoose.model('Stock', StockSchema);

module.exports = Stock;
