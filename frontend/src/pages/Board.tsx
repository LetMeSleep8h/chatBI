import { useEffect, useState } from 'react'
import { Button, Card, Col, Form, Input, InputNumber, message, Modal, Row, Space, Spin } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { assignTask, createTask, deliverTask, getStats, getTaskDetail, listTasks, type PlatformStats, type Task } from '../api/tasks'
import { currentUser, StatusTag } from '../api/status'

const COLUMNS = ['待分配', '采集中', '待质检', '已交付']

export default function Board() {
  const navigate = useNavigate()
  const user = currentUser()
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [assignTaskId, setAssignTaskId] = useState<number | null>(null)
  const [createForm] = Form.useForm()
  const [assignForm] = Form.useForm()

  const isAdmin = user.role === 'admin'
  const isOperator = user.role === 'operator'

  async function load() {
    const tasks = await listTasks()
    const withNames = await Promise.all(
      tasks.map(async (t) => {
        // 列表接口已带 assigneeName；游客演示数据直接用
        return t
      }),
    )
    setTasks(withNames)
    setStats(await getStats())
  }
  useEffect(() => {
    load().catch(() => {})
  }, [])

  async function submitCreate(values: { name: string; station: string; robotType: string; targetCount: number }) {
    await createTask(values)
    message.success('任务已创建')
    setCreateOpen(false)
    createForm.resetFields()
    load().catch(() => {})
  }

  async function submitAssign(values: { operatorId: number }) {
    await assignTask(assignTaskId!, values.operatorId)
    message.success('已分配')
    setAssignTaskId(null)
    load().catch(() => {})
  }

  async function doDeliver(id: number) {
    await deliverTask(id)
    message.success('已交付')
    load().catch(() => {})
  }

  function cardActions(t: Task) {
    const list: React.ReactNode[] = [<Link key="detail" to={`/task/${t.id}`}>详情</Link>]
    if (isOperator && t.status === '采集中') {
      list.push(<Link key="upload" to={`/upload?taskId=${t.id}`}>上传数据</Link>)
    }
    if (isAdmin && t.status === '待分配') {
      list.push(<a key="assign" onClick={() => setAssignTaskId(t.id)}>分配操作员</a>)
    }
    if (isAdmin && t.status === '待质检') {
      list.push(<a key="deliver" onClick={() => doDeliver(t.id)}>交付</a>)
    }
    return list
  }

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>具身智能数据采集平台 · 任务看板（{user.name} · {user.role}）</h2>
        <Space>
          {isAdmin && <Button type="primary" onClick={() => setCreateOpen(true)}>新建任务</Button>}
          {isOperator && <Link to="/upload">去上传数据</Link>}
          <Link to="/device-status">设备状态</Link>
          {user.name !== '游客（演示数据）' ? (
            <Button onClick={() => { localStorage.clear(); navigate('/login') }}>退出登录</Button>
          ) : (
            <Button type="link" onClick={() => navigate('/login')}>登录</Button>
          )}
        </Space>
      </div>

      {/* 顶部统计条 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {[
          { label: '进行中任务数', value: stats?.ongoingTasks },
          { label: '今日已采条数', value: stats?.todayCollected },
          { label: '待质检条数', value: stats?.pendingReview },
          { label: '在线工位数', value: stats?.onlineStations },
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

      {/* 任务四栏看板 */}
      <Row gutter={16}>
        {COLUMNS.map((col) => {
          const list = tasks.filter((t) => t.status === col)
          return (
            <Col span={6} key={col}>
              <Card title={`${col}（${list.length}）`} variant="borderless" style={{ minHeight: 320, background: '#fafafa' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {list.map((t) => (
                    <Card key={t.id} size="small" title={t.name} extra={<StatusTag status={t.status} />} actions={cardActions(t)}>
                      工位：{t.station} ｜ 机器人：{t.robotType}
                      <br />
                      已采 {t.collectedCount} / 目标 {t.targetCount}
                      <br />
                      操作员：{t.assigneeName ?? '未分配'}
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
          <Form.Item name="robotType" label="机器人类型" rules={[{ required: true, message: '请输入机器人类型' }]}>
            <Input placeholder="如 UR5e / xArm7 / 自研R1" />
          </Form.Item>
          <Form.Item name="targetCount" label="目标条数" rules={[{ required: true, message: '请输入目标条数' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配操作员弹窗（admin） */}
      <Modal title="分配操作员" open={assignTaskId !== null} onCancel={() => setAssignTaskId(null)} onOk={() => assignForm.submit()}>
        <Form form={assignForm} layout="vertical" onFinish={submitAssign}>
          <Form.Item name="operatorId" label="操作员 ID" rules={[{ required: true, message: '请输入操作员用户 ID' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="operator 的用户 ID" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
