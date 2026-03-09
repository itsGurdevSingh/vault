// Handles graceful shutdown
export function shutdown(grpcServer, httpServer, scheduler) {
    console.log('Shutting down Vault...');

    // Stop cron jobs first
    if (scheduler) {
        scheduler.stop();
    }

    let pending = 2;
    const done = () => {
        pending -= 1;
        if (pending === 0) process.exit(0);
    };
    grpcServer.tryShutdown(done);
    httpServer.close(done);
}
