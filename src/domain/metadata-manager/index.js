import { MetadataService } from "./MetadataService.js";
import { MetaFileStore } from "./metaFileStore.js";
import { pathsRepo } from "../../infrastructure/filesystem/index.js";

const store = new MetaFileStore(pathsRepo);

export const metadataManager = new MetadataService(store);
