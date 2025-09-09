'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('llama2')

  useEffect(() => {
    const fetchModels = async () => {
      const response = await fetch('/api/models')
      const data = await response.json()
      setModels(data.models)
      if (data.models.length > 0) {
        setSelectedModel(data.models[0].name)
      }
    }
    fetchModels()
  }, [])

  const handleSendMessage = async () => {
    if (!message) return

    const newChatHistory = [...chatHistory, { role: 'user', content: message }]
    setChatHistory(newChatHistory)
    setMessage('')

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, model: selectedModel }),
    })

    if (response.body) {
      const reader = response.body.getReader()
      let decoder = new TextDecoder()
      let fullResponse = ''
      let assistantMessage = { role: 'assistant', content: '' }
      let assistantMessageIndex = -1

      // Add a placeholder for the assistant's message
      setChatHistory(prev => [...prev, assistantMessage])
      assistantMessageIndex = chatHistory.length + 1


      const read = async () => {
        const { done, value } = await reader.read()
        if (done) {
          return
        }

        const chunk = decoder.decode(value, { stream: true })

        // The response from the Flask backend is a stream of "data: {content}\n\n"
        // We need to parse this to get the actual content
        const lines = chunk.split('\n\n');
        const content = lines.map(line => line.replace(/^data: /, '')).join('');
        fullResponse += content

        // Update the last message in the chat history with the streamed response
        setChatHistory(prevChatHistory => {
          const updatedHistory = [...prevChatHistory]
          if (updatedHistory[updatedHistory.length - 1].role === 'assistant') {
            updatedHistory[updatedHistory.length - 1].content = fullResponse
          } else {
            updatedHistory.push({ role: 'assistant', content: fullResponse })
          }
          return updatedHistory
        })

        read()
      }

      read()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      <div className="flex-grow p-6 overflow-y-auto">
        <div className="flex flex-col space-y-4">
          {chatHistory.map((chat, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg max-w-2xl ${chat.role === 'user' ? 'bg-blue-500 text-white self-end' : 'bg-white text-gray-800 self-start'}`}>
              <p className="whitespace-pre-wrap">{chat.content}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center max-w-3xl mx-auto">
          <select
            className="px-4 py-2 mr-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}>
            {models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="flex-grow px-4 py-2 mr-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            className="px-6 py-2 font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            onClick={handleSendMessage}
            disabled={!message.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
