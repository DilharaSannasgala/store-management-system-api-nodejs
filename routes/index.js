const UserRouter = require('./authRoutes');
const ProductRouter = require('./productRoutes');
const CategoryRouter = require('./categoryRoutes');
const CustomerRouter = require('./customerRoutes');
const OrderRouter = require('./orderRoutes');
const StockRouter = require('./stockRoutes');
const DashboardRouter = require('./dashBoardRoutes');
const authMiddleware = require('../middleware/auth');

module.exports = (app) => {
    // Health Check Routes
    app.get('/', (req, res) => {
        res.json({
            status: 'SUCCESS',
            message: 'API is running',
            timestamp: new Date(),
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        });
    });

    app.get('/health', (req, res) => {
        res.json({
            status: 'UP',
            uptime: process.uptime(),
            timestamp: new Date()
        });
    });

    // API Routes with /api prefix
    app.use('/api/auth', UserRouter);
    app.use('/api/products', ProductRouter);
    app.use('/api/categories', CategoryRouter);
    app.use('/api/customers', CustomerRouter);
    app.use('/api/orders', OrderRouter);
    app.use('/api/stock', StockRouter);
    app.use('/api/dashboard', DashboardRouter);

    // Protected Test Route
    app.get('/api/protected', authMiddleware, (req, res) => {
        res.json({ 
            status: "SUCCESS", 
            message: "You have access to this protected route", 
            userId: req.userId 
        });
    });
};