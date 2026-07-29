import axiosClient from './axiosClient';

export async function listOrders(filters = {}) {
  const { data } = await axiosClient.get('/orders', { params: filters });
  return data.data;
}

export async function getOrderDetail(orderId) {
  const { data } = await axiosClient.get(`/orders/${orderId}`);
  return data.data;
}

export async function updateOrderStatus(orderId, payload) {
  const { data } = await axiosClient.patch(`/orders/${orderId}/status`, payload);
  return data.data;
}

export async function importOrders(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await axiosClient.post('/orders/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data.data;
}

export async function createOrder(payload) {
  const { data } = await axiosClient.post('/orders', payload);
  return data.data;
}