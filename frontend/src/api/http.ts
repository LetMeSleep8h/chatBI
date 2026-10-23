import axios from 'axios'
import { message } from 'antd'

/** 统一返回体（对齐后端 Result：{code, message, data}） */
export interface ApiResult<T> {
  code: number
  message: string
  data: T
}

const http = axios.create({ baseURL: '/bi', timeout: 60_000 })

// 请求拦截器：统一带 token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：401 跳登录；错误统一弹后端 message
http.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error.response?.status
    const msg = error.response?.data?.message ?? '请求失败'
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (location.pathname !== '/login') {
        location.href = '/login'
      }
    }
    message.error(msg)
    return Promise.reject(error)
  },
)

/** 解包 Result：code!==0 视为业务失败并抛错 */
export async function unwrap<T>(promise: Promise<{ data: ApiResult<T> }>): Promise<T> {
  const resp = await promise
  if (resp.data.code !== 0) {
    message.error(resp.data.message)
    throw new Error(resp.data.message)
  }
  return resp.data.data
}

export default http
