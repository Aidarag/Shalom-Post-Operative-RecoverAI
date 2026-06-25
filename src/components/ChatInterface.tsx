import React, { useState, useRef, useEffect } from 'react';
import { Send, Key, Sparkles, AlertTriangle, ShieldAlert, Info, Activity } from 'lucide-react';
import { type Message, evaluateSafety, getSimulatedResponse, getGeminiResponse } from '../utils/shalomAgent';

interface ChatInterfaceProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  onNavigateToTool: (toolId: string) => void;
  onCheckInComplete: (answers: {
    painLevel: number;
    temperature: number;
    medsAdherence: number;
    mobility: 'None' | 'Limited' | 'Moderate' | 'Good';
    sleepQuality: 'Poor' | 'Fair' | 'Good';
    woundAppearance: 'Normal' | 'Mild Redness' | 'Redness & Swelling' | 'Drainage' | 'Infected';
    notes: string;
  }) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  apiKey, 
  setApiKey, 
  onNavigateToTool,
  onCheckInComplete 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'shalom',
      text: "Hello! I am Shalom, your AI Post-Operative Recovery Assistant. I am here to help you monitor your recovery, track medications, simplify discharge paperwork, and check for any clinical signs that need provider review.\n\nWould you like to start your daily recovery check-in?",
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  // Keep track of check-in answers accumulated during the guided chat
  const [checkInAnswers, setCheckInAnswers] = useState({
    painLevel: 4,
    temperature: 98.6,
    medsAdherence: 100,
    mobility: 'Limited' as 'None' | 'Limited' | 'Moderate' | 'Good',
    sleepQuality: 'Fair' as 'Poor' | 'Fair' | 'Good',
    woundAppearance: 'Normal' as 'Normal' | 'Mild Redness' | 'Redness & Swelling' | 'Drainage' | 'Infected',
    notes: ''
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    "Start Daily Recovery Check-in",
    "Log my pain level",
    "Is incision redness normal?",
    "What are my discharge activity rules?",
    "I am having chest pain and difficulty breathing!"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsTyping(true);

    // Parse check-in answers based on Shalom's previous question
    const shalomMessages = messages.filter(m => m.sender === 'shalom');
    const lastShalomText = shalomMessages[shalomMessages.length - 1]?.text || "";

    let newAnswers = { ...checkInAnswers };

    if (lastShalomText.includes("scale of 0 (no pain) to 10")) {
      const match = textToSend.match(/\d+/);
      const painVal = match ? parseInt(match[0]) : 5;
      newAnswers.painLevel = Math.max(0, Math.min(10, painVal));
      setCheckInAnswers(newAnswers);
    } else if (lastShalomText.includes("reading in degrees Fahrenheit")) {
      const match = textToSend.match(/\d+(\.\d+)?/);
      const tempVal = match ? parseFloat(match[0]) : 98.6;
      newAnswers.temperature = tempVal;
      setCheckInAnswers(newAnswers);
    } else if (lastShalomText.includes("recovery medications today")) {
      const lowerText = textToSend.toLowerCase();
      const didTake = lowerText.includes('yes') || lowerText.includes('took') || lowerText.includes('did') || lowerText.includes('all');
      newAnswers.medsAdherence = didTake ? 100 : (lowerText.includes('some') || lowerText.includes('half') ? 50 : 0);
      setCheckInAnswers(newAnswers);
    } else if (lastShalomText.includes("describe your mobility today")) {
      const lowerText = textToSend.toLowerCase();
      let mob: 'None' | 'Limited' | 'Moderate' | 'Good' = 'Limited';
      if (lowerText.includes('none') || lowerText.includes('bed') || lowerText.includes('resting')) mob = 'None';
      else if (lowerText.includes('moderate') || lowerText.includes('some') || lowerText.includes('walker')) mob = 'Moderate';
      else if (lowerText.includes('good') || lowerText.includes('well') || lowerText.includes('cane')) mob = 'Good';
      newAnswers.mobility = mob;
      setCheckInAnswers(newAnswers);
    } else if (lastShalomText.includes("sleep last night")) {
      const lowerText = textToSend.toLowerCase();
      let sl: 'Poor' | 'Fair' | 'Good' = 'Fair';
      if (lowerText.includes('poor') || lowerText.includes('bad') || lowerText.includes('couldn\'t')) sl = 'Poor';
      else if (lowerText.includes('good') || lowerText.includes('well') || lowerText.includes('great')) sl = 'Good';
      newAnswers.sleepQuality = sl;
      setCheckInAnswers(newAnswers);
    } else if (lastShalomText.includes("surgical wound")) {
      const lowerText = textToSend.toLowerCase();
      let wound: 'Normal' | 'Mild Redness' | 'Redness & Swelling' | 'Drainage' | 'Infected' = 'Normal';
      if (lowerText.includes('infected') || lowerText.includes('bad')) wound = 'Infected';
      else if (lowerText.includes('drain') || lowerText.includes('pus') || lowerText.includes('ooz')) wound = 'Drainage';
      else if (lowerText.includes('red') && lowerText.includes('swell')) wound = 'Redness & Swelling';
      else if (lowerText.includes('red')) wound = 'Mild Redness';
      newAnswers.woundAppearance = wound;
      setCheckInAnswers(newAnswers);
    } else if (lastShalomText.includes("drink fluids normally today")) {
      newAnswers.notes = `Logged via Check-in. Fluid status: ${textToSend}`;
      setCheckInAnswers(newAnswers);
      // Callback to app to update charts
      onCheckInComplete(newAnswers);
    }

    // Evaluate safety indicators
    const { isEmergency, isMedicalAdvice } = evaluateSafety(textToSend);

    // Simulate response delay
    setTimeout(async () => {
      let responseText = '';
      
      if (apiKey.trim() && !isEmergency && !isMedicalAdvice) {
        responseText = await getGeminiResponse(updatedMessages, apiKey, textToSend);
      } else {
        responseText = getSimulatedResponse(textToSend, updatedMessages);
      }

      const shalomMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'shalom',
        text: responseText,
        timestamp: new Date(),
        isEmergency,
        isMedicalWarning: isMedicalAdvice,
      };

      setMessages(prev => [...prev, shalomMessage]);
      setIsTyping(false);
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputText);
    }
  };

  const saveApiKey = () => {
    setApiKey(tempKey);
    setShowSettings(false);
  };

  return (
    <div className="chat-card">
      <div className="chat-header">
        <div className="chat-agent-info">
          <div className="agent-avatar" style={{ backgroundColor: 'var(--primary-dark)' }}>
            <Activity size={18} style={{ color: 'white' }} />
          </div>
          <div>
            <h3>Shalom AI</h3>
            <span className="agent-status">
              <span className="status-dot"></span> Post-Op Recovery Assistant
            </span>
          </div>
        </div>
        
        <button 
          className={`settings-toggle-btn ${apiKey ? 'has-key' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
          title="Configure API Settings"
        >
          <Key size={18} />
          {apiKey ? 'API Active' : 'Setup AI API'}
        </button>
      </div>

      {showSettings && (
        <div className="api-settings-panel">
          <h4>
            <Sparkles size={16} style={{ marginRight: '6px', color: 'var(--accent)' }} />
            Configure Google Gemini API (Optional)
          </h4>
          <p className="settings-desc">
            By default, Shalom runs on a high-fidelity local post-op check-in simulator. Enter a Google Gemini API key to unlock natural, open-ended clinical support.
          </p>
          <div className="api-key-input-row">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              className="settings-input"
            />
            <button className="btn-primary btn-sm" onClick={saveApiKey}>
              Save Key
            </button>
          </div>
          {apiKey && (
            <button 
              className="text-btn btn-danger-text" 
              onClick={() => { setApiKey(''); setTempKey(''); }}
              style={{ marginTop: '8px', fontSize: '12px' }}
            >
              Remove saved API key
            </button>
          )}
        </div>
      )}

      {/* Main chat window */}
      <div className="chat-messages-container">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`chat-bubble-wrapper ${isUser ? 'user-wrapper' : 'shalom-wrapper'}`}>
              {!isUser && <div className="bubble-avatar">S</div>}
              <div className={`chat-bubble ${isUser ? 'user-bubble' : 'shalom-bubble'} ${msg.isEmergency ? 'emergency-bubble' : ''} ${msg.isMedicalWarning ? 'warning-bubble' : ''}`}>
                
                {msg.isEmergency && (
                  <div className="bubble-alert-header emergency">
                    <ShieldAlert size={16} /> <span>🚨 EMERGENCY DIRECTIVE</span>
                  </div>
                )}

                {msg.isMedicalWarning && (
                  <div className="bubble-alert-header warning">
                    <AlertTriangle size={16} /> <span>⚠️ MEDICAL ADVICE DISCLAIMER</span>
                  </div>
                )}

                <div className="bubble-text">
                  {msg.text.split('\n').map((line, idx) => {
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      return <li key={idx} className="bubble-li">{line.substring(2)}</li>;
                    }
                    if (line.match(/^\d+\.\s/)) {
                      return <p key={idx} className="bubble-ol-item">{line}</p>;
                    }
                    return <p key={idx} className="bubble-paragraph">{line}</p>;
                  })}
                </div>

                <div className="bubble-meta">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Helper buttons to navigate tabs if suggested in responses */}
                {!isUser && msg.text.includes("Medication Tracker") && (
                  <button className="chat-action-btn" onClick={() => onNavigateToTool('meds')}>
                    Go to Medication Tracker →
                  </button>
                )}
                {!isUser && msg.text.includes("follow-up") && (
                  <button className="chat-action-btn" onClick={() => onNavigateToTool('visit')}>
                    Go to Surgeon Follow-up Prep →
                  </button>
                )}
                {!isUser && msg.text.includes("Discharge Decoder") && (
                  <button className="chat-action-btn" onClick={() => onNavigateToTool('decode')}>
                    Go to Discharge Decoder →
                  </button>
                )}
                {!isUser && msg.text.includes("Clinical Summary") && (
                  <button className="chat-action-btn" onClick={() => onNavigateToTool('support')}>
                    Go to Provider Reports →
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="chat-bubble-wrapper shalom-wrapper">
            <div className="bubble-avatar">S</div>
            <div className="chat-bubble shalom-bubble typing-bubble">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="suggestion-chips-container">
        {suggestionChips.map((chip, idx) => (
          <button 
            key={idx} 
            className={`suggestion-chip ${chip.includes('!') ? 'emergency-chip' : chip.includes('?') ? 'warning-chip' : ''}`}
            onClick={() => handleSendMessage(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Text Input Footer */}
      <div className="chat-input-footer">
        <input
          type="text"
          placeholder="Ask Shalom about incisions, pain, medications, check-ins..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
          className="chat-input"
        />
        <button 
          className="send-btn" 
          onClick={() => handleSendMessage(inputText)}
          disabled={!inputText.trim()}
          title="Send message"
        >
          <Send size={18} />
        </button>
      </div>

      <div className="medical-disclaimer-banner">
        <Info size={12} style={{ marginRight: '4px', flexShrink: 0 }} />
        <span>Shalom is a recovery tracker and educator. Shalom cannot diagnose conditions, prescribe medications, or replace professional clinical care.</span>
      </div>
    </div>
  );
};
