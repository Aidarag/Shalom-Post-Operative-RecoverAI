import { useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Pill, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle,
  Info,
  Activity,
  TrendingUp
} from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { MedTracker } from './components/MedTracker';
import { VisitPrep } from './components/VisitPrep';
import { DischargeDecoder } from './components/DischargeDecoder';
import { ClinicalSummary } from './components/ClinicalSummary';
import { MOCK_RECOVERY_HISTORY, type RecoveryLog } from './utils/mockData';

type TabType = 'overview' | 'chat' | 'meds' | 'visit' | 'decode' | 'support';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [apiKey, setApiKey] = useState<string>('');
  
  // Manage patient recovery history in central App state to sync across tabs
  const [recoveryHistory, setRecoveryHistory] = useState<RecoveryLog[]>(MOCK_RECOVERY_HISTORY);

  const handleCheckInComplete = (answers: {
    painLevel: number;
    temperature: number;
    medsAdherence: number;
    mobility: 'None' | 'Limited' | 'Moderate' | 'Good';
    sleepQuality: 'Poor' | 'Fair' | 'Good';
    woundAppearance: 'Normal' | 'Mild Redness' | 'Redness & Swelling' | 'Drainage' | 'Infected';
    notes: string;
  }) => {
    setRecoveryHistory(prev => {
      const nextDay = prev.length + 1;
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Prevent duplicate logging for the same day if re-run
      if (prev.some(log => log.day === nextDay)) {
        return prev;
      }
      
      const newLog: RecoveryLog = {
        day: nextDay,
        date: dateStr,
        painLevel: answers.painLevel,
        temperature: answers.temperature,
        mobility: answers.mobility,
        sleepQuality: answers.sleepQuality,
        woundAppearance: answers.woundAppearance,
        medsAdherence: answers.medsAdherence,
        notes: answers.notes
      };
      
      return [...prev, newLog];
    });
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderDashboardOverview();
      case 'chat':
        return (
          <ChatInterface 
            apiKey={apiKey} 
            setApiKey={setApiKey} 
            onNavigateToTool={handleNavigateToTool} 
            onCheckInComplete={handleCheckInComplete}
          />
        );
      case 'meds':
        return <MedTracker />;
      case 'visit':
        return <VisitPrep />;
      case 'decode':
        return <DischargeDecoder apiKey={apiKey} />;
      case 'support':
        return <ClinicalSummary history={recoveryHistory} />;
      default:
        return renderDashboardOverview();
    }
  };

  const handleNavigateToTool = (toolId: string) => {
    setActiveTab(toolId as TabType);
  };

  const renderDashboardOverview = () => {
    const latestLog = recoveryHistory[recoveryHistory.length - 1];
    const targetDay = 14;
    const progressPercent = Math.min(100, Math.round((latestLog.day / targetDay) * 100));

    return (
      <div className="dashboard-overview-container">
        {/* Welcome Section */}
        <div className="welcome-hero" style={{ padding: '24px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>
                Active Patient Profile
              </span>
              <h1 style={{ marginTop: '4px', marginBottom: '8px' }}>Arthur's Recovery Dashboard</h1>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Left Total Hip Arthroplasty (Anterior Approach) | Post-Op Day {latestLog.day} of {targetDay}
              </p>
            </div>
            {/* Circular Timeline Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.1)', padding: '10px 16px', borderRadius: '12px' }}>
              <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                <svg width="48" height="48" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="white" strokeWidth="3" strokeDasharray={`${progressPercent} ${100 - progressPercent}`} />
                </svg>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                  {progressPercent}%
                </div>
              </div>
              <div style={{ fontSize: '12px' }}>
                <strong style={{ display: 'block' }}>Timeline Progress</strong>
                <span>Day {latestLog.day} / {targetDay}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', margin: '20px 0' }}>
          <div className="schedule-slot-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Pain Severity</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <strong style={{ fontSize: '24px', color: latestLog.painLevel >= 7 ? 'var(--danger)' : latestLog.painLevel >= 4 ? 'var(--warning)' : 'var(--success)' }}>
                {latestLog.painLevel}
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ 10</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trend: {latestLog.painLevel >= 5 ? 'Elevated' : 'Controlled'}</span>
          </div>

          <div className="schedule-slot-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Temperature</span>
            <strong style={{ fontSize: '24px', color: latestLog.temperature >= 99.4 ? 'var(--warning)' : 'var(--success)' }}>
              {latestLog.temperature}°F
            </strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Normal range: 97.0°-99.0°</span>
          </div>

          <div className="schedule-slot-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Mobility Rating</span>
            <strong style={{ fontSize: '24px', color: 'var(--accent)' }}>{latestLog.mobility}</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Progressing daily</span>
          </div>

          <div className="schedule-slot-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Wound Site</span>
            <strong style={{ fontSize: '18px', color: latestLog.woundAppearance === 'Normal' ? 'var(--success)' : 'var(--warning)' }}>
              {latestLog.woundAppearance}
            </strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Inspect daily</span>
          </div>
        </div>

        {/* Dashboard grid layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', margin: '20px 0' }}>
          
          {/* Left Column: Today's Tasks */}
          <div className="schedule-slot-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <CheckCircle size={18} style={{ marginRight: '8px', color: 'var(--success)' }} /> Today's Post-Op Recovery Tasks
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', padding: 0, margin: 0 }}>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="checkbox" defaultChecked={recoveryHistory.length > 5} style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }} />
                <span>Complete daily recovery check-in with Shalom AI {recoveryHistory.length > 5 ? '✓' : ''}</span>
              </li>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }} />
                <span>Wound Care: Visually inspect hip dressing. Keep dry.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="checkbox" style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }} />
                <span>Physical Therapy: Walk with walker for 10-15 minutes (3 sessions)</span>
              </li>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="checkbox" style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }} />
                <span>Hydration: Drink 6-8 glasses of water today.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="checkbox" style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }} />
                <span>Log medication compliance in Medication Tracker.</span>
              </li>
            </ul>
          </div>

          {/* Right Column: Support & Disclaimers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="safety-box" style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <Info size={24} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <div>
                  <h4 style={{ color: 'var(--warning)', fontSize: '15px', fontWeight: 'bold', marginBottom: '4px' }}>Incision Red Flag Reminder</h4>
                  <p style={{ fontSize: '13px', lineHeight: '1.4', margin: 0, color: 'var(--text-dark)' }}>
                    Contact your surgical care team immediately if you observe a fever of 101.5°F or higher, spreading redness/warmth around the hip incision, or foul-smelling yellow drainage.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Dashboard quick stats/tools access */}
        <div className="quick-links-section" style={{ marginTop: '24px' }}>
          <h3>Post-Op Recovery Toolkit</h3>
          <div className="dashboard-stats-row">
            <div className="stat-card" onClick={() => setActiveTab('chat')}>
              <div className="stat-icon-wrapper">
                <MessageSquare size={22} />
              </div>
              <div className="stat-info">
                <h4>Daily Check-in Chat</h4>
                <p>Run your comprehensive recovery scan. Discuss pain levels, symptoms, and receive structured post-op support.</p>
              </div>
            </div>

            <div className="stat-card" onClick={() => setActiveTab('meds')}>
              <div className="stat-icon-wrapper">
                <Pill size={22} />
              </div>
              <div className="stat-info">
                <h4>Medication Tracker</h4>
                <p>Track blood thinners, pain medications, stool softeners, and follow safety dosage guidelines.</p>
              </div>
            </div>

            <div className="stat-card visit" onClick={() => setActiveTab('visit')}>
              <div className="stat-icon-wrapper">
                <FileSpreadsheet size={22} />
              </div>
              <div className="stat-info">
                <h4>Surgeon Follow-Up Prep</h4>
                <p>Build a checklist of critical questions regarding your stitches, stitches removal, physical therapy milestones.</p>
              </div>
            </div>

            <div className="stat-card decode" onClick={() => setActiveTab('decode')}>
              <div className="stat-icon-wrapper">
                <FileText size={22} />
              </div>
              <div className="stat-info">
                <h4>Discharge Decoder</h4>
                <p>Decode complex orthopedic discharge instructions into clear daily directives.</p>
              </div>
            </div>

            <div className="stat-card support" onClick={() => setActiveTab('support')}>
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(235, 94, 40, 0.1)', color: 'var(--accent)' }}>
                <TrendingUp size={22} />
              </div>
              <div className="stat-info">
                <h4>Provider Reports</h4>
                <p>Access historical trend logs for pain and temperature, review the internal status flag, and generate clinic printouts.</p>
              </div>
            </div>
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
            <span className="brand-subtitle">Recovery Assistant</span>
          </div>
        </div>

        <ul className="nav-links">
          <li>
            <button 
              className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <LayoutDashboard size={18} className="nav-icon" /> Dashboard
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={18} className="nav-icon" /> Daily Check-in Chat
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'meds' ? 'active' : ''}`}
              onClick={() => setActiveTab('meds')}
            >
              <Pill size={18} className="nav-icon" /> Medication Tracker
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'visit' ? 'active' : ''}`}
              onClick={() => setActiveTab('visit')}
            >
              <FileSpreadsheet size={18} className="nav-icon" /> Surgeon Follow-Up Prep
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'decode' ? 'active' : ''}`}
              onClick={() => setActiveTab('decode')}
            >
              <FileText size={18} className="nav-icon" /> Discharge Decoder
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'support' ? 'active' : ''}`}
              onClick={() => setActiveTab('support')}
            >
              <TrendingUp size={18} className="nav-icon" /> Provider Reports
            </button>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div className="loved-one-badge" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <p>Active Patient</p>
            <span>Arthur (Hip Post-Op)</span>
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
