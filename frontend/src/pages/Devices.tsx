import { useEffect, useState } from 'react'
import { Card, Col, Row, Spin, Space } from 'antd'
import { Link } from 'react-router-dom'
import { listDevices, type DeviceItem } from '../api/devices'
import { StatusTag } from '../api/status'

/** 设备状态页：工位卡片墙（本期假数据，接口已留好） */
export default function Devices() {
  const [devices, setDevices] = useState<DeviceItem[] | null>(null)

  useEffect(() => {
    listDevices().then(setDevices).catch(() => {})
  }, [])

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f0f2f5' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/board">返回看板</Link>
        <h2 style={{ margin: 0 }}>工位设备状态</h2>
      </Space>

      {!devices ? (
        <Spin />
      ) : (
        <Row gutter={[16, 16]}>
          {devices.map((d) => (
            <Col span={6} key={d.id}>
              <Card size="small" title={`工位 ${d.station}`} extra={<StatusTag status={d.status} />}>
                设备类型：{d.deviceType}
                <br />
                最近心跳：{d.lastHeartbeat ?? '-'}
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}
