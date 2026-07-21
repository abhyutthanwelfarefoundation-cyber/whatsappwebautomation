import axiosClient from './axiosClient';

export async function getDashboardStats() {
  const { data } = await axiosClient.get('/dashboard/stats');
  return data.data;
}