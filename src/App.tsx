import { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  MessageSquare,
  Settings,
  MoreHorizontal,
  Paperclip,
  BrainCircuit,
  Send,
  Check,
  LineChart,
  Activity,
  ShieldAlert,
  Compass
} from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { type CheckInAnswers, type CareTeamReport } from './utils/shalomAgent';

type TabType = 'home' | 'check-in' | 'insights' | 'about';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [apiKey, setApiKey] = useState<string>('');
  
  // Check-In results state
  const [checkInComplete, setCheckInComplete] = useState<boolean>(false);
  const [answers, setAnswers] = useState<CheckInAnswers | null>(null);
  const [riskStatus, setRiskStatus] = useState<'Green' | 'Yellow' | 'Red' | 'Emergency' | null>(null);
  const [careTeamReport, setCareTeamReport] = useState<CareTeamReport | null>(null);
  
  // State to trigger a preset scenario programmatically
  const [presetScenarioTrigger, setPresetScenarioTrigger] = useState<CheckInAnswers | null>(null);

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

  const handleCheckInComplete = (
    submittedAnswers: CheckInAnswers,
    status: 'Green' | 'Yellow' | 'Red' | 'Emergency',
    report: CareTeamReport
  ) => {
    setAnswers(submittedAnswers);
    setRiskStatus(status);
    setCareTeamReport(report);
    setCheckInComplete(true);
  };

  const handleTriggerPreset = (type: 'green' | 'yellow' | 'red' | 'emergency') => {
    const data = PRESET_SCENARIOS[type];
    setPresetScenarioTrigger(data);
    setActiveTab('check-in');
  };

  const handleResetStatus = () => {
    setAnswers(null);
    setRiskStatus(null);
    setCareTeamReport(null);
    setCheckInComplete(false);
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomePage();
      case 'check-in':
        return renderCheckInPage();
      case 'insights':
        return renderInsightsSection();
      case 'about':
        return renderAboutSection();
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

        {/* Suggestion Chips - Visually identical to mockup, functionally triggers demo scenarios */}
        <div className="pill-chips-container">
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
          <button className="pill-chip" onClick={handleResetStatus} title="Reset status">
            <MoreHorizontal size={13} />
          </button>
        </div>

        {/* Custom Console input box mimic matching the mockup */}
        <div className="console-container" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('check-in')}>
          <div className="console-input-row">
            <span style={{ color: '#a3a3a3', fontSize: '14.5px', textAlign: 'left', flexGrow: 1 }}>
              Ask me anything...
            </span>
          </div>
          <div className="console-actions-row">
            <div className="console-left-actions">
              <span className="console-btn"><Paperclip size={13} /> Attach</span>
              <span className="console-btn"><BrainCircuit size={13} /> Deep Think</span>
            </div>
            <div className="console-right-actions">
              <span className="console-btn">
                <Sparkles size={13} style={{ color: '#e170c1' }} /> Voice
              </span>
              <button className="console-send-btn">
                Send <Send size={13} style={{ marginLeft: '4px' }} />
              </button>
            </div>
          </div>
        </div>

        {/* MVP Description & Safety Notice */}
        <div style={{ marginTop: '36px', maxWidth: '700px', padding: '16px 20px', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
        />
        
        {checkInComplete && riskStatus && (
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Diagnostics Triage Result</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <strong style={{ 
                    fontSize: '18px', 
                    color: riskStatus === 'Emergency' ? 'var(--emergency)' : riskStatus === 'Red' ? 'var(--emergency)' : riskStatus === 'Yellow' ? 'var(--warning)' : 'var(--success)' 
                  }}>
                    {riskStatus === 'Emergency' ? 'Emergency Directive Triggered' : riskStatus === 'Red' ? 'Clinical Review Required (Red)' : riskStatus === 'Yellow' ? 'Monitoring Advised (Yellow)' : 'Stable Recovery (Green)'}
                  </strong>
                  
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: '700', 
                    padding: '3px 10px', 
                    borderRadius: '20px', 
                    backgroundColor: riskStatus === 'Green' ? 'var(--success-bg)' : riskStatus === 'Yellow' ? 'var(--warning-bg)' : 'var(--emergency-bg)',
                    color: riskStatus === 'Green' ? 'var(--success)' : riskStatus === 'Yellow' ? 'var(--warning)' : 'var(--emergency)'
                  }}>
                    {careTeamReport?.reportAlertText}
                  </span>
                </div>
              </div>
              <button 
                className="btn-primary" 
                onClick={() => setActiveTab('insights')}
                style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <LineChart size={14} /> View Care Team Report
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderInsightsSection = () => {
    if (!checkInComplete || !riskStatus || !careTeamReport) {
      return (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 20px', minHeight: '400px' }}>
          <LineChart size={48} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', color: 'var(--primary-dark)', fontWeight: 'bold' }}>No Check-in Logged Today</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', fontSize: '13.5px', marginTop: '8px' }}>
            Insights and care team reports are dynamically generated after you complete your check-in questionnaire.
          </p>
          <button 
            className="btn-primary" 
            onClick={() => setActiveTab('check-in')} 
            style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '20px' }}
          >
            Go to Check-In Chat
          </button>
        </div>
      );
    }

    const statusExplanations = {
      Green: "Your recovery is progressing normally. Based on your inputs, your vitals and symptoms are within standard parameters. No immediate clinical action is required.",
      Yellow: "Your recovery indicators show minor variations from normal. Your missed medication, moderate pain level, or minor symptoms require tracking. A report has been filed for your clinical team to monitor your status.",
      Red: "Your reports indicate concerning healing markers or severe pain. Your care team has been notified with an Urgent Alert. You should contact your surgeon or healthcare provider's office directly today.",
      Emergency: "CRITICAL: You reported life-threatening symptoms that require immediate clinical evaluation. Shalom has triggered an emergency directive. Please dial 911 or go to the nearest emergency department immediately."
    };

    return (
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '16px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--primary-dark)' }}>AI Insights & Care Team Reports</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Structured FHIR reporting summaries generated by the Shalom Agent.</p>
          </div>
          <button className="btn-secondary btn-sm" onClick={handleResetStatus} style={{ borderRadius: '20px' }}>
            Reset Diagnostics
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
          {/* Diagnostic Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid',
              borderColor: riskStatus === 'Green' ? '#cceadd' : riskStatus === 'Yellow' ? '#ffd8be' : '#fecaca',
              backgroundColor: riskStatus === 'Green' ? '#f0fdf4' : riskStatus === 'Yellow' ? '#fffbeb' : '#fff5f5',
            }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Triage Result</span>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                marginTop: '4px',
                color: riskStatus === 'Green' ? 'var(--success)' : riskStatus === 'Yellow' ? 'var(--warning)' : 'var(--emergency)'
              }}>
                {riskStatus === 'Emergency' ? 'Emergency Level Directive' : riskStatus === 'Red' ? 'Red: Clinical Review Required' : riskStatus === 'Yellow' ? 'Yellow: Monitoring Advised' : 'Green: Stable Recovery'}
              </h3>
              <p style={{ fontSize: '13.5px', marginTop: '10px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                {statusExplanations[riskStatus]}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Transmission status:</span>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  padding: '3px 8px', 
                  borderRadius: '10px',
                  backgroundColor: riskStatus === 'Green' ? 'var(--success-bg)' : riskStatus === 'Yellow' ? 'var(--warning-bg)' : 'var(--emergency-bg)',
                  color: riskStatus === 'Green' ? 'var(--success)' : riskStatus === 'Yellow' ? 'var(--warning)' : 'var(--emergency)'
                }}>
                  {careTeamReport.reportAlertText}
                </span>
              </div>
            </div>

            {/* AI Summary Card */}
            <div style={{ padding: '20px', borderRadius: '16px', background: 'white', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} style={{ color: 'var(--primary)' }} /> Automated AI Case Summary
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.5', fontStyle: 'italic', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                "{careTeamReport.aiSummary}"
              </p>
            </div>
          </div>

          {/* Care Team Transmission Document */}
          <div style={{ padding: '24px', borderRadius: '16px', background: 'white', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'var(--shadow-sm)' }}>
            <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--primary-dark)', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '10px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={16} /> Care Team Transmission Payload</span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 'normal' }}>ID: SHALOM-DEMO-RPT</span>
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Document Type:</span>
                <strong style={{ color: 'var(--primary-dark)' }}>{careTeamReport.title}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Patient:</span>
                <span>Demo User (Hip Replacement Patient)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Triage level:</span>
                <span style={{ 
                  fontWeight: 'bold', 
                  color: riskStatus === 'Green' ? 'var(--success)' : riskStatus === 'Yellow' ? 'var(--warning)' : 'var(--emergency)'
                }}>{riskStatus.toUpperCase()}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Logged Pain:</span>
                <span>{careTeamReport.painLevel} / 10</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Meds Adherence:</span>
                <span>{answers?.medsTaken ? "100% compliant" : "Missed scheduled doses"}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Key Findings:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {careTeamReport.keySymptoms.map((sym, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px', width: 'fit-content', fontSize: '11px' }}>
                      • {sym}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', marginTop: '8px', borderTop: '1px dashed rgba(0,0,0,0.05)', paddingTop: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Generated At:</span>
                <span>{careTeamReport.generatedAt}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Delivery Status:</span>
                <span style={{ color: 'var(--success)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={13} /> Delivered (Simulated Gateway)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAboutSection = () => {
    return (
      <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', gap: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary-dark)', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '10px' }}>About Shalom Assistant</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '13.5px', lineHeight: '1.6' }}>
          <div>
            <h4 style={{ color: 'var(--primary-dark)', fontWeight: 'bold', marginBottom: '4px' }}>The Post-Operative Challenge</h4>
            <p style={{ margin: 0, color: 'var(--text-main)' }}>
              The first two weeks following a surgical hospital discharge represent a critical period for patient safety. Due to complex medication guidelines, confusion over physical activity boundaries, and difficulties recognizing complications, up to 15% of patients require emergency readmission. Clinical teams cannot realistically contact every discharged patient daily, leaving a monitoring gap.
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--primary-dark)', fontWeight: 'bold', marginBottom: '4px' }}>Who Shalom Serves</h4>
            <p style={{ margin: 0, color: 'var(--text-main)' }}>
              Shalom serves post-operative surgical patients recovering at home, alongside the home-health nursing boards and surgery teams responsible for monitoring them. By triaging reports, Shalom helps teams prioritize their patient check-ins.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '8px' }}>
            <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', borderLeft: '4px solid var(--success)' }}>
              <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '6px' }}>What Shalom CAN Do:</strong>
              <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Conduct daily guided symptom check-in dialogues.</li>
                <li>Implement rules-based risk triage algorithms (Green/Yellow/Red).</li>
                <li>Simulate emergency detection and trigger immediate emergency directives.</li>
                <li>Generate clinical narrative case summaries.</li>
              </ul>
            </div>

            <div style={{ padding: '16px', background: '#fff5f5', borderRadius: '12px', borderLeft: '4px solid var(--emergency)' }}>
              <strong style={{ color: 'var(--emergency)', display: 'block', marginBottom: '6px' }}>What Shalom CANNOT Do:</strong>
              <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Diagnose specific infections, blood clots, or ailments.</li>
                <li>Prescribe new medications or adjust existing drug schedules.</li>
                <li>Alter post-operative instruction parameters.</li>
                <li>Manage active life-threatening emergencies.</li>
                <li>Replace the professional opinion of surgeons, doctors, or nurses.</li>
              </ul>
            </div>
          </div>
        </div>
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
          <li>
            <button 
              className={`nav-btn ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
              title="Insights & Settings"
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
