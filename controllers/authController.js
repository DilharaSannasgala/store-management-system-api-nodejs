const User = require('../model/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const generateToken = require('../utils/generateToken');
const emailService = require('../services/emailService');

/**
 * User signup/registration
 */
const signup = async (req, res) => {
    let { name, email, password, dateOfBirth } = req.body;
    name = name.trim();
    email = email.trim();
    password = password.trim();
    dateOfBirth = dateOfBirth.trim();

    if (!name || !email || !password || !dateOfBirth) {
        return res.json({ status: "FAILED", message: "All fields are required" });
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
        return res.json({ status: "FAILED", message: "Invalid name" });
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        return res.json({ status: "FAILED", message: "Invalid email address" });
    }

    const parsedDate = new Date(dateOfBirth);
    if (isNaN(parsedDate.getTime())) {
        return res.json({ status: "FAILED", message: "Invalid date of birth" });
    }

    if (password.length < 8) {
        return res.json({ status: "FAILED", message: "Password must be at least 8 characters long" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({ status: "FAILED", message: "Email already exists" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            dateOfBirth: parsedDate
        });

        await newUser.save();

        return res.json({ status: "SUCCESS", message: "Signup successful", data: { user: newUser } });

    } catch (err) {
        console.error(err);
        return res.json({ status: "FAILED", message: "Internal server error" });
    }
};

/**
 * User signin/login
 */
const signin = async (req, res) => {
    let { email, password } = req.body;
    email = email.trim();
    password = password.trim();

    if (!email || !password) {
        return res.json({ status: "FAILED", message: "All fields are required" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ status: "FAILED", message: "Invalid credentials" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.json({ status: "FAILED", message: "Incorrect password" });
        }

        // Generate JWT token
        const token = generateToken(user._id);

        return res.json({ status: "SUCCESS", message: "Sign in successful", data: { user, token } });

    } catch (err) {
        console.error(err);
        return res.json({ status: "FAILED", message: "Internal server error" });
    }
};

/**
 * Request password reset
 */
const forgetPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.json({ status: "FAILED", message: "Email is required" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ status: "FAILED", message: "No user with this email" });
        }

        // Generate a reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        try {
            // Send password reset email
            await emailService.sendPasswordResetEmail(
                user.email, 
                resetToken, 
                req.headers.host
            );
            
            return res.json({ 
                status: "SUCCESS", 
                message: "A reset email has been sent to " + user.email 
            });
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            return res.json({ status: "FAILED", message: "Error sending email" });
        }

    } catch (err) {
        console.error(err);
        return res.json({ status: "FAILED", message: "Internal server error" });
    }
};

/**
 * Reset password with token
 */
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.json({ status: "FAILED", message: "Password is required" });
    }

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.json({ status: "FAILED", message: "Password reset token is invalid or has expired" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ status: "SUCCESS", message: "Password has been reset" });

    } catch (err) {
        console.error(err);
        return res.json({ status: "FAILED", message: "Internal server error" });
    }
};

/**
 * Verify JWT token
 */
const verifyToken = async (req, res) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ 
            status: "FAILED", 
            message: 'Access denied. No token provided.' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(404).json({ 
                status: "FAILED", 
                message: 'User not found.' 
            });
        }

        return res.json({ 
            status: "SUCCESS", 
            message: "Token is valid",
            data: { user }
        });
    } catch (err) {
        return res.status(400).json({ 
            status: "FAILED", 
            message: 'Invalid token.' 
        });
    }
};

module.exports = {
    signup,
    signin,
    forgetPassword,
    resetPassword,
    verifyToken
};