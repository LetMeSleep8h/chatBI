import { useEffect, useState } from 'react'
import { Button, Card, Col, Form, Input, InputNumber, message, Modal, Row, Space, Spin } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { assignTask, createTask, getStats, listTasks, mockIngest, mockUploadRecord, type PlatformStats, type Task } from '../api/types'
import { StatusTag } from '../api/status'

const COLUMNS = ['待分配', '采集中', '待质检', '已交付']

interface Store {
  name: string
  role: string
}

function store(): Store {
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : { name: '未登录', role: '-' }
}

function isManager(role: string) {
  return role === 'admin' || role === 'reviewer'
}

/** 主页 = 采集任务看板：统计条 + 四栏任务卡片 */
export default function Board() {
  const navigate = useNavigate()
  const user = store()
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [assignTaskId, setAssignTaskId] = useState<number | null>(null)
  const [ingestTaskId, setIngestTaskId] = useState<number | null>(null)
  const [createForm] = Form.useForm()
  const [assignForm] = Form.useForm()
  const [ingestForm] = Form.useForm()

  async function load() {
    const [ts, st] = await Promise.all([listTasks(), getStats()])
    setTasks(ts)
    setStats(st)
  }
  useEffect(() => {
    load().catch(() => {})
  }, [])

  async function submitCreate(values: { name: string; station: string; robot_type: string; target_count: number }) {
    await createTask(values)
    message.success('任务已创建')
    setCreateOpen(false)
    createForm.resetFields()
    load().catch(() => {})
  }

  async function submitAssign(values: { operator_id: number }) {
    await assignTask(assignTaskId!, values.operator_id)
    message.success('已分配')
    setAssignTaskId(null)
    load().catch(() => {})
  }

  async function doMockUpload(t: Task) {
    await mockUploadRecord(t.id)
    message.success('已 mock 上传一条（待质检）')
    load().catch(() => {})
  }

  function cardActions(t: Task) {
    const list: React.ReactNode[] = [<Link key="detail" to={`/tasks/${t.id}`}>详情</Link>]
    if (user.role === 'operator' && (t.status === '采集中' || t.status === '待质检')) {
      list.push(<a key="upload" onClick={() => doMockUpload(t)}>mock 上传一条</a>)
    }
    if (isManager(user.role) && t.status === '待分配') {
      list.push(<a key="assign" onClick={() => setAssignTaskId(t.id)}>分配操作员</a>)
    }
    if (isManager(user.role) && (t.status === '采集中' || t.status === '待质检')) {
      list.push(<a key="ingest" onClick={() => { setIngestTaskId(t.id); ingestForm.setFieldValue('count', 1) }}>模拟工位产出</a>)
    }
    return list
  }

  async function submitIngest(values: { count: number }) {
    const created = await mockIngest(ingestTaskId!, values.count)
    message.success(`已模拟产出 ${created.length} 条（待质检）`)
    setIngestTaskId(null)
    load().catch(() => {})
  }

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>具身智能数据采集平台 · 任务看板（{user.name} · {user.role}）</h2>
        <Space>
          {isManager(user.role) && <Button type="primary" onClick={() => setCreateOpen(true)}>新建任务</Button>}
          <Button onClick={() => { localStorage.clear(); navigate('/login') }}>退出登录</Button>
        </Space>
      </div>

      {/* 顶部 4 个统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {[
          { label: '进行中任务数', value: stats?.ongoing_tasks },
          { label: '今日已采条数', value: stats?.today_collected },
          { label: '待质检条数', value: stats?.pending_review },
          { label: '在线工位数', value: stats?.online_stations },
        ].map((s) => (
          <Col span={6} key={s.label}>
            <Card size="small">
              <div style={{ fontSize: 12, color: '#888' }}>{s.label}</div>
              {s.value === undefined ? <Spin size="small" /> : (
                <div style={{ fontSize: 28, fontWeight: 600 }}>{s.value}</div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {/* 任务卡片按状态分栏 */}
      <Row gutter={16}>
        {COLUMNS.map((col) => {
          const list = tasks.filter((t) => t.status === col)
          return (
            <Col span={6} key={col}>
              <Card title={`${col}（${list.length}）`} variant="borderless" style={{ minHeight: 320, background: '#fafafa' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {list.map((t) => (
                    <Card key={t.id} size="small" title={t.name} extra={<StatusTag status={t.status} />} actions={cardActions(t)}>
                      工位：{t.station} ｜ 机器人：{t.robot_type}
                      <br />
                      已采 {t.collected_count} / 目标 {t.target_count}
                      <br />
                      操作员：{t.assignee_name ?? '未分配'}
                    </Card>
                  ))}
                  {list.length === 0 && <span style={{ color: '#999' }}>暂无任务</span>}
                </Space>
              </Card>
            </Col>
          )
        })}
      </Row>

      {/* 新建任务弹窗（admin） */}
      <Modal title="新建任务" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => createForm.submit()}>
        <Form form={createForm} layout="vertical" onFinish={submitCreate}>
          <Form.Item name="name" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="station" label="工位" rules={[{ required: true, message: '请输入工位' }]}>
            <Input placeholder="如 A-01" />
          </Form.Item>
          <Form.Item name="robot_type" label="机器人类型" rules={[{ required: true, message: '请输入机器人类型' }]}>
            <Input placeholder="如 UR5e / xArm7" />
          </Form.Item>
          <Form.Item name="target_count" label="目标条数" rules={[{ required: true, message: '请输入目标条数' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配操作员弹窗（admin） */}
      <Modal title="分配操作员" open={assignTaskId !== null} onCancel={() => setAssignTaskId(null)} onOk={() => assignForm.submit()}>
        <Form form={assignForm} layout="vertical" onFinish={submitAssign}>
          <Form.Item name="operator_id" label="操作员 ID" rules={[{ required: true, message: '请输入操作员用户 ID' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="operator 的用户 ID" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 模拟工位产出弹窗（admin） */}
      <Modal title="模拟工位产出" open={ingestTaskId !== null} onCancel={() => setIngestTaskId(null)} onOk={() => ingestForm.submit()}>
        <Form form={ingestForm} layout="vertical" onFinish={submitIngest}>
          <Form.Item name="count" label="生成条数（1~5）" rules={[{ required: true, message: '请选择条数' }]}>
            <InputNumber min={1} max={5} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
