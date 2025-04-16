require('dotenv').config();
const app = require('./config/express');
const connectDB = require('./config/database');
const port = process.env.PORT || 3001;

// Connect to Database
connectDB();

// Start Server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});