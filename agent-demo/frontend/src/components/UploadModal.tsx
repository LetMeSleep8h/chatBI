import { useEffect, useState } from 'react'
import { Button, DatePicker, Form, Input, Modal, Progress, Select, Upload, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { listTasks, uploadRecord } from '../api/types'

interface Props {
  taskId: number | null
  open: boolean
  onClose: () => void
  onUploaded: () => void
}

/** 上传弹窗（operator）：选任务 + 文件 + 元数据（数据类型/工位号/采集时间/备注），带进度 */
export default function UploadModal({ taskId, open, onClose, onUploaded }: Props) {
  const [tasks, setTasks] = useState<{ id: number; name: string; station: string }[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [percent, setPercent] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    if (open) {
      listTasks()
        .then((ts) => setTasks(ts.filter((t) => t.status === '采集中')))
        .catch(() => {})
      if (taskId) form.setFieldValue('task_id', taskId)
    }
  }, [open, taskId])

  async function submit(values: {
    task_id: number
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
        values.task_id,
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
      onUploaded()
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      title="上传采集数据"
      open={open}
      onCancel={() => { if (!uploading) onClose() }}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={uploading}>取消</Button>,
        <Button key="submit" type="primary" loading={uploading} onClick={() => form.submit()}>上传</Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="task_id" label="所属任务" rules={[{ required: true, message: '请选择所属任务' }]}>
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
        <Form.Item
          name="collectedAt"
          label="采集时间"
          rules={[{ required: true, message: '请选择采集时间' }]}
          initialValue={dayjs()}
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} />
        </Form.Item>
        {uploading && <Progress percent={percent} status="active" />}
      </Form>
    </Modal>
  )
}
