import { useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Pill, 
  FileSpreadsheet, 
  FileText, 
  Activity,
  TrendingUp,
  HelpCircle,
  Users
} from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { MedTracker } from './components/MedTracker';
import { VisitPrep } from './components/VisitPrep';
import { DischargeDecoder } from './components/DischargeDecoder';
import { NurseDashboard } from './components/NurseDashboard';
import { MOCK_PATIENTS_SEEDED, type Patient, type RecoveryLog } from './utils/mockData';

type TabType = 'home' | 'patient-portal' | 'nurse-dashboard' | 'about';
type PatientSubTab = 'check-in' | 'meds' | 'visit' | 'decode';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [patientSubTab, setPatientSubTab] = useState<PatientSubTab>('check-in');
  const [apiKey, setApiKey] = useState<string>('');
  
  // Centralized state of active patients in the system
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS_SEEDED);


  const handleCheckInComplete = (answers: {
    painLevel: number;
    temperature: number;
    medsAdherence: number;
    mobility: 'None' | 'Limited' | 'Moderate' | 'Good';
    sleepQuality: 'Poor' | 'Fair' | 'Good';
    woundAppearance: 'Normal' | 'Mild Redness' | 'Redness & Swelling' | 'Drainage' | 'Infected' | 'Getting Worse';
    notes: string;
    riskLevel: 'Green' | 'Yellow' | 'Red';
  }) => {
    // Find Arthur and add Day 6 to his history
    setPatients(prev => prev.map(patient => {
      if (patient.id !== 'pat-2') return patient; // Simulate updating Arthur's logs in this demo

      const nextDay = patient.postOpDay + 1;
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Check if Day 6 is already logged to avoid double entries
      if (patient.history.some(log => log.day === nextDay)) {
        return patient;
      }

      const newLog: RecoveryLog = {
        day: nextDay,
        date: dateStr,
        painLevel: answers.painLevel,
        temperature: answers.temperature,
        medsAdherence: answers.medsAdherence,
        woundAppearance: answers.woundAppearance,
        mobility: answers.mobility,
        notes: answers.notes
      };

      const newHistory = [...patient.history, newLog];
      
      const symptomsList: string[] = [];
      if (answers.painLevel >= 8) symptomsList.push('Severe Pain');
      if (answers.temperature >= 100.4) symptomsList.push('Fever');
      if (answers.woundAppearance !== 'Normal') symptomsList.push(answers.woundAppearance);
      if (answers.medsAdherence === 0) symptomsList.push('Missed Medications');

      let actionText = "Routine daily checks. Continue light walking and resting.";
      if (answers.riskLevel === 'Red') {
        actionText = "Clinical review recommended today. Direct contact with orthopedic nurse advised.";
      } else if (answers.riskLevel === 'Yellow') {
        actionText = "Monitor symptoms over next 24 hours. Reinforce medication compliance.";
      }

      return {
        ...patient,
        postOpDay: nextDay,
        painLevel: answers.painLevel,
        symptoms: symptomsList,
        medicationStatus: answers.medsAdherence === 100 ? 'Taken' : 'Missed',
        riskLevel: answers.riskLevel,
        aiSummary: `Patient Arthur is recovering on Day ${nextDay} post-hip surgery. Pain is logged at ${answers.painLevel}/10, temp is ${answers.temperature}°F. Incision site status: ${answers.woundAppearance}. Notes: ${answers.notes}`,
        recommendedAction: actionText,
        history: newHistory
      };
    }));

    // Trigger tab navigation to nurse dashboard to review the updated stats
    setTimeout(() => {
      alert("Arthur's daily check-in is complete! Redirecting to the Nurse Dashboard to review clinical risk level changes.");
      setActiveTab('nurse-dashboard');
    }, 1500);
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomePage();
      case 'patient-portal':
        return renderPatientPortal();
      case 'nurse-dashboard':
        return <NurseDashboard patients={patients} />;
      case 'about':
        return renderAboutSection();
      default:
        return renderHomePage();
    }
  };


  const renderHomePage = () => {
    const redCount = patients.filter(p => p.riskLevel === 'Red').length;
    const yellowCount = patients.filter(p => p.riskLevel === 'Yellow').length;
    const greenCount = patients.filter(p => p.riskLevel === 'Green').length;

    return (
      <div className="dashboard-overview-container">
        {/* Welcome Section */}
        <div className="welcome-hero" style={{ padding: '40px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ textTransform: 'uppercase', fontSize: '12px', letterSpacing: '2px', color: 'rgba(255,255,255,0.8)', fontWeight: 'bold' }}>
            DEMO MVP PROTOTYPE
          </span>
          <h1 style={{ marginTop: '8px', marginBottom: '16px', fontSize: '32px' }}>
            Shalom helps patients recover safely after surgery.
          </h1>
          <p style={{ margin: '0 auto', opacity: 0.95, maxWidth: '650px', fontSize: '15px', lineHeight: '1.6' }}>
            An interactive post-operative recovery assistant designed to track clinical symptoms at home, simplify discharge orders, and alert clinical teams to potential healing deviations.
          </p>

          <div style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              className="btn-primary" 
              onClick={() => { setActiveTab('patient-portal'); setPatientSubTab('check-in'); }}
              style={{ padding: '12px 28px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', color: 'var(--primary-dark)', fontWeight: 'bold' }}
            >
              <MessageSquare size={18} /> Start Patient Check-In
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => setActiveTab('nurse-dashboard')}
              style={{ padding: '12px 28px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', border: '2px solid rgba(255,255,255,0.4)', color: 'white', fontWeight: 'bold' }}
            >
              <Users size={18} /> Open Nurse Dashboard
            </button>
          </div>
        </div>

        {/* Portal Gateway Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', margin: '30px 0' }}>
          <div className="stat-card" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => { setActiveTab('patient-portal'); setPatientSubTab('check-in'); }}>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)' }}>
              <MessageSquare size={24} />
            </div>
            <div className="stat-info" style={{ marginTop: '12px' }}>
              <h3 style={{ fontSize: '18px', color: 'var(--primary-dark)', marginBottom: '6px' }}>Patient Portal</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dark)', lineHeight: '1.4' }}>
                Complete your daily recovery check-in questionnaire, track pain levels and temperature, organize post-op medications, and simplify discharge instructions.
              </p>
              <span className="chat-action-btn" style={{ marginTop: '12px', display: 'inline-block' }}>Access Patient Portal →</span>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => setActiveTab('nurse-dashboard')}>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(235, 94, 40, 0.1)', color: 'var(--accent)' }}>
              <Users size={24} />
            </div>
            <div className="stat-info" style={{ marginTop: '12px' }}>
              <h3 style={{ fontSize: '18px', color: 'var(--primary-dark)', marginBottom: '6px' }}>Nurse Dashboard Portal</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dark)', lineHeight: '1.4' }}>
                Monitor simulated patients recovering at home, view risk-prioritized alert statuses, check historical recovery charts, and review automated AI case summaries.
              </p>
              <span className="chat-action-btn" style={{ marginTop: '12px', display: 'inline-block', color: 'var(--accent)' }}>Open Nurse Portal →</span>
            </div>
          </div>
        </div>

        {/* Quick System Stats */}
        <div className="schedule-slot-card" style={{ padding: '20px', marginTop: '20px' }}>
          <h4 style={{ color: 'var(--primary-dark)', fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} style={{ color: 'var(--primary)' }} /> Live Simulated Clinical Metrics
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', textAlign: 'center' }}>
            <div style={{ padding: '10px', background: 'var(--bg-light)', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Simulated Patients</span>
              <strong style={{ fontSize: '20px' }}>{patients.length}</strong>
            </div>
            <div style={{ padding: '10px', background: '#fff5f5', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--danger)', display: 'block', fontWeight: 'bold' }}>Red Alerts</span>
              <strong style={{ fontSize: '20px', color: 'var(--danger)' }}>{redCount}</strong>
            </div>
            <div style={{ padding: '10px', background: '#fffbeb', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--warning)', display: 'block', fontWeight: 'bold' }}>Yellow Monitors</span>
              <strong style={{ fontSize: '20px', color: 'var(--warning)' }}>{yellowCount}</strong>
            </div>
            <div style={{ padding: '10px', background: '#f0fdf4', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--success)', display: 'block', fontWeight: 'bold' }}>Green Stable</span>
              <strong style={{ fontSize: '20px', color: 'var(--success)' }}>{greenCount}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPatientPortal = () => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px' }}>
        
        {/* Left Side: Subtab Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary-dark)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Patient Portal Tools
          </h4>
          <button 
            className={`nav-btn ${patientSubTab === 'check-in' ? 'active' : ''}`}
            onClick={() => setPatientSubTab('check-in')}
            style={{ textAlign: 'left', width: '100%' }}
          >
            <MessageSquare size={16} className="nav-icon" /> Daily Check-In Chat
          </button>
          <button 
            className={`nav-btn ${patientSubTab === 'meds' ? 'active' : ''}`}
            onClick={() => setPatientSubTab('meds')}
            style={{ textAlign: 'left', width: '100%' }}
          >
            <Pill size={16} className="nav-icon" /> Medication Tracker
          </button>
          <button 
            className={`nav-btn ${patientSubTab === 'decode' ? 'active' : ''}`}
            onClick={() => setPatientSubTab('decode')}
            style={{ textAlign: 'left', width: '100%' }}
          >
            <FileText size={16} className="nav-icon" /> Discharge Decoder
          </button>
          <button 
            className={`nav-btn ${patientSubTab === 'visit' ? 'active' : ''}`}
            onClick={() => setPatientSubTab('visit')}
            style={{ textAlign: 'left', width: '100%' }}
          >
            <FileSpreadsheet size={16} className="nav-icon" /> Surgeon Follow-Up Prep
          </button>
          
          <div style={{ marginTop: '30px', padding: '12px', background: 'var(--bg-light)', borderRadius: '8px', fontSize: '11px', lineHeight: '1.4' }}>
            <strong style={{ display: 'block', color: 'var(--primary-dark)', marginBottom: '4px' }}>Active Profile</strong>
            <span style={{ color: 'var(--text-dark)' }}>Arthur (Hip Replacement)</span>
            <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>Recovery Timeline: Day 5</span>
          </div>
        </div>

        {/* Right Side: Tab View */}
        <div style={{ minWidth: 0 }}>
          {patientSubTab === 'check-in' && (
            <ChatInterface 
              apiKey={apiKey} 
              setApiKey={setApiKey} 
              onCheckInComplete={handleCheckInComplete}
            />
          )}
          {patientSubTab === 'meds' && <MedTracker />}
          {patientSubTab === 'decode' && <DischargeDecoder apiKey={apiKey} />}
          {patientSubTab === 'visit' && <VisitPrep />}
        </div>
      </div>
    );
  };

  const renderAboutSection = () => {
    return (
      <div className="tool-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ color: 'var(--primary-dark)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>About Shalom AI Recovery Assistant</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px', lineHeight: '1.6' }}>
          <div>
            <h4 style={{ color: 'var(--primary)', marginBottom: '4px' }}>The Problem</h4>
            <p style={{ margin: 0 }}>
              The first two weeks following hospital discharge are critical for surgical patients. Due to complex clinical discharge documents, confusing medication schedules, and self-monitoring fatigue, up to 15% of patients experience preventable complications (like surgical site infections or medication dosage errors) at home, driving up emergency readmissions and overwhelming hospital clinical personnel.
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--primary)', marginBottom: '4px' }}>Who Shalom Serves</h4>
            <p style={{ margin: 0 }}>
              Shalom serves post-operative patients recovering in their home environments and the discharge nursing care teams monitoring their progress. It acts as an educational and triage bridge, alerting clinical nurses to warning signs so they can focus clinical outreach on the patients who need attention most.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
            <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid var(--success)' }}>
              <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '6px' }}>What Shalom CAN Do:</strong>
              <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Conduct daily structured recovery check-ins.</li>
                <li>Simulate internal clinical risk status classifications.</li>
                <li>Track and organize complex post-operative drug doses.</li>
                <li>Simplify jargon-heavy medical discharge summaries.</li>
                <li>Generate clinical trend charts and narratives for providers.</li>
              </ul>
            </div>

            <div style={{ padding: '12px 16px', background: '#fff5f5', borderRadius: '8px', borderLeft: '4px solid var(--danger)' }}>
              <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: '6px' }}>What Shalom CANNOT Do:</strong>
              <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Diagnose infections, blood clots, or other illnesses.</li>
                <li>Prescribe or adjust recovery drug dosages.</li>
                <li>Replace the judgment of surgeons, physicians, or nurses.</li>
                <li>Diagnose or manage active life-threatening emergencies.</li>
                <li>Guarantee clinical recovery outcomes.</li>
              </ul>
            </div>
          </div>

          <div className="safety-box" style={{ margin: '10px 0 0 0' }}>
            <h4 style={{ color: 'var(--warning)', fontSize: '14px', marginBottom: '6px' }}>Student Competition Prototype Note</h4>
            <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.4' }}>
              Shalom was built as a digital prototype to demonstrate how agentic AI workflows and simple rules-based clinical triage filters can support hospital transition-to-home models. No clinical decisions should be made based on this prototype.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <nav className="sidebar no-print">
        <div className="brand-section">
          <div className="logo-icon" style={{ backgroundColor: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={20} style={{ color: 'white' }} />
          </div>
          <div>
            <h2 className="brand-title">Shalom AI</h2>
            <span className="brand-subtitle">Post-Op Copilot</span>
          </div>
        </div>

        <ul className="nav-links">
          <li>
            <button 
              className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              <LayoutDashboard size={18} className="nav-icon" /> Home Page
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'patient-portal' ? 'active' : ''}`}
              onClick={() => setActiveTab('patient-portal')}
            >
              <MessageSquare size={18} className="nav-icon" /> Patient Portal
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'nurse-dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('nurse-dashboard')}
            >
              <TrendingUp size={18} className="nav-icon" /> Nurse Dashboard
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              <HelpCircle size={18} className="nav-icon" /> About Shalom
            </button>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div className="loved-one-badge" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <p>Simulated Environment</p>
            <span>Active Patients: 4</span>
          </div>
        </div>
      </nav>

      {/* Main Viewport */}
      <main className="main-viewport">
        {renderActiveTabContent()}
      </main>
    </div>
  );
}

export default App;
