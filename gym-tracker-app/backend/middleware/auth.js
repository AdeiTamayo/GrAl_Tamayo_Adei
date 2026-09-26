const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { requireVar } = require('../config/env');

// A JWT stays valid for 7 days, so a user who deletes their account would
// otherwise keep full access until it expires. We re-check the account on every
// request, but cache the answer briefly so a burst of requests from one session
// costs at most one extra query per window.
const USER_CHECK_TTL_MS = 60 * 1000;
const MAX_CACHE_ENTRIES = 1000;
const userCache = new Map();

async function userStillExists(userId) {
    const now = Date.now();
    const cached = userCache.get(userId);
    if (cached && now - cached.checkedAt < USER_CHECK_TTL_MS) {
        return cached.exists;
    }

    // Periodically drop expired entries so the map cannot grow without bound.
    if (userCache.size >= MAX_CACHE_ENTRIES) {
        for (const [id, entry] of userCache) {
            if (now - entry.checkedAt >= USER_CHECK_TTL_MS) {
                userCache.delete(id);
            }
        }
    }

    const exists = await User.userExists(userId);
    userCache.set(userId, { exists, checkedAt: now });
    return exists;
}

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, requireVar('JWT_SECRET'));
    } catch {
        return res.status(403).json({ success: false, error: 'Invalid token' });
    }

    try {
        if (!(await userStillExists(decoded.userId))) {
            return res.status(401).json({ success: false, error: 'Account no longer exists' });
        }
    } catch (error) {
        // Fail closed: if we cannot confirm the account, do not grant access.
        console.error('[Auth] Failed to verify user account:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to verify user account' });
    }

    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
};

// Exposed for tests so they can start from a known state.
module.exports = authMiddleware;
module.exports._clearUserCache = () => userCache.clear();
