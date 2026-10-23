import { useEffect, useState } from 'react'
import { Button, Card, Descriptions, Form, Input, Modal, Space, Table, message } from 'antd'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getTaskDetail, type TaskDetail as Detail } from '../api/tasks'
import { reviewRecord, type RecordItem } from '../api/records'
import { currentUser, StatusTag } from '../api/status'
import UploadModal from '../components/UploadModal'

export default function TaskDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [params] = useSearchParams()
  const taskId = Number(id)
  const user = currentUser()!
  const isReviewer = user.role === 'reviewer' || user.role === 'admin'
  const isOperator = user.role === 'operator'

  const [detail, setDetail] = useState<Detail | null>(null)
  const [uploadOpen, setUploadOpen] = useState(params.get('upload') === '1')
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
        <Button onClick={() => navigate('/')}>返回看板</Button>
        {isOperator && task.status === '采集中' && (
          <Button type="primary" onClick={() => setUploadOpen(true)}>上传数据</Button>
        )}
      </Space>

      <Card title={task.name} extra={<StatusTag status={task.status} />} style={{ marginBottom: 16 }}>
        <Descriptions column={4}>
          <Descriptions.Item label="工位">{task.station}</Descriptions.Item>
          <Descriptions.Item label="完成 / 目标">{detail.doneCount} / {detail.targetCount}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{task.createdAt}</Descriptions.Item>
          <Descriptions.Item label="任务 ID">{task.id}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="数据条目">
        <Table<RecordItem>
          rowKey="id"
          dataSource={detail.records}
          pagination={false}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 60 },
            { title: '文件名', dataIndex: 'fileName' },
            { title: '操作员 ID', dataIndex: 'operatorId', width: 100 },
            { title: '元数据', dataIndex: 'metaJson', ellipsis: true },
            { title: '状态', dataIndex: 'status', width: 90, render: (s: string) => <StatusTag status={s} /> },
            { title: '质检意见', dataIndex: 'reviewComment', ellipsis: true },
            { title: '审核时间', dataIndex: 'reviewedAt', width: 170 },
            {
              title: '操作',
              width: 200,
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
                      <span style={{ color: 'red' }}>原因：{record.reviewComment ?? '-'}</span>
                      <Button size="small" onClick={() => setUploadOpen(true)}>重新上传</Button>
                    </Space>
                  )
                }
                return null
              },
            },
          ]}
        />
      </Card>

      {/* 打回弹窗：原因必填（后端 422 校验，前端也必填） */}
      <Modal
        title="打回原因"
        open={rejectTarget !== null}
        onCancel={() => setRejectTarget(null)}
        onOk={() => rejectForm.submit()}
      >
        <Form form={rejectForm} layout="vertical" onFinish={submitReject}>
          <Form.Item
            name="comment"
            label="打回原因（必填）"
            rules={[{ required: true, message: '请填写打回原因' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <UploadModal
        taskId={taskId}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          setUploadOpen(false)
          load()
        }}
      />
    </div>
  )
}
