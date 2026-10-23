import axios from 'axios'
import { message } from 'antd'

/** axios 实例：baseURL = /agent/api，请求自动带 token，401 跳登录 */
const http = axios.create({ baseURL: '/agent/api', timeout: 60_000 })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error.response?.status
    const detail = error.response?.data?.detail ?? '请求失败'
    if (typeof detail === 'string') message.error(detail)
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!location.pathname.endsWith('/login')) {
        location.href = '/agent/login'
      }
    }
    return Promise.reject(error)
  },
)

export default http
