// Единый HTTP-клиент для общения с backend API.
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
})

// К каждому запросу добавляем JWT-токен из localStorage, если он есть.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
