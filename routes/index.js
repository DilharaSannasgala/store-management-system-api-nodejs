const UserRouter = require('./authRoutes');
const ProductRouter = require('./productRoutes');
const CategoryRouter = require('./categoryRoutes');
const CustomerRouter = require('./customerRoutes');
const OrderRouter = require('./orderRoutes');
const StockRouter = require('./stockRoutes');
const DashboardRouter = require('./dashBoardRoutes');
const authMiddleware = require('../middleware/auth');

module.exports = (app) => {
    // Health Check Route
    app.get('/', (req, res) => {
        res.json({
            status: 'SUCCESS',
            message: 'API is running',
            timestamp: new Date(),
            environment: process.env.NODE_ENV || 'development'
        });
    });

    // API Routes
    app.use('/user', UserRouter);
    app.use('/product', ProductRouter);
    app.use('/category', CategoryRouter);
    app.use('/customer', CustomerRouter);
    app.use('/order', OrderRouter);
    app.use('/stock', StockRouter);
    app.use('/dashboard', DashboardRouter);

    // Protected Test Route
    app.get('/protected', authMiddleware, (req, res) => {
        res.json({ 
            status: "SUCCESS", 
            message: "You have access to this protected route", 
            userId: req.userId 
        });
    });
};