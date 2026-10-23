import { useEffect, useState } from 'react'
import { Button, Card, Col, Form, Input, InputNumber, message, Modal, Row, Space } from 'antd'
import { useNavigate } from 'react-router-dom'
import { assignTask, createTask, getTaskDetail, listTasks, type Task } from '../api/tasks'
import { currentUser, StatusTag } from '../api/status'

const COLUMNS = ['待分配', '采集中', '已完成']

/** 卡片：任务名/工位/完成 n/目标 m */
interface CardModel extends Task {
  doneCount: number
}

export default function Board() {
  const navigate = useNavigate()
  const user = currentUser()!
  const [cards, setCards] = useState<CardModel[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [assignTaskId, setAssignTaskId] = useState<number | null>(null)
  const [createForm] = Form.useForm()
  const [assignForm] = Form.useForm()

  const isAdmin = user.role === 'admin'

  async function load() {
    const tasks = await listTasks()
    const models = await Promise.all(
      tasks.map(async (t) => {
        const detail = await getTaskDetail(t.id).catch(() => null)
        return { ...t, doneCount: detail?.doneCount ?? 0 }
      }),
    )
    setCards(models)
  }
  useEffect(() => {
    load().catch(() => {})
  }, [])

  async function submitCreate(values: { name: string; station: string; targetCount: number }) {
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

  function cardActions(t: CardModel) {
    const list: React.ReactNode[] = [<a key="detail" onClick={() => navigate(`/tasks/${t.id}`)}>详情</a>]
    if (user.role === 'operator' && t.status === '采集中') {
      list.push(<a key="upload" onClick={() => navigate(`/tasks/${t.id}?upload=1`)}>上传数据</a>)
    }
    if (isAdmin && t.status === '待分配') {
      list.push(<a key="assign" onClick={() => setAssignTaskId(t.id)}>分配</a>)
    }
    return list
  }

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>任务看板（{user.name} · {user.role}）</h2>
        <Space>
          {isAdmin && <Button type="primary" onClick={() => setCreateOpen(true)}>新建任务</Button>}
          <Button onClick={() => { localStorage.clear(); navigate('/login') }}>退出登录</Button>
        </Space>
      </div>

      <Row gutter={16}>
        {COLUMNS.map((col) => {
          const list = cards.filter((t) => t.status === col)
          return (
            <Col span={8} key={col}>
              <Card title={`${col}（${list.length}）`} variant="borderless" style={{ minHeight: 300, background: '#fafafa' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {list.map((t) => (
                    <Card key={t.id} size="small" title={t.name} extra={<StatusTag status={t.status} />} actions={cardActions(t)}>
                      工位：{t.station}
                      <br />
                      完成 {t.doneCount} / 目标 {t.targetCount}
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
            <Input />
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
