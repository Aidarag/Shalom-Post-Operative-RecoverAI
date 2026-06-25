import { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  MessageSquare,
  Check,
  Activity,
  ShieldAlert,
  Compass
} from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { type CheckInAnswers, type CareTeamReport } from './utils/shalomAgent';

type TabType = 'home' | 'check-in';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [apiKey, setApiKey] = useState<string>('');
  
  // Check-In results state

  // State to trigger a preset scenario programmatically
  const [presetScenarioTrigger, setPresetScenarioTrigger] = useState<CheckInAnswers | null>(null);

  // Grounding Dataset state
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<any | null>(null);

  // Preset Scenario Data Definitions
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
      medsTaken: false, // missed meds
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

  const [faqDataset, setFaqDataset] = useState<any | null>(null);

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
          setAttachedFile(new File([JSON.stringify(data, null, 2)], "patient_record.json", { type: "application/json" }));
        }
      } catch (e) {
        console.error("Failed to load default patient record on mount", e);
      }
    };

    loadDefaultFaq();
    loadDefaultPatient();
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
    setActiveTab('check-in');
  };

  const handleResetStatus = () => {
    console.log("Reset check-in status");
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomePage();
      case 'check-in':
        return renderCheckInPage();
      default:
        return renderHomePage();
    }
  };

  const renderHomePage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)', width: '100%', maxWidth: '1000px', margin: '0 auto', textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
        
        {/* Exact Headline from user's screenshot */}
        <h1 style={{ 
          fontSize: '38px', 
          fontWeight: '700', 
          lineHeight: '1.25',
          fontFamily: 'var(--font-body)',
          background: 'linear-gradient(90deg, #c07ab0 0%, #5e9ecb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px'
        }}>
          AI Enables Smooth Assistant & Voice Interaction
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '20px', maxWidth: '600px' }}>
          Shalom helps patients recover safely at home after surgery.
        </p>

        {/* Floating Liquid Glass Orb with Mirror Reflection */}
        <div className="liquid-orb-container">
          <div className="liquid-orb"></div>
          <div className="liquid-orb-reflection"></div>
        </div>

        {/* Action Button Row - Clearly distinguishes landing page from chat page */}
        <div className="hero-buttons-row" style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '20px', marginBottom: '40px' }}>
          <button className="btn-primary" onClick={() => setActiveTab('check-in')} style={{ padding: '14px 28px', borderRadius: '30px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={16} /> Start Patient Check-In
          </button>
        </div>

        {/* Features Capabilities Grid */}
        <div className="features-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '20px', 
          width: '100%', 
          maxWidth: '800px', 
          margin: '0 auto 20px auto' 
        }}>
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', textAlign: 'left', gap: '8px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
              <MessageSquare size={18} />
              <strong style={{ fontSize: '14px' }}>Daily Check-Ins</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
              Guided recovery checks tracking pain, medication, mobility, and symptom progressions.
            </p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', textAlign: 'left', gap: '8px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
              <Activity size={18} />
              <strong style={{ fontSize: '14px' }}>Early Triage & FAQ Grounding</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
              Ask post-op recovery questions naturally and triage symptoms to identify potential complications.
            </p>
          </div>
        </div>

        {/* Demo Fast Triggers */}
        <div style={{ marginTop: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Or click to test preset recovery scenarios directly:</span>
          <div className="pill-chips-container" style={{ marginBottom: 0 }}>
            <button className="pill-chip" onClick={() => handleTriggerPreset('green')}>
              <Check size={13} style={{ color: 'var(--success)' }} /> Stable Progress
            </button>
            <button className="pill-chip" onClick={() => handleTriggerPreset('yellow')}>
              <Activity size={13} style={{ color: 'var(--warning)' }} /> Monitor Status
            </button>
            <button className="pill-chip" onClick={() => handleTriggerPreset('red')}>
              <FileText size={13} style={{ color: 'var(--emergency)' }} /> Urgent Review
            </button>
            <button className="pill-chip" onClick={() => handleTriggerPreset('emergency')}>
              <ShieldAlert size={13} style={{ color: '#b33939' }} /> Emergency Alert
            </button>
          </div>
        </div>

        {/* MVP Description & Safety Notice */}
        <div style={{ marginTop: '24px', maxWidth: '700px', padding: '12px 18px', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <strong>Post-Operative Recovery Assistant MVP Demo</strong>
          <span>This interactive prototype simulates rules-based clinical triage (Green, Yellow, Red) and triggers alerts directly to a nursing care dashboard. Click any scenario button above to auto-run a complete demo.</span>
        </div>
      </div>
    );
  };

  const renderCheckInPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
        <ChatInterface 
          apiKey={apiKey} 
          setApiKey={setApiKey} 
          onCheckInComplete={handleCheckInComplete}
          presetScenarioTrigger={presetScenarioTrigger}
          clearPresetScenarioTrigger={() => setPresetScenarioTrigger(null)}
          onResetStatus={handleResetStatus}
          attachedFile={attachedFile}
          setAttachedFile={setAttachedFile}
          medicalHistory={medicalHistory}
          setMedicalHistory={setMedicalHistory}
          faqDataset={faqDataset}
        />
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation - Simplified to match Mockup */}
      <nav className="sidebar">
        <div className="brand-section">
          {/* Circular letter C concentric-like logo */}
          <div className="logo-icon" onClick={() => setActiveTab('home')}>
            <Compass size={20} />
          </div>
        </div>

        <ul className="nav-links">
          <li>
            <button 
              className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
              title="Home Page"
            >
              <Sparkles size={18} />
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'check-in' ? 'active' : ''}`}
              onClick={() => setActiveTab('check-in')}
              title="Patient Check-In"
            >
              <MessageSquare size={18} />
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
