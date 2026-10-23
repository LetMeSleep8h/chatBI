import { Tag } from 'antd'
import type { ReactNode } from 'react'

/** 统一状态标签：中文 + 颜色（待质检=橙，通过=绿，被打回=红） */
const STATUS_COLORS: Record<string, string> = {
  待分配: 'default',
  采集中: 'blue',
  待质检: 'orange',
  已交付: 'green',
  通过: 'green',
  被打回: 'red',
  已重传: 'default',
  在线: 'green',
  离线: 'default',
  故障: 'red',
}

export function StatusTag({ status }: { status: string }): ReactNode {
  return <Tag color={STATUS_COLORS[status] ?? 'default'}>{status}</Tag>
}
