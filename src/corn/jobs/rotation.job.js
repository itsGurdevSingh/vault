export function createRotationJob({ rotationService }) {
  return async function rotationJob() {
    // This method already handles:
    // - distributed locks
    // - skip logic
    // - retries
    await rotationService.runScheduled();
  };
}
