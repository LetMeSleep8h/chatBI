import type { DeviceItem } from './devices'
import type { RecordItem } from './records'
import type { PlatformStats, Task, TaskDetail } from './tasks'

/**
 * 游客演示模式：未登录（无 token）时不调后端，用这份内存数据渲染，
 * 建任务/分配/交付/审核/上传都在内存里模拟，刷新即重置。
 */

let seq = 100

const demoTasks: Task[] = [
  { id: 1, name: '车间A抓取动作演示采集', station: 'A-01', robotType: 'UR5e', targetCount: 4, collectedCount: 3, status: '采集中', assigneeId: 2, assigneeName: 'operator1', createdBy: 1, createdAt: '2026-10-23 10:00:00' },
  { id: 2, name: '车间B双臂协作数据集', station: 'B-02', robotType: 'xArm7', targetCount: 6, collectedCount: 0, status: '待分配', assigneeId: null, assigneeName: null, createdBy: 1, createdAt: '2026-10-23 11:00:00' },
  { id: 3, name: '开瓶盖技能触觉数据', station: 'C-01', robotType: '自研R1', targetCount: 3, collectedCount: 3, status: '待质检', assigneeId: 2, assigneeName: 'operator1', createdBy: 1, createdAt: '2026-10-22 09:00:00' },
  { id: 4, name: '叠毛巾动作轨迹集', station: 'A-02', robotType: 'UR5e', targetCount: 5, collectedCount: 5, status: '已交付', assigneeId: 2, assigneeName: 'operator1', createdBy: 1, createdAt: '2026-10-21 14:00:00' },
]

const demoRecords: RecordItem[] = [
  { id: 1, taskId: 1, operatorId: 2, dataUrl: '/demo/a1.mp4', dataType: '视频', metaJson: '{"station":"A-01","collectedAt":"2026-10-23 10:30:00","remark":"首批样本"}', status: '待质检', reviewComment: null, reviewedBy: null, reviewedAt: null, createdAt: '2026-10-23 10:30:00', fileName: 'a1.mp4' },
  { id: 2, taskId: 1, operatorId: 2, dataUrl: '/demo/a2.csv', dataType: '关节角度', metaJson: '{"station":"A-01","collectedAt":"2026-10-23 11:00:00"}', status: '通过', reviewComment: null, reviewedBy: 1, reviewedAt: '2026-10-23 12:00:00', createdAt: '2026-10-23 11:00:00', fileName: 'a2.csv' },
  { id: 3, taskId: 1, operatorId: 2, dataUrl: '/demo/a3.bin', dataType: '触觉', metaJson: '{"station":"A-01","collectedAt":"2026-10-23 11:40:00"}', status: '被打回', reviewComment: '触觉序列时间戳缺失，请重新采集', reviewedBy: 1, reviewedAt: '2026-10-23 12:10:00', createdAt: '2026-10-23 11:40:00', fileName: 'a3.bin' },
  { id: 4, taskId: 3, operatorId: 2, dataUrl: '/demo/c1.h5', dataType: '触觉', metaJson: '{"station":"C-01"}', status: '通过', reviewComment: null, reviewedBy: 1, reviewedAt: '2026-10-22 15:00:00', createdAt: '2026-10-22 14:00:00', fileName: 'c1.h5' },
]

const demoDeviceList: DeviceItem[] = [
  { id: 1, station: 'A-01', deviceType: 'UR5e 机械臂', status: '在线', lastHeartbeat: '2026-10-23 16:00:00' },
  { id: 2, station: 'A-02', deviceType: 'UR5e 机械臂', status: '在线', lastHeartbeat: '2026-10-23 16:00:00' },
  { id: 3, station: 'B-01', deviceType: 'xArm7 机械臂', status: '故障', lastHeartbeat: '2026-10-23 15:25:00' },
  { id: 4, station: 'B-02', deviceType: 'RealSense D435i', status: '在线', lastHeartbeat: '2026-10-23 15:59:00' },
  { id: 5, station: 'C-01', deviceType: '触觉传感阵列', status: '离线', lastHeartbeat: '2026-10-23 10:00:00' },
  { id: 6, station: 'C-02', deviceType: '关节角度采集器', status: '在线', lastHeartbeat: '2026-10-23 15:58:00' },
]

export const demoMode = () => !localStorage.getItem('token')

export const delay = () => new Promise((r) => setTimeout(r, 200))

export async function demoStats(): Promise<PlatformStats> {
  await delay()
  return {
    ongoingTasks: demoTasks.filter((t) => t.status === '采集中' || t.status === '待质检').length,
    todayCollected: 42,
    pendingReview: demoRecords.filter((r) => r.status === '待质检').length,
    onlineStations: demoDeviceList.filter((d) => d.status === '在线').length,
  }
}

export async function demoListTasks(): Promise<Task[]> {
  await delay()
  return [...demoTasks]
}

export async function demoCreateTask(body: {
  name: string
  station: string
  robotType: string
  targetCount: number
}): Promise<Task> {
  await delay()
  const t: Task = {
    id: ++seq, status: '待分配', assigneeId: null, assigneeName: null,
    createdBy: 1, collectedCount: 0,
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    ...body,
  }
  demoTasks.unshift(t)
  return t
}

export async function demoAssign(id: number, operatorId: number): Promise<Task> {
  await delay()
  const t = demoTasks.find((x) => x.id === id)!
  t.status = '采集中'
  t.assigneeId = operatorId
  t.assigneeName = operatorId === 2 ? 'operator1' : `operator${operatorId}`
  return t
}

export async function demoDeliver(id: number): Promise<Task> {
  await delay()
  const t = demoTasks.find((x) => x.id === id)!
  t.status = '已交付'
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
    operatorNames: { '2': 'operator1', '1': 'admin' },
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
  return r
}

export async function demoUpload(
  taskId: number,
  file: File,
  body: { dataType: string; station: string; collectedAt: string; remark?: string },
): Promise<RecordItem> {
  await delay()
  // 被打回的旧记录改为已重传（模拟审计链）
  demoRecords.filter((r) => r.taskId === taskId && r.status === '被打回').forEach((r) => { r.status = '已重传' })
  const t = demoTasks.find((x) => x.id === taskId)!
  t.collectedCount += 1
  if (t.status === '采集中' && t.collectedCount >= t.targetCount) t.status = '待质检'
  const r: RecordItem = {
    id: ++seq, taskId, operatorId: 2, dataUrl: `/demo/${file.name}`,
    dataType: body.dataType,
    metaJson: JSON.stringify({ station: body.station, collectedAt: body.collectedAt, remark: body.remark }),
    status: '待质检', reviewComment: null, reviewedBy: null, reviewedAt: null,
    createdAt: body.collectedAt, fileName: file.name,
  }
  demoRecords.unshift(r)
  return r
}

export async function demoDevices(): Promise<DeviceItem[]> {
  await delay()
  return [...demoDeviceList]
}
