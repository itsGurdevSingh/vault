class FsUtils {
    async safeUnlink(path) {
        try {
            await unlink(path);
            console.log('File deleted:', path);
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log('File did not exist (already deleted):', path);
                // ← this is usually what you want — treat as success
                return;
            }

            // Other real errors (permission denied, etc.)
            console.error('Error deleting file:', err);
        }
    }

    async ensureDir(path) {
        try {
          await mkdir(path, {
            recursive: true
          });
        } catch (err) {
          throw new Error(`Failed to ensure directory at ${path}: ${err.message}`);
        }
      }

}