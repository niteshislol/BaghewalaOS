import { useState, useRef, useEffect, useCallback } from 'react'
import { aiChat } from '../services/api'
import { useWellStore } from '../stores/wellStore'
import toast from 'react-hot-toast'
import { Mic, MicOff } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string; physics?: boolean }

const ROLES = [
  { id: 'field_engineer', label: '⚙️ Field Engineer', desc: 'Operational focus, SPM/VFD, safety' },
  { id: 'reservoir_expert', label: '🌡️ Reservoir Expert', desc: 'CSS design, thermal EOR, SOR' },
  { id: 'executive', label: '📊 Executive', desc: 'KPIs, NPV, field summary' },
]

const STARTERS = [
  "What is the rod float risk right now?",
  "Should I reduce SPM? Explain with physics.",
  "Design the next CSS cycle — optimize for SOR.",
  "What's causing high viscosity at the rod string?",
  "Predict production for the next 30 days.",
  "Is it safe to increase SPM to 7.0?",
]

export default function AiCopilotPage() {
  const { selectedWell, twin } = useWellStore()
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: `👋 Hello! I'm the **BaghewalaOS AI Copilot** — powered by Gemini and grounded in live physics twin data for **${selectedWell}**.\n\nI can help with rod float prevention, CSS cycle optimization, SRP tuning, and production forecasting. My answers are always backed by the live digital twin state.\n\nWhat would you like to analyze?`
  }])
  const [input, setInput] = useState('')
  const [role, setRole] = useState('field_engineer')
  const [loading, setLoading] = useState(false)
  const [actions, setActions] = useState<unknown[]>([])
  const [quickPrompts, setQuickPrompts] = useState<string[]>(STARTERS)
  const [isListening, setIsListening] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const toggleListen = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser.')
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => prev ? prev + ' ' + transcript : transcript)
      setIsListening(false)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event)
      setIsListening(false)
      toast.error('Microphone error: ' + event.error)
    }

    recognition.onend = () => setIsListening(false)
    
    recognition.start()
  }, [isListening])


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }))
      const res = await aiChat({
        well_id: selectedWell,
        message: text,
        role,
        history,
        twin_context: twin || {},
        current_page: 'ai_copilot'
      })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.reply,
        physics: res.physics_answered
      }])
      if (res.suggested_actions?.length) setActions(res.suggested_actions)
      if (res.quick_prompts?.length) setQuickPrompts(res.quick_prompts)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Error connecting to AI service: ${msg}\n\nCheck that the backend is running on port 8000.`
      }])
      toast.error('AI Copilot connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 h-auto lg:h-[calc(100vh-90px)]">
      {/* Main Chat */}
      <div className="flex flex-col gap-4 h-[65vh] lg:h-auto">
        <div className="page-header">
          <div>
            <div className="page-title">🤖 AI Copilot</div>
            <div className="page-subtitle">Gemini-powered · Physics-grounded · Well {selectedWell}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`btn btn-sm ${role === r.id ? 'btn-primary' : 'btn-ghost'}`}
                title={r.desc}
              >{r.label}</button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="card" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.physics && (
                <span style={{ fontSize: 10, color: 'var(--secondary)', marginBottom: 4, fontWeight: 700 }}>
                  ⚡ ANSWERED FROM PHYSICS TWIN (no LLM call)
                </span>
              )}
              <div className={`chat-bubble ${msg.role}`}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              </div>
              {msg.role === 'assistant' && !msg.physics && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                  Gemini · Physics-grounded
                </span>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="spinner"></div>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>AI Copilot thinking...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${isListening ? 'btn-error' : 'btn-ghost'}`}
            onClick={toggleListen}
            title="Voice Input"
            style={{ padding: '0 12px', border: '1px solid var(--border)' }}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            className="input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="Ask about rod float, CSS optimization, SOR, maintenance..."
            disabled={loading}
          />
          <button className="btn btn-primary" onClick={() => send(input)} disabled={loading || !input.trim()}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }}></span> : 'Send'}
          </button>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>

        {/* Quick prompts */}
        <div className="card">
          <div className="section-label">Quick Prompts</div>
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => send(p)}
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 6, textAlign: 'left', whiteSpace: 'normal', height: 'auto', padding: '8px 10px' }}
              disabled={loading}
            >{p}</button>
          ))}
        </div>

        {/* Suggested actions */}
        {actions.length > 0 && (
          <div className="card card-amber">
            <div className="section-label">Suggested Actions</div>
            {(actions as Array<{param_name: string; current_value: unknown; recommended_value: unknown; unit: string; rationale: string}>).map((a, i) => (
              <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{a.param_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0' }}>
                  {String(a.current_value)} → <span style={{ color: 'var(--success)', fontWeight: 700 }}>{String(a.recommended_value)}</span> {a.unit}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{a.rationale}</div>
              </div>
            ))}
          </div>
        )}

        {/* Live twin state */}
        {twin && (
          <div className="card">
            <div className="section-label">Live Twin State</div>
            {[
              ['Phase', String((twin as Record<string, unknown>).phase)],
              ['Oil Rate', `${(twin as Record<string, unknown>).production_rate_bopd} BOPD`],
              ['Viscosity', `${(twin as Record<string, unknown>).in_situ_viscosity} cP`],
              ['Rod Float Risk', String((twin as Record<string, unknown>).rod_float_risk)],
              ['Temp', `${(twin as Record<string, unknown>).reservoir_temperature}°C`],
              ['SOR', String((twin as Record<string, unknown>).sor)],
            ].map(([k, v]) => (
              <div key={k} className="data-row">
                <span className="data-label">{k}</span>
                <span className="data-value" style={{ fontSize: 12 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
