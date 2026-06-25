import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Search, User, Phone, Send, Clipboard } from 'lucide-react';
import { type Patient, type RecoveryLog } from '../utils/mockData';

interface NurseDashboardProps {
  patients: Patient[];
}

export const NurseDashboard: React.FC<NurseDashboardProps> = ({ patients }) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'All' | 'Red' | 'Yellow' | 'Green'>('All');
  
  // State to hold nurse notes entered during this demo session
  const [nurseNotesText, setNurseNotesText] = useState('');
  const [patientNotesList, setPatientNotesList] = useState<Record<string, Array<{ date: string; text: string }>>>({
    'pat-1': [{ date: 'June 25, 10:15 AM', text: 'Checked knee incision via video call. Observed spreading erythema and edema. Temperature recorded at 100.4°F. Contacted orthopedic resident on call. Advised patient to present to clinic at 1:00 PM for assessment.' }],
    'pat-2': [{ date: 'June 25, 09:30 AM', text: 'Spoke with Arthur regarding missed dose. Informed that it was due to stomach upset. Advised taking subsequent doses with food. Confirmed swelling is mild.' }],
    'pat-4': [{ date: 'June 25, 11:10 AM', text: 'URGENT: Patient reported chest pain and difficulty breathing. Advised immediate activation of EMS (911). Logged emergency redirect instruction.' }]
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nurseNotesText.trim() || !selectedPatientId) return;

    const newNote = {
      date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      text: nurseNotesText.trim()
    };

    setPatientNotesList(prev => ({
      ...prev,
      [selectedPatientId]: [newNote, ...(prev[selectedPatientId] || [])]
    }));
    setNurseNotesText('');
  };

  // Sort and filter patients: Red first, then Yellow, then Green
  const filteredPatients = patients
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.surgery.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === 'All' || p.riskLevel === riskFilter;
      return matchesSearch && matchesRisk;
    })
    .sort((a, b) => {
      const riskWeight = { Red: 3, Yellow: 2, Green: 1 };
      return riskWeight[b.riskLevel] - riskWeight[a.riskLevel];
    });

  // SVG Chart Dimensions
  const chartWidth = 480;
  const chartHeight = 110;
  const paddingX = 40;
  const paddingY = 12;
  const availableWidth = chartWidth - paddingX * 2;
  const availableHeight = chartHeight - paddingY * 2;

  // Pain SVG Path calculation
  const getPainPoints = (history: RecoveryLog[]) => {
    return history.map((log, index) => {
      const x = paddingX + (index / (history.length - 1 || 1)) * availableWidth;
      const y = chartHeight - paddingY - ((log.painLevel - 1) / 9) * availableHeight;
      return { x, y, val: log.painLevel, day: log.day };
    });
  };

  // Temp SVG Path calculation (97.0°F - 102.0°F)
  const getTempPoints = (history: RecoveryLog[]) => {
    const minTemp = 97.0;
    const maxTemp = 102.0;
    const range = maxTemp - minTemp;
    return history.map((log, index) => {
      const x = paddingX + (index / (history.length - 1 || 1)) * availableWidth;
      const y = chartHeight - paddingY - ((log.temperature - minTemp) / range) * availableHeight;
      return { x, y, val: log.temperature, day: log.day };
    });
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Clinical narrative copied to clipboard!');
  };

  return (
    <div className="tool-card">
      <div className="tool-header">
        <div>
          <h2>Clinical Nurse Monitoring Dashboard</h2>
          <p className="tool-subtitle">Sorts recovering patients by risk level, alerts nurses of warning signs, and details clinical check-in history.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', minHeight: '600px' }}>
        
        {/* Left Side: Patient List & Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
          
          {/* Search bar */}
          <div className="search-input-wrapper" style={{ margin: 0 }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name or surgery..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
              style={{ fontSize: '13px', padding: '6px 12px 6px 32px' }}
            />
          </div>

          {/* Risk Category Selector */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['All', 'Red', 'Yellow', 'Green'] as const).map(level => (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                className={`chip-btn ${riskFilter === level ? 'active' : ''}`}
                style={{ 
                  flex: 1, 
                  fontSize: '11px', 
                  padding: '4px 6px',
                  backgroundColor: riskFilter === level 
                    ? (level === 'Red' ? 'var(--danger)' : level === 'Yellow' ? 'var(--warning)' : level === 'Green' ? 'var(--success)' : 'var(--primary-dark)')
                    : 'var(--bg-light)'
                }}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Patient Card Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '550px', paddingRight: '4px' }}>
            {filteredPatients.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
                No active patients match this criteria.
              </p>
            ) : (
              filteredPatients.map(patient => {
                const isSelected = patient.id === selectedPatientId;
                const isRed = patient.riskLevel === 'Red';
                const isYellow = patient.riskLevel === 'Yellow';
                
                return (
                  <div
                    key={patient.id}
                    onClick={() => {
                      setSelectedPatientId(patient.id);
                      setNurseNotesText('');
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: isSelected 
                        ? (isRed ? '2px solid var(--danger)' : isYellow ? '2px solid var(--warning)' : '2px solid var(--success)') 
                        : '1px solid var(--border-color)',
                      backgroundColor: isSelected 
                        ? (isRed ? '#fff5f5' : isYellow ? '#fffbeb' : '#f0fdf4') 
                        : 'white',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    className={`patient-card-demo ${isRed ? 'pulse-border' : ''}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--primary-dark)' }}>{patient.name}</strong>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: 'bold', 
                        padding: '2px 6px', 
                        borderRadius: '12px',
                        backgroundColor: isRed ? 'var(--danger)' : isYellow ? 'var(--warning)' : 'var(--success)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isRed && <span className="red-dot-pulse"></span>}
                        {patient.riskLevel}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-dark)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{patient.surgery}</span>
                      <span style={{ color: 'var(--text-muted)' }}>Day {patient.postOpDay}</span>
                    </div>

                    <div style={{ fontSize: '11px', marginTop: '6px', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                      <span>Pain: <strong>{patient.painLevel}/10</strong></span>
                      <span>Meds: <strong style={{ color: patient.medicationStatus === 'Missed' ? 'var(--warning)' : 'inherit' }}>{patient.medicationStatus}</strong></span>
                    </div>

                    <div style={{ 
                      fontSize: '11px', 
                      marginTop: '8px', 
                      paddingTop: '6px', 
                      borderTop: '1px dashed var(--border-color)',
                      color: 'var(--text-dark)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {patient.aiSummary}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Selected Patient Detail View */}
        <div style={{ minWidth: 0 }}>
          {selectedPatient ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Header Details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0, color: 'var(--primary-dark)' }}>{selectedPatient.name}</h2>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 'bold', 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      backgroundColor: selectedPatient.riskLevel === 'Red' ? 'var(--danger)' : selectedPatient.riskLevel === 'Yellow' ? 'var(--warning)' : 'var(--success)',
                      color: 'white'
                    }}>
                      Risk Level: {selectedPatient.riskLevel}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {selectedPatient.surgery} &bull; Post-Operative Recovery Day {selectedPatient.postOpDay}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    className="btn-secondary btn-sm" 
                    onClick={() => handleCopyToClipboard(selectedPatient.aiSummary)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Clipboard size={12} /> Copy Narrative
                  </button>
                  <a href={`tel:555-0100`} className="btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                    <Phone size={12} /> Contact Patient
                  </a>
                </div>
              </div>

              {/* Action Banner */}
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '8px', 
                backgroundColor: selectedPatient.riskLevel === 'Red' ? '#fff5f5' : selectedPatient.riskLevel === 'Yellow' ? '#fffbeb' : '#f0fdf4',
                borderLeft: `5px solid ${selectedPatient.riskLevel === 'Red' ? 'var(--danger)' : selectedPatient.riskLevel === 'Yellow' ? 'var(--warning)' : 'var(--success)'}`,
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                {selectedPatient.riskLevel === 'Red' && <ShieldAlert size={20} style={{ color: 'var(--danger)', flexShrink: 0 }} />}
                {selectedPatient.riskLevel === 'Yellow' && <AlertTriangle size={20} style={{ color: 'var(--warning)', flexShrink: 0 }} />}
                {selectedPatient.riskLevel === 'Green' && <CheckCircle size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />}
                <div>
                  <strong style={{ fontSize: '13px', display: 'block', color: 'var(--primary-dark)' }}>Recommended Clinical Response:</strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-dark)' }}>{selectedPatient.recommendedAction}</span>
                </div>
              </div>

              {/* Grid: Charts & Patient Vitals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* Details Log Card */}
                <div className="schedule-slot-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Current Vital Metrics</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ padding: '8px', background: 'var(--bg-light)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Pain Level</span>
                      <strong style={{ fontSize: '16px', color: selectedPatient.painLevel >= 8 ? 'var(--danger)' : 'inherit' }}>{selectedPatient.painLevel} / 10</strong>
                    </div>
                    <div style={{ padding: '8px', background: 'var(--bg-light)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Temperature</span>
                      <strong style={{ fontSize: '16px', color: selectedPatient.history[selectedPatient.history.length - 1]?.temperature >= 100.4 ? 'var(--danger)' : 'inherit' }}>
                        {selectedPatient.history[selectedPatient.history.length - 1]?.temperature}°F
                      </strong>
                    </div>
                    <div style={{ padding: '8px', background: 'var(--bg-light)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Medication Status</span>
                      <strong style={{ fontSize: '15px' }}>{selectedPatient.medicationStatus}</strong>
                    </div>
                    <div style={{ padding: '8px', background: 'var(--bg-light)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Wound Condition</span>
                      <strong style={{ fontSize: '13px' }}>{selectedPatient.history[selectedPatient.history.length - 1]?.woundAppearance || 'Normal'}</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>AI-Generated Narrative:</span>
                    <p style={{ fontSize: '12px', margin: '4px 0 0 0', fontStyle: 'italic', lineHeight: '1.4' }}>
                      "{selectedPatient.aiSummary}"
                    </p>
                  </div>
                </div>

                {/* Interactive Nurse Notes */}
                <div className="schedule-slot-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Nurse Intervention Log</h4>
                  
                  <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Add case notes..."
                      value={nurseNotesText}
                      onChange={e => setNurseNotesText(e.target.value)}
                      style={{ 
                        flex: 1, 
                        fontSize: '12px', 
                        padding: '6px 10px', 
                        borderRadius: '6px', 
                        border: '1px solid var(--border-color)' 
                      }}
                    />
                    <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                      <Send size={12} />
                    </button>
                  </form>

                  <div style={{ overflowY: 'auto', maxHeight: '120px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    {(patientNotesList[selectedPatient.id] || []).map((note, idx) => (
                      <div key={idx} style={{ padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-light)', fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '2px', fontSize: '9px' }}>
                          <span>{note.date}</span>
                          <span>Registered Nurse</span>
                        </div>
                        <p style={{ margin: 0, lineHeight: '1.3' }}>{note.text}</p>
                      </div>
                    ))}
                    {(patientNotesList[selectedPatient.id] || []).length === 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>No interventions logged yet.</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Recovery Trend Graphs Pane */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* Pain Chart */}
                <div className="schedule-slot-card" style={{ padding: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary-dark)', display: 'block', marginBottom: '6px' }}>Pain Level History</span>
                  <div style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px' }}>
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
                      {[1, 4, 7, 10].map(val => {
                        const y = chartHeight - paddingY - ((val - 1) / 9) * availableHeight;
                        return (
                          <g key={val}>
                            <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2 2" />
                            <text x={paddingX - 8} y={y + 3} textAnchor="end" fontSize="8" fill="var(--text-muted)">{val}</text>
                          </g>
                        );
                      })}
                      <path
                        d={getPainPoints(selectedPatient.history).map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                        fill="none"
                        stroke="var(--danger)"
                        strokeWidth="2"
                      />
                      {getPainPoints(selectedPatient.history).map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="3" fill="var(--danger)" />
                          <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize="8" fontWeight="bold">{p.val}</text>
                          <text x={p.x} y={chartHeight - 1} textAnchor="middle" fontSize="8" fill="var(--text-muted)">Day {p.day}</text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Temperature Chart */}
                <div className="schedule-slot-card" style={{ padding: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary-dark)', display: 'block', marginBottom: '6px' }}>Temperature History (°F)</span>
                  <div style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px' }}>
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
                      {[97.0, 98.5, 100.0, 101.5].map(val => {
                        const y = chartHeight - paddingY - ((val - 97.0) / 5) * availableHeight;
                        return (
                          <g key={val}>
                            <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2 2" />
                            <text x={paddingX - 8} y={y + 3} textAnchor="end" fontSize="8" fill="var(--text-muted)">{val.toFixed(1)}</text>
                          </g>
                        );
                      })}
                      {/* Danger Line for 100.4°F */}
                      <line 
                        x1={paddingX} 
                        y1={chartHeight - paddingY - ((100.4 - 97.0) / 5) * availableHeight} 
                        x2={chartWidth - paddingX} 
                        y2={chartHeight - paddingY - ((100.4 - 97.0) / 5) * availableHeight} 
                        stroke="red" 
                        strokeWidth="0.8" 
                        strokeDasharray="4 2" 
                      />
                      <path
                        d={getTempPoints(selectedPatient.history).map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="2"
                      />
                      {getTempPoints(selectedPatient.history).map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="3" fill="var(--primary)" />
                          <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize="8" fontWeight="bold">{p.val.toFixed(1)}</text>
                          <text x={p.x} y={chartHeight - 1} textAnchor="middle" fontSize="8" fill="var(--text-muted)">Day {p.day}</text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <User size={48} style={{ opacity: 0.5, marginBottom: '10px' }} />
              <p>Select a patient from the checklist to monitor their recovery.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
