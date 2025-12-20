import { Signer } from './Signer.js';
import { SignerCache } from './utils/cache.js';

// create one shared signer singleton configured with defaults
const defaultCache = new SignerCache();
export const signer = new Signer({
    cache: defaultCache,
    defaultTTL: 300,        // 5 minutes
    maxPayloadBytes: 4 * 1024, // 4KB
    logger: console          // replace with  logger instance later
});

export default signer;
