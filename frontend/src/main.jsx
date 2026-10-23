import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import '@ant-design/v5-patch-for-react-19'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App.jsx'
import Board from './pages/Board'
import Login from './pages/Login'
import TaskDetail from './pages/TaskDetail'
import './index.css'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ConfigProvider locale={zhCN}>
            <BrowserRouter basename="/bi">
                <Routes>
                    {/* ChatBI 对话页保留为首页 */}
                    <Route path="/" element={<App />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/board" element={<Board />} />
                    <Route path="/task/:id" element={<TaskDetail />} />
                </Routes>
            </BrowserRouter>
        </ConfigProvider>
    </StrictMode>,
)
