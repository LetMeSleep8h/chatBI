import http, { unwrap } from './http'
import { demoListRecords, demoMode, demoReview, demoUpload } from './demo'

export interface RecordItem {
  id: number
  taskId: number
  operatorId: number
  dataUrl: string
  dataType: string
  metaJson: string | null
  status: string
  reviewComment: string | null
  reviewedBy: number | null
  reviewedAt: string | null
  createdAt: string
  fileName: string
}

/** 文件下载地址（后端校验权限后流式返回） */
export function downloadUrl(id: number) {
  return `/bi/records/${id}/download`
}

export function listRecords(status?: string) {
  if (demoMode()) return demoListRecords(status)
  return unwrap<RecordItem[]>(http.get('/records', { params: { status } }))
}

export function reviewRecord(id: number, result: '通过' | '打回', comment?: string) {
  if (demoMode()) return demoReview(id, result, comment)
  return unwrap<RecordItem>(http.patch(`/records/${id}/review`, { result, comment }))
}

export function uploadRecord(
  taskId: number,
  file: File,
  body: { dataType: string; station: string; collectedAt: string; remark?: string },
  onProgress?: (percent: number) => void,
) {
  if (demoMode()) return demoUpload(taskId, file, body)
  const form = new FormData()
  form.append('taskId', String(taskId))
  form.append('file', file)
  form.append('dataType', body.dataType)
  form.append('meta', JSON.stringify({ station: body.station, collectedAt: body.collectedAt, remark: body.remark }))
  return unwrap<RecordItem>(
    http.post('/records', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    }),
  )
}
