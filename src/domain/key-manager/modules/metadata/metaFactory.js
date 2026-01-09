import { MetadataService } from "./MetadataService";
import { MetaFileStore } from "./metaFileStore";
import { writeFile, readFile, unlink, readdir, mkdir } from "fs/promises";
import path from "path";

class MetadataFactory {

    constructor(pathsRepo, fsOps = null) {
        this.pathsRepo = pathsRepo;
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
        const store = new MetaFileStore(this.pathsRepo, this.fsOps);
        return new MetadataService(store);
    }

    static getInstance(pathsRepo, fsOps = null) {
        if (!this._instance) {
            this._instance = new MetadataFactory(pathsRepo, fsOps);
        }
        return this._instance;
    }
}

export { MetadataFactory };