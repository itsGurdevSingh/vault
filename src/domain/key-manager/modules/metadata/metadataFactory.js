import { MetadataService } from "./MetadataService";
import { MetadataFileStore } from "./metadataFileStore";
import { writeFile, readFile, unlink, readdir, mkdir } from "fs/promises";
import path from "path";

class MetadataFactory {

    constructor(pathService, fsOps = null) {
        this.pathService = pathService;
        this.fsOps = fsOps || {
            writeFile,
            readFile,
            unlink,
            readdir,
            mkdir,
            path
        };
    }

    create() {
        const store = new MetadataFileStore(this.pathService, this.fsOps);
        return new MetadataService(store);
    }

    static getInstance(pathService, fsOps = null) {
        if (!this._instance) {
            this._instance = new MetadataFactory(pathService, fsOps);
        }
        return this._instance;
    }
}

export { MetadataFactory };