import { useState } from 'react'
import { Button, Card, Space, Statistic } from 'antd'
import { pushMock } from '../api/types'

interface StreamEntry {
  ts: string
  dataType: string
}

/** user1/user2 数据生产页：进来就是一个"模拟数据推送"大按钮，点一下 = 一条数据采集 */
export default function Push({ name }: { name: string }) {
  const [total, setTotal] = useState(0)
  const [stream, setStream] = useState<StreamEntry[]>([])
  const [pushing, setPushing] = useState(false)

  async function push() {
    setPushing(true)
    try {
      const r = await pushMock()
      setTotal(r.total)
      setStream((prev) => [
        { ts: new Date().toLocaleTimeString('zh-CN', { hour12: false }), dataType: r.data_type },
        ...prev,
      ])
    } finally {
      setPushing(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={() => { localStorage.clear(); location.href = '/agent/login' }}>退出登录</Button>
      </div>
      <h2 style={{ textAlign: 'center', marginTop: 0 }}>{name} · 模拟数据推送</h2>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, marginTop: 48 }}>
        <Button
          type="primary"
          size="large"
          onClick={push}
          loading={pushing}
          style={{ width: 280, height: 96, fontSize: 22, borderRadius: 16 }}
        >
          模拟数据推送
        </Button>
        <Statistic title="累计推送条数" value={total} />
        {stream.length > 0 && (
          <Card style={{ width: 360 }} size="small" title="我的推送记录（仅自己可见）">
            {stream.map((e, i) => (
              <div key={i} style={{ fontSize: 12, padding: '2px 0' }}>
                {e.ts} ｜ {e.dataType} ｜ ✓ 已入库
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
