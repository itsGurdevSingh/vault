import { FileSystemKeyStore } from './keyStore/FileSystemKeyStore.js';
import { MetadataFileStore } from './metadataStore/MetadataFileStore.js';
import { pathService } from './pathService.js';
import { FsUtils } from './fileUtils.js';

const fileUtils = new FsUtils();

const fileSystem = {
    keyStore: new FileSystemKeyStore({ pathResolver: pathService, FsUtils: fileUtils }),
    metaStore: new MetadataFileStore({ metaPaths: pathService, FsUtils: fileUtils })
};

export default fileSystem;
