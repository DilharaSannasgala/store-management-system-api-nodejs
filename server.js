const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.log("DB Connection Error:", err));

// Serve static files (images, uploads, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const UserRouter = require('./controllers/User');
const ProductRouter = require('./controllers/Product');
const CategoryRouter = require('./routes/categoryRoutes');
const CustomerRouter = require('./controllers/Customer');
const OrderRouter = require('./controllers/Order');
const StockRouter = require('./controllers/Stock');
const authMiddleware = require('./middleware/auth');

app.use('/user', UserRouter);
app.use('/product', ProductRouter);
app.use('/category', CategoryRouter);
app.use('/customer', CustomerRouter);
app.use('/order', OrderRouter);
app.use('/stock', StockRouter);

// Protected Test Route
app.get('/protected', authMiddleware, (req, res) => {
    res.json({ status: "SUCCESS", message: "You have access to this protected route", userId: req.userId });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ status: "FAILED", message: "Route not found" });
});

// Start Server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
