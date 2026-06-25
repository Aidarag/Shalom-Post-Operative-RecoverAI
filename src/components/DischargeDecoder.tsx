import React, { useState } from 'react';
import { FileText, ArrowRight, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';
import { SAMPLE_DISCHARGE_TEXTS } from '../utils/mockData';

interface DecodedData {
  diagnosis: string;
  medicationChanges: string[];
  rules: string[];
  redFlags: string[];
  followUps: string[];
}

interface DischargeDecoderProps {
  apiKey: string;
}

export const DischargeDecoder: React.FC<DischargeDecoderProps> = ({ apiKey }) => {
  const [inputText, setInputText] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodedResult, setDecodedResult] = useState<DecodedData | null>(null);
  
  // Local parser helper for fallback/samples
  const parseLocally = (text: string): DecodedData => {
    // Check if it's sample 1
    if (text.includes("Heart Failure Exacerbation")) {
      return {
        diagnosis: "Congestive Heart Failure Exacerbation (Fluid build-up around the heart making it harder to pump blood efficiently).",
        medicationChanges: [
          "Start Furosemide (Lasix) 40mg daily in the morning (replaces old Furosemide 20mg dose). Do not take if your blood pressure is under 90.",
          "Resume Lisinopril 10mg daily. Monitor blood pressure.",
          "Continue Metoprolol Succinate 25mg daily."
        ],
        rules: [
          "Fluid Restriction: Keep total liquids under 1.5 Liters (about 6 cups) per day.",
          "Low Salt: Eat less than 2000mg of sodium daily. Avoid canned soup, processed food, and adding table salt."
        ],
        redFlags: [
          "Weight gain of more than 3 lbs in one day, or 5 lbs in a week.",
          "Worsening shortness of breath when walking or resting.",
          "New swelling in both ankles/feet."
        ],
        followUps: [
          "Dr. Vance (Cardiology) in 7 to 10 days. Call 555-0199 to schedule."
        ]
      };
    }
    
    // Check if it's sample 2
    if (text.includes("Left Total Hip Arthroplasty")) {
      return {
        diagnosis: "Left Hip Replacement surgery (anterior incision approach).",
        medicationChanges: [
          "Take Apixaban (Eliquis) 2.5mg twice a day for 12 days to prevent blood clots. Start tonight.",
          "Take Acetaminophen (Tylenol) 650mg every 6 hours for mild pain (maximum 3000mg/day).",
          "Take Oxycodone 5mg every 4 to 6 hours ONLY as needed for severe pain. Always take with food.",
          "Take Colace 100mg twice daily to prevent constipation caused by pain meds."
        ],
        rules: [
          "Do not cross your legs at the knees or ankles.",
          "Do not bend your hips more than 90 degrees (use tall chairs, raised toilet seats).",
          "Sleep on your back with the wedge pillow between your legs for 4 weeks.",
          "Keep incision dressing completely dry. Do not soak in a tub."
        ],
        redFlags: [
          "Signs of infection: Redness, yellow pus draining from incision, or skin that feels hot.",
          "Sudden chest pain or shortness of breath (could signal a clot).",
          "Calf pain, swelling, or redness in either leg."
        ],
        followUps: [
          "Dr. Chen in 14 days for staple removal.",
          "Start outpatient physical therapy (PT) within the next 3 days."
        ]
      };
    }

    // Generic rule-based parsing for arbitrary text
    const lines = text.split('\n');
    const meds: string[] = [];
    const instructions: string[] = [];
    const flags: string[] = [];
    const follow: string[] = [];
    let diag = "Recovering patient care plan";

    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('diagnosis:') || lower.includes('diagnoses:')) {
        diag = line.split(':')[1]?.trim() || line;
      } else if (lower.includes('mg') || lower.includes('pill') || lower.includes('tablets') || lower.includes('take') || lower.includes('dose')) {
        if (line.trim().length > 5) meds.push(line.trim());
      } else if (lower.includes('diet') || lower.includes('restrict') || lower.includes('limit') || lower.includes('avoid') || lower.includes('do not') || lower.includes('sleep')) {
        if (line.trim().length > 5) instructions.push(line.trim());
      } else if (lower.includes('notify') || lower.includes('immediately') || lower.includes('warning') || lower.includes('call if') || lower.includes('alert')) {
        if (line.trim().length > 5) flags.push(line.trim());
      } else if (lower.includes('follow up') || lower.includes('appointment') || lower.includes('doctor') || lower.includes('schedule')) {
        if (line.trim().length > 5) follow.push(line.trim());
      }
    });

    return {
      diagnosis: diag,
      medicationChanges: meds.length ? meds : ["Check medication labels. Consult a pharmacist for safety."],
      rules: instructions.length ? instructions : ["Follow standard light activity guidelines. Avoid strenuous tasks."],
      redFlags: flags.length ? flags : ["Worsening pain, high fever over 101°F, or sudden trouble breathing require immediate medical response."],
      followUps: follow.length ? follow : ["Schedule follow-up appointments with your primary care provider in 7-14 days."]
    };
  };

  const handleDecode = async () => {
    if (!inputText.trim()) return;
    setIsDecoding(true);
    
    // Simulate delay
    setTimeout(async () => {
      if (apiKey.trim()) {
        try {
          const prompt = `You are a clinical instructions decoder. Translate the following clinical instructions into plain caregiver-friendly English. 
You must output ONLY a valid JSON object matching the format below. Do not include markdown code block formatting in your response. Just return the raw JSON object string:
{
  "diagnosis": "simple plain English explanation of diagnosis and surgery",
  "medicationChanges": ["plain explanation of every medication start, stop, or dose adjustment"],
  "rules": ["plain daily diet, activity, wound, and sleep rules"],
  "redFlags": ["clear warnings and signs when they need to call doctor or go to ER"],
  "followUps": ["who to follow up with, when, and phone numbers if mentioned"]
}

Instructions text to parse:
${inputText}`;

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
              })
            }
          );
          
          if (!response.ok) throw new Error('API failure');
          const data = await response.json();
          let rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          // Clean JSON tags if LLM formatted it inside codeblock
          rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
          const decoded: DecodedData = JSON.parse(rawJson);
          setDecodedResult(decoded);
        } catch (e) {
          console.error("Gemini discharge decoder failed, falling back locally:", e);
          setDecodedResult(parseLocally(inputText));
        }
      } else {
        setDecodedResult(parseLocally(inputText));
      }
      setIsDecoding(false);
    }, 1500);
  };

  const handleLoadSample = (sampleText: string) => {
    setInputText(sampleText);
    setDecodedResult(null);
  };

  return (
    <div className="tool-card">
      <div className="tool-header">
        <div>
          <h2>Discharge Instructions Decoder</h2>
          <p className="tool-subtitle">Paste complex hospital paperwork or doctor notes to translate medical terms into simple caregiver steps.</p>
        </div>
      </div>

      <div className="decoder-layout">
        {/* Input Panel */}
        <div className="decoder-panel input-panel">
          <div className="section-row-header">
            <h3>Paste Clinical Notes</h3>
            <div className="samples-row">
              <span className="sample-label">Load Example:</span>
              {SAMPLE_DISCHARGE_TEXTS.map((sample, idx) => (
                <button 
                  key={idx} 
                  className="sample-btn"
                  onClick={() => handleLoadSample(sample.text)}
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="decoder-textarea"
            rows={12}
            placeholder="Paste your loved one's discharge papers, clinical plans, or doctor messages here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <button 
            className="btn-primary decode-submit-btn" 
            onClick={handleDecode}
            disabled={isDecoding || !inputText.trim()}
          >
            {isDecoding ? (
              <>
                <RefreshCw size={16} className="spinning" style={{ marginRight: '8px' }} />
                Decoding Medical Notes...
              </>
            ) : (
              <>
                Decode Instructions <ArrowRight size={16} style={{ marginLeft: '8px' }} />
              </>
            )}
          </button>
        </div>

        {/* Output Panel */}
        <div className="decoder-panel output-panel">
          <h3>Caregiver-Friendly Action Plan</h3>

          {!decodedResult && !isDecoding && (
            <div className="decoder-empty-state">
              <FileText size={48} className="empty-icon" />
              <p>Your decoded plan will appear here.</p>
              <p className="sub-detail">Paste notes on the left or select an example to see it in action.</p>
            </div>
          )}

          {isTypingSimulated() && (
            <div className="decoder-loading-state">
              <RefreshCw size={24} className="spinning loading-icon" />
              <p>Translating jargon into plain English...</p>
            </div>
          )}

          {decodedResult && !isDecoding && (
            <div className="decoded-content">
              {/* Diagnosis */}
              <div className="decoded-section">
                <h4 className="decoded-sec-title diagnosis">Condition / Diagnosis</h4>
                <div className="decoded-card">
                  <p>{decodedResult.diagnosis}</p>
                </div>
              </div>

              {/* Medication changes */}
              <div className="decoded-section">
                <h4 className="decoded-sec-title meds">Medication Actions</h4>
                <div className="decoded-card">
                  <ul>
                    {decodedResult.medicationChanges.map((med, idx) => (
                      <li key={idx}>
                        <CheckCircle size={14} className="bullet-check" />
                        <span>{med}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Physical Activity / Diet Rules */}
              <div className="decoded-section">
                <h4 className="decoded-sec-title rules">Daily Care Rules</h4>
                <div className="decoded-card">
                  <ul>
                    {decodedResult.rules.map((rule, idx) => (
                      <li key={idx}>
                        <CheckCircle size={14} className="bullet-check" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Warning signs */}
              <div className="decoded-section">
                <h4 className="decoded-sec-title warning">Red Flags (When to Call)</h4>
                <div className="decoded-card warning-card">
                  <ul>
                    {decodedResult.redFlags.map((flag, idx) => (
                      <li key={idx}>
                        <ShieldAlert size={14} className="bullet-alert" />
                        <strong>{flag}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Follow ups */}
              <div className="decoded-section">
                <h4 className="decoded-sec-title follow">Appointments & Follow-Ups</h4>
                <div className="decoded-card">
                  <ul>
                    {decodedResult.followUps.map((followUp, idx) => (
                      <li key={idx}>
                        <CheckCircle size={14} className="bullet-check" />
                        <span>{followUp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function isTypingSimulated() {
    return isDecoding;
  }
};
