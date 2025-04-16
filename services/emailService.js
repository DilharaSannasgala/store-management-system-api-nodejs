const nodemailer = require('nodemailer');

/**
 * Create a reusable transporter object
 */
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, resetToken, host) => {
    const transporter = createTransporter();
    
    const mailOptions = {
        to: email,
        from: process.env.EMAIL,
        subject: 'Password Reset',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
               Please click on the following link, or paste this into your browser to complete the process:\n\n
               http://${host}/reset-password/${resetToken}\n\n
               If you did not request this, please ignore this email and your password will remain unchanged.\n`
    };

    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error('Error sending email:', err);
                reject(err);
            } else {
                console.log('Email sent:', info.response);
                resolve(info);
            }
        });
    });
};

/**
 * Send low stock alert email
 */
const sendLowStockAlert = async (productName, batchNumber, quantity, recipients) => {
    const transporter = createTransporter();
    
    const mailOptions = {
        to: recipients,
        from: process.env.EMAIL,
        subject: 'Low Stock Alert',
        text: `This is an automated notification for low stock.\n\n
               Product: ${productName}\n
               Batch: ${batchNumber}\n
               Current Quantity: ${quantity}\n\n
               Please restock this item soon.`
    };

    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error('Error sending email:', err);
                reject(err);
            } else {
                console.log('Email sent:', info.response);
                resolve(info);
            }
        });
    });
};

module.exports = {
    sendPasswordResetEmail,
    sendLowStockAlert
};