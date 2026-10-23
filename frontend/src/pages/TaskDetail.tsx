import { useEffect, useState } from 'react'
import { Button, Card, Descriptions, Form, Input, Modal, Space, Table, message } from 'antd'
import { Link, useParams } from 'react-router-dom'
import { deliverTask, getTaskDetail, type TaskDetail as Detail } from '../api/tasks'
import { downloadUrl, reviewRecord, type RecordItem } from '../api/records'
import { currentUser, StatusTag } from '../api/status'

export default function TaskDetail() {
  const { id } = useParams()
  const taskId = Number(id)
  const user = currentUser()
  const isReviewer = user.role === 'reviewer' || user.role === 'admin'
  const isAdmin = user.role === 'admin'
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

  async function doDeliver() {
    await deliverTask(taskId)
    message.success('已交付')
    load()
  }

  if (!detail) return <div style={{ padding: 24 }}>加载中…</div>
  const { task } = detail

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f0f2f5' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/board">返回看板</Link>
        {isOperator && (task.status === '采集中' || task.status === '待质检') && (
          <Button type="primary" href={`/bi/upload?taskId=${task.id}`}>去上传数据</Button>
        )}
        {isAdmin && task.status === '待质检' && (
          <Button type="primary" onClick={doDeliver}>交付客户</Button>
        )}
      </Space>

      <Card title={task.name} extra={<StatusTag status={task.status} />} style={{ marginBottom: 16 }}>
        <Descriptions column={5}>
          <Descriptions.Item label="工位">{task.station}</Descriptions.Item>
          <Descriptions.Item label="机器人类型">{task.robotType}</Descriptions.Item>
          <Descriptions.Item label="已采 / 目标">{task.collectedCount} / {task.targetCount}</Descriptions.Item>
          <Descriptions.Item label="质检通过">{detail.doneCount}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{task.createdAt}</Descriptions.Item>
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
            { title: '操作员', width: 100, render: (_, r) => detail.operatorNames?.[String(r.operatorId)] ?? r.operatorId },
            { title: '数据类型', dataIndex: 'dataType', width: 90 },
            { title: '上传时间', dataIndex: 'createdAt', width: 170 },
            { title: '质检状态', dataIndex: 'status', width: 90, render: (s: string) => <StatusTag status={s} /> },
            { title: '质检意见', dataIndex: 'reviewComment', ellipsis: true },
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
                      <span style={{ color: 'red' }}>原因：{record.reviewComment ?? '-'}</span>
                      <Button size="small" href={`/bi/upload?taskId=${task.id}`}>重新上传</Button>
                    </Space>
                  )
                }
                return null
              },
            },
            {
              title: '文件',
              width: 80,
              render: (_, record) => {
                if (record.dataUrl.startsWith('/demo/')) return <span style={{ color: '#999' }}>演示</span>
                return <a href={downloadUrl(record.id)}>下载</a>
              },
            },
          ]}
        />
      </Card>

      {/* 打回弹窗：原因必填 */}
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
