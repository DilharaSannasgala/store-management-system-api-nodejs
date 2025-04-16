const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const routes = require('../routes');
const errorHandlers = require('../middleware/errorHandlers');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Register routes
routes(app);

// Error handlers
app.use(errorHandlers.notFound);

module.exports = app;