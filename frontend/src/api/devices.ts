import http, { unwrap } from './http'
import { demoDevices, demoMode } from './demo'

export interface DeviceItem {
  id: number
  station: string
  deviceType: string
  status: string
  lastHeartbeat: string | null
}

/** 工位设备状态（本期假数据，接口留好） */
export function listDevices() {
  if (demoMode()) return demoDevices()
  return unwrap<DeviceItem[]>(http.get('/devices'))
}
