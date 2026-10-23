import { useEffect, useRef, useState } from 'react'
import { Button, Card, List, Progress, Select, Space, message } from 'antd'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { listTasks, mockUploadRecord, startSession, type CollectSession } from '../api/types'
import { StatusTag } from '../api/status'

interface StreamEntry {
  ts: string
  dataType: string
}

/** Operator 工位控制台：开启采集会话后定时 mock 产出，实时流 + 进度条 */
export default function Console() {
  const [tasks, setTasks] = useState<{ id: number; name: string; station: string }[]>([])
  const [taskId, setTaskId] = useState<number | null>(null)
  const [session, setSession] = useState<CollectSession | null>(null)
  const [collected, setCollected] = useState(0)
  const [stream, setStream] = useState<StreamEntry[]>([])
  const [running, setRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionRef = useRef<CollectSession | null>(null)
  const collectedRef = useRef(0)

  useEffect(() => {
    listTasks()
      .then((ts) => setTasks(ts.filter((t) => t.status === '采集中' || t.status === '待质检')))
      .catch(() => {})
    // 组件卸载：清理定时器
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setRunning(false)
  }

  async function start() {
    if (!taskId) {
      message.warning('请先选择任务')
      return
    }
    const s = await startSession(taskId)
    sessionRef.current = s
    setSession(s)
    setCollected(s.collected)
    collectedRef.current = s.collected
    setStream([])
    setRunning(true)
    message.success(`采集会话已开启：${s.session_id}`)
    // 每 2 秒 mock 产出一条，直到达标
    timerRef.current = setInterval(async () => {
      const cur = sessionRef.current
      if (!cur) return
      if (collectedRef.current >= cur.target) {
        stopTimer()
        message.success('采集完成，等待质检')
        return
      }
      try {
        const r = await mockUploadRecord(cur.task_id)
        collectedRef.current += 1
        setCollected(collectedRef.current)
        setStream((prev) => [{ ts: dayjs().format('HH:mm:ss'), dataType: r.data_type }, ...prev])
        if (collectedRef.current >= cur.target) {
          stopTimer()
          message.success('采集完成，等待质检')
        }
      } catch {
        stopTimer()
      }
    }, 2000)
  }

  function stop() {
    stopTimer()
    message.info('会话已手动停止')
  }

  const target = session?.target ?? 0
  const percent = target ? Math.round((collected / target) * 100) : 0

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f0f2f5' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/">返回看板</Link>
        <h2 style={{ margin: 0 }}>工位控制台</h2>
      </Space>

      <Card title="当前任务" style={{ maxWidth: 720, marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Select
            style={{ width: '100%' }}
            placeholder="选择要采集的任务"
            value={taskId}
            onChange={(v) => setTaskId(v)}
            disabled={running}
            options={tasks.map((t) => ({ value: t.id, label: `#${t.id} ${t.name}（${t.station}）` }))}
          />
          {session && (
            <>
              <div>
                {session.task_name} <StatusTag status={session.status} /> ｜ 工位 {session.station} ｜ {session.robot_type}
              </div>
              <Progress
                percent={percent}
                status={running ? 'active' : 'normal'}
                format={() => `已采 ${collected} / 目标 ${target}`}
              />
            </>
          )}
          <Space>
            {!running ? (
              <Button type="primary" onClick={start} disabled={!taskId}>
                {session ? '继续采集会话' : '开始采集会话'}
              </Button>
            ) : (
              <Button danger onClick={stop}>
                停止
              </Button>
            )}
            {running && <span style={{ color: '#888' }}>每 2 秒产出一条…</span>}
          </Space>
        </Space>
      </Card>

      <Card title="实时产出流" style={{ maxWidth: 720 }}>
        {stream.length === 0 ? (
          <span style={{ color: '#999' }}>开启会话后，这里实时显示每条产出的时间和数据类型</span>
        ) : (
          <List
            size="small"
            dataSource={stream}
            renderItem={(item) => (
              <List.Item>
                <span>{item.ts}</span>
                <span>{item.dataType}</span>
                <span style={{ color: '#52c41a' }}>✓ 已入库</span>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  )
}
