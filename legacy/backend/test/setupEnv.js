// Deterministic environment for the Jest suite.
//
// Runs before each test file (see the `setupFiles` entry in package.json).
// Without this, any suite that exercises a code path reading process.env gets
// `undefined` and fails for reasons unrelated to the code under test -- e.g.
// `jsonwebtoken` throws "secretOrPrivateKey must have a value" when
// JWT_SECRET is absent from the machine's .env.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';
