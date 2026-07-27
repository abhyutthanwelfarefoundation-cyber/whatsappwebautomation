import axiosClient from './axiosClient';
export async function scheduleMessage(payload) {
  const { data } = await axiosClient.post('/scheduled-messages', payload);
  return data.data;
}
export async function listScheduledMessages(customerId) {
  const { data } = await axiosClient.get('/scheduled-messages', { params: customerId ? { customerId } : {} });
  return data.data;
}
export async function cancelScheduledMessage(id) {
  const { data } = await axiosClient.delete(`/scheduled-messages/${id}`);
  return data.data;
}