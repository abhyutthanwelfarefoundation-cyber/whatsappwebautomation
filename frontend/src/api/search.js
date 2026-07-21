import axiosClient from './axiosClient';

export async function globalSearch(query) {
  const { data } = await axiosClient.get('/search', { params: { query } });
  return data.data;
}
