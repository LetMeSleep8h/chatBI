import { useState } from 'react'
import './App.css'

function App() {
  const [result, setResult] = useState('')

  function heath() {
    fetch('/heath', { method: 'GET' })
        .then((res) => res.text())
        .then(setResult)
  }
    function test() {
        fetch('/test', { method: 'GET' })
            .then((res) => res.text())
            .then(setResult)
    }

  return (
      <>
        <button onClick={heath}>请求按钮</button>
        <p>后端返回: {result}</p>
      </>
  )
}

export default App