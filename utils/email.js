const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Send Email
const sendLowStockAlert = async (productName, batchNumber, quantity, emailRecipients) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to: emailRecipients,
        subject: 'Low Stock Alert: ' + productName + 'from ' + batchNumber,
        text: `The stock for ${productName} from batch ${batchNumber} is low. Current quantity: ${quantity}. Please restock soon.`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Low stock alert email sent successfully!');
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

module.exports = sendLowStockAlert;
