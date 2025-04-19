const Customer = require('../model/Customer');
const mongoose = require('mongoose');

/**
 * Add a new customer
 */
const addCustomer = async (req, res) => {
    const { firstName, lastName, email, phone, address, city, state } = req.body;

    if (!firstName || !lastName || !email || !phone || !address || !city || !state) {
        return res.status(400).json({ status: "FAILED", message: "All fields are required" });
    }

    try {
        // Check for email duplicate only if email is provided
        if (email) {
            const existingCustomer = await Customer.findOne({ 
                email: email,
                deletedAt: 0
            });
            
            if (existingCustomer) {
                return res.status(400).json({ 
                    status: "FAILED", 
                    message: "Email already exists" 
                });
            }
        }

        const newCustomer = new Customer({
            firstName,
            lastName,
            email,
            phone,
            address,
            city,
            state,
            deletedAt: 0
        });

        await newCustomer.save();

        return res.status(201).json({ status: "SUCCESS", message: "Customer added successfully", data: newCustomer });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Get all non-deleted customers
 */
const getAllCustomers = async (req, res) => {
    try {
        const customers = await Customer.find({ deletedAt: 0 })
            .sort({ createdAt: -1 });
        return res.json({ status: "SUCCESS", data: customers });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Get all customers including deleted ones
 */
const getAllCustomersWithDeleted = async (req, res) => {
    try {
        const customers = await Customer.find()
            .sort({ createdAt: -1 });
        return res.json({ status: "SUCCESS", data: customers });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Get a single customer by ID
 */
const getCustomerById = async (req, res) => {
    const { id } = req.params;

    // Validate customer ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: "FAILED", message: "Invalid customer ID" });
    }

    try {
        const customer = await Customer.findOne({ 
            _id: id,
            deletedAt: 0
        });
        
        if (!customer) {
            // Check if the customer exists but is soft deleted
            const softDeleted = await Customer.findById(id);
            if (softDeleted && softDeleted.deletedAt !== 0) {
                return res.status(410).json({ status: "FAILED", message: "Customer has been deleted" });
            }

            return res.status(404).json({ status: "FAILED", message: "Customer not found" });
        }

        return res.json({ status: "SUCCESS", data: customer });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Update an existing customer
 */
const updateCustomer = async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, phone, address, city, state } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !address || !city || !state) {
        return res.status(400).json({ status: "FAILED", message: "All fields are required" });
    }

    try {
        // Find the customer
        const customer = await Customer.findOne({ _id: id, deletedAt: 0 });
        if (!customer) {
            return res.status(404).json({ status: "FAILED", message: "Customer not found or has been deleted" });
        }

        // Check for email duplicate only if email is provided and different
        if (email && email !== customer.email) {
            const existingCustomer = await Customer.findOne({ 
                email: email,
                _id: { $ne: id },
                deletedAt: 0
            });
            
            if (existingCustomer) {
                return res.status(400).json({ 
                    status: "FAILED", 
                    message: "Email already exists" 
                });
            }
        }

        // Update fields
        customer.firstName = firstName;
        customer.lastName = lastName;
        customer.email = email;
        customer.phone = phone;
        customer.address = address;
        customer.city = city;
        customer.state = state;

        await customer.save();

        return res.json({
            status: "SUCCESS",
            message: "Customer updated successfully",
            data: customer
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: "FAILED",
            message: "Internal server error",
            error: err.message
        });
    }
};

/**
 * Soft delete a customer
 */
const softDeleteCustomer = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if customer exists and is not already deleted
        const customer = await Customer.findOne({ 
            _id: id,
            deletedAt: 0
        });
        
        if (!customer) {
            return res.status(404).json({ status: "FAILED", message: "Customer not found or already deleted" });
        }

        // Soft delete by setting deletedAt to current timestamp
        customer.deletedAt = Date.now();
        await customer.save();

        return res.json({ status: "SUCCESS", message: "Customer soft deleted successfully" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Restore a soft-deleted customer
 */
const restoreCustomer = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if customer exists and is deleted
        const customer = await Customer.findOne({ 
            _id: id,
            deletedAt: { $ne: 0 }
        });
        
        if (!customer) {
            return res.status(404).json({ status: "FAILED", message: "Customer not found or is not deleted" });
        }

        // Restore by setting deletedAt back to 0
        customer.deletedAt = 0;
        await customer.save();

        return res.json({ status: "SUCCESS", message: "Customer restored successfully", data: customer });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Permanently delete a customer
 */
const permanentlyDeleteCustomer = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await Customer.findByIdAndDelete(id);
        
        if (!result) {
            return res.status(404).json({ status: "FAILED", message: "Customer not found" });
        }

        return res.json({ status: "SUCCESS", message: "Customer permanently deleted" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
    }
};

/**
 * Count customers with optional filters
 */
const countCustomers = async (req, res) => {
    try {
        const { countDeleted } = req.query;
        
        // Base counts
        const activeCount = await Customer.countDocuments({ deletedAt: 0 });
        
        // If we only want active count
        if (countDeleted !== 'true') {
            return res.json({ 
                status: "SUCCESS", 
                data: { 
                    active: activeCount
                }
            });
        }
        
        // If we want all stats
        const deletedCount = await Customer.countDocuments({ deletedAt: { $ne: 0 } });
        const totalCount = activeCount + deletedCount;
        
        // Get count by states
        const stateCounts = await Customer.aggregate([
            { $match: { deletedAt: 0 } },
            { $group: { _id: "$state", count: { $sum: 1 } } },
            { $project: {
                _id: 1,
                count: 1,
                stateName: "$_id"
            }}
        ]);
        
        return res.json({
            status: "SUCCESS",
            data: {
                active: activeCount,
                deleted: deletedCount,
                total: totalCount,
                byState: stateCounts
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ 
            status: "FAILED", 
            message: "Internal server error", 
            error: err.message 
        });
    }
};

module.exports = {
    addCustomer,
    getAllCustomers,
    getAllCustomersWithDeleted,
    getCustomerById,
    updateCustomer,
    softDeleteCustomer,
    restoreCustomer,
    permanentlyDeleteCustomer,
    countCustomers
};