import { KeyStoreAdapter } from "./keyStoreAdapter";
import { fileSystem } from "../filesystem/index.js";


const keyStoreAdapter = new KeyStoreAdapter(fileSystem.keyStore);

export { keyStoreAdapter };