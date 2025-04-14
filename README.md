# Store Management System Backend

## Description

The backend for a store management system designed to handle inventory management, orders, and user authentication. The application allows for:

- Product management
- User registration and authentication
- Stock updates and low-stock alerts
- Order management
- Customer management
- Email notifications for low-stock alerts

This backend is built using Express.js, MongoDB (with Mongoose), and various other libraries for added functionality.

## Prerequisites

- Node.js and npm
- MongoDB Database (local or cloud)

## Installation

### Clone the repository

```bash
git clone https://github.com/DilharaSannasgala/store-management-system-api-nodejs.git
```

### Navigate to the project directory

```bash
cd store-management-system-api-nodejs
```

### Install dependencies

```bash
npm install
```

### Set up environment variables

Create a `.env` file in the root directory and add the following:

```env
MONGODB_URI=your-mongo-db-connection-url
JWT_SECRET=secret-key
EMAIL=your-email
EMAIL_PASSWORD=your-email-password
JWT_EXPIRES_IN=time-for-token-expire
```

### Running the server

To run the server in development mode:

```bash
npm run dev
```

This will use `nodemon` to automatically restart the server on code changes.

To run the server normally:

```bash
npm start
```

## Acknowledgments

- Node.js, Express.js, MongoDB, and Mongoose for the backend framework
- nodemailer for email notifications
- bcrypt and JWT for user authentication and password encryption

