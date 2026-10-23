import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Board from './pages/Board'
import Login from './pages/Login'
import TaskDetail from './pages/TaskDetail'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  const user = localStorage.getItem('user')
  if (!token || !user) return <Navigate to="/login" replace />
  return <>{children}</>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Board /></RequireAuth>} />
          <Route path="/tasks" element={<Navigate to="/" replace />} />
          <Route path="/tasks/:id" element={<RequireAuth><TaskDetail /></RequireAuth>} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  </StrictMode>,
)
