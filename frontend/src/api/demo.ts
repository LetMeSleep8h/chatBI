import type { RecordItem } from './records'
import type { Task, TaskDetail } from './tasks'

/**
 * 游客演示模式：未登录（无 token）时不调后端，用这份内存数据渲染，
 * 建任务/分配/审核/上传都在内存里模拟，刷新即重置。
 */

let seq = 100

const demoTasks: Task[] = [
  { id: 1, name: '车间A环境数据采集', station: 'A-01', targetCount: 4, status: '采集中', assigneeId: 2, createdBy: 1, createdAt: '2026-10-23 10:00:00' },
  { id: 2, name: '车间B设备巡检拍照', station: 'B-02', targetCount: 6, status: '待分配', assigneeId: null, createdBy: 1, createdAt: '2026-10-23 11:00:00' },
  { id: 3, name: '仓库温湿度记录', station: 'C-01', targetCount: 3, status: '已完成', assigneeId: 2, createdBy: 1, createdAt: '2026-10-22 09:00:00' },
]

const demoRecords: RecordItem[] = [
  { id: 1, taskId: 1, operatorId: 2, filePath: '/demo/a1.csv', metaJson: '{"station":"A-01","collectedAt":"2026-10-23 10:30:00","remark":"首批样本"}', status: '待质检', reviewComment: null, reviewedBy: null, reviewedAt: null, fileName: 'a1.csv' },
  { id: 2, taskId: 1, operatorId: 2, filePath: '/demo/a2.csv', metaJson: '{"station":"A-01","collectedAt":"2026-10-23 11:00:00"}', status: '通过', reviewComment: null, reviewedBy: 1, reviewedAt: '2026-10-23 12:00:00', fileName: 'a2.csv' },
  { id: 3, taskId: 1, operatorId: 2, filePath: '/demo/a3.csv', metaJson: '{"station":"A-01","collectedAt":"2026-10-23 11:40:00"}', status: '被打回', reviewComment: '时间戳缺失，请重新采集', reviewedBy: 1, reviewedAt: '2026-10-23 12:10:00', fileName: 'a3.csv' },
  { id: 4, taskId: 3, operatorId: 2, filePath: '/demo/c1.csv', metaJson: '{"station":"C-01"}', status: '通过', reviewComment: null, reviewedBy: 1, reviewedAt: '2026-10-22 15:00:00', fileName: 'c1.csv' },
]

export const demoMode = () => !localStorage.getItem('token')

export const delay = () => new Promise((r) => setTimeout(r, 200))

export async function demoListTasks(): Promise<Task[]> {
  await delay()
  return [...demoTasks]
}

export async function demoCreateTask(body: { name: string; station: string; targetCount: number }): Promise<Task> {
  await delay()
  const t: Task = { id: ++seq, status: '待分配', assigneeId: null, createdBy: 1, createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '), ...body }
  demoTasks.unshift(t)
  return t
}

export async function demoAssign(id: number, operatorId: number): Promise<Task> {
  await delay()
  const t = demoTasks.find((x) => x.id === id)!
  t.status = '采集中'
  t.assigneeId = operatorId
  return t
}

export async function demoDetail(id: number): Promise<TaskDetail> {
  await delay()
  const task = demoTasks.find((x) => x.id === id)!
  const records = demoRecords.filter((r) => r.taskId === id)
  return {
    task,
    doneCount: records.filter((r) => r.status === '通过').length,
    targetCount: task.targetCount,
    records,
  }
}

export async function demoListRecords(status?: string): Promise<RecordItem[]> {
  await delay()
  return status ? demoRecords.filter((r) => r.status === status) : [...demoRecords]
}

export async function demoReview(id: number, result: '通过' | '打回', comment?: string): Promise<RecordItem> {
  await delay()
  const r = demoRecords.find((x) => x.id === id)!
  r.status = result === '通过' ? '通过' : '被打回'
  r.reviewComment = result === '打回' ? comment! : null
  r.reviewedBy = 1
  r.reviewedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  // 通过数达标 → 任务自动完成（模拟后端状态机）
  if (result === '通过') {
    const t = demoTasks.find((x) => x.id === r.taskId)!
    const passed = demoRecords.filter((x) => x.taskId === t.id && x.status === '通过').length
    if (passed >= t.targetCount) t.status = '已完成'
  }
  return r
}

export async function demoUpload(taskId: number, file: File, meta: { station: string; collectedAt: string; remark?: string }): Promise<RecordItem> {
  await delay()
  // 被打回的旧记录改为已重传（模拟审计链）
  demoRecords.filter((r) => r.taskId === taskId && r.status === '被打回').forEach((r) => { r.status = '已重传' })
  const r: RecordItem = {
    id: ++seq, taskId, operatorId: 2, filePath: `/demo/${file.name}`,
    metaJson: JSON.stringify(meta), status: '待质检', reviewComment: null,
    reviewedBy: null, reviewedAt: null, fileName: file.name,
  }
  demoRecords.unshift(r)
  return r
}
