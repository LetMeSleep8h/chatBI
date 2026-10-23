import http, { unwrap } from './http'

export interface LoginResp {
  token: string
  name: string
  role: 'operator' | 'reviewer' | 'admin'
}

export function login(name: string, password: string) {
  return unwrap<LoginResp>(http.post('/auth/login', { name, password }))
}
