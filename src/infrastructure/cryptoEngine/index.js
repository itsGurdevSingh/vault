import crypto from 'node:crypto';
import { EngineFactory } from './engineFactory.js';

// Create a single factory instance and a single engine instance
const factory = EngineFactory.getInstance(crypto);
const cryptoEngine = factory.create();

// Public exposure: export the configured engine instance
export { cryptoEngine };

