import http from './http'

export interface Task {
  id: number
  name: string
  station: string
  robot_type: string
  target_count: number
  collected_count: number
  status: string
  assignee_id: number | null
  assignee_name: string | null
  created_at: string
}

export interface RecordItem {
  id: number
  task_id: number
  operator_id: number
  operator_name: string
  data_type: string
  status: string
  review_comment: string | null
  reviewed_at: string | null
  created_at: string
  file_name: string
  meta_json: string | null
}

export interface TaskDetail {
  task: Task
  progress: { collected: number; target: number }
  records: RecordItem[]
}

export interface PlatformStats {
  ongoing_tasks: number
  today_collected: number
  pending_review: number
  online_stations: number
}

export interface CurrentUser {
  id: number
  name: string
  role: 'admin' | 'operator' | 'reviewer'
}

export async function login(name: string, password: string) {
  const resp = await http.post<{ token: string; name: string; role: string }>('/auth/login', {
    name,
    password,
  })
  return resp.data
}

export async function me() {
  return (await http.get<CurrentUser>('/auth/me')).data
}

export async function listTasks() {
  return (await http.get<Task[]>('/tasks')).data
}

export async function createTask(body: {
  name: string
  station: string
  robot_type: string
  target_count: number
}) {
  return (await http.post<Task>('/tasks', body)).data
}

export async function assignTask(id: number, operatorId: number) {
  return (await http.patch<Task>(`/tasks/${id}/assign`, { operator_id: operatorId })).data
}

export async function getTaskDetail(id: number) {
  return (await http.get<TaskDetail>(`/tasks/${id}`)).data
}

export async function getStats() {
  return (await http.get<PlatformStats>('/stats')).data
}

export async function listRecords(taskId?: number) {
  return (await http.get<RecordItem[]>('/records', { params: { task_id: taskId } })).data
}

export async function reviewRecord(id: number, result: '通过' | '打回', comment?: string) {
  return (await http.patch<RecordItem>(`/records/${id}/review`, { result, comment })).data
}

export function downloadUrl(id: number) {
  return `/agent/api/records/${id}/download`
}

export async function uploadRecord(
  taskId: number,
  file: File,
  body: { dataType: string; station: string; collectedAt: string; remark?: string },
  onProgress?: (percent: number) => void,
) {
  const form = new FormData()
  form.append('task_id', String(taskId))
  form.append('file', file)
  form.append('data_type', body.dataType)
  form.append('meta', JSON.stringify({ station: body.station, collected_at: body.collectedAt, remark: body.remark }))
  return (
    await http.post<RecordItem>('/records', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })
  ).data
}
