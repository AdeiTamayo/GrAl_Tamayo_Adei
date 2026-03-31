const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {

    console.log("Middleware");
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, error: 'Invalid token' });
    }
};

module.exports = authMiddleware;