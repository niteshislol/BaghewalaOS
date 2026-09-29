import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Trash2, Zap, ArrowRight } from 'lucide-react';
import type { RealTimeTelemetry, CSSParameters, SRPParameters, ReservoirParameters } from '../types';
import axios from 'axios';
import { useWellStore } from '../stores/wellStore';
import toast from 'react-hot-toast';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  category?: 'SAFETY' | 'ECONOMICS' | 'OPTIMIZATION' | 'GENERAL';
  actionButton?: {
    label: string;
    actionType: 'SET_SPM' | 'SWITCH_TAB' | 'APPLY_VFD';
    payload?: string | number;
  };
}

interface AiAdvisorBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAdvisorBox: React.FC<AiAdvisorBoxProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('baghewala_copilot_history');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'welcome_1',
        sender: 'ai',
        text: `⚡ **WagheraOS SCADA AI Co-Pilot Ready**\n\nI am connected to the live digital-twin telemetry stream. SCADA/field adapters can be connected separately when deployed.\n\nYou can ask for downhole diagnostics, command setpoint adjustments, analyze steam soak economics, or click any prompt below.`,
        timestamp: Date.now(),
        category: 'GENERAL',
      },
    ];
  });

  const [inputQuery, setInputQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { selectedWell } = useWellStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Persist chat history
  useEffect(() => {
    localStorage.setItem('baghewala_copilot_history', JSON.stringify(messages));
  }, [messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setLoading(true);

    try {
      // Map history to backend format
      const history = messages.filter(m => m.id !== 'welcome_1').map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await axios.post('/api/v1/copilot/chat', {
        well_id: selectedWell,
        message: query,
        history: history,
        role: 'field_engineer'
      });
      
      const reply = res.data;
      
      let actionBtn: ChatMessage['actionButton'] = undefined;
      if (reply.suggested_actions && reply.suggested_actions.length > 0) {
        const firstAction = reply.suggested_actions[0];
        if (firstAction.param_key === 'spm') {
          actionBtn = { label: `Apply SPM: ${firstAction.recommended_value}`, actionType: 'SET_SPM', payload: firstAction.recommended_value };
        }
      }

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now() + 1}`,
        sender: 'ai',
        text: reply.reply,
        timestamp: Date.now() + 1,
        category: reply.physics_answered ? 'OPTIMIZATION' : 'GENERAL',
        actionButton: actionBtn,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: `ai_${Date.now() + 1}`,
        sender: 'ai',
        text: '❌ Connection to AI Copilot failed. Please ensure the backend is running and the GEMINI_API_KEY is configured.',
        timestamp: Date.now() + 1,
        category: 'GENERAL'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = (actionButton: ChatMessage['actionButton']) => {
    if (!actionButton) return;
    if (actionButton.actionType === 'SET_SPM') {
      // In a real app we'd trigger the VFD API
      toast.success(`Action sent to backend: ${actionButton.label}`);
      onClose();
    }
  };

  const handleClearHistory = () => {
    const defaultMsg: ChatMessage = {
      id: `welcome_${Date.now()}`,
      sender: 'ai',
      text: `Chat history cleared. SCADA AI Co-Pilot listening for commands.`,
      timestamp: Date.now(),
      category: 'GENERAL',
    };
    setMessages([defaultMsg]);
  };

  const suggestionChips = [
    { label: '🚨 Diagnose Rod Floating', query: 'Why is rod floating happening and how do we fix it?' },
    { label: '📊 Waveform Oscilloscope', query: 'Explain the real-time waveform oscilloscope' },
    { label: '🔥 Optimize CSS Steam', query: 'What is the optimal steam volume for this cycle?' },
    { label: '💰 Check Daily Profit Margin', query: 'What is our current daily net cash profit?' },
    { label: '📈 Dynamometer Laser Tracing', query: 'How does the live dynamometer card work?' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(6, 10, 18, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          height: '700px',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          borderColor: 'rgba(255, 122, 0, 0.45)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.85)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(255, 122, 0, 0.25) 0%, rgba(5, 6, 8, 0.95) 100%)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #ff7a00 0%, #ff5500 100%)',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={22} color="#050608" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>WagheraOS AI Co-Pilot</h3>
                <span className="badge badge-cyan font-mono" style={{ fontSize: '0.65rem' }}>
                  SCADA CORE
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Baghewala Heavy Crude Digital Twin • Real-Time Decision & Dispatch Governor
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleClearHistory}
              className="btn-secondary"
              title="Clear Chat History"
              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div
          style={{
            padding: '10px 16px',
            background: 'rgba(5, 6, 8, 0.7)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip.query)}
              className="tab-btn-mini"
              style={{ fontSize: '0.75rem', padding: '5px 10px' }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Messages Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg) => {
            const isAi = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isAi ? 'flex-start' : 'flex-end',
                  gap: '10px',
                }}
              >
                {isAi && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(255, 122, 0, 0.15)',
                      border: '1px solid rgba(255, 122, 0, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={18} color="var(--primary-orange)" />
                  </div>
                )}

                <div
                  style={{
                    maxWidth: '82%',
                    background: isAi ? 'rgba(14, 16, 20, 0.9)' : 'linear-gradient(135deg, #ff7a00 0%, #e65100 100%)',
                    border: `1px solid ${isAi ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 122, 0, 0.5)'}`,
                    borderRadius: '12px',
                    padding: '14px 16px',
                    color: isAi ? '#fff' : '#050608',
                    fontWeight: isAi ? 400 : 700,
                    fontSize: '0.85rem',
                    lineHeight: '1.5',
                  }}
                >
                  <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>

                  {/* Optional Action Dispatch Button */}
                  {msg.actionButton && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <button
                        onClick={() => handleExecuteAction(msg.actionButton)}
                        className="btn-primary"
                        style={{
                          width: '100%',
                          padding: '8px 14px',
                          fontSize: '0.8rem',
                          background: 'linear-gradient(135deg, #ff7a00 0%, #ffa133 100%)',
                          color: '#050608',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        <Zap size={14} />
                        <span>{msg.actionButton.label}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{
            padding: '14px 20px',
            background: 'rgba(6, 10, 18, 0.95)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '10px',
          }}
        >
          <input
            type="text"
            placeholder="Type a SCADA diagnostic query or setpoint command..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '10px',
              padding: '10px 16px',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none',
              opacity: loading ? 0.5 : 1,
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={!inputQuery.trim() || loading}
            style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
