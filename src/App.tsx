import { useState, useEffect } from 'react';
import { 
  MessageSquare,
  User,
  Settings,
  Compass
} from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { type CheckInAnswers, type CareTeamReport } from './utils/shalomAgent';

type TabType = 'chat' | 'profile' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [apiKey, setApiKey] = useState<string>('');
  
  // Speech synthesis hoisted states
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(true);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // State to trigger a preset scenario programmatically
  const [presetScenarioTrigger, setPresetScenarioTrigger] = useState<CheckInAnswers | null>(null);

  // Grounding Dataset state
  const [medicalHistory, setMedicalHistory] = useState<any | null>(null);
  const [faqDataset, setFaqDataset] = useState<any | null>(null);

  // Preset Scenario Data Definitions for testing
  const PRESET_SCENARIOS = {
    green: {
      painLevel: 2,
      hasFever: false,
      temperature: 98.6,
      medsTaken: true,
      incisionIssues: ['Normal'],
      mobility: 'Okay' as const,
      unusualSymptoms: ['None']
    },
    yellow: {
      painLevel: 6,
      hasFever: false,
      temperature: 98.6,
      medsTaken: false,
      incisionIssues: ['Mild Redness'],
      mobility: 'Getting harder' as const,
      unusualSymptoms: ['Severe vomiting']
    },
    red: {
      painLevel: 9,
      hasFever: true,
      temperature: 101.2,
      medsTaken: true,
      incisionIssues: ['Drainage', 'Getting Worse'],
      mobility: 'Restricted' as const,
      unusualSymptoms: ['Symptoms getting much worse']
    },
    emergency: {
      painLevel: 8,
      hasFever: false,
      temperature: 98.6,
      medsTaken: true,
      incisionIssues: ['Normal'],
      mobility: 'Restricted' as const,
      unusualSymptoms: ['Chest pain', 'Difficulty breathing']
    }
  };

  // Automatically load default FAQ dataset and patient record on mount
  useEffect(() => {
    const loadDefaultFaq = async () => {
      try {
        const response = await fetch('/Dataset_main_patient.json');
        if (response.ok) {
          const data = await response.json();
          setFaqDataset(data);
        }
      } catch (e) {
        console.error("Failed to load default FAQ dataset on mount", e);
      }
    };
    
    const loadDefaultPatient = async () => {
      try {
        const response = await fetch('/patient_record.json');
        if (response.ok) {
          const data = await response.json();
          setMedicalHistory(data);
        }
      } catch (e) {
        console.error("Failed to load default patient record on mount", e);
      }
    };

    loadDefaultFaq();
    loadDefaultPatient();
  }, []);

  // Load English speech synthesis voices on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        const englishVoices = availableVoices.filter(v => v.lang.startsWith('en'));
        setVoices(englishVoices.length > 0 ? englishVoices : availableVoices);
        
        if (englishVoices.length > 0) {
          const preferred = englishVoices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || englishVoices[0];
          setSelectedVoiceName(preferred.name);
        } else if (availableVoices.length > 0) {
          setSelectedVoiceName(availableVoices[0].name);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const handleCheckInComplete = (
    submittedAnswers: CheckInAnswers,
    status: 'Green' | 'Yellow' | 'Red' | 'Emergency',
    report: CareTeamReport
  ) => {
    console.log("Check-in complete:", status, report, submittedAnswers);
  };

  const handleTriggerPreset = (type: 'green' | 'yellow' | 'red' | 'emergency') => {
    const data = PRESET_SCENARIOS[type];
    setPresetScenarioTrigger(data);
    setActiveTab('chat');
  };

  const handleResetStatus = () => {
    console.log("Reset check-in status");
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return renderChatPage();
      case 'profile':
        return renderPatientProfilePage();
      case 'settings':
        return renderSettingsPage();
      default:
        return renderChatPage();
    }
  };

  const renderChatPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
        <ChatInterface 
          apiKey={apiKey} 
          onCheckInComplete={handleCheckInComplete}
          presetScenarioTrigger={presetScenarioTrigger}
          clearPresetScenarioTrigger={() => setPresetScenarioTrigger(null)}
          onResetStatus={handleResetStatus}
          medicalHistory={medicalHistory}
          faqDataset={faqDataset}
          isTtsEnabled={isTtsEnabled}
          selectedVoiceName={selectedVoiceName}
          voices={voices}
        />
      </div>
    );
  };

  const renderPatientProfilePage = () => {
    if (!medicalHistory) {
      return (
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', margin: '40px auto', maxWidth: '600px' }}>
          <h3>Loading Patient Profile...</h3>
        </div>
      );
    }

    const { patient_profile, medical_history, hospital_discharge, discharge_instructions } = medicalHistory;

    return (
      <div className="patient-profile-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out', paddingBottom: '40px' }}>
        
        {/* Header Hero Card */}
        <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifySelf: 'stretch', gap: '24px', padding: '24px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.4) 100%)', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.03)' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, #c07ab0 0%, #5e9ecb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '28px', fontWeight: 'bold' }}>
            {patient_profile.first_name[0]}{patient_profile.last_name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0 }}>
              {patient_profile.first_name} {patient_profile.last_name}
            </h2>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span><strong>ID:</strong> {patient_profile.patient_id}</span>
              <span>•</span>
              <span><strong>Age:</strong> {patient_profile.age}</span>
              <span>•</span>
              <span><strong>Sex:</strong> {patient_profile.sex}</span>
              <span>•</span>
              <span><strong>Blood Type:</strong> {patient_profile.blood_type}</span>
            </div>
          </div>
          <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid rgba(46, 204, 113, 0.2)' }}>
            Active Patient
          </div>
        </div>

        {/* Dashboard Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          {/* Post-Op / Discharge Details */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(255,255,255,0.7)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🏥 Surgery & Discharge Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>PROCEDURE</span>
                <strong>{hospital_discharge.procedure}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>SURGEON</span>
                <strong>{hospital_discharge.surgeon}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>SURGERY DATE</span>
                <strong>{hospital_discharge.surgery_date}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>DISCHARGE DATE</span>
                <strong>{hospital_discharge.discharge_date}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>FOLLOW-UP DATE</span>
                <strong>{hospital_discharge.follow_up_date}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>MOBILITY AID</span>
                <strong>{hospital_discharge.mobility_aid}</strong>
              </div>
            </div>
          </div>

          {/* Clinical History */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(255,255,255,0.7)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📋 Medical History & Vitals
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>CHRONIC CONDITIONS</span>
                <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {medical_history.chronic_conditions.map((c: string) => (
                    <span key={c} style={{ background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px' }}>{c}</span>
                  ))}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>ALLERGIES</span>
                <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {medical_history.allergies.map((a: string) => (
                    <span key={a} style={{ background: 'var(--emergency-bg)', color: 'var(--emergency)', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: '600' }}>{a}</span>
                  ))}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>CURRENT HOME MEDICATIONS</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {medical_history.current_medications.map((m: any) => (
                    <div key={m.name} style={{ fontSize: '12px' }}>
                      • <strong>{m.name}</strong> - {m.dose}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Discharge Care Plan */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(255,255,255,0.7)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px' }}>
            💊 Discharge Instructions & Recovery Care Plan
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 8px 0', color: 'var(--primary)' }}>Post-Op Medications</h4>
              <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {discharge_instructions.medications.map((med: any) => (
                  <li key={med.name}>
                    <strong>{med.name}</strong> ({med.dose}) - <span style={{ color: 'var(--text-muted)' }}>{med.frequency}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 8px 0', color: 'var(--primary)' }}>Prescribed Activities</h4>
              <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {discharge_instructions.activity.map((act: string, idx: number) => (
                  <li key={idx}>{act}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 8px 0', color: 'var(--emergency)' }}>Warning Signs to Report</h4>
              <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--emergency)' }}>
                {discharge_instructions.warning_signs.map((sign: string, idx: number) => (
                  <li key={idx}><strong>{sign}</strong></li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px', background: 'rgba(255,255,255,0.7)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)', fontSize: '13px' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Emergency Contact:</span>
            <span>{patient_profile.emergency_contact.name} ({patient_profile.emergency_contact.relationship})</span>
            <span>•</span>
            <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{patient_profile.emergency_contact.phone}</span>
          </div>
        </div>

      </div>
    );
  };

  const renderSettingsPage = () => {
    return (
      <div className="settings-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
        
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0 }}>
            ⚙️ Shalom Assistant Settings
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Configure voice synthesis preferences and clinical intelligence modules.
          </p>
        </div>

        {/* Voice and Speech Synthesis Card */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🗣️ Speech & Audio Controls
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '12px' }}>
            <div>
              <strong style={{ fontSize: '13.5px', display: 'block' }}>Voice Responses (TTS)</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enable or disable speech synthesis for assistant answers.</span>
            </div>
            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
              <input 
                type="checkbox" 
                checked={isTtsEnabled} 
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setIsTtsEnabled(newValue);
                  if (!newValue && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                }}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span className="slider" style={{ position: 'absolute', cursor: 'pointer', inset: 0, backgroundColor: isTtsEnabled ? 'var(--primary)' : '#ccc', transition: '.4s', borderRadius: '24px' }}>
                <span className="slider-thumb" style={{ position: 'absolute', height: '18px', width: '18px', left: isTtsEnabled ? '22px' : '4px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
              </span>
            </label>
          </div>

          {isTtsEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)' }}>Select Synthesis Voice</label>
              {voices.length > 0 ? (
                <select
                  value={selectedVoiceName}
                  onChange={(e) => {
                    setSelectedVoiceName(e.target.value);
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', background: '#fff', outline: 'none' }}
                >
                  {voices.map(voice => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No English voices detected. Using system default.</span>
              )}
            </div>
          )}
        </div>

        {/* Clinical RAG / API Configuration Card */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0 }}>
            🔑 Clinical Intelligence Engine (Gemini RAG)
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
            Provide a Google Gemini API key to activate advanced clinical reasoning, permitting natural follow-up conversation grounded strictly on James Carter's profile and FAQ dataset.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)' }}>Gemini API Key (Optional)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="password"
                placeholder="Enter Gemini API key (AIzaSy...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', outline: 'none', background: '#fff' }}
              />
              {apiKey && (
                <button 
                  onClick={() => setApiKey('')}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #ffc5c5', background: 'var(--emergency-bg)', color: 'var(--emergency)', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Clear Key
                </button>
              )}
            </div>
            {apiKey && (
              <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                ✓ API key saved. Advanced grounding is fully active.
              </span>
            )}
          </div>
        </div>

        {/* Demo Fast Triggers for Testing */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0 }}>
            🧪 Quick Triage Scenarios (Demo & Evaluation)
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Quickly trigger predefined clinical responses to test Shalom's triage categorization (Stable, Yellow Monitor, Red Urgent, Emergency).
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
            <button className="pill-chip" onClick={() => handleTriggerPreset('green')} style={{ border: '1px solid var(--success)', background: 'var(--success-bg)', color: 'var(--success)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              Stable Progress
            </button>
            <button className="pill-chip" onClick={() => handleTriggerPreset('yellow')} style={{ border: '1px solid var(--warning)', background: 'var(--warning-bg)', color: 'var(--warning)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              Monitor Status
            </button>
            <button className="pill-chip" onClick={() => handleTriggerPreset('red')} style={{ border: '1px solid var(--emergency)', background: 'var(--emergency-bg)', color: 'var(--emergency)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              Urgent Review
            </button>
            <button className="pill-chip" onClick={() => handleTriggerPreset('emergency')} style={{ border: '1px solid #b33939', background: 'rgba(179, 57, 57, 0.05)', color: '#b33939', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              Emergency Alert
            </button>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div className="brand-section">
          {/* Circular letter C concentric-like logo */}
          <div className="logo-icon" onClick={() => setActiveTab('chat')}>
            <Compass size={20} />
          </div>
        </div>

        <ul className="nav-links">
          <li>
            <button 
              className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
              title="Chat & Check-In"
            >
              <MessageSquare size={18} />
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
              title="Patient Profile"
            >
              <User size={18} />
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </li>
        </ul>
      </nav>

      {/* Main Viewport */}
      <main className="main-viewport">
        {renderActiveTabContent()}
        
        {/* Sticky footer disclaimer matching user requests */}
        <footer style={{ marginTop: 'auto', paddingTop: '32px', borderTop: '1px solid rgba(0,0,0,0.04)', fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.5' }}>
          <p>
            <strong>Safety Disclaimer:</strong> Shalom is a demo AI assistant. It does not diagnose, treat, prescribe medication, or replace doctors or nurses. For medical questions, contact a healthcare professional. For emergencies, call 911.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
