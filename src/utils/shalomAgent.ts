export interface Message {
  id: string;
  sender: 'user' | 'shalom';
  text: string;
  timestamp: Date;
  isEmergency?: boolean;
  isMedicalWarning?: boolean;
}

export interface CheckInAnswers {
  painLevel: number;
  hasFever: boolean;
  temperature?: number;
  medsTaken: boolean;
  incisionIssues: string[]; // e.g. ["Normal", "Mild Redness", "Swelling", "Drainage", "Getting Worse"]
  mobility: 'Okay' | 'Getting harder' | 'Restricted';
  unusualSymptoms: string[]; // e.g. ["None", "Chest pain", "Difficulty breathing", "Uncontrolled bleeding", "Loss of consciousness", "Severe vomiting", "Severe dizziness", "Symptoms getting much worse"]
}

export interface CareTeamReport {
  title: string;
  status: 'Green' | 'Yellow' | 'Red' | 'Emergency';
  reportAlertText: string; // "Report sent to your care team", "Urgent alert sent", "Daily summary shared"
  painLevel: number;
  keySymptoms: string[];
  aiSummary: string;
  generatedAt: string;
}

export interface NormalizedPatientRecord {
  patientName: string;
  age: number;
  sex?: string;
  surgeryType: string;
  dischargeDate: string;
  allergies: string[];
  preExistingConditions: string[];
  activeMedications: { name: string; dose: string; frequency?: string }[];
  chronicMedications?: { name: string; dose: string }[];
  dischargeInstructions?: {
    activity?: string[];
    warningSigns?: string[];
    emergencySymptoms?: string[];
  };
  surgeonNotes: string;
  raw: any;
}

export function normalizePatientRecord(raw: any): NormalizedPatientRecord | null {
  if (!raw) return null;
  
  // If it's already normalized or in the old format:
  if (raw.patientName && !raw.patient_profile) {
    return {
      patientName: raw.patientName,
      age: raw.age || 0,
      surgeryType: raw.surgeryType || 'Post-operative Recovery',
      dischargeDate: raw.dischargeDate || '',
      allergies: raw.allergies || [],
      preExistingConditions: raw.preExistingConditions || [],
      activeMedications: raw.activeMedications || [],
      surgeonNotes: raw.surgeonNotes || '',
      raw: raw
    };
  }

  // Detect knee replacement dataset format
  const profile = raw.patient_profile || {};
  const history = raw.medical_history || {};
  const discharge = raw.hospital_discharge || {};
  const instructions = raw.discharge_instructions || {};
  
  const patientName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Patient';
  const age = profile.age || 0;
  const sex = profile.sex;
  const surgeryType = discharge.procedure || 'Post-operative Recovery';
  const dischargeDate = discharge.discharge_date || '';
  const allergies = history.allergies || [];
  const preExistingConditions = history.chronic_conditions || [];
  
  const activeMedications = (instructions.medications || []).map((m: any) => ({
    name: m.name,
    dose: m.dose,
    frequency: m.frequency
  }));

  const chronicMedications = (history.current_medications || []).map((m: any) => ({
    name: m.name,
    dose: m.dose
  }));

  let notesParts: string[] = [];
  if (discharge.surgeon) {
    notesParts.push(`Surgeon: ${discharge.surgeon}.`);
  }
  if (discharge.hospital_name) {
    notesParts.push(`Hospital: ${discharge.hospital_name}.`);
  }
  if (discharge.mobility_aid) {
    notesParts.push(`Mobility aid: ${discharge.mobility_aid}.`);
  }
  if (instructions.activity && instructions.activity.length > 0) {
    notesParts.push(`Activity guidelines: ${instructions.activity.join(', ')}.`);
  }
  if (instructions.warning_signs && instructions.warning_signs.length > 0) {
    notesParts.push(`Warning signs: ${instructions.warning_signs.join(', ')}.`);
  }
  const surgeonNotes = notesParts.join(' ');

  return {
    patientName,
    age,
    sex,
    surgeryType,
    dischargeDate,
    allergies,
    preExistingConditions,
    activeMedications,
    chronicMedications,
    dischargeInstructions: {
      activity: instructions.activity || [],
      warningSigns: instructions.warning_signs || [],
      emergencySymptoms: instructions.emergency_symptoms || []
    },
    surgeonNotes,
    raw: raw
  };
}

/**
 * Classifies recovery risk level based on the daily check-in answers.
 */
export function classifyRisk(answers: CheckInAnswers): 'Green' | 'Yellow' | 'Red' | 'Emergency' {
  const { painLevel, hasFever, medsTaken, incisionIssues, mobility, unusualSymptoms } = answers;

  // 1. Emergency cases (Chest pain, trouble breathing, uncontrolled bleeding, loss of consciousness)
  const emergencySymptoms = ["Chest pain", "Difficulty breathing", "Uncontrolled bleeding", "Loss of consciousness"];
  const hasEmergency = unusualSymptoms.some(symptom => emergencySymptoms.includes(symptom));
  if (hasEmergency) {
    return 'Emergency';
  }

  // 2. Red cases (Pain 8-10, fever, severe redness/swelling/drainage/worsening incision, difficulty breathing, chest pain, uncontrolled bleeding, symptoms getting much worse)
  // Note: some overlaps are already handled in Emergency, but we list the rest here.
  const hasSevereWound = incisionIssues.some(issue => 
    ["Drainage", "Getting Worse", "Severe Redness", "Severe Swelling"].includes(issue)
  );
  const hasWorseningSymptoms = unusualSymptoms.includes("Symptoms getting much worse");

  if (
    painLevel >= 8 || 
    hasFever || 
    hasSevereWound || 
    hasWorseningSymptoms
  ) {
    return 'Red';
  }

  // 3. Yellow cases (Pain 5-7, mild redness or swelling, meds missed, mobility getting harder, symptoms not severe but need monitoring)
  const hasMildWound = incisionIssues.some(issue => ["Mild Redness", "Swelling"].includes(issue));
  const hasMildSymptoms = unusualSymptoms.some(symptom => 
    ["Severe vomiting", "Severe dizziness"].includes(symptom)
  );

  if (
    (painLevel >= 5 && painLevel <= 7) ||
    hasMildWound ||
    !medsTaken ||
    mobility === 'Getting harder' ||
    hasMildSymptoms
  ) {
    return 'Yellow';
  }

  // 4. Green cases (Pain 1-4, no fever, no major wound concerns, meds taken, mobility okay)
  return 'Green';
}

/**
 * Generates an automated AI report for the care team.
 */
export function generateCareTeamReport(answers: CheckInAnswers, status: 'Green' | 'Yellow' | 'Red' | 'Emergency'): CareTeamReport {
  let title = "Periodic Summary Report";
  let reportAlertText = "Daily summary shared";
  
  if (status === 'Red') {
    title = "Urgent Alert Report";
    reportAlertText = "Urgent alert sent";
  } else if (status === 'Emergency') {
    title = "Emergency Notification";
    reportAlertText = "Urgent alert sent"; // Matches: "Urgent alert sent" for red/emergency cases in UI
  } else if (status === 'Yellow') {
    title = "Patient Monitoring Report";
    reportAlertText = "Report sent to your care team";
  }

  // Compile key symptoms
  const keySymptoms: string[] = [];
  if (answers.painLevel >= 5) {
    keySymptoms.push(`Pain level: ${answers.painLevel}/10`);
  }
  if (answers.hasFever) {
    keySymptoms.push(`Fever reported (${answers.temperature ? answers.temperature + '°F' : 'Yes'})`);
  }
  answers.incisionIssues.forEach(issue => {
    if (issue !== 'Normal') keySymptoms.push(`Incision: ${issue}`);
  });
  if (!answers.medsTaken) {
    keySymptoms.push("Medication missed");
  }
  if (answers.mobility !== 'Okay') {
    keySymptoms.push(`Mobility issues: ${answers.mobility}`);
  }
  answers.unusualSymptoms.forEach(symptom => {
    if (symptom !== 'None') keySymptoms.push(`Symptom: ${symptom}`);
  });

  if (keySymptoms.length === 0) {
    keySymptoms.push("None reported (Stable)");
  }

  // Dynamic short AI summary
  let aiSummary = "";
  const tempStr = answers.temperature ? ` temp ${answers.temperature}°F` : "";
  const woundStr = answers.incisionIssues.includes('Normal') ? "incision site is normal" : `incision shows signs of [${answers.incisionIssues.filter(i => i !== 'Normal').join(', ')}]`;
  const medsStr = answers.medsTaken ? "medications taken" : "reported missed medications";
  const mobStr = answers.mobility === 'Okay' ? "mobility is good" : `mobility is limited (${answers.mobility.toLowerCase()})`;

  if (status === 'Emergency') {
    aiSummary = `CRITICAL ALERT: Patient reported emergency symptoms (${answers.unusualSymptoms.filter(s => s !== 'None').join(', ')}). Immediate 911 directive issued. Incident logged for clinical team outreach.`;
  } else if (status === 'Red') {
    aiSummary = `Urgent clinical review advised. Patient is experiencing pain level ${answers.painLevel}/10,${tempStr}, and ${woundStr}. Patient has been advised to contact their provider immediately.`;
  } else if (status === 'Yellow') {
    aiSummary = `Patient requires recovery monitoring. Key details: pain level ${answers.painLevel}/10, ${medsStr}, and ${mobStr}. Incision status: ${answers.incisionIssues.join(', ')}.`;
  } else {
    aiSummary = `Stable post-operative recovery logged. Pain is well-managed (${answers.painLevel}/10), no fever reported, ${woundStr}, medications taken, and ${mobStr}.`;
  }

  return {
    title,
    status,
    reportAlertText,
    painLevel: answers.painLevel,
    keySymptoms,
    aiSummary,
    generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  };
}

/**
 * Returns a warm, plaintext reaction to a specific question answer to maintain the AI experience.
 */
export function getWarmFeedback(questionIndex: number, answer: any): string {
  switch (questionIndex) {
    case 0: { // Pain level (1-10)
      const pain = Number(answer);
      if (pain <= 4) return `Thank you. I'm glad to hear your pain is at a manageable level (${pain}/10). Let's continue tracking it.`;
      if (pain <= 7) return `I appreciate you sharing. I'm sorry you are experiencing moderate pain (${pain}/10) today. We will log this to watch for trends.`;
      return `Thank you for sharing that. I'm very sorry you are experiencing severe pain (${pain}/10) today. I will make sure this is recorded for your care team.`;
    }
    case 1: { // Fever
      const fever = Boolean(answer.hasFever);
      if (fever) {
        return `Understood. Running a fever (${answer.temp || '100.4+'}°F) is something we want to note carefully, as it can be an early warning sign.`;
      }
      return "Good, keeping a normal temperature is a positive sign for your recovery.";
    }
    case 2: { // Medications
      const meds = Boolean(answer);
      if (meds) {
        return "Excellent. Taking your medications consistently is a key part of your recovery plan.";
      }
      return "Thank you for your honesty. Missing medications can slow down your healing, so please try to take them as soon as possible, or check with your provider if you are experiencing side effects.";
    }
    case 3: { // Incision site
      const issues = Array.isArray(answer) ? answer : [];
      if (issues.length === 0 || issues.includes('Normal')) {
        return "That is wonderful. A clean, normal-looking incision site is exactly what we are aiming for.";
      }
      return `Thank you. Keeping a close eye on wound changes like ${issues.join(', ')} is very important to ensure proper healing.`;
    }
    case 4: { // Mobility
      const mob = String(answer);
      if (mob === 'Okay') {
        return "Great. Light movement and walking at your own pace helps speed up recovery and prevents clots.";
      }
      return `I understand. Please do not push yourself, and restrict your movement as needed. Your comfort and safety are the priority.`;
    }
    case 5: { // Unusual symptoms
      const symptoms = Array.isArray(answer) ? answer : [];
      if (symptoms.length === 0 || symptoms.includes('None')) {
        return "Excellent. Not having any unusual symptoms is great news.";
      }
      const hasEmergency = symptoms.some(s => ["Chest pain", "Difficulty breathing", "Uncontrolled bleeding", "Loss of consciousness"].includes(s));
      if (hasEmergency) {
        return "Thank you for reporting this. These symptoms are critical and require immediate attention.";
      }
      return `Thank you. I have registered these symptoms (${symptoms.join(', ')}) so your medical team can review them.`;
    }
    default:
      return "Thank you for that update.";
  }
}

// Safety filters helper
export function evaluateSafety(text: string): { isEmergency: boolean; isMedicalAdvice: boolean } {
  const lower = text.toLowerCase();
  
  // Emergency indicators
  const emergencyKeywords = [
    'chest pain', 'heart attack', 'difficulty breathing', 'shortness of breath',
    'cannot breathe', 'uncontrolled bleeding', 'heavy bleeding', 'unconscious',
    'passed out', 'loss of consciousness', '911', 'emergency department', 'emergency room'
  ];
  
  const isEmergency = emergencyKeywords.some(keyword => lower.includes(keyword));
  
  // Diagnostic/dosage alteration indicators
  const medicalAdviceKeywords = [
    'diagnose', 'infection', 'blood clot', 'what medicine should i take',
    'change dose', 'stop taking', 'adjust medication', 'prescribe', 'what is my diagnosis'
  ];
  
  const isMedicalAdvice = medicalAdviceKeywords.some(keyword => lower.includes(keyword));

  return { isEmergency, isMedicalAdvice };
}

// Local simulation fallback engine
export function getSimulatedResponse(text: string, _history: Message[] = [], medicalHistory?: any): string {
  const { isEmergency } = evaluateSafety(text);
  
  if (isEmergency) {
    return "**EMERGENCY DIRECTIVE**\n\nIf you are experiencing chest pain, difficulty breathing, uncontrolled bleeding, loss of consciousness, or another life-threatening symptom, please **call 911 or go to the nearest emergency department immediately**. Do not wait.";
  }

  const lower = text.toLowerCase();
  
  // Normalize patient record for robust local checks
  const normalized = normalizePatientRecord(medicalHistory);
  
  if (normalized) {
    if (lower.includes('allergy') || lower.includes('allergies')) {
      const allergies = normalized.allergies?.join(', ') || 'No known allergies';
      return `Based on your attached medical dataset, your logged allergies are: ${allergies}.`;
    }
    if (lower.includes('surgery') || lower.includes('operation') || lower.includes('procedure')) {
      return `Your medical record indicates you had a ${normalized.surgeryType || 'surgery'} discharged on ${normalized.dischargeDate || 'recently'}.`;
    }
    if (lower.includes('condition') || lower.includes('medical history') || lower.includes('diseases')) {
      const conds = normalized.preExistingConditions?.join(', ') || 'None listed';
      return `Your records list the following pre-existing conditions: ${conds}.`;
    }
    if (lower.includes('active medication') || lower.includes('my meds') || lower.includes('medication list') || lower.includes('meds')) {
      const medsList = normalized.activeMedications?.map((m: any) => {
        const freqPart = m.frequency ? ` - ${m.frequency}` : '';
        return `${m.name} (${m.dose}${freqPart})`;
      }).join(', ') || 'None listed';
      return `Your active medications in the record are: ${medsList}.`;
    }
    if (lower.includes('surgeon note') || lower.includes('surgeon instruction') || lower.includes('doctor note') || lower.includes('notes') || lower.includes('instruction')) {
      return `Your surgeon/discharge notes indicate: "${normalized.surgeonNotes || 'No specific notes listed.'}"`;
    }
  }
  
  // Medical diagnostic block
  if (lower.includes('diagnose') || lower.includes('infection') || lower.includes('blood clot')) {
    return "I am a demo AI assistant and cannot diagnose medical conditions. Your symptoms may need review by your healthcare team. Please contact your healthcare provider directly to discuss any potential infections or complications.";
  }
  
  if (lower.includes('medicine') || lower.includes('prescribe') || lower.includes('change dose') || lower.includes('stop taking') || lower.includes('adjust dosage')) {
    return "I cannot prescribe medication, adjust your dosage, or recommend changing your treatment plan. Please contact your healthcare provider or physician directly to make any medication adjustments.";
  }

  // Handle standard check-in conversational triggers
  if (lower.includes('check-in') || lower.includes('start check') || lower.includes('checkin')) {
    return "Let's start your daily post-operative recovery check-in. Question 1: What is your pain level today from 1 to 10?";
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hello! I am Shalom, your AI Post-Operative Recovery Assistant. I am here to help you complete your daily check-in. Would you like to start your check-in now?";
  }

  return "I am Shalom, your AI Recovery Assistant. I can help guide you through your daily check-in, check for warning signs, and compile summaries for your care team.\n\nTo begin, click \"Start Patient Check-In\" on the sidebar or type \"Check-in\" here.";
}

// Live API call to Gemini
export async function getGeminiResponse(
  messages: Message[],
  apiKey: string,
  userMessageText: string,
  medicalHistoryContext?: string
): Promise<string> {
  const { isEmergency } = evaluateSafety(userMessageText);
  
  if (isEmergency) {
    return "**EMERGENCY DIRECTIVE**\n\nIf you are experiencing chest pain, difficulty breathing, uncontrolled bleeding, loss of consciousness, or another life-threatening symptom, please **call 911 or go to the nearest emergency department immediately**.";
  }

  let shalomSystemPrompt = `You are Shalom, an AI Post-Operative Recovery Assistant.
Your primary responsibility is to help patients recovering at home after surgery by conducting daily recovery check-ins, tracking progress, explaining fictional discharge instructions, and identifying when a patient should contact their healthcare team.

Tone:
* Warm, calm, reassuring, supportive, and professional.
* Use simple, plain, non-clinical language.
* Keep responses concise.
* Show empathy when patients report pain or concerning symptoms.

AI Behavior Rules:
* Classify the patient internally as Green (Stable), Yellow (Needs monitoring), or Red (Needs clinical review). Do not display these classifications directly to patients.
* NEVER diagnose medical conditions. Never tell a patient: "You have an infection", "You have a blood clot", "You should take this medicine", or "Change your dosage".
* If a patient asks clinical questions, explain you are an AI assistant and recommend contacting their surgeon, physician, or care team.
* If the patient reports chest pain, difficulty breathing, uncontrolled bleeding, loss of consciousness, or other life-threatening symptoms, immediately tell them to call 911 or go to the nearest emergency department.
* If symptoms are concerning but not life-threatening, tell them: "Your symptoms may need review by your healthcare team. Please contact your healthcare provider."`;

  if (medicalHistoryContext) {
    let normalizedSummary = "";
    try {
      const parsed = JSON.parse(medicalHistoryContext);
      const normalized = normalizePatientRecord(parsed);
      if (normalized) {
        normalizedSummary = `
--- Grounded Patient Profile ---
Patient Name: ${normalized.patientName}
Age: ${normalized.age} ${normalized.sex ? `(Sex: ${normalized.sex})` : ''}
Surgery Procedure: ${normalized.surgeryType}
Discharge Date: ${normalized.dischargeDate}
Allergies: ${normalized.allergies.join(', ') || 'No known allergies'}
Pre-existing Conditions: ${normalized.preExistingConditions.join(', ') || 'None'}
Active Post-Op Medications: ${normalized.activeMedications.map(m => `${m.name} (${m.dose}${m.frequency ? ` - ${m.frequency}` : ''})`).join(', ') || 'None'}
Chronic Medications: ${normalized.chronicMedications?.map(m => `${m.name} (${m.dose})`).join(', ') || 'None'}
Surgeon/Discharge Notes: ${normalized.surgeonNotes}
--------------------------------`;
      }
    } catch (e) {
      console.warn("Failed to parse/normalize medical history context in getGeminiResponse", e);
    }

    shalomSystemPrompt += `\n\nPatient Medical History Context (Raw JSON Dataset):\n${medicalHistoryContext}`;
    if (normalizedSummary) {
      shalomSystemPrompt += `\n\nPatient Medical History (Normalized Text):\n${normalizedSummary}`;
    }
    shalomSystemPrompt += `\n\nPlease tailor your feedback, check-in answers, or questions to align with this patient's medical history, active medications, and post-op instructions.`;
  }

  try {
    const contents = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    contents.push({
      role: 'user',
      parts: [{ text: userMessageText }]
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: shalomSystemPrompt }]
          },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!candidateText) {
      throw new Error('Invalid response structure from Gemini API');
    }

    return candidateText;
  } catch (error) {
    console.error('Error invoking Gemini API:', error);
    let parsedHistory = null;
    if (medicalHistoryContext) {
      try {
        parsedHistory = JSON.parse(medicalHistoryContext);
      } catch (e) {}
    }
    return getSimulatedResponse(userMessageText, messages, parsedHistory) + "\n\n*(Note: Failed to connect to Gemini. Showing simulated response instead.)*";
  }
}
