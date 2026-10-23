import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import '@ant-design/v5-patch-for-react-19'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import App from './App.jsx'
import Board from './pages/Board'
import Login from './pages/Login'
import TaskDetail from './pages/TaskDetail'
import './index.css'

function RequireAuth({ children }) {
  const token = localStorage.getItem('token')
  const user = localStorage.getItem('user')
  if (!token || !user) return <Navigate to="/login" replace />
  return children
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ConfigProvider locale={zhCN}>
            <BrowserRouter basename="/bi">
                <Routes>
                    {/* ChatBI 对话页保留为首页 */}
                    <Route path="/" element={<App />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/board" element={<RequireAuth><Board /></RequireAuth>} />
                    <Route path="/task/:id" element={<RequireAuth><TaskDetail /></RequireAuth>} />
                </Routes>
            </BrowserRouter>
        </ConfigProvider>
    </StrictMode>,
)
