import { DomainSnapshot } from "./domainSnapshot";
import { DomainSnapshotBuilder } from "./domainSnapshotBuilder";

export class SnapshotFactory {
constructor({ keyStore, metadataStore, policyStore }) {
    this.keyStore = keyStore;
    this.metadataStore = metadataStore;
    this.policyStore = policyStore;
  }

  static getInstance ({keyStore, metadataStore, policyStore}){
    if(!this._instance){
        this._instance = new SnapshotFactory({keyStore, metadataStore, policyStore});
    }
    return this._instance;
  }

  create(){
    return new DomainSnapshotBuilder({ keyStore, metadataStore, policyStore, domainSnapshot: DomainSnapshot });
  }

}