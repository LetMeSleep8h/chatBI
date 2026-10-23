import { useState } from 'react'
import { Button, DatePicker, Form, Input, Modal, Progress, Upload, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { uploadRecord } from '../api/records'

interface Props {
  taskId: number
  open: boolean
  onClose: () => void
  onUploaded: () => void
}

/** 上传弹窗：文件 + 元数据（工位号/采集时间/备注），FormData 上传并展示进度 */
export default function UploadModal({ taskId, open, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [percent, setPercent] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()

  async function submit(values: { station: string; collectedAt: dayjs.Dayjs; remark?: string }) {
    if (!file) {
      message.warning('请选择文件')
      return
    }
    setUploading(true)
    setPercent(0)
    try {
      await uploadRecord(
        taskId,
        file,
        {
          station: values.station,
          collectedAt: values.collectedAt.format('YYYY-MM-DD HH:mm:ss'),
          remark: values.remark,
        },
        setPercent,
      )
      message.success('上传成功，已进入待质检')
      form.resetFields()
      setFile(null)
      onUploaded()
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      title="上传数据"
      open={open}
      onCancel={() => { if (!uploading) onClose() }}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={uploading}>取消</Button>,
        <Button key="submit" type="primary" loading={uploading} onClick={() => form.submit()}>上传</Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={submit}>
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
            <p className="ant-upload-text">点击或拖拽文件到这里</p>
            <p className="ant-upload-hint">单个文件不超过 50MB</p>
          </Upload.Dragger>
        </Form.Item>
        <Form.Item name="station" label="工位号" rules={[{ required: true, message: '请输入工位号' }]}>
          <Input />
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
