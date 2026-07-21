import axiosClient from './axiosClient';

export async function searchCustomers({ query = '', page = 1, pageSize = 20 }) {
  const { data } = await axiosClient.get('/customers', { params: { query, page, pageSize } });
  return data.data;
}

export async function getCustomerProfile(customerId) {
  const { data } = await axiosClient.get(`/customers/${customerId}`);
  return data.data;
}

export async function importCustomers(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await axiosClient.post('/customers/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
} 