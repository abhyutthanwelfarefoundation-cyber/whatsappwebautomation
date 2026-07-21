const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const { generalLimiter } = require('./middleware/rateLimiter.middleware');
const { errorMiddleware, notFoundMiddleware } = require('./middleware/error.middleware');
const { env } = require('./config/env');
const logger = require('./config/logger');

const app = express();

app.set('trust proxy', 1); // needed for correct req.ip behind Nginx

app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, res, next) => {
  // Meta's webhook calls (and its automatic retries on failure/timeout)
  // shouldn't be subject to the same rate limit as browser-driven API
  // traffic - throttling them could cause Meta to silently give up
  // retrying a delivery/read status update.
  if (req.path === '/api/whatsapp/webhook') return next();
  return generalLimiter(req, res, next);
});

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, { ip: req.ip });
  next();
});

app.use('/api', routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
