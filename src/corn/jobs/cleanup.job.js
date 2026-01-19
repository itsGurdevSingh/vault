export function createCleanupJob({ janitorService }) {
  return async function cleanupJob() {
    await janitorService.cleanupExpiredKeys();
  };
}
