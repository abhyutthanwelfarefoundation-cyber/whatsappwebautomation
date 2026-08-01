const crypto = require('crypto');

/**
 * Verifies X-Hub-Signature-256 header sent by Meta on every webhook POST.
 * Requires req.rawBody to be captured (see server.js snippet for setup).
 */
function verifyMetaSignature(req, res, next) {
  const signature = req.get('X-Hub-Signature-256');

  if (!signature) {
    console.warn('[meta-webhook] Missing signature header');
    return res.sendStatus(401);
  }

  if (!req.rawBody) {
    console.error('[meta-webhook] req.rawBody not set — check express.json() verify option in server.js');
    return res.sendStatus(500);
  }

  const expectedHash = crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(req.rawBody)
    .digest('hex');

  const expectedSignature = `sha256=${expectedHash}`;

  const providedBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  const isValid =
    providedBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(providedBuf, expectedBuf);

  if (!isValid) {
    console.warn('[meta-webhook] Signature mismatch — possible spoofed request');
    return res.sendStatus(401);
  }

  next();
}

module.exports = verifyMetaSignature;