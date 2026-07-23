const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Fail fast if critical secrets are missing in non-dev environments.
const REQUIRED_IN_PRODUCTION = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL',
];

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',

  db: {
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true',
  },

  pub5Db: {
    server: process.env.PUB5_DB_SERVER,
    port: parseInt(process.env.PUB5_DB_PORT, 10) || 1433,
    database: process.env.PUB5_DB_NAME,
    user: process.env.PUB5_DB_USER,
    password: process.env.PUB5_DB_PASSWORD,
    encrypt: process.env.PUB5_DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.PUB5_DB_TRUST_SERVER_CERT === 'true',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiryDays: parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS, 10) || 7,
    refreshExpiryDaysRememberMe:
      parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS_REMEMBER_ME, 10) || 30,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    fromName: process.env.SMTP_FROM_NAME || 'Publisher Operations Portal',
    fromEmail: process.env.SMTP_FROM_EMAIL,
  },

  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  whatsapp: {
    baseUrl: process.env.WHATSAPP_BASE_URL || 'https://partnersv1.pinbot.ai/v3',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    apiKey: process.env.WHATSAPP_API_KEY,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  },

  uploads: {
    maxSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 25,
    dir: process.env.UPLOAD_DIR || './uploads',
  },

  rateLimit: {
    windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 300,
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10) || 10,
  },
};

function validateEnv() {
  if (env.nodeEnv === 'production') {
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables in production: ${missing.join(', ')}`
      );
    }
  }
}

module.exports = { env, validateEnv };
