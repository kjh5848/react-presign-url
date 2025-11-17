import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api/images';

const axiosJson = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const imageApi = {
  presign(fileName, contentType) {
    return axiosJson.post('/presigned', { fileName, contentType });
  },

  complete(key) {
    return axios.get(`${BASE_URL}/complete?key=${key}`);
  },

  list() {
    return axios.get(`${BASE_URL}/list`);
  },

  detail(id) {
    return axios.get(`${BASE_URL}/${id}`);
  },
};
