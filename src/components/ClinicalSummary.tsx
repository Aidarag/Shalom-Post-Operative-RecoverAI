import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Clipboard, Printer, Calendar, User, Eye, EyeOff } from 'lucide-react';
import { type RecoveryLog } from '../utils/mockData';

interface ClinicalSummaryProps {
  history: RecoveryLog[];
}

export const ClinicalSummary: React.FC<ClinicalSummaryProps> = ({ history }) => {
  const [showStatus, setShowStatus] = useState(false); // Toggle to represent "do not show directly to patients" but accessible for clinical/provider purposes

  if (history.length === 0) {
    return (
      <div className="tool-card">
        <p>No recovery logs found. Please complete a daily check-in first.</p>
      </div>
    );
  }

  const latest = history[history.length - 1];
  const prev = history.length > 1 ? history[history.length - 2] : null;

  // Determine recovery status internally
  // Green - Stable Recovery
  // Yellow - Needs Monitoring
  // Red - Needs Clinical Review
  const getStatus = (): { status: 'Green' | 'Yellow' | 'Red'; label: string; color: string; description: string } => {
    // Red Flags
    if (latest.woundAppearance === 'Infected' || latest.temperature >= 101.0 || latest.painLevel >= 8) {
      return {
        status: 'Red',
        label: 'Needs Clinical Review',
        color: 'var(--danger)',
        description: 'Red Flag Warning: Symptoms suggest potential post-op complications (fever >= 101°F, signs of infection, or uncontrolled pain). Immediate provider assessment recommended.'
      };
    }
    // Yellow Flags
    if (
      latest.woundAppearance === 'Redness & Swelling' ||
      latest.woundAppearance === 'Drainage' ||
      latest.woundAppearance === 'Mild Redness' ||
      latest.temperature >= 99.4 ||
      latest.painLevel >= 5 ||
      latest.medsAdherence < 80
    ) {
      return {
        status: 'Yellow',
        label: 'Needs Monitoring',
        color: 'var(--warning)',
        description: 'Warning Indicator: Minor deviations detected (low-grade fever, wound changes, elevated pain, or missed meds). Increase monitoring frequency and consult care team.'
      };
    }

    return {
      status: 'Green',
      label: 'Stable Recovery',
      color: 'var(--success)',
      description: 'Routine Progress: Metrics are within expected thresholds. Continue routine daily monitoring and activity guidance.'
    };
  };

  const statusInfo = getStatus();

  // Generate automated provider narrative
  const generateNarrative = () => {
    let narrative = `CLINICAL POST-OPERATIVE SUMMARY
-----------------------------------
PATIENT: Arthur
SURGERY: Left Total Hip Arthroplasty (Anterior Approach)
RECOVERY TIMELINE: Day ${latest.day} of 14
STATUS ASSESSMENT: [INTERNAL ONLY] ${statusInfo.label.toUpperCase()}

VITAL METRICS LOGGED TODAY:
- Pain Level: ${latest.painLevel}/10 (yesterday: ${prev ? prev.painLevel + '/10' : 'N/A'})
- Temperature: ${latest.temperature}°F (yesterday: ${prev ? prev.temperature + '°F' : 'N/A'})
- Wound Appearance: ${latest.woundAppearance}
- Mobility Index: ${latest.mobility} (yesterday: ${prev ? prev.mobility : 'N/A'})
- Medication Adherence: ${latest.medsAdherence}% (yesterday: ${prev ? prev.medsAdherence + '%' : 'N/A'})

RECOVERY OBSERVATION:
`;

    if (latest.woundAppearance === 'Redness & Swelling' || latest.woundAppearance === 'Drainage' || latest.woundAppearance === 'Infected') {
      narrative += `* WARNING: Surgical wound site shows ${latest.woundAppearance.toLowerCase()}. Requires visual inspection to rule out superficial or deep joint infection.\n`;
    }
    if (latest.temperature >= 99.4) {
      narrative += `* WATCH: Sub-febrile temperature of ${latest.temperature}°F noted. Instruct patient to monitor temp every 4 hours.\n`;
    }
    if (prev && latest.painLevel > prev.painLevel) {
      narrative += `* CHANGE: Daily pain score increased by ${latest.painLevel - prev.painLevel} points. Verify pain medication intervals.\n`;
    }
    if (latest.medsAdherence < 90) {
      narrative += `* ACTION: Medication compliance fell to ${latest.medsAdherence}%. Verify patient is not experiencing gastrointestinal distress or swallowing difficulty.\n`;
    }
    if (latest.woundAppearance === 'Normal' && latest.temperature < 99.4 && latest.painLevel < 5) {
      narrative += `* Progress is satisfactory. Incision margins are clean and healing well. Vitals are stable.\n`;
    }

    narrative += `\nRECOMMENDED ACTIONS:
`;
    if (statusInfo.status === 'Red') {
      narrative += `- Direct patient to call the Orthopedic On-Call Clinic or present to Urgent Care.
- Prepare complete medication list and log for provider inspection.`;
    } else if (statusInfo.status === 'Yellow') {
      narrative += `- Contact Surgeon's office for guidance on wound changes or low-grade fever.
- Re-check vitals (pain, temperature) in 4-6 hours. Verify medication timeline.`;
    } else {
      narrative += `- Continue routine monitoring. Support patient in walking as weight-bearing as tolerated.
- Maintain outpatient physical therapy plan.`;
    }

    return narrative;
  };

  const narrativeText = generateNarrative();

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(narrativeText);
    alert('Clinical summary report copied to clipboard!');
  };

  const handlePrint = () => {
    window.print();
  };

  // SVG Chart Helper Coordinates
  const chartWidth = 500;
  const chartHeight = 120;
  const paddingX = 40;
  const paddingY = 15;
  const availableWidth = chartWidth - paddingX * 2;
  const availableHeight = chartHeight - paddingY * 2;

  // Pain SVG Path calculation
  const getPainPathPoints = () => {
    return history.map((log, index) => {
      const x = paddingX + (index / (history.length - 1 || 1)) * availableWidth;
      // Pain 0 is at bottom (chartHeight - paddingY), Pain 10 is at top (paddingY)
      const y = chartHeight - paddingY - (log.painLevel / 10) * availableHeight;
      return { x, y, val: log.painLevel, day: log.day };
    });
  };

  // Temp SVG Path calculation (Scale 97.0°F to 102.0°F)
  const getTempPathPoints = () => {
    const minTemp = 97.0;
    const maxTemp = 102.0;
    const range = maxTemp - minTemp;
    return history.map((log, index) => {
      const x = paddingX + (index / (history.length - 1 || 1)) * availableWidth;
      const normalizedTemp = Math.max(minTemp, Math.min(maxTemp, log.temperature));
      const y = chartHeight - paddingY - ((normalizedTemp - minTemp) / range) * availableHeight;
      return { x, y, val: log.temperature, day: log.day };
    });
  };

  const painPoints = getPainPathPoints();
  const tempPoints = getTempPathPoints();

  return (
    <div className="tool-card print-container">
      <div className="tool-header no-print">
        <div>
          <h2>Clinical Summary & Recovery Trends</h2>
          <p className="tool-subtitle">Analyze patient records over time. This data is designed for sharing with visiting nurses, surgeons, and care teams.</p>
        </div>
        <div className="action-buttons-row">
          <button 
            className={`btn-secondary btn-sm ${showStatus ? 'active' : ''}`}
            onClick={() => setShowStatus(!showStatus)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {showStatus ? <EyeOff size={14} /> : <Eye size={14} />}
            {showStatus ? 'Hide Internal Status' : 'Show Internal Status'}
          </button>
          <button className="btn-secondary btn-icon-only" onClick={handleCopyToClipboard} title="Copy Clinical Summary">
            <Clipboard size={16} />
          </button>
          <button className="btn-secondary btn-icon-only" onClick={handlePrint} title="Print Report">
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* Internal Status Banner (Conditional or toggled) */}
      {showStatus && (
        <div className="safety-box no-print" style={{ 
          borderColor: statusInfo.color, 
          backgroundColor: `${statusInfo.color}10`,
          borderLeftWidth: '5px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            {statusInfo.status === 'Red' && <ShieldAlert size={24} style={{ color: statusInfo.color, flexShrink: 0 }} />}
            {statusInfo.status === 'Yellow' && <AlertTriangle size={24} style={{ color: statusInfo.color, flexShrink: 0 }} />}
            {statusInfo.status === 'Green' && <CheckCircle size={24} style={{ color: statusInfo.color, flexShrink: 0 }} />}
            <div>
              <h4 style={{ color: statusInfo.color, fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                Internal Assessment: {statusInfo.label}
              </h4>
              <p style={{ fontSize: '13px', lineHeight: '1.4', margin: 0, color: 'var(--text-dark)' }}>
                {statusInfo.description}
              </p>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                *Note: Do not display Green/Yellow/Red indicators directly to patients to avoid unnecessary anxiety. Use clinical vocabulary when speaking with family.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout: Narrative & Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Left Column: Narrative & Metadata */}
        <div className="schedule-slot-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} style={{ color: 'var(--primary)' }} />
              <strong style={{ fontSize: '15px' }}>Arthur (Hip Arthroplasty)</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <Calendar size={14} />
              <span>Day {latest.day} Post-Op</span>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '14px', color: 'var(--primary-dark)', marginBottom: '8px' }}>Clinical Observations</h4>
            <textarea
              className="decoder-textarea"
              style={{ 
                fontFamily: 'monospace', 
                fontSize: '12px', 
                lineHeight: '1.5', 
                padding: '12px', 
                height: '310px',
                backgroundColor: 'var(--bg-light)',
                color: 'var(--text-dark)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                width: '100%',
                resize: 'none'
              }}
              value={narrativeText}
              readOnly
            />
          </div>
          
          <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" style={{ flex: 1, fontSize: '13px' }} onClick={handleCopyToClipboard}>
              Copy Summary text
            </button>
            <button className="btn-secondary" style={{ flex: 1, fontSize: '13px' }} onClick={handlePrint}>
              Print Clinical Report
            </button>
          </div>
        </div>

        {/* Right Column: Trend Visualizer */}
        <div className="schedule-slot-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--primary-dark)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>
            Patient Recovery Trends (7-Day History)
          </h3>

          {/* Pain Chart */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Pain Level History (0 - 10)</span>
              <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>Current: {latest.painLevel}/10</span>
            </div>
            <div style={{ backgroundColor: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
                {/* Horizontal Guide Lines */}
                {[0, 2.5, 5, 7.5, 10].map((val) => {
                  const y = chartHeight - paddingY - (val / 10) * availableHeight;
                  return (
                    <g key={val}>
                      <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3 3" />
                      <text x={paddingX - 10} y={y + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">{val}</text>
                    </g>
                  );
                })}
                {/* Connector Line */}
                <path
                  d={painPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                  fill="none"
                  stroke="var(--danger)"
                  strokeWidth="2.5"
                />
                {/* Data Points */}
                {painPoints.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.y} r="4" fill="var(--danger)" />
                    <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--text-dark)">{p.val}</text>
                    <text x={p.x} y={chartHeight - 2} textAnchor="middle" fontSize="9" fill="var(--text-muted)">D{p.day}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Temperature Chart */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Temperature Logs (°F)</span>
              <span style={{ fontSize: '12px', color: latest.temperature >= 99.4 ? 'var(--warning)' : 'var(--success)', fontWeight: 'bold' }}>Current: {latest.temperature}°F</span>
            </div>
            <div style={{ backgroundColor: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
                {/* Horizontal Guide Lines */}
                {[97, 98, 99, 100, 101, 102].map((val) => {
                  const y = chartHeight - paddingY - ((val - 97) / 5) * availableHeight;
                  return (
                    <g key={val}>
                      <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3 3" />
                      <text x={paddingX - 10} y={y + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">{val}°</text>
                    </g>
                  );
                })}
                {/* Critical line for fever (101°F) */}
                <line 
                  x1={paddingX} 
                  y1={chartHeight - paddingY - ((101 - 97) / 5) * availableHeight} 
                  x2={chartWidth - paddingX} 
                  y2={chartHeight - paddingY - ((101 - 97) / 5) * availableHeight} 
                  stroke="red" 
                  strokeWidth="1" 
                  strokeDasharray="4 2" 
                />
                {/* Connector Line */}
                <path
                  d={tempPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                />
                {/* Data Points */}
                {tempPoints.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.y} r="4" fill="var(--primary)" />
                    <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--text-dark)">{p.val}</text>
                    <text x={p.x} y={chartHeight - 2} textAnchor="middle" fontSize="9" fill="var(--text-muted)">D{p.day}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Recovery Adherence & Mobility Logs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-light)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Med Adherence</span>
              <strong style={{ fontSize: '16px', color: 'var(--success)' }}>{latest.medsAdherence}%</strong>
              <div style={{ height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${latest.medsAdherence}%`, backgroundColor: 'var(--success)', borderRadius: '3px' }}></div>
              </div>
            </div>
            <div style={{ padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-light)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Mobility Rating</span>
              <strong style={{ fontSize: '16px', color: 'var(--accent)' }}>{latest.mobility}</strong>
              <span style={{ fontSize: '11px', display: 'block', marginTop: '6px', color: 'var(--text-dark)' }}>
                {latest.mobility === 'Good' && 'Walking well'}
                {latest.mobility === 'Moderate' && 'Light walking'}
                {latest.mobility === 'Limited' && 'Restrictive movement'}
                {latest.mobility === 'None' && 'Strictly resting'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Printable Clinical Checklist */}
      <div className="print-only" style={{ marginTop: '30px' }}>
        <h4 style={{ fontSize: '14px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>Verification Sign-Off</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px', fontSize: '11px' }}>
          <div>
            <p>Visiting Nurse Signature: ___________________________</p>
            <p>Date: _______________ Time: ______________</p>
          </div>
          <div>
            <p>Family/Caregiver Signature: ___________________________</p>
            <p>Date: _______________ Time: ______________</p>
          </div>
        </div>
      </div>
    </div>
  );
};
