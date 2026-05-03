// ============================================================
//  auth.js — Middleware to protect routes via JWT
// ============================================================

const jwt = require('jsonwebtoken');

// A default secret for dev purposes (in production, use process.env.JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-habit-cost-key';

module.exports = function(req, res, next) {
    // Get token from header
    const authHeader = req.header('Authorization');

    // Check if no token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Add user payload to request
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token is not valid' });
    }
};
