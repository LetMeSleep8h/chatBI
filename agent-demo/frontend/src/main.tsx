import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Board from './pages/Board'
import Console from './pages/Console'
import Login from './pages/Login'
import TaskDetail from './pages/TaskDetail'
import './index.css'

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('token')
  const user = localStorage.getItem('user')
  // 未登录不发请求，直接引导到登录页
  if (!token || !user) return <Navigate to="/login" replace />
  return <>{children}</>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <BrowserRouter basename="/agent">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Board /></RequireAuth>} />
          <Route path="/tasks/:id" element={<RequireAuth><TaskDetail /></RequireAuth>} />
          <Route path="/console" element={<RequireAuth><Console /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  </StrictMode>,
)
