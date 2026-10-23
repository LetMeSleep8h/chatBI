import http, { unwrap } from './http'
import type { RecordItem } from './records'
import { demoAssign, demoCreateTask, demoDeliver, demoDetail, demoListTasks, demoMode } from './demo'

export interface Task {
  id: number
  name: string
  station: string
  robotType: string
  targetCount: number
  collectedCount: number
  status: string
  assigneeId: number | null
  assigneeName: string | null
  createdBy: number
  createdAt: string
}

export interface TaskDetail {
  task: Task
  doneCount: number
  targetCount: number
  records: RecordItem[]
  operatorNames: Record<string, string>
}

export interface PlatformStats {
  ongoingTasks: number
  todayCollected: number
  pendingReview: number
  onlineStations: number
}

export function listTasks() {
  if (demoMode()) return demoListTasks()
  return unwrap<Task[]>(http.get('/tasks'))
}

export function createTask(body: {
  name: string
  station: string
  robotType: string
  targetCount: number
}) {
  if (demoMode()) return demoCreateTask(body)
  return unwrap<Task>(http.post('/tasks', body))
}

export function assignTask(id: number, operatorId: number) {
  if (demoMode()) return demoAssign(id, operatorId)
  return unwrap<Task>(http.patch(`/tasks/${id}/assign`, { operatorId }))
}

/** admin 交付：待质检 → 已交付 */
export function deliverTask(id: number) {
  if (demoMode()) return demoDeliver(id)
  return unwrap<Task>(http.patch(`/tasks/${id}/deliver`))
}

export function getTaskDetail(id: number) {
  if (demoMode()) return demoDetail(id)
  return unwrap<TaskDetail>(http.get(`/tasks/${id}`))
}

/** 顶部统计条 */
export function getStats(): Promise<PlatformStats> {
  if (demoMode()) return import('./demo').then((m) => m.demoStats())
  return unwrap<PlatformStats>(http.get('/stats'))
}
