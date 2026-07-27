const http = require('http');
const { Server } = require('socket.io');
const { env, validateEnv } = require('./config/env');
const logger = require('./config/logger');
const { getPopPool, closeAllPools } = require('./config/db');
const app = require('./app');
const { initSockets } = require('./sockets');
const whatsappService = require('./services/whatsapp.service');
const { startScheduler } = require('./services/scheduledMessage.service');

async function start() {
  try {
    validateEnv();
    await getPopPool(); // fail fast if the DB is unreachable

    const server = http.createServer(app);

    const io = new Server(server, {
      cors: { origin: env.clientUrl, credentials: true },
    });
    initSockets(io);
    whatsappService.attachSocketServer(io);

    server.listen(env.port, () => {
      logger.info(`POP backend listening on port ${env.port} [${env.nodeEnv}]`);
    });
startScheduler();
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      server.close(async () => {
        await closeAllPools();
        process.exit(0);
      });
      // Force-exit if graceful shutdown hangs
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection', { reason });
    });
  } catch (err) {
    logger.error('Failed to start server', { err: err.message, stack: err.stack });
    process.exit(1);
  }
}

start();
