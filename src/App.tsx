import { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  MessageSquare,
  Settings,
  Check,
  LineChart,
  Activity,
  ShieldAlert,
  Compass,
  Database,
  Upload,
  Trash2,
  AlertTriangle,
  User
} from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { type CheckInAnswers, type CareTeamReport, normalizePatientRecord } from './utils/shalomAgent';

type TabType = 'home' | 'check-in' | 'dataset' | 'insights' | 'about';

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

  // FAQ Knowledge Base state
  const [attachedFaqFile, setAttachedFaqFile] = useState<File | null>(null);
  const [faqDataset, setFaqDataset] = useState<any | null>(null);
  const [faqSearchQuery, setFaqSearchQuery] = useState<string>('');

  // Automatically load default FAQ dataset and patient record on mount
  useEffect(() => {
    const loadDefaultFaq = async () => {
      try {
        const response = await fetch('/Dataset_main_patient.json');
        if (response.ok) {
          const data = await response.json();
          setFaqDataset(data);
          setAttachedFaqFile(new File([JSON.stringify(data, null, 2)], "Dataset_main_patient.json", { type: "application/json" }));
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
      case 'dataset':
        return renderDatasetPage();
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

        {/* Action Button Row - Clearly distinguishes landing page from chat page */}
        <div className="hero-buttons-row" style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '20px', marginBottom: '40px' }}>
          <button className="btn-primary" onClick={() => setActiveTab('check-in')} style={{ padding: '14px 28px', borderRadius: '30px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={16} /> Start Patient Check-In
          </button>
          <button className="btn-secondary" onClick={() => setActiveTab('dataset')} style={{ padding: '14px 28px', borderRadius: '30px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={16} /> Upload Patient Dataset
          </button>
        </div>

        {/* Features Capabilities Grid */}
        <div className="features-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          width: '100%', 
          maxWidth: '900px', 
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
              <strong style={{ fontSize: '14px' }}>Early Detection</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
              Instantly triage symptoms into Green, Yellow, or Red to prevent clinical complications.
            </p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', textAlign: 'left', gap: '8px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-dark)' }}>
              <FileText size={18} />
              <strong style={{ fontSize: '14px' }}>Clinical Reports</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
              Generate concise, structured case summaries for the caregiver clinical dashboard.
            </p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', textAlign: 'left', gap: '8px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
              <Database size={18} />
              <strong style={{ fontSize: '14px' }}>Dataset Grounding</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
              Ground the AI assistant's clinical logic in specific patient discharge guidelines.
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

  const renderDatasetPage = () => {
    const loadDefaultDataset = async () => {
      try {
        const response = await fetch('/patient_record.json');
        if (!response.ok) {
          throw new Error("Could not fetch file");
        }
        const data = await response.json();
        setMedicalHistory(data);
        setAttachedFile(new File([JSON.stringify(data, null, 2)], "patient_record.json", { type: "application/json" }));
      } catch (err) {
        // Fallback data if public fetching fails
        const fallbackData = {
          "patientName": "Arthur",
          "age": 68,
          "surgeryType": "Left Total Hip Arthroplasty (Anterior Approach)",
          "dischargeDate": "June 20, 2026",
          "allergies": ["Penicillin", "Sulfa drugs"],
          "preExistingConditions": ["Hypertension", "Type 2 Diabetes", "Mild Osteoarthritis"],
          "activeMedications": [
            { "name": "Apixaban (Eliquis)", "dose": "2.5mg" },
            { "name": "Metformin", "dose": "500mg" },
            { "name": "Lisinopril", "dose": "10mg" }
          ],
          "surgeonNotes": "Monitor pain management and incision healing closely. Arthur is highly compliant but has a history of mild DVT, so Eliquis adherence is critical."
        };
        setMedicalHistory(fallbackData);
        setAttachedFile(new File([JSON.stringify(fallbackData, null, 2)], "patient_record.json", { type: "application/json" }));
      }
    };

    const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setAttachedFile(file);
          setMedicalHistory(json);
        } catch (err) {
          alert("Invalid JSON file format. Please upload a valid patient record dataset JSON.");
        }
      };
      reader.readAsText(file);
    };

    const handleClearDataset = () => {
      setAttachedFile(null);
      setMedicalHistory(null);
    };

    const loadDefaultFaqDataset = async () => {
      try {
        const response = await fetch('/Dataset_main_patient.json');
        if (!response.ok) {
          throw new Error("Could not fetch file");
        }
        const data = await response.json();
        setFaqDataset(data);
        setAttachedFaqFile(new File([JSON.stringify(data, null, 2)], "Dataset_main_patient.json", { type: "application/json" }));
      } catch (err) {
        alert("Failed to load default FAQ knowledge base dataset.");
      }
    };

    const handleCustomFaqUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (!json.faq || !Array.isArray(json.faq)) {
            throw new Error("Invalid FAQ dataset format");
          }
          setAttachedFaqFile(file);
          setFaqDataset(json);
        } catch (err) {
          alert("Invalid FAQ JSON format. Please upload a valid knowledge base dataset JSON containing an 'faq' array.");
        }
      };
      reader.readAsText(file);
    };

    const handleClearFaqDataset = () => {
      setAttachedFaqFile(null);
      setFaqDataset(null);
    };

    return (
      <div className="glass-panel" style={{ maxWidth: '1200px', margin: '0 auto', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
        <div style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Database size={20} style={{ color: 'var(--primary)' }} /> System Grounding & Knowledge Base
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Configure and preview patient profiles and the FAQ knowledge base that grounds Shalom's recovery AI agent.
          </p>
        </div>

        <div className="dataset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          
          {/* Patient Profile Grounding Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary-dark)', margin: '0 0 -4px 0', borderBottom: '2px solid var(--primary)', paddingBottom: '6px', width: 'fit-content' }}>
              Patient Profile
            </h3>
            
            {/* Upload patient card */}
            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0 }}>Patient Setup</h4>
              
              {attachedFile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--success-bg)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(33, 140, 116, 0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Check size={20} style={{ color: 'var(--success)' }} />
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px', color: 'var(--success)' }}>Patient Dataset Active</strong>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>File: {attachedFile.name}</span>
                    </div>
                  </div>
                  <button className="btn-secondary btn-sm" onClick={handleClearDataset} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content', color: 'var(--emergency)', borderColor: 'rgba(179, 57, 57, 0.1)', cursor: 'pointer' }}>
                    <Trash2 size={13} /> Unload Patient
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ 
                    border: '2px dashed rgba(192, 122, 176, 0.3)', 
                    borderRadius: '12px', 
                    padding: '30px 20px', 
                    textAlign: 'center', 
                    background: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    position: 'relative'
                  }}>
                    <input 
                      type="file" 
                      accept=".json"
                      onChange={handleCustomFileUpload}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    />
                    <Upload size={32} style={{ color: 'var(--primary)', opacity: 0.7, marginBottom: '8px', margin: '0 auto' }} />
                    <span style={{ display: 'block', fontSize: '13.5px', fontWeight: '600', color: 'var(--text-main)' }}>Click to browse Patient JSON</span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Supports structured discharge profiles (.json)</span>
                  </div>

                  <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', position: 'relative' }}>
                    <span style={{ background: '#fff', padding: '0 8px', position: 'relative', zIndex: 1 }}>OR</span>
                    <div style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', position: 'absolute', top: '50%', left: 0, right: 0, zIndex: 0 }}></div>
                  </div>

                  <button className="btn-primary" onClick={loadDefaultDataset} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <User size={15} /> Load Default Demo Patient (James Carter)
                  </button>
                </div>
              )}
            </div>

            {/* Patient Dataset Preview card */}
            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0 }}>Active Patient Profile Preview</h4>
              
              {medicalHistory ? (() => {
                const normalized = normalizePatientRecord(medicalHistory);
                if (!normalized) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
                        {normalized.patientName?.[0] || 'P'}
                      </div>
                      <div>
                        <h5 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0 }}>{normalized.patientName}</h5>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Age: {normalized.age} {normalized.sex ? `• Sex: ${normalized.sex}` : ''} • Discharged: {normalized.dischargeDate}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Surgery Procedure</span>
                      <strong style={{ color: 'var(--text-main)', fontSize: '13px' }}>{normalized.surgeryType}</strong>
                    </div>

                    {normalized.allergies && normalized.allergies.length > 0 && (
                      <div>
                        <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Allergies</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {normalized.allergies.map((all: string, idx: number) => (
                            <span key={idx} style={{ background: 'var(--emergency-bg)', color: 'var(--emergency)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={10} /> {all}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {normalized.preExistingConditions && normalized.preExistingConditions.length > 0 && (
                      <div>
                        <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Pre-existing Conditions</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {normalized.preExistingConditions.map((cond: string, idx: number) => (
                            <span key={idx} style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', border: '1px solid rgba(0,0,0,0.04)' }}>
                              {cond}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {normalized.activeMedications && normalized.activeMedications.length > 0 && (
                      <div>
                        <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Active Discharge Medications</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {normalized.activeMedications.map((med: any, idx: number) => (
                            <div key={idx} style={{ background: 'rgba(94, 158, 203, 0.05)', border: '1px solid rgba(94, 158, 203, 0.1)', padding: '6px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: 'var(--primary-dark)', fontSize: '12px' }}>{med.name}</strong>
                              <span style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>{med.dose}{med.frequency ? ` (${med.frequency})` : ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {normalized.chronicMedications && normalized.chronicMedications.length > 0 && (
                      <div>
                        <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Chronic/Current Medications</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {normalized.chronicMedications.map((med: any, idx: number) => (
                            <div key={idx} style={{ background: 'rgba(94, 158, 203, 0.02)', border: '1px solid rgba(0,0,0,0.04)', padding: '6px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: 'var(--text-main)', fontSize: '12px' }}>{med.name}</strong>
                              <span style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>{med.dose}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {normalized.surgeonNotes && (
                      <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Recovery Notes / Instructions</span>
                        <p style={{ margin: 0, fontStyle: 'italic', color: '#525c6c', lineHeight: '1.4', background: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                          "{normalized.surgeonNotes}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '260px', border: '1px dashed rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <Database size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '12px' }} />
                  <h5 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-muted)', margin: 0 }}>No Patient Record Active</h5>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '240px', marginTop: '6px', margin: '6px auto 0 auto' }}>
                    Load a patient record dataset to visualize clinical grounding metrics. Shalom will fall back to baseline post-op guidelines if none is provided.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* FAQ Knowledge Base Grounding Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary-dark)', margin: '0 0 -4px 0', borderBottom: '2px solid var(--accent)', paddingBottom: '6px', width: 'fit-content' }}>
              FAQ Knowledge Base
            </h3>
            
            {/* Upload FAQ card */}
            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0 }}>Knowledge Base Setup</h4>
              
              {attachedFaqFile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--success-bg)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(33, 140, 116, 0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Check size={20} style={{ color: 'var(--success)' }} />
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px', color: 'var(--success)' }}>FAQ Knowledge Base Active</strong>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>File: {attachedFaqFile.name}</span>
                    </div>
                  </div>
                  <button className="btn-secondary btn-sm" onClick={handleClearFaqDataset} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content', color: 'var(--emergency)', borderColor: 'rgba(179, 57, 57, 0.1)', cursor: 'pointer' }}>
                    <Trash2 size={13} /> Unload Knowledge Base
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ 
                    border: '2px dashed rgba(192, 122, 176, 0.3)', 
                    borderRadius: '12px', 
                    padding: '30px 20px', 
                    textAlign: 'center', 
                    background: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    position: 'relative'
                  }}>
                    <input 
                      type="file" 
                      accept=".json"
                      onChange={handleCustomFaqUpload}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    />
                    <Upload size={32} style={{ color: 'var(--accent)', opacity: 0.7, marginBottom: '8px', margin: '0 auto' }} />
                    <span style={{ display: 'block', fontSize: '13.5px', fontWeight: '600', color: 'var(--text-main)' }}>Click to browse FAQ JSON</span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Supports structured FAQ records (.json)</span>
                  </div>

                  <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', position: 'relative' }}>
                    <span style={{ background: '#fff', padding: '0 8px', position: 'relative', zIndex: 1 }}>OR</span>
                    <div style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', position: 'absolute', top: '50%', left: 0, right: 0, zIndex: 0 }}></div>
                  </div>

                  <button className="btn-secondary" onClick={loadDefaultFaqDataset} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <Sparkles size={15} style={{ color: 'var(--accent)' }} /> Load Default FAQ (Dataset_main_patient)
                  </button>
                </div>
              )}
            </div>

            {/* FAQ Dataset Preview card */}
            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0 }}>Knowledge Base Information Preview</h4>
              
              {faqDataset ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
                      K
                    </div>
                    <div>
                      <h5 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0 }}>{faqDataset.dataset_name}</h5>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Version: {faqDataset.version} • FAQs count: {faqDataset.faq?.length || faqDataset.records_count}</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Intended Use</span>
                    <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '12px', lineHeight: '1.4' }}>{faqDataset.intended_use}</p>
                  </div>

                  {faqDataset.design_direction && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.01)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)' }}>
                      <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block' }}>Design Direction & Rules</span>
                      <div style={{ fontSize: '12px' }}><strong style={{ color: 'var(--primary-dark)' }}>Brand Voice:</strong> {faqDataset.design_direction.brand_voice}</div>
                      <div style={{ fontSize: '12px' }}><strong style={{ color: 'var(--primary-dark)' }}>Personality:</strong> {faqDataset.design_direction.personality}</div>
                      
                      {faqDataset.design_direction.style_rules && (
                        <div style={{ marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Style Rules:</span>
                          <ul style={{ paddingLeft: '14px', margin: '4px 0 0 0', fontSize: '11.5px', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {faqDataset.design_direction.style_rules.map((rule: string, idx: number) => (
                              <li key={idx}>{rule}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Interactive FAQ Search */}
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block' }}>Search FAQ Knowledge Base</span>
                    <input 
                      type="text"
                      placeholder="Type query to test FAQ search (e.g. pain, shower, fever)..."
                      value={faqSearchQuery}
                      onChange={(e) => setFaqSearchQuery(e.target.value)}
                      style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', outline: 'none', background: 'var(--bg-primary)' }}
                    />
                    
                    {faqSearchQuery.trim() && (() => {
                      const query = faqSearchQuery.toLowerCase();
                      const matches = (faqDataset.faq || []).filter((item: any) => 
                        (item.patient_question || '').toLowerCase().includes(query) ||
                        (item.category || '').toLowerCase().includes(query) ||
                        (item.tags || []).some((t: string) => t.toLowerCase().includes(query))
                      ).slice(0, 3);
                      
                      if (matches.length === 0) {
                        return <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No matches found in 76 FAQs.</span>;
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 'bold' }}>{matches.length} FAQ match(es) in base:</span>
                          {matches.map((match: any) => (
                            <div key={match.id} style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(0,0,0,0.04)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <strong style={{ color: 'var(--primary-dark)', fontSize: '12px' }}>Q: {match.patient_question}</strong>
                              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-main)', lineHeight: '1.4' }}>A: {match.shalom_response}</p>
                              <span style={{ fontSize: '9px', color: 'var(--text-muted)', alignSelf: 'flex-end', background: '#fff', padding: '1px 6px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.03)' }}>Category: {match.category}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <button 
                    className="btn-primary" 
                    onClick={() => setActiveTab('check-in')}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                  >
                    <MessageSquare size={14} /> Open Chat & Test Grounded FAQ
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '260px', border: '1px dashed rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <Sparkles size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '12px' }} />
                  <h5 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-muted)', margin: 0 }}>No FAQ Knowledge Base Active</h5>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '240px', marginTop: '6px', margin: '6px auto 0 auto' }}>
                    Load a FAQ dataset to view brand style rules and explore standard patient question answers.
                  </p>
                </div>
              )}
            </div>
          </div>

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

        <div className="insights-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
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

          <div className="about-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '8px' }}>
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
              className={`nav-btn ${activeTab === 'dataset' ? 'active' : ''}`}
              onClick={() => setActiveTab('dataset')}
              title="Dataset Grounding"
            >
              <Database size={18} />
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
