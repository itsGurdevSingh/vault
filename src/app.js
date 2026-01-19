import { startGrpcServer } from "./transport/grpc/server/server.js";
import { startHttpServer } from "./transport/http/server.js";

import { createKeyManager } from "./domain/key-manager/index.js";
import { JwksService, SignerService, RotationService, JanitorService } from "./application/services/index.js";

import { startCron } from "./corn/index.js";

import { connectDB } from "./infrastructure/db/index.js";

async function bootstrap() {
  try {

    /* ---------- Infrastructure ---------- */
    // connect to database
    await connectDB();

    /* ---------- Domain ---------- */
    const keyManager = await createKeyManager();

    // intilize test postman api
    keyManager.initialSetup("user");
    keyManager.initialSetup("service");


    /* ---------- Application ---------- */
        // transport services
    const jwksService = new JwksService({ keyManager });
    const signerService = new SignerService({ keyManager });
        // cron services
    const rotationService = new RotationService({ keyManager });
    const janitorService = new JanitorService({ keyManager });

    /* ---------- Start Corn ---------- */
    startCron({ rotationService, janitorService, logger: console });

    /* ---------- gRPC (private, mTLS) ---------- */
    const { server: grpcServer, port: grpcPort } =
      await startGrpcServer({
        certDir: "certs",
        port: 50051,
        services: { jwksService, signerService }
      });

    console.log(`Vault gRPC listening on :${grpcPort}`);

    /* ---------- HTTP (public JWKS) ---------- */
    const httpServer = startHttpServer({
      jwksService,
      port: 3000
    });

    /* ---------- Shutdown handling ---------- */
    process.on("SIGTERM", () => shutdown(grpcServer, httpServer));
    process.on("SIGINT", () => shutdown(grpcServer, httpServer));
  } catch (err) {
    console.error("Failed to start Vault", err);
    process.exit(1);
  }
}

function shutdown(grpcServer, httpServer) {
  console.log("Shutting down Vault...");

  let pending = 2;

  const done = () => {
    pending -= 1;
    if (pending === 0) process.exit(0);
  };

  grpcServer.tryShutdown(done);
  httpServer.close(done);
}

bootstrap();



/*
  NOTES:
  what to do next 
   everything is working till now . 
   we have to add corn jobs config with deeloper upper and lower bound 
   while initial setup we should pass interval time for roatation for initial policy build 
   
   above are our main priorties 
   then we will make admin apis for rotation (all and single)
   and for config setup (view and update bteween dev constraints)

   then we add tests

   then we add logging and monitoring

   then we documantize our work
*/