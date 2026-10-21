import { useState } from 'react'
import './App.css'

function App() {
  const [result, setResult] = useState('')

  function heath() {
    fetch('/heath', { method: 'POST' })
        .then((res) => res.text())
        .then(setResult)
  }

  return (
      <>
        <button onClick={heath}>请求</button>
        <p>后端返回: {result}</p>
      </>
  )
}

export default App