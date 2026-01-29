import { KeyStoreAdapter } from "./keyStoreAdapter";
import { MetadataStoreAdapter } from "./metadataStoreAdapter.js";
import { fileSystem } from "../filesystem/index.js";


const keyStoreAdapter = new KeyStoreAdapter(fileSystem.keyStore);
const metadataStoreAdapter = new MetadataStoreAdapter(fileSystem.metaStore);

export { metadataStoreAdapter };
export { keyStoreAdapter };