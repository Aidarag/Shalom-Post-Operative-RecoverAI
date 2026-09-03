import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle, 
  RotateCcw,
  Volume2, 
  VolumeX,
  Sparkles, 
  Mic, 
  MessageSquare, 
  ClipboardList, 
  ShieldCheck, 
  Check, 
  Activity, 
  Calendar, 
  ChevronRight, 
  TrendingUp, 
  Flame,
  Clock
} from 'lucide-react';
import { 
  type Message, 
  type CheckInAnswers, 
  type CareTeamReport,
  classifyRisk, 
  generateCareTeamReport, 
  evaluateSafety, 
  getGeminiResponse,
  searchFAQDataset,
  getSimulatedResponse
} from '../utils/shalomAgent';

interface ChatInterfaceProps {
  apiKey: string;
  onCheckInComplete: (
    answers: CheckInAnswers, 
    status: 'Green' | 'Yellow' | 'Red' | 'Emergency', 
    report: CareTeamReport
  ) => void;
  presetScenarioTrigger: CheckInAnswers | null;
  clearPresetScenarioTrigger: () => void;
  onResetStatus: () => void;
  medicalHistory: any | null;
  faqDataset: any | null;
  isTtsEnabled: boolean;
  selectedVoiceName: string;
  voices: SpeechSynthesisVoice[];
  ttsSpeed?: number;
  checkInComplete?: boolean;
  lastCheckInAnswers?: CheckInAnswers | null;
  currentRecoveryStatus?: 'Green' | 'Yellow' | 'Red' | 'Emergency' | string;
  onNavigateToProgress?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  apiKey,
  onCheckInComplete,
  presetScenarioTrigger,
  clearPresetScenarioTrigger,
  onResetStatus,
  medicalHistory,
  faqDataset,
  isTtsEnabled,
  selectedVoiceName,
  voices,
  ttsSpeed = 1,
  checkInComplete = false,
  lastCheckInAnswers,
  currentRecoveryStatus: _currentRecoveryStatus = 'Green',
  onNavigateToProgress
}) => {
  // Mobile / Tab switch state: 'chat' or 'work'
  const [mobileSide, setMobileSide] = useState<'chat' | 'work'>('chat');

  // Chat conversation state (strictly for questions & clinical inquiries)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-q',
      sender: 'shalom',
      text: "Hello Aïda! I'm Shalom, your personal Post-Operative Recovery Assistant.\n\nUse this chat side to ask any questions about your medications, icing, swelling, mobility, showering, or recovery timelines. I'm here to support you 24/7!",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Work Side State: Daily Clinical Check-In
  const [isCheckInSubmitted, setIsCheckInSubmitted] = useState<boolean>(checkInComplete);
  const [checkInStep, setCheckInStep] = useState<number>(0); // 0 to 5 for the 6 steps
  const [answers, setAnswers] = useState<CheckInAnswers>(
    lastCheckInAnswers || {
      painLevel: 4,
      hasFever: false,
      temperature: 98.6,
      medsTaken: true,
      incisionIssues: ['Normal'],
      mobility: 'Okay',
      unusualSymptoms: ['None']
    }
  );

  // Keep internal answers synced with prop if updated externally
  useEffect(() => {
    if (lastCheckInAnswers) {
      setAnswers(lastCheckInAnswers);
    }
    if (checkInComplete) {
      setIsCheckInSubmitted(true);
    }
  }, [lastCheckInAnswers, checkInComplete]);

  // Handle Preset Scenarios trigger
  useEffect(() => {
    if (presetScenarioTrigger) {
      setAnswers(presetScenarioTrigger);
      const status = classifyRisk(presetScenarioTrigger);
      const report = generateCareTeamReport(presetScenarioTrigger, status);
      onCheckInComplete(presetScenarioTrigger, status, report);
      setIsCheckInSubmitted(true);
      clearPresetScenarioTrigger();
    }
  }, [presetScenarioTrigger, onCheckInComplete, clearPresetScenarioTrigger]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Voice synthesis (TTS)
  const speakText = (text: string) => {
    if (!isTtsEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);

    if (selectedVoiceName && voices.length > 0) {
      const voiceObj = voices.find(v => v.name === selectedVoiceName);
      if (voiceObj) utterance.voice = voiceObj;
    }
    utterance.rate = ttsSpeed;
    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeakMessage = (id: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (playingMessageId === id) {
      window.speechSynthesis.cancel();
      setPlayingMessageId(null);
    } else {
      window.speechSynthesis.cancel();
      setPlayingMessageId(id);
      const cleanText = text.replace(/[*_#`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (selectedVoiceName && voices.length > 0) {
        const voiceObj = voices.find(v => v.name === selectedVoiceName);
        if (voiceObj) utterance.voice = voiceObj;
      }
      utterance.rate = ttsSpeed;
      utterance.onend = () => setPlayingMessageId(null);
      utterance.onerror = () => setPlayingMessageId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Chat send message handler (strictly questions & advice)
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const faqMatch = searchFAQDataset(textToSend, faqDataset);
    const { isEmergency, isMedicalAdvice } = evaluateSafety(textToSend);

    const userMessage: Message = {
      id: `user-msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    setTimeout(async () => {
      let responseText = '';
      const serializedHistory = medicalHistory ? JSON.stringify(medicalHistory, null, 2) : undefined;

      if (isEmergency) {
        responseText = "** EMERGENCY DIRECTIVE **\n\nBased on your reported symptoms (such as chest pain or severe shortness of breath), please **call 911 or go to the nearest emergency department immediately**. These signs require urgent, in-person clinical care.";
      } else if (apiKey.trim() && !isMedicalAdvice) {
        responseText = await getGeminiResponse([...messages, userMessage], apiKey, textToSend, serializedHistory, faqDataset);
      } else {
        if (faqMatch.matched && faqMatch.response) {
          responseText = faqMatch.response;
        } else {
          responseText = getSimulatedResponse(textToSend, [...messages, userMessage], medicalHistory, faqDataset);
        }
      }

      const botBubble: Message = {
        id: `shalom-resp-${Date.now()}`,
        sender: 'shalom',
        text: responseText,
        timestamp: new Date(),
        isEmergency,
        isMedicalWarning: isMedicalAdvice
      };

      setMessages(prev => [...prev, botBubble]);
      setIsTyping(false);
      speakText(responseText);
    }, 700);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputText);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'shalom',
        text: "Conversation refreshed. Ask me anything about your recovery, exercises, wound care, or medications!",
        timestamp: new Date()
      }
    ]);
  };

  // Suggested question chips
  const prebakedQueries = [
    "Can I shower with my knee dressing?",
    "Is swelling normal at Day 6 post-op?",
    "When is it safe to start driving?",
    "Tips to reduce nighttime knee pain"
  ];

  // Work Side: Check-in complete submission
  const handleCompleteCheckIn = (finalAnswers: CheckInAnswers) => {
    const status = classifyRisk(finalAnswers);
    const report = generateCareTeamReport(finalAnswers, status);

    onCheckInComplete(finalAnswers, status, report);
    setIsCheckInSubmitted(true);

    // Notify user in Chat side
    const summaryMsg = `I've analyzed your Day 6 check-in! Your Recovery Status has been updated on your Work Board.\n\n` +
      `- **Pain Level**: ${finalAnswers.painLevel}/10\n` +
      `- **Temperature**: ${finalAnswers.temperature || 98.6}°F (${finalAnswers.hasFever ? 'Fever reported' : 'Normal'})\n` +
      `- **Medications**: ${finalAnswers.medsTaken ? 'All Taken ✓' : 'Missed Some'}\n` +
      `- **Overall Protocol**: ${status === 'Green' ? 'Normal & Stable (On Track)' : status === 'Yellow' ? 'Attention Needed' : 'Clinical Review Needed'}\n\n` +
      `Feel free to ask me any questions about your results or today's activities!`;

    setMessages(prev => [
      ...prev,
      {
        id: `shalom-checkin-ack-${Date.now()}`,
        sender: 'shalom',
        text: summaryMsg,
        timestamp: new Date()
      }
    ]);
    speakText("I've analyzed your Day 6 check-in! Your recovery status is now updated.");
  };

  // Retake check-in
  const handleRetakeCheckIn = () => {
    setIsCheckInSubmitted(false);
    setCheckInStep(0);
    onResetStatus();
  };

  // ==========================================
  // RENDER WORK SIDE: CHECK-IN WORKFLOW
  // ==========================================
  const renderCheckInWorkflow = () => {
    const stepsTitle = [
      "1. Pain Assessment",
      "2. Oral Temperature",
      "3. Medication Adherence",
      "4. Wound & Incision Safety",
      "5. Knee Mobility",
      "6. Safety & Symptoms"
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        {/* Step Indicator Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {stepsTitle[checkInStep]}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
              Step {checkInStep + 1} of 6
            </span>
          </div>

          <div className="work-step-pills">
            {[0, 1, 2, 3, 4, 5].map(idx => (
              <div 
                key={idx} 
                className={`work-step-pill ${checkInStep === idx ? 'active' : checkInStep > idx ? 'completed' : ''}`}
                onClick={() => setCheckInStep(idx)}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Step Content Panels */}
        <div style={{
          background: 'var(--bg-glass-card)',
          border: '1.5px solid var(--border-glass)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          flex: 1
        }}>
          {/* STEP 0: PAIN LEVEL (1-10) */}
          {checkInStep === 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Activity size={18} style={{ color: 'var(--primary)' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  How would you rate your knee pain right now?
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                On a scale from 1 (minimal discomfort) to 10 (unbearable pain).
              </p>

              <div style={{
                background: '#ffffff',
                border: '1px solid var(--border-glass)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>Mild (1)</span>
                  <div style={{
                    padding: '4px 14px',
                    borderRadius: '20px',
                    background: answers.painLevel >= 8 ? 'rgba(225, 29, 72, 0.1)' : answers.painLevel >= 5 ? 'rgba(217, 119, 6, 0.1)' : 'var(--primary-light)',
                    color: answers.painLevel >= 8 ? '#E11D48' : answers.painLevel >= 5 ? '#D97706' : 'var(--primary)',
                    fontWeight: 800,
                    fontSize: '14px'
                  }}>
                    Pain: {answers.painLevel} / 10 &bull; {answers.painLevel <= 3 ? 'Mild' : answers.painLevel <= 6 ? 'Moderate' : 'Severe'}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#E11D48' }}>Severe (10)</span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="10"
                  value={answers.painLevel}
                  onChange={(e) => setAnswers({ ...answers, painLevel: parseInt(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--primary)', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <span key={n}>{n}</span>)}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: TEMPERATURE & FEVER */}
          {checkInStep === 1 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Flame size={18} style={{ color: 'var(--primary)' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Do you have an elevated temperature or fever?
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                Post-operative fever over 100.4°F is an important healing indicator.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setAnswers({ ...answers, hasFever: false, temperature: 98.6 })}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    border: !answers.hasFever ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
                    background: !answers.hasFever ? 'var(--primary-light)' : '#ffffff',
                    color: !answers.hasFever ? 'var(--primary-dark)' : 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>No Fever</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Normal (~98.6°F)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAnswers({ ...answers, hasFever: true, temperature: 100.6 })}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    border: answers.hasFever ? '2px solid #D97706' : '1px solid var(--border-glass)',
                    background: answers.hasFever ? '#FEF3C7' : '#ffffff',
                    color: answers.hasFever ? '#B45309' : 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>Yes, Running a Fever</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Feeling warm / chills</span>
                </button>
              </div>

              {answers.hasFever && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>Exact Temperature (°F):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="97.0"
                    max="106.0"
                    value={answers.temperature}
                    onChange={(e) => setAnswers({ ...answers, temperature: parseFloat(e.target.value) || 100.4 })}
                    style={{
                      width: '80px',
                      padding: '6px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--primary)',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--primary)'
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 2: MEDICATION ADHERENCE */}
          {checkInStep === 2 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Clock size={18} style={{ color: 'var(--primary)' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Did you take your scheduled recovery medications today?
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                Including prescribed anti-inflammatories, analgesics, and supplements.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAnswers({ ...answers, medsTaken: true })}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: answers.medsTaken ? '2px solid #059669' : '1px solid var(--border-glass)',
                    background: answers.medsTaken ? 'rgba(5, 150, 105, 0.08)' : '#ffffff',
                    color: answers.medsTaken ? '#059669' : 'var(--text-main)',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Check size={16} strokeWidth={3} /> Yes, All Taken
                </button>

                <button
                  type="button"
                  onClick={() => setAnswers({ ...answers, medsTaken: false })}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: !answers.medsTaken ? '2px solid #D97706' : '1px solid var(--border-glass)',
                    background: !answers.medsTaken ? '#FEF3C7' : '#ffffff',
                    color: !answers.medsTaken ? '#B45309' : 'var(--text-main)',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  Missed Some / All
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: INCISION SITE ISSUES */}
          {checkInStep === 3 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  How does your surgical incision dressing appear today?
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                Select all that apply to your left knee dressing.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {["Normal (Clean & Dry)", "Mild Redness", "Swelling", "Drainage", "Getting Worse"].map(opt => {
                  const isSelected = opt === "Normal (Clean & Dry)" 
                    ? answers.incisionIssues.includes("Normal") 
                    : answers.incisionIssues.includes(opt);

                  const toggleOption = () => {
                    if (opt === "Normal (Clean & Dry)") {
                      setAnswers({ ...answers, incisionIssues: ["Normal"] });
                    } else {
                      let updated = answers.incisionIssues.filter(i => i !== "Normal");
                      if (updated.includes(opt)) {
                        updated = updated.filter(i => i !== opt);
                        if (updated.length === 0) updated = ["Normal"];
                      } else {
                        updated.push(opt);
                      }
                      setAnswers({ ...answers, incisionIssues: updated });
                    }
                  };

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={toggleOption}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
                        background: isSelected ? 'var(--primary-light)' : '#ffffff',
                        color: isSelected ? 'var(--primary-dark)' : 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: KNEE MOBILITY */}
          {checkInStep === 4 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  How is your walking and knee movement today?
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                Movement consistency promotes safe tissue healing.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: "Okay (moving around normally with crutch/walker)", val: 'Okay' as const },
                  { label: "Getting harder to walk or exercise", val: 'Getting harder' as const },
                  { label: "Restricted (resting in bed/chair)", val: 'Restricted' as const }
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setAnswers({ ...answers, mobility: opt.val })}
                    style={{
                      padding: '14px',
                      borderRadius: '14px',
                      border: answers.mobility === opt.val ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
                      background: answers.mobility === opt.val ? 'var(--primary-light)' : '#ffffff',
                      color: answers.mobility === opt.val ? 'var(--primary-dark)' : 'var(--text-main)',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: WARNING SYMPTOMS CHECK */}
          {checkInStep === 5 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <ShieldAlert size={18} style={{ color: 'var(--primary)' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Are you experiencing any warning symptoms?
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                Select "None" if you are feeling safe and stable.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  "None",
                  "Chest pain",
                  "Difficulty breathing",
                  "Uncontrolled bleeding",
                  "Severe dizziness",
                  "Symptoms getting much worse"
                ].map(opt => {
                  const isSelected = answers.unusualSymptoms.includes(opt);
                  const isEmergencyOpt = ["Chest pain", "Difficulty breathing", "Uncontrolled bleeding"].includes(opt);

                  const toggleSymptom = () => {
                    if (opt === "None") {
                      setAnswers({ ...answers, unusualSymptoms: ["None"] });
                    } else {
                      let updated = answers.unusualSymptoms.filter(s => s !== "None");
                      if (updated.includes(opt)) {
                        updated = updated.filter(s => s !== opt);
                        if (updated.length === 0) updated = ["None"];
                      } else {
                        updated.push(opt);
                      }
                      setAnswers({ ...answers, unusualSymptoms: updated });
                    }
                  };

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={toggleSymptom}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: isSelected 
                          ? (isEmergencyOpt ? '2px solid #E11D48' : '2px solid var(--primary)') 
                          : '1px solid var(--border-glass)',
                        background: isSelected 
                          ? (isEmergencyOpt ? '#FFE4E6' : 'var(--primary-light)') 
                          : '#ffffff',
                        color: isSelected 
                          ? (isEmergencyOpt ? '#BE123C' : 'var(--primary-dark)') 
                          : 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Bottom Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-glass)' }}>
            {checkInStep > 0 ? (
              <button
                type="button"
                onClick={() => setCheckInStep(prev => prev - 1)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-glass)',
                  background: '#ffffff',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Back
              </button>
            ) : <div />}

            {checkInStep < 5 ? (
              <button
                type="button"
                onClick={() => setCheckInStep(prev => prev + 1)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px var(--primary-glow)'
                }}
              >
                Next Step <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleCompleteCheckIn(answers)}
                style={{
                  padding: '10px 22px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px var(--primary-glow)'
                }}
              >
                Submit Daily Check-In <CheckCircle size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER WORK SIDE: DYNAMIC RECOVERY STATUS RESPONSE
  // ==========================================
  const renderRecoveryStatusResponse = () => {
    const pain = answers.painLevel;
    const temp = answers.temperature || 98.6;
    const hasFever = answers.hasFever || temp >= 100.4;
    const meds = answers.medsTaken;
    const incision = answers.incisionIssues;
    const symptoms = answers.unusualSymptoms;

    const isEmergency = symptoms.some(s => ["Chest pain", "Difficulty breathing", "Uncontrolled bleeding", "Loss of consciousness"].includes(s));
    const isRed = !isEmergency && (pain >= 8 || temp >= 101.5 || symptoms.includes("Symptoms getting much worse") || incision.includes("Getting Worse"));
    const isYellow = !isEmergency && !isRed && (pain >= 5 || hasFever || !meds || incision.some(i => ["Mild Redness", "Swelling", "Drainage"].includes(i)));
    const isGreen = !isEmergency && !isRed && !isYellow;

    let heroTitle = "You’re doing great!";
    let heroSubtitle = "Your recovery is on track. Pain is controlled at " + pain + "/10 and tissue recovery is ahead of Day 6 baseline.";
    let statusBadgeText = "ON TRACK";
    let statusBadgeBg = "#DCFCE7";
    let statusBadgeColor = "#15803D";
    let shalomSpeech = "Small steps today, stronger you tomorrow. Keep taking short walks and hydrating well!";

    if (isYellow) {
      heroTitle = "Attention Recommended Today";
      heroSubtitle = !meds 
        ? "You missed scheduled medications. Taking anti-inflammatories on time keeps swelling down."
        : pain >= 5 
          ? `Pain level of ${pain}/10 is slightly elevated. Rest, ice for 20 minutes, and elevate your leg.`
          : "Mild symptoms logged. Continue standard monitoring and contact your care team if anything changes.";
      statusBadgeText = "MONITORING PROTOCOL";
      statusBadgeBg = "#FEF3C7";
      statusBadgeColor = "#B45309";
      shalomSpeech = "Rest and elevation are your superpowers right now. Don't push through pain—ice for 20 minutes and rest.";
    } else if (isRed || isEmergency) {
      heroTitle = "Clinical Review Recommended";
      heroSubtitle = isEmergency
        ? "Critical warning symptoms reported. Please call 911 or visit the emergency room immediately."
        : `Elevated pain (${pain}/10) or concerning incision signs reported. Please notify Dr. Carter's clinic desk.`;
      statusBadgeText = isEmergency ? "EMERGENCY ALERT" : "CLINICAL REVIEW";
      statusBadgeBg = "#FFE4E6";
      statusBadgeColor = "#BE123C";
      shalomSpeech = "Your health is the top priority. Please speak directly with Dr. Carter's clinic hotline right away.";
    }

    return (
      <div 
        className="shalom-letter-card" 
        style={{ 
          padding: '22px', 
          background: '#ffffff', 
          border: '1px solid rgba(226, 232, 240, 0.9)', 
          borderRadius: '24px', 
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)', 
          position: 'relative', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {/* Faint Quote Watermark */}
        <div style={{ 
          position: 'absolute', top: '12px', right: '18px', 
          fontSize: '56px', fontFamily: 'Georgia, serif', 
          color: 'rgba(148, 163, 184, 0.12)', lineHeight: 1, 
          pointerEvents: 'none', userSelect: 'none' 
        }}>
          “
        </div>

        {/* Top Header: 3D Shalom Bubble Orb + Assistant Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 2 }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #f5f3ff 20%, #c084fc 45%, #7c3aed 75%, #3b0764 100%)',
            boxShadow: '0 8px 18px rgba(124, 58, 237, 0.28), inset -2px -2px 6px rgba(91, 33, 182, 0.35)',
            position: 'relative', flexShrink: 0
          }}>
            <div style={{
              position: 'absolute', top: '4px', left: '7px',
              width: '8px', height: '5px', borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.85)', transform: 'rotate(-35deg)'
            }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '14px', color: '#0F172A', fontWeight: 800 }}>Shalom (AI Assistant)</strong>
              <span style={{ 
                fontSize: '9.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', 
                background: statusBadgeBg, color: statusBadgeColor, textTransform: 'uppercase', letterSpacing: '0.4px' 
              }}>
                {statusBadgeText}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
              Evaluated response to your Day 6 Check-In
            </span>
          </div>
        </div>

        {/* Greeting */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Hi Aïda!
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
            </svg>
          </h3>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
            Here’s how your recovery is progressing based on today's check-in.
          </p>
        </div>

        {/* Highlight Card */}
        <div style={{
          background: isGreen ? '#F8FCF9' : isYellow ? '#FFFBEB' : '#FFF1F2',
          border: `1.5px solid ${isGreen ? '#DCFCE7' : isYellow ? '#FDE68A' : '#FECDD3'}`,
          borderRadius: '18px',
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: isGreen 
              ? 'radial-gradient(circle, rgba(74, 222, 128, 0.22) 0%, rgba(220, 252, 231, 0.55) 70%, transparent 100%)' 
              : isYellow 
                ? 'radial-gradient(circle, rgba(251, 191, 36, 0.25) 0%, rgba(254, 243, 199, 0.55) 70%, transparent 100%)'
                : 'radial-gradient(circle, rgba(244, 63, 94, 0.25) 0%, rgba(255, 228, 230, 0.55) 70%, transparent 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: '#ffffff',
              boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {isGreen ? (
                <Check size={22} strokeWidth={3.5} style={{ color: '#16A34A' }} />
              ) : isYellow ? (
                <AlertTriangle size={20} style={{ color: '#D97706' }} />
              ) : (
                <ShieldAlert size={20} style={{ color: '#E11D48' }} />
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 800, color: isGreen ? '#166534' : isYellow ? '#92400E' : '#9F1239', margin: '0 0 2px 0' }}>
              {heroTitle}
            </h4>
            <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.4 }}>
              {heroSubtitle}
            </div>
          </div>
        </div>

        {/* Submitted Vitals Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          background: 'rgba(248, 250, 252, 0.8)',
          border: '1px solid var(--border-glass)',
          borderRadius: '14px',
          padding: '10px 12px',
          position: 'relative',
          zIndex: 2
        }}>
          <div>
            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', display: 'block' }}>Pain Level</span>
            <strong style={{ fontSize: '12px', color: 'var(--primary)' }}>{pain}/10</strong>
          </div>
          <div>
            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', display: 'block' }}>Oral Temp</span>
            <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>{temp}°F</strong>
          </div>
          <div>
            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', display: 'block' }}>Medications</span>
            <strong style={{ fontSize: '12px', color: meds ? '#059669' : '#D97706' }}>{meds ? 'Taken ✓' : 'Missed'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', display: 'block' }}>Wound Status</span>
            <strong style={{ fontSize: '12px', color: incision.includes('Normal') ? '#059669' : '#D97706' }}>
              {incision.includes('Normal') ? 'Clear ✓' : incision[0]}
            </strong>
          </div>
        </div>

        {/* 3 WINS THIS WEEK */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <span style={{
            fontSize: '10.5px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase',
            letterSpacing: '0.6px', display: 'block', marginBottom: '8px'
          }}>
            3 WINS THIS WEEK
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={14} strokeWidth={3} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>Walking is getting easier</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F3E8FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrendingUp size={14} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>Knee movement improved</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F5F3FF', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={14} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>6-day check-in streak</span>
            </div>
          </div>
        </div>

        {/* Shalom Says Speech Bubble */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', position: 'relative', zIndex: 2 }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #f5f3ff 20%, #c084fc 45%, #7c3aed 75%, #3b0764 100%)',
            boxShadow: '0 4px 10px rgba(124, 58, 237, 0.25)',
            position: 'relative', flexShrink: 0, marginTop: '2px'
          }}>
            <div style={{ position: 'absolute', top: '3px', left: '6px', width: '6px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.85)', transform: 'rotate(-35deg)' }} />
          </div>

          <div style={{
            background: '#FAF5FF',
            border: '1px solid rgba(124, 58, 237, 0.15)',
            borderRadius: '14px',
            padding: '10px 14px',
            flex: 1
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '2px' }}>
              Shalom says:
            </div>
            <div style={{ fontSize: '12px', color: '#1E293B', fontWeight: 500, lineHeight: 1.4 }}>
              {shalomSpeech}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', position: 'relative', zIndex: 2 }}>
          {onNavigateToProgress && (
            <button 
              type="button"
              onClick={onNavigateToProgress}
              style={{ 
                width: '100%',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                color: '#ffffff', 
                fontWeight: 800, 
                padding: '12px 18px', 
                borderRadius: '14px', 
                border: 'none',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px var(--primary-glow)'
              }}
            >
              See detailed trajectory in Progress
              <ChevronRight size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={handleRetakeCheckIn}
            style={{
              width: '100%',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '11.5px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            Update Today's Check-In
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // MAIN RENDER: SPLIT VIEW (CHAT SIDE & WORK SIDE)
  // ==========================================
  return (
    <div className="shalom-split-container">
      {/* Mobile Switcher (Visible on screens < 1024px) */}
      <div className="shalom-mobile-switcher">
        <button
          type="button"
          className={`shalom-mobile-switch-btn ${mobileSide === 'chat' ? 'active' : ''}`}
          onClick={() => setMobileSide('chat')}
        >
          <MessageSquare size={13} />
          <span>Chat (Questions)</span>
        </button>
        <button
          type="button"
          className={`shalom-mobile-switch-btn ${mobileSide === 'work' ? 'active' : ''}`}
          onClick={() => setMobileSide('work')}
        >
          <ClipboardList size={13} />
          <span>Work (Check-In &amp; Status)</span>
        </button>
      </div>

      {/* Grid: Left Chat Side + Right Work Side */}
      <div className="shalom-split-grid">
        {/* ========================================================= */}
        {/* LEFT SIDE: CHAT PANEL (FOR QUESTIONS & CLINICAL ANSWERS) */}
        {/* ========================================================= */}
        <div 
          className="shalom-chat-panel"
          style={{ display: mobileSide === 'chat' ? 'flex' : undefined }}
        >
          {/* Header */}
          <div className="shalom-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="chat-header-avatar" />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="chat-header-title">Ask Shalom</span>
                  <span style={{ 
                    fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', 
                    background: 'var(--primary-light)', color: 'var(--primary)', textTransform: 'uppercase' 
                  }}>
                    Q&amp;A
                  </span>
                </div>
                <span className="chat-header-status">
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }}></span>
                  Questions &amp; Post-Op Guidance
                </span>
              </div>
            </div>

            <button
              type="button"
              className="detail-menu-btn"
              onClick={handleClearChat}
              title="Refresh conversation"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Messages Scroller */}
          <div className="chat-scroller-view">
            {messages.length <= 1 && (
              <div className="chat-welcome-box" style={{ padding: '16px' }}>
                <div className="hologram-chat-sphere" style={{ width: '46px', height: '46px', margin: '0 auto' }}></div>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                  Hi Aïda, what questions do you have today?
                </strong>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                  Ask about recovery timelines, swelling, pain relief, showering, or walking guidelines.
                </p>

                <div className="suggest-chips-grid" style={{ width: '100%', marginTop: '6px' }}>
                  {prebakedQueries.map((q, idx) => (
                    <div 
                      key={idx} 
                      className="suggest-chip-box"
                      onClick={() => handleSendMessage(q)}
                    >
                      <span className="suggest-chip-icon"><Sparkles size={11} /></span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              let wrapperStatusClass = '';
              if (msg.isEmergency) wrapperStatusClass = 'emergency';
              else if (msg.isMedicalWarning) wrapperStatusClass = 'warning';

              return (
                <div key={msg.id} className={`chat-bubble-row ${isUser ? 'user' : 'shalom'} ${wrapperStatusClass}`}>
                  {!isUser && <div className="chat-bubble-avatar">S</div>}
                  <div className="chat-text-bubble">
                    {msg.isEmergency && (
                      <div className="chat-alert-heading" style={{ color: 'var(--color-red)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <ShieldAlert size={12} /> EMERGENCY DIRECTIVE
                      </div>
                    )}

                    {msg.isMedicalWarning && (
                      <div className="chat-alert-heading" style={{ color: 'var(--color-yellow)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <AlertTriangle size={12} /> CLINICAL GUIDANCE
                      </div>
                    )}

                    <div>
                      {msg.text.split('\n').map((line, idx) => {
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          return <li key={idx} style={{ marginLeft: '12px', fontSize: '12px' }}>{line.substring(2)}</li>;
                        }
                        return <p key={idx} style={{ margin: '2px 0', fontSize: '12px' }}>{line}</p>;
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '4px' }}>
                      {!isUser && (
                        <button 
                          onClick={() => toggleSpeakMessage(msg.id, msg.text)} 
                          className={`replay-speech-btn ${playingMessageId === msg.id ? 'active-speaking' : ''}`}
                          title={playingMessageId === msg.id ? "Click to stop voice playback" : "Listen to this response"}
                          type="button"
                        >
                          {playingMessageId === msg.id ? (
                            <>
                              <VolumeX size={11} />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 size={11} />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      )}
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="chat-bubble-row shalom">
                <div className="chat-bubble-avatar">S</div>
                <div className="chat-loading-dots">
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Console */}
          <div className="chat-modern-footer-area">
            <div className="chat-input-console">
              <div className="console-row">
                <button 
                  type="button"
                  className="chat-mic-btn" 
                  onClick={() => speakText("I'm listening. Ask me any question about your recovery.")} 
                  title="Voice input"
                >
                  <Mic size={15} />
                </button>
                <input
                  type="text"
                  placeholder="Ask Shalom any question about your recovery..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="console-field"
                />
                <button 
                  type="button"
                  className="console-send-button" 
                  onClick={() => handleSendMessage(inputText)}
                  disabled={!inputText.trim()}
                  title="Send message"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>

            <div className="chat-footer-disclaimer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <ShieldCheck size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span>Grounded in Dr. Carter's orthopedic protocol &bull; Emergency: 911</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT SIDE: WORK PANEL (FOR DAILY CHECK-IN & DYNAMIC RECOVERY STATUS) */}
        {/* ========================================================================= */}
        <div 
          className="shalom-work-panel"
          style={{ display: mobileSide === 'work' ? 'flex' : undefined }}
        >
          {/* Header */}
          <div className="shalom-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '10px',
                background: 'var(--primary-light)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ClipboardList size={16} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="chat-header-title">Daily Clinical Check-In</span>
                  <span style={{
                    fontSize: '9.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px',
                    background: isCheckInSubmitted ? 'rgba(5, 150, 105, 0.1)' : 'var(--primary-light)',
                    color: isCheckInSubmitted ? '#059669' : 'var(--primary)',
                    textTransform: 'uppercase'
                  }}>
                    {isCheckInSubmitted ? 'Completed' : `Step ${checkInStep + 1} of 6`}
                  </span>
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  {isCheckInSubmitted ? 'Recovery status analyzed from your answers' : 'Daily vitals, pain scale & triage'}
                </span>
              </div>
            </div>

            {isCheckInSubmitted && (
              <button
                type="button"
                onClick={handleRetakeCheckIn}
                style={{
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(124, 58, 237, 0.2)',
                  borderRadius: '10px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={11} /> Retake
              </button>
            )}
          </div>

          {/* Work Body: Either the 6-step Check-In workflow OR the Dynamic Recovery Status Response */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {!isCheckInSubmitted ? (
              renderCheckInWorkflow()
            ) : (
              renderRecoveryStatusResponse()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
