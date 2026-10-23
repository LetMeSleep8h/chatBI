import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import '@ant-design/v5-patch-for-react-19'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Board from './pages/Board'
import Devices from './pages/Devices'
import Login from './pages/Login'
import TaskDetail from './pages/TaskDetail'
import Upload from './pages/Upload'
import './index.css'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ConfigProvider locale={zhCN}>
            <BrowserRouter basename="/bi">
                <Routes>
                    {/* 登录后主页 = 采集任务看板（游客以演示数据浏览） */}
                    <Route path="/" element={<Board />} />
                    <Route path="/board" element={<Navigate to="/" replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/task/:id" element={<TaskDetail />} />
                    <Route path="/upload" element={<Upload />} />
                    <Route path="/device-status" element={<Devices />} />
                </Routes>
            </BrowserRouter>
        </ConfigProvider>
    </StrictMode>,
)
