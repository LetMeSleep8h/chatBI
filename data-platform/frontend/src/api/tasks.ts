import http, { unwrap } from './http'
import type { RecordItem } from './records'

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
  return unwrap<Task[]>(http.get('/tasks'))
}

export function createTask(body: { name: string; station: string; targetCount: number }) {
  return unwrap<Task>(http.post('/tasks', body))
}

export function assignTask(id: number, operatorId: number) {
  return unwrap<Task>(http.patch(`/tasks/${id}/assign`, { operatorId }))
}

export function getTaskDetail(id: number) {
  return unwrap<TaskDetail>(http.get(`/tasks/${id}`))
}
