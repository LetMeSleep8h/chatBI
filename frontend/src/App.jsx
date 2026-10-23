import { useState } from 'react'
import './App.css'

function App() {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      status: 'done',
      text: '你好，我是 ChatBI，可以用自然语言向我提问数据问题，例如“本月销售额的整体情况”。',
    },
  ])
  const [input, setInput] = useState('')
  const [testOpen, setTestOpen] = useState(false)
  const [testResult, setTestResult] = useState('')

  function heath() {
    fetch('/bi/heath', { method: 'GET' })
      .then((res) => res.text())
      .then(setTestResult)
  }

  function test() {
    fetch('/bi/test', { method: 'GET' })
      .then((res) => res.text())
      .then(setTestResult)
  }

  function send() {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])

    setMessages((prev) => [...prev, { role: 'ai', status: 'loading' }])
    setTimeout(() => {
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last && last.role === 'ai' && last.status === 'loading') {
          next[next.length - 1] = {
            role: 'ai',
            status: 'done',
            text: '这是演示回复：接入后端后，这里会展示生成的 SQL、查询结果表格或图表。',
          }
        }
        return next
      })
    }, 900)
  }

  function newChat() {
    setMessages([])
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-dot"></span>ChatBI
        </div>
        <button className="new-chat" onClick={newChat}>＋ 新建对话</button>
        <div className="side-title">历史对话</div>
        <div className="history">
          <div className="history-item active">新对话</div>
        </div>
        <div className="user">
          <div className="avatar">Z</div>
          <div>
            <div className="user-name">pengzeyu</div>
            <div className="user-plan">管理员</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="chat-title">ChatBI 智能分析</div>
          <div className="top-actions">
            <span className="pill">数据集：sales_2026</span>
          </div>
        </header>

        <div className="messages">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'msg msg-user' : 'msg msg-ai'}>
              {m.role === 'user' ? (
                <div className="bubble bubble-user">{m.text}</div>
              ) : (
                <div style={{ maxWidth: '78%' }}>
                  <div className="ai-head">
                    <span className={m.status === 'loading' ? 'ai-dot ai-dot-loading' : 'ai-dot'}></span>
                    ChatBI · {m.status === 'loading' ? '正在生成 SQL…' : '已完成'}
                  </div>
                  <div className="bubble bubble-ai">{m.text}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="input-area">
          <div className="input-box">
            <textarea
              rows={1}
              value={input}
              placeholder="用自然语言提问，例如：上月各区域毛利率是多少？"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
            />
            <button className="send" onClick={send} aria-label="发送">➤</button>
          </div>
          <div className="hint">ChatBI 可能会出错，请核对生成的 SQL 与数据结果</div>
        </div>
      </main>

      <button className="test-toggle" onClick={() => setTestOpen(!testOpen)}>
        {testOpen ? '收起测试' : '测试'}
      </button>
      {testOpen && (
        <div className="test-panel">
          <button onClick={heath}>heath</button>
          <button onClick={test}>test</button>
          <p>后端返回: {testResult}</p>
        </div>
      )}
    </div>
  )
}

export default App
