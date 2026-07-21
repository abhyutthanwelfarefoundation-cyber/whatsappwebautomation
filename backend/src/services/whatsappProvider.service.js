/**
 * ADAPTER LAYER for PromoMessages' "SMARTPING Partners API" (their WhatsApp
 * BSP platform, running on pinbot.ai infrastructure).
 *
 * Confirmed from their official API documentation:
 * - Base URL: https://partnersv1.pinbot.ai/v3/{phoneNumberId}/...
 * - Auth: header "apikey: <your key>" (NOT an Authorization Bearer token)
 * - Message body shape matches Meta's Cloud API format closely, so most of
 *   the payload-building logic below is unchanged from a raw-Meta setup.
 *
 * This is the ONLY file that talks to the network for sending messages.
 * Everything upstream (whatsapp.service.js, controllers, sockets, frontend)
 * is unaffected by this provider swap.
 */
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { env } = require('../config/env');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

function client() {
  if (!env.whatsapp.apiKey || !env.whatsapp.phoneNumberId) {
    throw ApiError.internal(
      'WhatsApp is not configured yet - set WHATSAPP_API_KEY and WHATSAPP_PHONE_NUMBER_ID in .env'
    );
  }
  return axios.create({
    baseURL: `${env.whatsapp.baseUrl}/${env.whatsapp.phoneNumberId}`,
    headers: {
      apikey: env.whatsapp.apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
}

function extractErrorMessage(err) {
  const data = err.response?.data;
  return data?.error?.message || data?.message || err.message || 'Failed to send WhatsApp message';
}

async function callApi(path, payload, extraConfig = {}) {
  try {
    const { data } = await client().post(path, payload, extraConfig);
    // Response shape (per docs): { messaging_product, contacts: [...], messages: [{ id }] }
    return { whatsAppMessageId: data.messages?.[0]?.id, raw: data };
  } catch (err) {
    logger.error('WhatsApp API call failed', { path, error: extractErrorMessage(err) });
    throw ApiError.badRequest(extractErrorMessage(err), err.response?.data || null);
  }
}

async function sendText(toMobile, text) {
  return callApi('/messages', {
    messaging_product: 'whatsapp',
    preview_url: false,
    recipient_type: 'individual',
    to: normalizeNumber(toMobile),
    type: 'text',
    text: { body: text },
  });
}

async function sendMediaByLink(toMobile, mediaType, link, filename, caption) {
  const mediaPayload = { link };
  if (mediaType === 'document') mediaPayload.filename = filename;
  if (caption) mediaPayload.caption = caption;

  return callApi('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizeNumber(toMobile),
    type: mediaType,
    [mediaType]: mediaPayload,
  });
}

async function uploadMedia(filePath, mimeType) {
  const form = new FormData();
  form.append('sheet', fs.createReadStream(filePath), { contentType: mimeType });

  try {
    const { data } = await client().post('/media', form, {
      headers: { ...form.getHeaders(), apikey: env.whatsapp.apiKey },
    });
    const mediaId = data?.response?.id;
    if (!mediaId) throw new Error('No media id returned in upload response');
    return mediaId;
  } catch (err) {
    logger.error('WhatsApp media upload failed', { error: extractErrorMessage(err) });
    throw ApiError.badRequest(extractErrorMessage(err), err.response?.data || null);
  }
}

async function sendMediaById(toMobile, mediaType, mediaId, filename, caption) {
  const mediaPayload = { id: mediaId };
  if (mediaType === 'document') mediaPayload.filename = filename;
  if (caption) mediaPayload.caption = caption;

  return callApi('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizeNumber(toMobile),
    type: mediaType,
    [mediaType]: mediaPayload,
  });
}

async function sendTemplate(toMobile, templateName, languageCode, components) {
  return callApi('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizeNumber(toMobile),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode || 'en' },
      components: components || [],
    },
  });
}

function normalizeNumber(mobile) {
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

module.exports = {
  sendText,
  sendMediaByLink,
  uploadMedia,
  sendMediaById,
  sendTemplate,
  normalizeNumber,
};