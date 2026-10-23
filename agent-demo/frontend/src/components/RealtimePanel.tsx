import { useEffect, useRef, useState } from 'react'
import { Card, Tag } from 'antd'

interface RecordEvent {
  task_name: string
  station: string
  operator: string
  data_type: string
  created_at: string
}

/** 简易 SVG 折线图：最近 N 分钟每分钟产出条数 */
function MinuteLine({ buckets }: { buckets: number[] }) {
  const w = 320
  const h = 90
  const pad = 6
  const max = Math.max(...buckets, 1)
  const step = (w - pad * 2) / (buckets.length - 1)
  const points = buckets
    .map((v, i) => `${pad + i * step},${h - pad - (v / max) * (h - pad * 2)}`)
    .join(' ')
  return (
    <svg width={w} height={h} role="img" aria-label="每分钟产出折线图">
      <polyline points={points} fill="none" stroke="#4f7cff" strokeWidth="2" />
      {buckets.map((v, i) => (
        <circle key={i} cx={pad + i * step} cy={h - pad - (v / max) * (h - pad * 2)} r="2.5" fill="#4f7cff" />
      ))}
      <text x={pad} y={h - 1} fontSize="10" fill="#999">{`-${buckets.length}分钟`}</text>
      <text x={w - pad} y={h - 1} fontSize="10" fill="#999" textAnchor="end">现在</text>
    </svg>
  )
}

/**
 * Admin 实时看板面板：WebSocket 订阅 /agent/ws/dashboard，
 * 收到 record_new 事件 → 流入列表置顶 + 当前分钟折线 +1。断开 3 秒自动重连。
 */
export default function RealtimePanel({ onEvent }: { onEvent?: (e: RecordEvent) => void }) {
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState<RecordEvent[]>([])
  const [buckets, setBuckets] = useState<number[]>(Array(12).fill(0))
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let closed = false

    function connect() {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${proto}://${location.host}/agent/ws/dashboard`)
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onmessage = (msg) => {
        try {
          const e = JSON.parse(msg.data)
          if (e.type !== 'record_new') return
          const event: RecordEvent = {
            task_name: e.task_name,
            station: e.station,
            operator: e.operator,
            data_type: e.data_type,
            created_at: e.created_at,
          }
          setEvents((prev) => [event, ...prev].slice(0, 30))
          // 当前分钟 +1（滚动窗口，最右为现在）
          setBuckets((prev) => [...prev.slice(1), prev[prev.length - 1] + 1])
          onEvent?.(event)
        } catch {
          /* 忽略非 JSON 帧 */
        }
      }
      ws.onclose = () => {
        setConnected(false)
        if (!closed) {
          retryRef.current = setTimeout(connect, 3000) // 3 秒退避重连
        }
      }
    }

    connect()
    return () => {
      closed = true
      if (retryRef.current) clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [onEvent])

  return (
    <Card
      title="实时数据流入"
      extra={<Tag color={connected ? 'green' : 'red'}>{connected ? '已连接' : '重连中…'}</Tag>}
      style={{ marginBottom: 16 }}
    >
      <MinuteLine buckets={buckets} />
      <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8 }}>
        {events.length === 0 ? (
          <span style={{ color: '#999', fontSize: 12 }}>
            等待数据流入…（operator 开启采集会话或 mock 上传后，这里 1 秒内出现新条目）
          </span>
        ) : (
          events.map((e, i) => (
            <div
              key={`${e.created_at}-${i}`}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                borderRadius: 6,
                background: i === 0 ? '#e8efff' : 'transparent',
              }}
            >
              <b>{e.created_at}</b> ｜ {e.task_name}（{e.station}）｜ {e.data_type} ｜ {e.operator}
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
