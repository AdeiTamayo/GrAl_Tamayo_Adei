import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

// jsdom does not provide these, and react-router v7 needs them at import time.
// Wire them onto the global object so router components can be rendered in tests.
Object.assign(global, { TextDecoder, TextEncoder });
