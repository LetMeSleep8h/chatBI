import { useEffect, useState } from 'react'
import { Button, Card, Descriptions, Form, Input, Modal, Space, Table, message } from 'antd'
import { Link, useParams } from 'react-router-dom'
import { downloadUrl, getTaskDetail, mockUploadRecord, reviewRecord, type RecordItem, type TaskDetail as Detail } from '../api/types'
import { StatusTag } from '../api/status'

function store(): { name: string; role: string } {
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : { name: '未登录', role: '-' }
}

/** 任务详情页：任务信息 + 数据条目表格 + reviewer 质检操作 */
export default function TaskDetail() {
  const { id } = useParams()
  const taskId = Number(id)
  const user = store()
  const isReviewer = user.role === 'reviewer' || user.role === 'admin'
  const isOperator = user.role === 'operator'

  const [detail, setDetail] = useState<Detail | null>(null)
  const [rejectTarget, setRejectTarget] = useState<RecordItem | null>(null)
  const [rejectForm] = Form.useForm()

  const load = () => {
    getTaskDetail(taskId).then(setDetail).catch(() => {})
  }
  useEffect(() => {
    if (taskId) load()
  }, [taskId])

  async function approve(record: RecordItem) {
    await reviewRecord(record.id, '通过')
    message.success('已通过')
    load()
  }

  async function submitReject(values: { comment: string }) {
    await reviewRecord(rejectTarget!.id, '打回', values.comment)
    message.success('已打回')
    setRejectTarget(null)
    rejectForm.resetFields()
    load()
  }

  if (!detail) return <div style={{ padding: 24 }}>加载中…</div>
  const { task } = detail

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f0f2f5' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/">返回看板</Link>
        {isOperator && (task.status === '采集中' || task.status === '待质检') && (
          <Button type="primary" onClick={async () => { await mockUploadRecord(taskId); message.success('已 mock 上传一条（待质检）'); load() }}>mock 上传一条</Button>
        )}
      </Space>

      <Card title={task.name} extra={<StatusTag status={task.status} />} style={{ marginBottom: 16 }}>
        <Descriptions column={5}>
          <Descriptions.Item label="工位">{task.station}</Descriptions.Item>
          <Descriptions.Item label="机器人类型">{task.robot_type}</Descriptions.Item>
          <Descriptions.Item label="已采 / 目标">{detail.progress.collected} / {detail.progress.target}</Descriptions.Item>
          <Descriptions.Item label="操作员">{task.assignee_name ?? '未分配'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{task.created_at}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="数据条目" extra={<span style={{ fontSize: 12, color: '#888' }}>数据来源：采集工位产出与操作员上传，每条可追溯到工位、任务、操作员</span>}>
        <Table<RecordItem>
          rowKey="id"
          dataSource={detail.records}
          pagination={false}
          columns={[
            { title: '数据类型', dataIndex: 'data_type', width: 90 },
            { title: '工位', width: 80, render: (_, r) => { try { return JSON.parse(r.meta_json ?? '{}').station ?? task.station } catch { return task.station } } },
            { title: '操作员', dataIndex: 'operator_name', width: 100 },
            { title: '上传时间', dataIndex: 'created_at', width: 170 },
            { title: '质检状态', dataIndex: 'status', width: 90, render: (s: string) => <StatusTag status={s} /> },
            { title: '质检意见', dataIndex: 'review_comment', ellipsis: true },
            {
              title: '操作',
              width: 220,
              render: (_, record) => {
                if (isReviewer && record.status === '待质检') {
                  return (
                    <Space>
                      <Button size="small" type="primary" onClick={() => approve(record)}>通过</Button>
                      <Button size="small" danger onClick={() => setRejectTarget(record)}>打回</Button>
                    </Space>
                  )
                }
                if (isOperator && record.status === '被打回') {
                  return (
                    <Space direction="vertical" size={4}>
                      <span style={{ color: 'red' }}>原因：{record.review_comment ?? '-'}</span>
                      <Button size="small" onClick={async () => { await mockUploadRecord(taskId); message.success('已 mock 重传一条（待质检）'); load() }}>mock 重传一条</Button>
                    </Space>
                  )
                }
                return null
              },
            },
            {
              title: '文件',
              width: 80,
              render: (_, record) => <a href={downloadUrl(record.id)}>下载</a>,
            },
          ]}
        />
      </Card>

      {/* 打回弹窗：原因必填（后端 422 强校验） */}
      <Modal title="打回原因" open={rejectTarget !== null} onCancel={() => setRejectTarget(null)} onOk={() => rejectForm.submit()}>
        <Form form={rejectForm} layout="vertical" onFinish={submitReject}>
          <Form.Item name="comment" label="打回原因（必填）" rules={[{ required: true, message: '请填写打回原因' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
