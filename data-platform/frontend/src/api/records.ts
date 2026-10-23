import http, { unwrap } from './http'

export interface RecordItem {
  id: number
  taskId: number
  operatorId: number
  filePath: string
  metaJson: string | null
  status: string
  reviewComment: string | null
  reviewedBy: number | null
  reviewedAt: string | null
  fileName: string
}

export function listRecords(status?: string) {
  return unwrap<RecordItem[]>(http.get('/records', { params: { status } }))
}

export function reviewRecord(id: number, result: '通过' | '打回', comment?: string) {
  return unwrap<RecordItem>(http.patch(`/records/${id}/review`, { result, comment }))
}

export function uploadRecord(
  taskId: number,
  file: File,
  meta: { station: string; collectedAt: string; remark?: string },
  onProgress: (percent: number) => void,
) {
  const form = new FormData()
  form.append('taskId', String(taskId))
  form.append('file', file)
  form.append('meta', JSON.stringify(meta))
  return unwrap<RecordItem>(
    http.post('/records', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    }),
  )
}
