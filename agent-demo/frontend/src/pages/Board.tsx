import { useEffect, useState } from 'react'
import { Button, Card, Col, Form, Input, InputNumber, message, Modal, Row, Space, Spin, Table } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { assignTask, createTask, getStats, listRecords, listTasks, mockIngest, pushMock, type PlatformStats, type RecordItem, type Task } from '../api/types'
import Push from './Push'
import RealtimePanel from '../components/RealtimePanel'
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
  // user1/user2：登录即"模拟数据推送"大按钮页
  if (user.role === 'operator' && (user.name === 'user1' || user.name === 'user2')) {
    return <Push name={user.name} />
  }
  // B1/B2 客户：实时视图，仅见映射操作员的数据（服务端过滤）
  if (user.role === 'customer') {
    return <CustomerView name={user.name} />
  }
  return <AdminBoard user={user} navigate={navigate} />
}

/** B1/B2 客户视图：实时流入面板 + 自己可见的数据表格 */
function CustomerView({ name }: { name: string }) {
  const [records, setRecords] = useState<RecordItem[]>([])
  async function load() {
    setRecords(await listRecords())
  }
  useEffect(() => {
    load().catch(() => {})
  }, [])
  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>客户视图（{name}）</h2>
        <Button onClick={() => { localStorage.clear(); location.href = '/agent/login' }}>退出登录</Button>
      </div>
      <RealtimePanel onEvent={() => { load().catch(() => {}) }} />
      <Card title="我可见的数据" size="small">
        <Table<RecordItem>
          rowKey="id"
          size="small"
          dataSource={records}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 60 },
            { title: '数据类型', dataIndex: 'data_type', width: 90 },
            { title: '操作员', dataIndex: 'operator_name', width: 100 },
            { title: '上传时间', dataIndex: 'created_at', width: 170 },
            { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <StatusTag status={v} /> },
          ]}
        />
      </Card>
    </div>
  )
}

/** admin/reviewer 看板 + operator1 视图 */
function AdminBoard({ user, navigate }: { user: { name: string; role: string }; navigate: ReturnType<typeof useNavigate> }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [records, setRecords] = useState<RecordItem[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [assignTaskId, setAssignTaskId] = useState<number | null>(null)
  const [ingestTaskId, setIngestTaskId] = useState<number | null>(null)
  const [createForm] = Form.useForm()
  const [assignForm] = Form.useForm()
  const [ingestForm] = Form.useForm()

  // WebSocket record_new 事件：统计卡片即时跳动 + 刷新任务列表 + 全量数据表插行
  async function onRecordEvent() {
    setStats((prev) =>
      prev
        ? { ...prev, today_collected: prev.today_collected + 1, pending_review: prev.pending_review + 1 }
        : prev,
    )
    try {
      const [ts, rs] = await Promise.all([listTasks(), user.role !== 'operator' ? listRecords() : Promise.resolve(null)])
      setTasks(ts)
      if (rs) setRecords(rs)
    } catch { /* 忽略 */ }
  }

  async function load() {
    const [ts, st] = await Promise.all([listTasks(), getStats()])
    setTasks(ts)
    setStats(st)
    if (user.role !== 'operator') setRecords(await listRecords())
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

  function cardActions(t: Task) {
    const list: React.ReactNode[] = [<Link key="detail" to={`/tasks/${t.id}`}>详情</Link>]
    if (user.role === 'operator' && (t.status === '采集中' || t.status === '待质检')) {
      list.push(<Link key="upload" to="/console">进入工位控制台</Link>)
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

      {isManager(user.role) && <RealtimePanel onEvent={() => onRecordEvent()} />}

      {isManager(user.role) && (
        <Card title={`全部数据（${records.length}）`} size="small" style={{ marginBottom: 16 }}>
          <Table<RecordItem>
            rowKey="id"
            size="small"
            dataSource={records}
            pagination={{ pageSize: 6 }}
            rowClassName={(_, i) => (i === 0 ? 'newest-row' : '')}
            columns={[
              { title: 'ID', dataIndex: 'id', width: 60 },
              { title: '数据类型', dataIndex: 'data_type', width: 90 },
              { title: '操作员', dataIndex: 'operator_name', width: 100 },
              { title: '上传时间', dataIndex: 'created_at', width: 170 },
              { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <StatusTag status={v} /> },
              { title: '文件', width: 70, render: (_, r) => (r.file_name.startsWith('mock_') ? <span style={{ color: '#999' }}>模拟</span> : <a href={`/agent/api/records/${r.id}/download`}>下载</a>) },
            ]}
          />
        </Card>
      )}

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
