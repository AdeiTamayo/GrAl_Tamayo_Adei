/**
 * Single place where environment configuration is declared and validated.
 *
 * `validateEnv()` is called once at boot so a missing variable fails fast with a
 * clear message instead of surfacing later as a confusing database or JWT error.
 * It is deliberately not called on import so tests can load the app without a
 * real environment.
 */

const REQUIRED_VARS = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
];

function getMissingVars() {
    return REQUIRED_VARS.filter((name) => !process.env[name]);
}

function validateEnv() {
    const missing = getMissingVars();
    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}. ` +
            'Copy .env.example to .env and fill in the values.'
        );
    }
}

/**
 * Read a variable that the running process cannot work without.
 * Throws a descriptive error instead of letting `undefined` reach the driver.
 */
function requireVar(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

module.exports = {
    REQUIRED_VARS,
    getMissingVars,
    validateEnv,
    requireVar,
};
