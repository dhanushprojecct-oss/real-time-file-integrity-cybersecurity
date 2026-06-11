import axios from 'axios'

const getBackendUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // If running locally, Vite proxy handles '/api' -> port 5000.
  // Otherwise (e.g. frontend deployed to Vercel but backend local), connect directly to localhost:5000.
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return ''
  }
  return 'http://localhost:5000'
}

const api = axios.create({
  baseURL: getBackendUrl() ? `${getBackendUrl()}/api` : '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor — redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    
    // Normalize response error object to a string to prevent React rendering crashes
    if (error.response?.data?.error && typeof error.response.data.error === 'object') {
      error.response.data.error = 
        error.response.data.error.message || 
        error.response.data.error.code || 
        JSON.stringify(error.response.data.error)
    }
    
    return Promise.reject(error)
  }
)

export default api

