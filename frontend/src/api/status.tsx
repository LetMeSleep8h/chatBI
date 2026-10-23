import { Tag } from 'antd'
import type { ReactNode } from 'react'

/** 统一状态标签：中文 + 颜色（待质检=橙，通过=绿，被打回=红） */
const STATUS_COLORS: Record<string, string> = {
  待质检: 'orange',
  通过: 'green',
  被打回: 'red',
  已重传: 'default',
  待分配: 'default',
  采集中: 'blue',
  已完成: 'green',
}

export function StatusTag({ status }: { status: string }): ReactNode {
  return <Tag color={STATUS_COLORS[status] ?? 'default'}>{status}</Tag>
}

export function currentUser() {
  const raw = localStorage.getItem('user')
  if (raw) return JSON.parse(raw) as { name: string; role: string }
  // 未登录 → 游客模式（演示数据，管理端视角）
  return { name: '游客（演示数据）', role: 'reviewer' }
}
