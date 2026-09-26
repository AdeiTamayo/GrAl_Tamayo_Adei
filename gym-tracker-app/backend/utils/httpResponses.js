/**
 * Helpers for the JSON envelope every endpoint returns.
 *
 * Keeping the shape in one place means clients can rely on `{ success, ... }` and
 * controllers stop repeating the same object literal in every branch.
 */

function sendData(res, status, payload) {
    return res.status(status).json({ success: true, ...payload });
}

function sendError(res, status, error) {
    return res.status(status).json({ success: false, error });
}

module.exports = { sendData, sendError };
