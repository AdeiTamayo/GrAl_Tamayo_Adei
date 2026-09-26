const { invalidateExercisesCache } = require('../utils/exerciseCache');

/**
 * Attach to any route that writes exercises so the read-through cache can never
 * serve a stale catalogue afterwards.
 */
function invalidateExerciseCache(req, res, next) {
    invalidateExercisesCache();
    next();
}

module.exports = invalidateExerciseCache;
