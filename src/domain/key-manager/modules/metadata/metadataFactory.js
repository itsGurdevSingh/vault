import { Metadata } from "./Metadata.js";
import { MetadataBuilder } from "./metadataBuilder.js";
import { isExpired } from "./utils.js";

class MetadataFactory {

    constructor({ metadataStore }) {
        this.metadataStore = metadataStore;
    }

    create() {
        return new Metadata(this.metadataStore, MetadataBuilder, isExpired);
    }

    static getInstance({ metadataStore }) {
        if (!this._instance) {
            this._instance = new MetadataFactory({ metadataStore });
        }
        return this._instance;
    }
}

export { MetadataFactory };