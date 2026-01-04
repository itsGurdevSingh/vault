// export factory of loader components
// our factory returns KeyRegistry instances per domain

// export * from './loaderFactory.js'; // right way but we have to inject dependencies now

// export cache for janitor use
export * from './KeyCache.js';


// for now we have inject dipendiency from here later parent will inject directly 
import Cache from "../../../utils/cache";
import normalizeDomain from "../../../utils/normalizer.js";
import pathsRepo from "../../../infrastructure/filesystem/index.js";

import { LoaderFactory } from './loaderFactory.js';

// create singleton factory instance with dependencies injected
const loaderFactory = new LoaderFactory(Cache, pathsRepo, normalizeDomain);
export { loaderFactory };


