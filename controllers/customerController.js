const Customer = require('../model/Customer');
const mongoose = require('mongoose');

// Controller methods for customer operations
const customerController = {
    // Add a new customer
    addCustomer: async (req, res) => {
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
    },

    // Get all active customers
    getAllCustomers: async (req, res) => {
        try {
            const customers = await Customer.find({ deletedAt: 0 });
            return res.json({ status: "SUCCESS", data: customers });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ status: "FAILED", message: "Internal server error" });
        }
    },

    // Get all customers including deleted ones
    getAllCustomersWithDeleted: async (req, res) => {
        try {
            const customers = await Customer.find();
            return res.json({ status: "SUCCESS", data: customers });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ status: "FAILED", message: "Internal server error" });
        }
    },

    // Get a single customer by ID
    getCustomerById: async (req, res) => {
        const { id } = req.params;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ status: "FAILED", message: "Invalid customer ID" });
        }

        try {
            const customer = await Customer.findOne({ 
                _id: id,
                deletedAt: 0
            });
            
            if (!customer) {
                return res.status(404).json({ status: "FAILED", message: "Customer not found" });
            }
            
            return res.json({ status: "SUCCESS", data: customer });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ status: "FAILED", message: "Internal server error" });
        }
    },

    // Update a customer
    updateCustomer: async (req, res) => {
        const { id } = req.params;
        const { firstName, lastName, email, phone, address, city, state } = req.body;

        if (!firstName || !lastName || !email || !phone || !address || !city || !state) {
            return res.status(400).json({ status: "FAILED", message: "All fields are required" });
        }

        try {
            // Check if customer exists and is active
            const customer = await Customer.findOne({ 
                _id: id,
                deletedAt: 0
            });
            
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

            customer.firstName = firstName;
            customer.lastName = lastName;
            customer.email = email;
            customer.phone = phone;
            customer.address = address;
            customer.city = city;
            customer.state = state;

            await customer.save();

            return res.json({ status: "SUCCESS", message: "Customer updated successfully", data: customer });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ status: "FAILED", message: "Internal server error", error: err.message });
        }
    },

    // Soft delete a customer
    softDeleteCustomer: async (req, res) => {
        const { id } = req.params;

        try {
            // Check if customer exists and is active
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
    },

    // Restore a soft deleted customer
    restoreCustomer: async (req, res) => {
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
    },

    // Permanently delete a customer
    permanentlyDeleteCustomer: async (req, res) => {
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
    }
};

module.exports = customerController;