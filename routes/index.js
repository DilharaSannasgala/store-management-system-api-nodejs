const UserRouter = require('./authRoutes');
const ProductRouter = require('./productRoutes');
const CategoryRouter = require('./categoryRoutes');
const CustomerRouter = require('./customerRoutes');
const OrderRouter = require('./orderRoutes');
const StockRouter = require('./stockRoutes');
const authMiddleware = require('../middleware/auth');

module.exports = (app) => {
    // API Routes
    app.use('/user', UserRouter);
    app.use('/product', ProductRouter);
    app.use('/category', CategoryRouter);
    app.use('/customer', CustomerRouter);
    app.use('/order', OrderRouter);
    app.use('/stock', StockRouter);

    // Protected Test Route
    app.get('/protected', authMiddleware, (req, res) => {
        res.json({ 
            status: "SUCCESS", 
            message: "You have access to this protected route", 
            userId: req.userId 
        });
    });
};