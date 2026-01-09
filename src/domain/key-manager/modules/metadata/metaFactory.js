import { MetadataService } from "./MetadataService";
import { MetaFileStore } from "./metaFileStore";

class MetadataFactory {

    constructor(pathsRepo) {
        this.pathsRepo = pathsRepo;
    }
    
    create() {
        const store = new MetaFileStore(this.pathsRepo);
        return new MetadataService(store);
    }

    static getInstance(pathsRepo) {
        if (!this._instance) {
            this._instance = new MetadataFactory(pathsRepo);
        }
        return this._instance;
    }
}

export { MetadataFactory };