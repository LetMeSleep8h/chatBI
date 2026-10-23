import { useEffect, useState } from 'react'
import { Button, Card, DatePicker, Form, Input, Progress, Select, Upload, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { listTasks } from '../api/tasks'
import { uploadRecord } from '../api/records'
import { currentUser } from '../api/status'

/** 数据上传页（operator）：选择所属任务 + 上传数据文件 + 元数据表单 */
export default function Upload() {
  const [params] = useSearchParams()
  const user = currentUser()
  const [tasks, setTasks] = useState<{ id: number; name: string; station: string }[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [percent, setPercent] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    listTasks()
      .then((ts) => setTasks(ts.filter((t) => t.status === '采集中' || t.status === '待质检')))
      .catch(() => {})
  }, [])

  async function submit(values: {
    taskId: number
    dataType: string
    station: string
    collectedAt: dayjs.Dayjs
    remark?: string
  }) {
    if (!file) {
      message.warning('请选择数据文件')
      return
    }
    setUploading(true)
    setPercent(0)
    try {
      await uploadRecord(
        values.taskId,
        file,
        {
          dataType: values.dataType,
          station: values.station,
          collectedAt: values.collectedAt.format('YYYY-MM-DD HH:mm:ss'),
          remark: values.remark,
        },
        setPercent,
      )
      message.success('上传成功，数据已进入待质检')
      form.resetFields()
      setFile(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f0f2f5' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/board">返回看板</Link>
      </Space>
      <Card title={`上传采集数据（${user.name} · ${user.role}）`} style={{ maxWidth: 640 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={submit}
          initialValues={{ dataType: '视频', station: params.get('station') ?? '', collectedAt: dayjs(), taskId: params.get('taskId') ? Number(params.get('taskId')) : undefined }}
        >
          <Form.Item name="taskId" label="所属任务" rules={[{ required: true, message: '请选择所属任务' }]}>
            <Select
              placeholder="选择采集中的任务"
              options={tasks.map((t) => ({ value: t.id, label: `#${t.id} ${t.name}（${t.station}）` }))}
            />
          </Form.Item>
          <Form.Item>
            <Upload.Dragger
              maxCount={1}
              beforeUpload={(f) => {
                if (f.size > 50 * 1024 * 1024) {
                  message.error('文件超过 50MB 上限')
                  return Upload.LIST_IGNORE
                }
                setFile(f)
                return false // 手动上传
              }}
              onRemove={() => setFile(null)}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">点击或拖拽数据文件到这里</p>
              <p className="ant-upload-hint">支持视频 / 触觉 / 关节角度数据，单个文件不超过 50MB</p>
            </Upload.Dragger>
          </Form.Item>
          <Form.Item name="dataType" label="数据类型" rules={[{ required: true, message: '请选择数据类型' }]}>
            <Select options={['视频', '触觉', '关节角度'].map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="station" label="工位号" rules={[{ required: true, message: '请输入工位号' }]}>
            <Input placeholder="如 A-01" />
          </Form.Item>
          <Form.Item name="collectedAt" label="采集时间" rules={[{ required: true, message: '请选择采集时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
          {uploading && <Progress percent={percent} status="active" />}
          <Button type="primary" htmlType="submit" loading={uploading} block>
            上传（状态置为待质检）
          </Button>
        </Form>
      </Card>
    </div>
  )
}
