import React, { useState, useRef, useEffect } from 'react';
import { Send, Key, Sparkles, AlertTriangle, ShieldAlert, Info, Activity, ArrowRight, Play, CheckCircle } from 'lucide-react';
import { type Message, evaluateSafety, getSimulatedResponse, getGeminiResponse } from '../utils/shalomAgent';

interface ChatInterfaceProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  onCheckInComplete: (answers: {
    painLevel: number;
    temperature: number;
    medsAdherence: number;
    mobility: 'None' | 'Limited' | 'Moderate' | 'Good';
    sleepQuality: 'Poor' | 'Fair' | 'Good';
    woundAppearance: 'Normal' | 'Mild Redness' | 'Redness & Swelling' | 'Drainage' | 'Infected' | 'Getting Worse';
    notes: string;
    riskLevel: 'Green' | 'Yellow' | 'Red';
  }) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  apiKey, 
  setApiKey, 
  onCheckInComplete 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'shalom',
      text: "Hello! I am Shalom, your AI Post-Operative Recovery Assistant. I am here to help you monitor your recovery, track medications, simplify discharge paperwork, and check for any clinical signs that need provider review.\n\nLet's complete your daily recovery check-in together.",
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  const suggestionChips = [
    "Start Daily Recovery Check-in",
    "Log my pain level",
    "Is incision redness normal?",
    "What are my discharge activity rules?",
    "I am having chest pain and difficulty breathing!"
  ];

  // Guided Check-in Steps: 
  // -1 = Not started, 0 = Pain, 1 = Fever, 2 = Medications, 3 = Incision, 4 = Mobility, 5 = Unusual Symptoms, 6 = Completed
  const [checkInStep, setCheckInStep] = useState<number>(-1);
  const [answers, setAnswers] = useState({
    painLevel: 5,
    hasFever: false,
    temperature: 98.6,
    medsTaken: true,
    incisionIssues: [] as string[],
    mobility: 'Moderate' as 'None' | 'Limited' | 'Moderate' | 'Good',
    unusualSymptoms: [] as string[],
    notes: ''
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Guided Check-In Questions definitions
  const checkInQuestions = [
    "What is your pain level today from 1 to 10?",
    "Do you have a fever? (Select Yes if your temperature is 100.4°F / 38°C or higher)",
    "Did you take your medication today?",
    "Is your incision red, swollen, draining, or getting worse? (Select all that apply)",
    "How is your mobility today?",
    "Do you have any unusual symptoms? (Select all that apply)"
  ];

  const handleStartCheckIn = () => {
    setCheckInStep(0);
    const welcomeMsg = "Great, let's begin your daily check-in. " + checkInQuestions[0];
    
    // Reset answers
    setAnswers({
      painLevel: 5,
      hasFever: false,
      temperature: 98.6,
      medsTaken: true,
      incisionIssues: [],
      mobility: 'Moderate',
      unusualSymptoms: [],
      notes: ''
    });

    setMessages(prev => [
      ...prev,
      {
        id: 'start-check-in-intro',
        sender: 'shalom',
        text: welcomeMsg,
        timestamp: new Date()
      }
    ]);
  };

  const handleInteractiveSubmit = (userText: string, updatedAnswers: typeof answers) => {
    setIsTyping(true);
    
    // Add user bubble
    const userBubble: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date()
    };
    
    const updatedMessages = [...messages, userBubble];
    setMessages(updatedMessages);

    // Calculate next step
    const nextStep = checkInStep + 1;
    setCheckInStep(nextStep);

    setTimeout(() => {
      let nextResponseText = "";
      
      if (nextStep < 6) {
        nextResponseText = checkInQuestions[nextStep];
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'shalom',
            text: nextResponseText,
            timestamp: new Date()
          }
        ]);
        setIsTyping(false);
      } else {
        // Complete the check-in and calculate risk
        let calculatedRisk: 'Green' | 'Yellow' | 'Red' = 'Green';
        
        // Red flags
        const hasSevereIncision = updatedAnswers.incisionIssues.includes('Infected') || 
                                  updatedAnswers.incisionIssues.includes('Drainage') || 
                                  updatedAnswers.incisionIssues.includes('Getting Worse');
        const hasEmergencySymptoms = updatedAnswers.unusualSymptoms.includes('Chest pain') || 
                                     updatedAnswers.unusualSymptoms.includes('Difficulty breathing') ||
                                     updatedAnswers.unusualSymptoms.includes('Uncontrolled bleeding');
        const hasSevereSymptoms = updatedAnswers.unusualSymptoms.includes('Severe nausea/vomiting') ||
                                  updatedAnswers.unusualSymptoms.includes('Extreme dizziness/weakness');

        if (
          updatedAnswers.painLevel >= 8 || 
          updatedAnswers.hasFever || 
          updatedAnswers.temperature >= 100.4 ||
          hasSevereIncision || 
          hasEmergencySymptoms ||
          hasSevereSymptoms
        ) {
          calculatedRisk = 'Red';
        }
        // Yellow flags
        else if (
          (updatedAnswers.painLevel >= 5 && updatedAnswers.painLevel <= 7) ||
          updatedAnswers.incisionIssues.includes('Mild Redness') ||
          updatedAnswers.incisionIssues.includes('Swelling') ||
          !updatedAnswers.medsTaken ||
          updatedAnswers.mobility === 'Limited' ||
          updatedAnswers.mobility === 'None' ||
          updatedAnswers.unusualSymptoms.length > 0
        ) {
          calculatedRisk = 'Yellow';
        }

        // Generate warm feedback response based on risk level
        if (hasEmergencySymptoms) {
          nextResponseText = "🚨 **EMERGENCY WARNING** 🚨\n\nBased on your reported symptoms (such as chest pain or difficulty breathing), please **call 911 or report to the nearest emergency department immediately**. These symptoms require immediate medical attention.";
        } else if (calculatedRisk === 'Red') {
          nextResponseText = "Thank you for completing today's check-in. I'm sorry you are feeling this way. Based on what you reported, **your symptoms may need review by your healthcare team**. Please contact your surgeon or healthcare provider's office directly today.";
        } else if (calculatedRisk === 'Yellow') {
          nextResponseText = "Thank you for sharing that information. Your answers suggest your recovery **needs monitoring**. I have highlighted this for your nursing team. Please contact your care team if these symptoms worsen or do not improve.";
        } else {
          nextResponseText = "Thank you for sharing. Your answers indicate your recovery is **stable and progressing well**. Continue to rest, take your medications, and follow your discharge instructions.";
        }

        const isEmergency = hasEmergencySymptoms;
        
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'shalom',
            text: nextResponseText,
            timestamp: new Date(),
            isEmergency,
            isMedicalWarning: calculatedRisk === 'Red' && !isEmergency
          }
        ]);

        // Submit to parent state (updates Arthur's patient info in Nurse Dashboard)
        let woundLabel: 'Normal' | 'Mild Redness' | 'Redness & Swelling' | 'Drainage' | 'Infected' | 'Getting Worse' = 'Normal';
        if (updatedAnswers.incisionIssues.includes('Getting Worse')) woundLabel = 'Getting Worse';
        else if (updatedAnswers.incisionIssues.includes('Infected')) woundLabel = 'Infected';
        else if (updatedAnswers.incisionIssues.includes('Drainage')) woundLabel = 'Drainage';
        else if (updatedAnswers.incisionIssues.includes('Swelling') && updatedAnswers.incisionIssues.includes('Mild Redness')) woundLabel = 'Redness & Swelling';
        else if (updatedAnswers.incisionIssues.includes('Mild Redness')) woundLabel = 'Mild Redness';
        else if (updatedAnswers.incisionIssues.includes('Swelling')) woundLabel = 'Redness & Swelling';

        onCheckInComplete({
          painLevel: updatedAnswers.painLevel,
          temperature: updatedAnswers.temperature,
          medsAdherence: updatedAnswers.medsTaken ? 100 : 0,
          mobility: updatedAnswers.mobility,
          sleepQuality: 'Good',
          woundAppearance: woundLabel,
          notes: `Check-in symptoms: ${updatedAnswers.unusualSymptoms.join(', ') || 'None'}. Incision: ${updatedAnswers.incisionIssues.join(', ') || 'Normal'}`,
          riskLevel: calculatedRisk
        });

        setIsTyping(false);
      }
    }, 800);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Add user bubble
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    const { isEmergency, isMedicalAdvice } = evaluateSafety(textToSend);

    setTimeout(async () => {
      let responseText = '';
      
      if (apiKey.trim() && !isEmergency && !isMedicalAdvice) {
        responseText = await getGeminiResponse([...messages, userMessage], apiKey, textToSend);
      } else {
        responseText = getSimulatedResponse(textToSend, [...messages, userMessage]);
      }

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'shalom',
          text: responseText,
          timestamp: new Date(),
          isEmergency,
          isMedicalWarning: isMedicalAdvice,
        }
      ]);
      setIsTyping(false);
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputText);
    }
  };

  // Renders the interactive custom controls for each step of the check-in
  const renderInteractiveControls = () => {
    if (checkInStep === -1) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
          <button className="btn-primary" onClick={handleStartCheckIn} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '15px' }}>
            <Play size={16} /> Start Patient Daily Check-In
          </button>
        </div>
      );
    }

    if (checkInStep === 0) { // Pain (1-10)
      return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '400px' }}>
            <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 'bold' }}>1 (Mild)</span>
            <strong style={{ fontSize: '20px', color: answers.painLevel >= 8 ? 'var(--danger)' : answers.painLevel >= 5 ? 'var(--warning)' : 'var(--success)' }}>
              Pain: {answers.painLevel} / 10
            </strong>
            <span style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 'bold' }}>10 (Severe)</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={answers.painLevel}
            onChange={(e) => setAnswers({ ...answers, painLevel: parseInt(e.target.value) })}
            style={{ width: '100%', maxWidth: '400px', accentColor: 'var(--primary)' }}
          />
          <button 
            className="btn-primary" 
            onClick={() => handleInteractiveSubmit(`My pain level is ${answers.painLevel} out of 10.`, answers)}
            style={{ marginTop: '8px', padding: '8px 16px', fontSize: '13px' }}
          >
            Submit Pain Level <ArrowRight size={14} style={{ marginLeft: '6px' }} />
          </button>
        </div>
      );
    }

    if (checkInStep === 1) { // Fever (Yes/No)
      return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button 
              className={`checkbox-btn ${answers.hasFever ? 'active' : ''}`}
              onClick={() => setAnswers({ ...answers, hasFever: true, temperature: 100.6 })}
              style={{ width: '120px', padding: '12px', fontSize: '14px' }}
            >
              Yes, I have a fever
            </button>
            <button 
              className={`checkbox-btn ${!answers.hasFever ? 'active' : ''}`}
              onClick={() => setAnswers({ ...answers, hasFever: false, temperature: 98.6 })}
              style={{ width: '120px', padding: '12px', fontSize: '14px' }}
            >
              No fever
            </button>
          </div>
          
          {answers.hasFever && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-light)', padding: '10px 16px', borderRadius: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Specify Temperature (°F):</label>
              <input
                type="number"
                step="0.1"
                min="97.0"
                max="105.0"
                value={answers.temperature}
                onChange={(e) => setAnswers({ ...answers, temperature: parseFloat(e.target.value) })}
                style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', textAlign: 'center' }}
              />
            </div>
          )}

          <button 
            className="btn-primary" 
            onClick={() => {
              const text = answers.hasFever 
                ? `Yes, I have a fever. My temperature is ${answers.temperature}°F.` 
                : "No, I do not have a fever.";
              handleInteractiveSubmit(text, answers);
            }}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Submit Fever Status <ArrowRight size={14} style={{ marginLeft: '6px' }} />
          </button>
        </div>
      );
    }

    if (checkInStep === 2) { // Medications (Yes/No)
      return (
        <div style={{ padding: '16px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button 
            className="checkbox-btn active"
            onClick={() => {
              const updated = { ...answers, medsTaken: true };
              setAnswers(updated);
              handleInteractiveSubmit("Yes, I took all my scheduled recovery medications today.", updated);
            }}
            style={{ width: '160px', padding: '14px', fontSize: '14px', borderColor: 'var(--success)' }}
          >
            Yes, took medications
          </button>
          <button 
            className="checkbox-btn"
            onClick={() => {
              const updated = { ...answers, medsTaken: false };
              setAnswers(updated);
              handleInteractiveSubmit("No, I missed some or all of my recovery medications today.", updated);
            }}
            style={{ width: '160px', padding: '14px', fontSize: '14px', borderColor: 'var(--warning)' }}
          >
            No, missed medication
          </button>
        </div>
      );
    }

    if (checkInStep === 3) { // Incision (Multi-select)
      const options = ["Normal", "Mild Redness", "Swelling", "Drainage / Leaking", "Getting Worse"];
      
      const toggleIncision = (opt: string) => {
        let updatedIssues = [...answers.incisionIssues];
        if (opt === "Normal") {
          updatedIssues = ["Normal"];
        } else {
          updatedIssues = updatedIssues.filter(item => item !== "Normal");
          if (updatedIssues.includes(opt)) {
            updatedIssues = updatedIssues.filter(item => item !== opt);
          } else {
            updatedIssues.push(opt);
          }
        }
        setAnswers({ ...answers, incisionIssues: updatedIssues });
      };

      return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '450px' }}>
            {options.map(opt => {
              const isSelected = answers.incisionIssues.includes(opt) || (opt === 'Normal' && answers.incisionIssues.length === 0);
              return (
                <button
                  key={opt}
                  className={`checkbox-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => toggleIncision(opt)}
                  style={{ padding: '8px 14px', fontSize: '13px' }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <button 
            className="btn-primary" 
            onClick={() => {
              const selected = answers.incisionIssues.length > 0 ? answers.incisionIssues.join(', ') : "Normal";
              handleInteractiveSubmit(`Incision condition reported: ${selected}.`, answers);
            }}
            style={{ marginTop: '8px', padding: '8px 16px', fontSize: '13px' }}
          >
            Submit Incision Status <ArrowRight size={14} style={{ marginLeft: '6px' }} />
          </button>
        </div>
      );
    }

    if (checkInStep === 4) { // Mobility
      const options: Array<{ label: string; val: 'None' | 'Limited' | 'Moderate' | 'Good' }> = [
        { label: "Resting in bed / chair (None)", val: 'None' },
        { label: "Limited (walking with support)", val: 'Limited' },
        { label: "Moderate (light walking inside)", val: 'Moderate' },
        { label: "Good (moving around comfortably)", val: 'Good' }
      ];

      return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '350px' }}>
            {options.map(opt => (
              <button
                key={opt.val}
                className={`checkbox-btn ${answers.mobility === opt.val ? 'active' : ''}`}
                onClick={() => setAnswers({ ...answers, mobility: opt.val })}
                style={{ padding: '10px 14px', fontSize: '13px', textAlign: 'left' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button 
            className="btn-primary" 
            onClick={() => handleInteractiveSubmit(`My mobility is: ${answers.mobility}.`, answers)}
            style={{ marginTop: '8px', padding: '8px 16px', fontSize: '13px' }}
          >
            Submit Mobility <ArrowRight size={14} style={{ marginLeft: '6px' }} />
          </button>
        </div>
      );
    }

    if (checkInStep === 5) { // Unusual Symptoms (Emergency triggers check)
      const options = ["None", "Chest pain", "Difficulty breathing", "Uncontrolled bleeding", "Severe nausea/vomiting", "Extreme dizziness/weakness"];
      
      const toggleSymptom = (opt: string) => {
        let updated = [...answers.unusualSymptoms];
        if (opt === "None") {
          updated = ["None"];
        } else {
          updated = updated.filter(item => item !== "None");
          if (updated.includes(opt)) {
            updated = updated.filter(item => item !== opt);
          } else {
            updated.push(opt);
          }
        }
        setAnswers({ ...answers, unusualSymptoms: updated });
      };

      return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '450px' }}>
            {options.map(opt => {
              const isSelected = answers.unusualSymptoms.includes(opt) || (opt === 'None' && answers.unusualSymptoms.length === 0);
              const isEmergencyOpt = opt === "Chest pain" || opt === "Difficulty breathing" || opt === "Uncontrolled bleeding";
              return (
                <button
                  key={opt}
                  className={`checkbox-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => toggleSymptom(opt)}
                  style={{ 
                    padding: '8px 14px', 
                    fontSize: '13px',
                    borderColor: isSelected ? 'var(--primary)' : (isEmergencyOpt ? '#ff8b8b' : 'var(--border-color)')
                  }}
                >
                  {opt} {isEmergencyOpt && "⚠️"}
                </button>
              );
            })}
          </div>
          <button 
            className="btn-primary" 
            onClick={() => {
              const selected = answers.unusualSymptoms.length > 0 ? answers.unusualSymptoms.join(', ') : "None";
              handleInteractiveSubmit(`Unusual symptoms: ${selected}.`, answers);
            }}
            style={{ marginTop: '8px', padding: '8px 16px', fontSize: '13px' }}
          >
            Submit & Complete Check-In <ArrowRight size={14} style={{ marginLeft: '6px' }} />
          </button>
        </div>
      );
    }

    if (checkInStep === 6) { // Completed
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)' }}>
            <CheckCircle size={20} />
            <strong style={{ fontSize: '15px' }}>Daily Check-In Completed Successfully</strong>
          </div>
          <button className="btn-secondary" onClick={() => setCheckInStep(-1)} style={{ fontSize: '12px', padding: '6px 12px' }}>
            Reset & Start New Check-In
          </button>
        </div>
      );
    }

    return null;
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
          style={{ display: checkInStep !== -1 ? 'none' : 'flex' }}
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
      <div className="chat-messages-container" style={{ minHeight: '350px' }}>
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

      {/* Interactive Questionnaire Panel */}
      <div style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-light)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
        {renderInteractiveControls()}
      </div>

      {/* Manual Input Footer - Disabled during guided check-in to prevent flow disruptions */}
      {checkInStep === -1 && (
        <>
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

          <div className="chat-input-footer">
            <input
              type="text"
              placeholder="Ask Shalom about your surgery recovery or type 'Check-In'..."
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
        </>
      )}

      <div className="medical-disclaimer-banner">
        <Info size={12} style={{ marginRight: '4px', flexShrink: 0 }} />
        <span>Shalom is a recovery tracker and educator. Shalom cannot diagnose conditions, prescribe medications, or replace professional clinical care.</span>
      </div>
    </div>
  );
};
