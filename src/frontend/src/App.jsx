import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [messages, setMessages] = useState([
    { type: 'bot', text: 'Hello! I\'m your Hybrid AI chatbot. I can use AIML patterns, LLM responses, or a hybrid approach. Click the mode button to switch between modes!' }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatMode, setChatMode] = useState('AIML') // AIML, LLM, or Hybrid
  const [llmLinguaEnabled, setLlmLinguaEnabled] = useState(false)
  const [showLinguaHelp, setShowLinguaHelp] = useState(false)
  const [showModeHelp, setShowModeHelp] = useState(false)
  const [showStatsHelp, setShowStatsHelp] = useState(false)
  const [sessionTokens, setSessionTokens] = useState(0)
  const [totalTokens, setTotalTokens] = useState(0)
  const [totalSpend, setTotalSpend] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const messagesEndRef = useRef(null)

  // Fetch stats from backend on mount and periodically
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:3011/stats')
        if (response.ok) {
          const data = await response.json()
          setTotalTokens(data.total_tokens || 0)
          setTotalSpend(data.total_spend || 0)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    // Add user message
    setMessages(prev => [...prev, { type: 'user', text: userMessage }])

    try {
      const response = await fetch('http://localhost:3011/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage,
          mode: chatMode,
          session_id: sessionId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      // Store session ID for conversation continuity
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id)
      }
      
      // Update session token count
      const tokens = data.tokens || { total: 0 }
      setSessionTokens(tokens.total)
      
      // Add bot response with source info
      const responseText = data.response
      const sourceInfo = data.source ? ` 💭 ${data.source}` : ''
      
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: responseText + sourceInfo,
        source: data.source,
        mode: data.mode
      }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'Sorry, I\'m having trouble connecting to the server. Please try again.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const cycleChatMode = () => {
    const modes = ['AIML', 'LLM', 'Hybrid']
    const currentIndex = modes.indexOf(chatMode)
    const nextIndex = (currentIndex + 1) % modes.length
    setChatMode(modes[nextIndex])
  }

  const toggleLlmLingua = () => {
    setLlmLinguaEnabled(prev => !prev)
  }

  const toggleLinguaHelp = () => {
    setShowLinguaHelp(prev => !prev)
    setShowModeHelp(false) // Close other help
    setShowStatsHelp(false)
  }

  const toggleModeHelp = () => {
    setShowModeHelp(prev => !prev)
    setShowLinguaHelp(false) // Close other help
    setShowStatsHelp(false)
  }

  const toggleStatsHelp = () => {
    setShowStatsHelp(prev => !prev)
    setShowLinguaHelp(false)
    setShowModeHelp(false)
  }

  const copyToClipboard = (text) => {
    // Remove the source info (💭 ...) before copying
    const cleanText = text.replace(/\s*💭\s*.+$/, '')
    navigator.clipboard.writeText(cleanText).then(() => {
      // Optional: Show a brief "Copied!" notification
      console.log('Copied to clipboard')
    }).catch(err => {
      console.error('Failed to copy:', err)
    })
  }

  return (
    <div className="app">
      <div className="chat-container">
        <div className="chat-header">
          <div className="token-stats-wrapper">
            <div className="token-stats">
              <div className="stat-item">
                <span className="stat-label">Session:</span>
                <span className="stat-value">{sessionTokens} tokens</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total:</span>
                <span className="stat-value">{totalTokens} tokens</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Price:</span>
                <span className="stat-value">${totalSpend.toFixed(6)}</span>
              </div>
            </div>
            <button 
              onClick={toggleStatsHelp}
              className="help-button stats-help"
              title="Token usage explained"
            >
              ?
            </button>
            {showStatsHelp && (
              <div className="help-tooltip stats-tooltip">
                <div className="help-content">
                  <strong>Token Usage</strong>
                  <p><strong>Session:</strong> Tokens used in current conversation</p>
                  <p><strong>Total:</strong> All tokens used across all sessions</p>
                  <p><strong>Price:</strong> Total cost based on token usage</p>
                </div>
              </div>
            )}
          </div>
          <div className="header-center">
            <h1>Hybrid AI Chatbot</h1>
            <p>AIML + LLM powered conversations</p>
          </div>
          <div className="mode-selector">
            <div className="control-group">
              <button 
                onClick={toggleLlmLingua}
                className={`llmlingua-button ${llmLinguaEnabled ? 'enabled' : 'disabled'}`}
                title={`LLMLingua: ${llmLinguaEnabled ? 'Enabled' : 'Disabled'}`}
              >
                🗜️ {llmLinguaEnabled ? 'ON' : 'OFF'}
              </button>
              <button 
                onClick={toggleLinguaHelp}
                className="help-button"
                title="What is LLMLingua?"
              >
                ?
              </button>
              {showLinguaHelp && (
                <div className="help-tooltip">
                  <div className="help-content">
                    <strong>LLMLingua</strong>
                    <p>Compresses prompts up to 20x to reduce tokens and costs while maintaining response quality.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="control-group">
              <button 
                onClick={cycleChatMode}
                className={`mode-button mode-${chatMode.toLowerCase()}`}
              >
                {chatMode}
              </button>
              <button 
                onClick={toggleModeHelp}
                className="help-button"
                title="Chat modes explained"
              >
                ?
              </button>
              {showModeHelp && (
                <div className="help-tooltip">
                  <div className="help-content">
                    <strong>Chat Modes</strong>
                    <p><strong>AIML:</strong> Pattern-based responses (fast, no cost)</p>
                    <p><strong>LLM:</strong> AI-powered responses (flexible, uses tokens)</p>
                    <p><strong>Hybrid:</strong> Best of both worlds</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="messages-container">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.type}`}>
              <div className="message-content">
                {message.text}
              </div>
              <button 
                className="copy-button"
                onClick={() => copyToClipboard(message.text)}
                title="Copy message"
              >
                📋
              </button>
            </div>
          ))}
          {isLoading && (
            <div className="message bot">
              <div className="message-content loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <div className="input-wrapper">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              disabled={isLoading}
              className="message-input"
            />
            <button 
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="send-button"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App