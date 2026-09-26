/**
 * Read-through cache for the full exercise list.
 *
 * The exercise catalogue is read on nearly every page but changes rarely, so an
 * unpaginated GET is served from memory for EXERCISE_CACHE_TTL_MS.
 *
 * Invalidation lives in the route table (see middleware/invalidateExerciseCache)
 * rather than in the controllers, so every write path is covered by
 * construction and a new write route cannot silently serve stale data.
 */

const EXERCISE_CACHE_TTL_MS = 5 * 60 * 1000;

let cached = null;
let cachedAt = 0;

function getCachedExercises() {
    if (cached && Date.now() - cachedAt < EXERCISE_CACHE_TTL_MS) {
        return cached;
    }
    return null;
}

function setCachedExercises(result) {
    cached = result;
    cachedAt = Date.now();
}

function invalidateExercisesCache() {
    cached = null;
    cachedAt = 0;
}

module.exports = {
    EXERCISE_CACHE_TTL_MS,
    getCachedExercises,
    setCachedExercises,
    invalidateExercisesCache,
};
