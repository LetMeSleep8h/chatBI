import http, { unwrap } from './http'
import type { RecordItem } from './records'
import { demoAssign, demoCreateTask, demoDetail, demoListTasks, demoMode } from './demo'

export interface Task {
  id: number
  name: string
  station: string
  targetCount: number
  status: string
  assigneeId: number | null
  createdBy: number
  createdAt: string
}

export interface TaskDetail {
  task: Task
  doneCount: number
  targetCount: number
  records: RecordItem[]
}

export function listTasks() {
  if (demoMode()) return demoListTasks()
  return unwrap<Task[]>(http.get('/tasks'))
}

export function createTask(body: { name: string; station: string; targetCount: number }) {
  if (demoMode()) return demoCreateTask(body)
  return unwrap<Task>(http.post('/tasks', body))
}

export function assignTask(id: number, operatorId: number) {
  if (demoMode()) return demoAssign(id, operatorId)
  return unwrap<Task>(http.patch(`/tasks/${id}/assign`, { operatorId }))
}

export function getTaskDetail(id: number) {
  if (demoMode()) return demoDetail(id)
  return unwrap<TaskDetail>(http.get(`/tasks/${id}`))
}
