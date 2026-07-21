import axiosClient from './axiosClient';

export async function listConversations(params = {}) {
  const { data } = await axiosClient.get('/whatsapp/conversations', { params });
  return data.data;
}

export async function getThread(customerId, params = {}) {
  const { data } = await axiosClient.get(`/whatsapp/conversations/${customerId}`, { params });
  return data.data;
}

export async function markRead(customerId) {
  await axiosClient.post(`/whatsapp/conversations/${customerId}/read`);
}

export async function sendMessage(payload) {
  const { data } = await axiosClient.post('/whatsapp/messages', payload);
  return data.data;
}

export async function deleteMessage(messageId) {
  const { data } = await axiosClient.delete(`/whatsapp/messages/${messageId}`);
  return data.data;
}

export async function retryMessage(messageId) {
  const { data } = await axiosClient.post(`/whatsapp/messages/${messageId}/retry`);
  return data.data;
}

export async function sendInvoiceTemplate({ customerId, attachmentId, invoiceReference }) {
  const { data } = await axiosClient.post('/whatsapp/messages/template/invoice', {
    customerId,
    attachmentId,
    invoiceReference,
  });
  return data.data;
}

export async function uploadAttachment(file, { orderId, fileType } = {}) {
  const form = new FormData();
  form.append('file', file);
  if (orderId) form.append('orderId', orderId);
  if (fileType) form.append('fileType', fileType);
  const { data } = await axiosClient.post('/whatsapp/attachments', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export function attachmentDownloadUrl(attachmentId) {
  const base = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api');
  return `${base}/whatsapp/attachments/${attachmentId}/download`;
}

/**
 * Attachments are served through an authenticated endpoint, so a plain
 * <img src="..."> or <a href="..."> can't include the Bearer token. Fetch
 * as a blob instead and hand back an object URL the browser can render/download.
 * Caller is responsible for revoking the URL (URL.revokeObjectURL) when done.
 */
export async function fetchAttachmentBlobUrl(attachmentId) {
  const { data } = await axiosClient.get(`/whatsapp/attachments/${attachmentId}/download`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(data);
}