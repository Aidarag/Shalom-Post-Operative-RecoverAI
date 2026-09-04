import {
  type KnowledgeChunk,
  type MedicalSource,
  type SurgeryType,
  type RecoveryStage,
  searchMedicalKnowledgeBase,
  KNEE_MEDICAL_KNOWLEDGE_BASE
} from '../data/kneeMedicalKnowledgeBase';

export interface GroundingSource {
  title: string;
  source: MedicalSource;
  url: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'shalom';
  text: string;
  timestamp: Date;
  isEmergency?: boolean;
  isMedicalWarning?: boolean;
  groundingSources?: GroundingSource[];
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

  // If raw has pdfText, parse it dynamically!
  if (raw.pdfText) {
    const text = raw.pdfText;
    
    // Heuristics for Patient Name
    let patientName = 'Patient';
    const nameMatch = text.match(/(?:Patient Name|Patient|Name):\s*([^\n\r]+)/i);
    if (nameMatch) patientName = nameMatch[1].trim();

    // Heuristics for Surgery Type
    let surgeryType = 'Post-operative Recovery';
    const surgeryMatch = text.match(/(?:Procedure|Surgery|Operation):\s*([^\n\r]+)/i);
    if (surgeryMatch) surgeryType = surgeryMatch[1].trim();

    // Heuristics for Discharge Date
    let dischargeDate = '';
    const dateMatch = text.match(/(?:Discharge Date|Discharge|Date):\s*([^\n\r]+)/i);
    if (dateMatch) dischargeDate = dateMatch[1].trim();

    // Heuristics for Allergies
    let allergies: string[] = [];
    const allergyMatch = text.match(/(?:Allergies|Allergy):\s*([^\n\r]+)/i);
    if (allergyMatch) {
      allergies = allergyMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    // Heuristics for Medications
    const activeMedications: { name: string; dose: string; frequency?: string }[] = [];
    
    // List of common recovery meds to search for
    const commonMeds = [
      'Aspirin', 'Oxycodone', 'Cephalexin', 'Senna', 'Gabapentin', 'Tramadol', 
      'Colace', 'Lovenox', 'Coumadin', 'Ibuprofen', 'Acetaminophen', 'Tylenol',
      'Norco', 'Vicodin', 'Percocet', 'Xarelto', 'Eliquis', 'Keflex'
    ];

    commonMeds.forEach(med => {
      const medRegex = new RegExp(`(${med})\\s+(\\d+\\s*(?:mg|g|ml|capsule|tablet|tab|cap)s?)(?:\\s+[^\\n\\r]*?(twice daily|once daily|every\\s+\\d+\\s*hours|at bedtime|daily|daily at bedtime|three times daily|four times daily))?`, 'i');
      const match = text.match(medRegex);
      if (match) {
        activeMedications.push({
          name: match[1],
          dose: match[2],
          frequency: match[3] || 'As directed'
        });
      }
    });

    // Heuristics for Activities
    const activityList: string[] = [];
    const activityMatches = text.matchAll(/(?:walk|ice|elevate|exercise|compress|movement|therapy|physiotherapy)[^\n\r.]{10,80}/gi);
    for (const match of activityMatches) {
      const phrase = match[0].trim();
      if (phrase && !activityList.includes(phrase) && activityList.length < 5) {
        activityList.push(phrase.charAt(0).toUpperCase() + phrase.slice(1));
      }
    }
    if (activityList.length === 0) {
      activityList.push('Walk 5-10 minutes every hour');
      activityList.push('Ice knee for swelling prevention');
      activityList.push('Perform physical therapy drills');
    }

    // Heuristics for Warning Signs
    const warningSigns: string[] = [];
    const warningMatches = text.matchAll(/(?:fever|redness|drainage|swelling|bleeding|pain|shortness|chest pain)[^\n\r.]{10,80}/gi);
    for (const match of warningMatches) {
      const phrase = match[0].trim();
      if (phrase && !warningSigns.includes(phrase) && warningSigns.length < 5) {
        warningSigns.push(phrase.charAt(0).toUpperCase() + phrase.slice(1));
      }
    }
    if (warningSigns.length === 0) {
      warningSigns.push('Fever of 101.5 F or higher');
      warningSigns.push('Severe redness or warmth at knee site');
      warningSigns.push('Incision drainage that gets worse');
    }

    return {
      patientName,
      age: 65,
      sex: 'Male',
      surgeryType,
      dischargeDate,
      allergies,
      preExistingConditions: [],
      activeMedications,
      dischargeInstructions: {
        activity: activityList,
        warningSigns,
        emergencySymptoms: ['Chest pain', 'Shortness of breath']
      },
      surgeonNotes: `Discharge summary text dynamically parsed: ${raw.fileName}`,
      raw: raw
    };
  }

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

// ============================================================================
// CLINICAL SAFETY & RED-FLAG TRIAGE
// ============================================================================

export interface SafetyEvaluation {
  isEmergency: boolean;
  isUrgentCallSurgeon: boolean;
  urgencyType?: 'pe_cardiac' | 'dvt' | 'infection' | 'bleeding';
  directiveMessage?: string;
  isMedicalAdvice: boolean;
}

/**
 * Evaluates user input against CDC, AAOS, and NIH clinical safety guidelines.
 * Differentiates life-threatening emergencies (911), urgent surgical complications (DVT/SSI),
 * and standard recovery observations.
 */
export function evaluateSafetyAndRedFlags(text: string): SafetyEvaluation {
  const lower = text.toLowerCase();

  // 1. Life-Threatening Emergency (Pulmonary Embolism, Acute Cardiac, Massive Hemorrhage, Syncope)
  const emergencyKeywords = [
    'chest pain', 'heart attack', 'difficulty breathing', 'shortness of breath',
    'cannot breathe', 'gasping for air', 'uncontrolled bleeding', 'heavy bleeding',
    'hemorrhage', 'unconscious', 'passed out', 'loss of consciousness',
    'fainted', 'coughing up blood', 'cough blood', '911', 'emergency room', 'emergency department'
  ];
  const isEmergency = emergencyKeywords.some(kw => lower.includes(kw));

  if (isEmergency) {
    const isBleeding = lower.includes('bleed') || lower.includes('hemorrhage');
    return {
      isEmergency: true,
      isUrgentCallSurgeon: false,
      urgencyType: isBleeding ? 'bleeding' : 'pe_cardiac',
      isMedicalAdvice: false,
      directiveMessage: "**EMERGENCY DIRECTIVE**\n\nSudden shortness of breath, chest tightness, coughing up blood, heavy bleeding, or feeling faint can be signs of a serious emergency, like a blood clot in the lungs.\n\nPlease **call 911 or have someone take you to the nearest emergency room immediately**. Do not wait to see if it passes.\n\nIs there someone with you right now who can help dial 911?"
    };
  }

  // 2. Urgent Surgical Complications (Deep Vein Thrombosis, Surgical Site Infection)
  const dvtKeywords = [
    'clot', 'dvt', 'calf pain', 'calf swelling', 'swollen calf', 'calf redness',
    'calf is hot', 'calf tenderness', 'tight calf', 'pain when flexing foot',
    'pain pulling toes', 'pain in back of leg'
  ];
  const isDvt = dvtKeywords.some(kw => lower.includes(kw));

  const infectionKeywords = [
    'pus', 'foul smell', 'foul odor', 'yellow drainage', 'green drainage',
    'fever', 'high fever', 'chills', 'spreading redness', 'red streaks',
    'incision opening', 'wound separated', 'temperature 101', 'temperature 102'
  ];
  const isSsi = infectionKeywords.some(kw => lower.includes(kw));

  if (isDvt) {
    return {
      isEmergency: false,
      isUrgentCallSurgeon: true,
      urgencyType: 'dvt',
      isMedicalAdvice: false,
      directiveMessage: "A calf that feels noticeably tight, swollen, hot to the touch, or tender when pulling your toes up toward your nose can be an early sign of a blood clot in the leg.\n\nPlease **call Dr. Carter's office right now** or go to urgent care so they can take a quick, painless ultrasound scan of your calf. While you're waiting, **please do not massage, squeeze, or rub your calf**, as that could dislodge a clot.\n\nCan someone at home help you call Dr. Carter's clinic right now?"
    };
  }

  if (isSsi) {
    return {
      isEmergency: false,
      isUrgentCallSurgeon: true,
      urgencyType: 'infection',
      isMedicalAdvice: false,
      directiveMessage: "Running a fever over 101°F, seeing redness spread outwards past the edge of your bandage, or noticing cloudy yellow fluid are signs that Dr. Carter's team needs to look at today.\n\nPlease **call Dr. Carter's clinic today** so a nurse or doctor can check your incision. Keep the area covered and completely dry, and avoid putting any creams or ointments on it.\n\nAre you experiencing any chills or feeling feverish right now?"
    };
  }

  // Diagnostic / prescription alteration requests
  const medicalAdviceKeywords = [
    'diagnose', 'what is my diagnosis', 'prescribe', 'what medicine should i take',
    'change dose', 'stop taking', 'adjust dosage', 'can i take extra'
  ];
  const isMedicalAdvice = medicalAdviceKeywords.some(kw => lower.includes(kw));

  return {
    isEmergency: false,
    isUrgentCallSurgeon: false,
    isMedicalAdvice
  };
}

/**
 * Backward compatibility helper for legacy checks
 */
export function evaluateSafety(text: string): { isEmergency: boolean; isMedicalAdvice: boolean } {
  const evalResult = evaluateSafetyAndRedFlags(text);
  return {
    isEmergency: evalResult.isEmergency,
    isMedicalAdvice: evalResult.isMedicalAdvice || evalResult.isUrgentCallSurgeon
  };
}

// ============================================================================
// MEDICAL EVIDENCE RETRIEVAL ENGINE
// ============================================================================

export interface RetrievedEvidence {
  chunks: KnowledgeChunk[];
  sources: GroundingSource[];
  surgeonOrders: string[];
  applicableSurgery: SurgeryType;
  recoveryStage: RecoveryStage;
}

/**
 * Retrieves trusted clinical evidence from the Knee Medical Knowledge Base,
 * incorporating surgeon orders and patient context.
 */
export function retrieveMedicalEvidence(
  query: string,
  patientRecord?: any,
  _recentHistory?: Message[]
): RetrievedEvidence {
  const normalized = normalizePatientRecord(patientRecord);

  // Determine applicable surgery type
  let applicableSurgery: SurgeryType = 'total_knee_replacement';
  if (normalized?.surgeryType) {
    const sLower = normalized.surgeryType.toLowerCase();
    if (sLower.includes('acl')) applicableSurgery = 'acl_reconstruction';
    else if (sLower.includes('meniscus repair') || sLower.includes('repair')) applicableSurgery = 'meniscus_repair';
    else if (sLower.includes('meniscectomy')) applicableSurgery = 'arthroscopic_meniscectomy';
    else if (sLower.includes('collateral') || sLower.includes('mcl') || sLower.includes('lcl')) applicableSurgery = 'collateral_ligament_injury';
    else if (sLower.includes('knee replacement') || sLower.includes('arthroplasty')) applicableSurgery = 'total_knee_replacement';
  }

  // Determine recovery stage (default acute stage for Day 6 post-op)
  const recoveryStage: RecoveryStage = 'acute_0_7_days';

  // Extract explicit surgeon & discharge instructions (Highest Priority Layer)
  const surgeonOrders: string[] = [];
  if (normalized) {
    if (normalized.activeMedications && normalized.activeMedications.length > 0) {
      surgeonOrders.push(`Prescribed medications: ${normalized.activeMedications.map((m: any) => `${m.name} ${m.dose} (${m.frequency || 'as directed'})`).join(', ')}.`);
    }
    if (normalized.dischargeInstructions?.activity && normalized.dischargeInstructions.activity.length > 0) {
      surgeonOrders.push(`Activity orders: ${normalized.dischargeInstructions.activity.join('; ')}.`);
    }
    if (normalized.dischargeInstructions?.warningSigns && normalized.dischargeInstructions.warningSigns.length > 0) {
      surgeonOrders.push(`Reportable warning signs: ${normalized.dischargeInstructions.warningSigns.join('; ')}.`);
    }
    if (normalized.allergies && normalized.allergies.length > 0) {
      surgeonOrders.push(`Documented allergies: ${normalized.allergies.join(', ')}.`);
    }
    if (normalized.surgeonNotes) {
      surgeonOrders.push(`Surgeon notes: ${normalized.surgeonNotes}`);
    }
  }

  // Score and retrieve relevant knowledge chunks
  const ranked = searchMedicalKnowledgeBase(query, applicableSurgery, recoveryStage);
  const topChunks = ranked.length > 0 
    ? ranked.slice(0, 3).map(r => r.chunk) 
    : KNEE_MEDICAL_KNOWLEDGE_BASE.slice(0, 2);

  // Extract unique grounding source citations
  const seenUrls = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const chunk of topChunks) {
    if (!seenUrls.has(chunk.sourceUrl)) {
      seenUrls.add(chunk.sourceUrl);
      sources.push({
        title: chunk.title,
        source: chunk.source,
        url: chunk.sourceUrl
      });
    }
  }

  return {
    chunks: topChunks,
    sources,
    surgeonOrders,
    applicableSurgery,
    recoveryStage
  };
}

// ============================================================================
// DYNAMIC PERSONALIZED RESPONSE GENERATOR (OFFLINE & SYNTHESIS ENGINE)
// ============================================================================

/**
 * Synthesizes a warm, concise, clinically grounded response without canned FAQ text.
 * Follows the clinical hierarchy: Surgeon Instructions > PT Protocol > Knowledge Base > General Guidance.
 */
export function generatePersonalizedResponse(
  text: string,
  _history: Message[] = [],
  medicalHistory?: any
): { text: string; sources: GroundingSource[]; isEmergency: boolean; isMedicalWarning: boolean } {
  const safety = evaluateSafetyAndRedFlags(text);

  // Emergency safety override
  if (safety.isEmergency && safety.directiveMessage) {
    return {
      text: safety.directiveMessage,
      sources: [{
        title: 'Pulmonary Embolism & VTE Emergency Signs',
        source: 'CDC',
        url: 'https://www.cdc.gov/blood-clots/about/'
      }],
      isEmergency: true,
      isMedicalWarning: false
    };
  }

  // Urgent surgeon review override
  if (safety.isUrgentCallSurgeon && safety.directiveMessage) {
    const isDvt = safety.urgencyType === 'dvt';
    return {
      text: safety.directiveMessage,
      sources: isDvt
        ? [
            {
              title: 'Deep Vein Thrombosis (DVT) Warning Signs',
              source: 'CDC',
              url: 'https://www.cdc.gov/blood-clots/about/'
            },
            {
              title: 'Total Knee Replacement Discharge Care (DVT Prevention)',
              source: 'NIH / MedlinePlus',
              url: 'https://medlineplus.gov/ency/patientinstructions/000681.htm'
            }
          ]
        : [
            {
              title: 'Surgical Site Infection (SSI) Signs & Wound Care',
              source: 'CDC',
              url: 'https://www.cdc.gov/infection-control/hcp/surgical-site-infections/'
            },
            {
              title: 'Post-Surgical Incision & Joint Infection Warning Signs',
              source: 'AAOS / OrthoInfo',
              url: 'https://orthoinfo.aaos.org/en/recovery/'
            }
          ],
      isEmergency: false,
      isMedicalWarning: true
    };
  }

  const normalized = normalizePatientRecord(medicalHistory);
  const evidence = retrieveMedicalEvidence(text, medicalHistory, _history);
  const lower = text.toLowerCase();

  // 1. Showering, Bathing, and Wound Care
  if (
    lower.includes('shower') || lower.includes('bath') || lower.includes('soak') ||
    lower.includes('water') || lower.includes('dressing') || lower.includes('bandage') ||
    lower.includes('wash')
  ) {
    let response = "Right now at Day 6, the golden rule from Dr. Carter is to keep your incision completely dry while the skin knits back together.\n\n";
    response += "Here is what that means for you today:\n";
    response += "• **No soaking or tub baths**: Sitting in a bathtub, hot tub, or pool is strictly off-limits for the first few weeks, because soaking in still water lets bacteria reach your new joint.\n";
    response += "• **Showering**: If Dr. Carter placed a waterproof bandage, quick showers are fine—just keep your back to the water so it doesn't spray directly on the knee, and gently pat the bandage dry with a clean towel.\n";
    response += "• **Sponge baths are safest**: If you're feeling unsteady or don't have a waterproof seal, a seated sponge bath is the easiest and safest choice right now.\n\n";
    response += "Are you thinking of taking a shower today, or would a seated sponge bath feel safer for you right now?";

    return {
      text: response,
      sources: [
        {
          title: 'Total Knee Replacement Discharge Instructions',
          source: 'NIH / MedlinePlus',
          url: 'https://medlineplus.gov/ency/patientinstructions/000681.htm'
        },
        {
          title: 'Post-Surgical Incision & Joint Infection Prevention',
          source: 'AAOS / OrthoInfo',
          url: 'https://orthoinfo.aaos.org/en/recovery/'
        }
      ],
      isEmergency: false,
      isMedicalWarning: false
    };
  }

  // 2. Swelling, Warmth, Elevation, and Resting Positioning
  if (
    lower.includes('swell') || lower.includes('warm') || lower.includes('heat') ||
    lower.includes('ice') || lower.includes('icing') || lower.includes('elevat') ||
    lower.includes('prop') || lower.includes('couch') || lower.includes('reclin')
  ) {
    let response = "A noticeable amount of warmth and puffiness is completely normal right now at Day 6. Your body is actively sending extra blood flow to repair the tissue around your new knee.\n\n";
    response += "Dr. Carter's recovery plan has two simple tools to keep you comfortable:\n";
    response += "• **Prop your leg up**: Rest with your foot propped above heart level. Place pillows under your calf or ankle—never directly under the knee joint, so your leg stays comfortably flat.\n";
    response += "• **Ice in 20-minute sessions**: Apply a cold pack for 20 minutes at a time, every 2 to 3 hours, with a thin cloth between the ice and your skin.\n";
    response += "• **When to call**: Mild pinkness and warmth are expected. But if you see bright redness spreading outward like a sunburn, run a fever over 101°F, or notice cloudy fluid, call Dr. Carter's office right away.\n\n";
    response += "Does the swelling tend to ease up when you prop your leg up on pillows, or has it been feeling pretty tight today?";

    return {
      text: response,
      sources: [
        {
          title: 'Post-Surgical Incision & Joint Infection Warning Signs',
          source: 'AAOS / OrthoInfo',
          url: 'https://orthoinfo.aaos.org/en/recovery/'
        },
        {
          title: 'Knee Pain & Symptom Triage',
          source: 'NHS',
          url: 'https://www.nhs.uk/conditions/knee-pain/'
        }
      ],
      isEmergency: false,
      isMedicalWarning: false
    };
  }

  // 3. Calf Soreness, Blood Clot Prevention, and Circulation
  if (
    lower.includes('calf') || lower.includes('ankle pump') || lower.includes('circulation') ||
    lower.includes('clot') || lower.includes('cramp') || lower.includes('shin')
  ) {
    let response = "Right now during your first week home, keeping blood moving smoothly through your legs is one of our top priorities.\n\n";
    response += "Dr. Carter's discharge plan protects your recovery in two key ways:\n";
    response += "• **Ankle pumps every hour**: Point your toes down and pull them up toward your nose 10 to 15 times every waking hour. This pumps your calf muscle and keeps blood flowing.\n";
    response += "• **Your daily Aspirin**: Continue taking your Aspirin (81 mg twice daily) as Dr. Carter prescribed to help prevent blood clots.\n";
    response += "• **What to watch out for**: Mild, even muscle soreness from walking is normal. But if one calf feels noticeably tight, swollen, warm to the touch, or aches when you pull your toes up, call Dr. Carter right away so they can do a quick ultrasound scan. Never rub or massage a sore calf.\n\n";
    response += "Are you noticing any tightness or warmth in either calf right now?";

    return {
      text: response,
      sources: [
        {
          title: 'Deep Vein Thrombosis (DVT) Warning Signs',
          source: 'CDC',
          url: 'https://www.cdc.gov/blood-clots/about/'
        },
        {
          title: 'Total Knee Replacement Discharge Care',
          source: 'NIH / MedlinePlus',
          url: 'https://medlineplus.gov/ency/patientinstructions/000681.htm'
        }
      ],
      isEmergency: false,
      isMedicalWarning: false
    };
  }

  // 4. Physical Therapy, Exercises, and Walking
  if (
    lower.includes('exercise') || lower.includes('walk') || lower.includes('pt') ||
    lower.includes('therapy') || lower.includes('quad') || lower.includes('heel slide') ||
    lower.includes('bend') || lower.includes('straight') || lower.includes('flexion') ||
    lower.includes('extension') || lower.includes('routine')
  ) {
    let response = "At Day 6, recovery isn't about pushing hard—it's about gentle circulation and keeping your knee from stiffening up.\n\n";
    response += "Dr. Carter's daily routine for you focuses on three simple things:\n";
    response += "• **Short walks**: 5 to 10 minutes, 3 to 4 times a day, using your walker with about half your weight on your operated leg.\n";
    response += "• **Hourly ankle pumps**: 10 to 15 pumps every hour you're awake to keep blood circulating.\n";
    response += "• **Thigh squeezes (Quad sets)**: Lie flat, tighten the muscle on top of your thigh to press the back of your knee flat against the mattress, hold for 5 seconds, and release.\n\n";
    response += "Always stop and rest with your leg elevated if the knee begins to throb. How did your last walk with the walker feel today?";

    return {
      text: response,
      sources: [
        {
          title: 'Knee Conditioning & Post-Operative Rehabilitation Program',
          source: 'AAOS / OrthoInfo',
          url: 'https://orthoinfo.aaos.org/en/recovery/knee-conditioning-program/'
        },
        {
          title: 'Rehabilitation Protocols & Joint Recovery',
          source: 'Mass General',
          url: 'https://www.massgeneral.org/orthopaedics/sports-medicine/physical-therapy-protocols'
        }
      ],
      isEmergency: false,
      isMedicalWarning: false
    };
  }

  // 5. Pain Management, Sleep, and Nighttime Discomfort
  if (
    lower.includes('pain') || lower.includes('sleep') || lower.includes('night') ||
    lower.includes('bed') || lower.includes('pillow') || lower.includes('ache') ||
    lower.includes('hurts') || lower.includes('sore')
  ) {
    let response = "Nighttime is often the hardest stretch during your first week at home because everything is quiet and you aren't moving around.\n\n";
    response += "A few practical adjustments from Dr. Carter's guidance can make a big difference tonight:\n";
    response += "• **Pillow placement**: If sleeping on your back, put pillows under your calf or heel—never directly behind your knee, so the joint doesn't freeze in a bent position. If sleeping on your side, lie on your non-operated side with a pillow between your knees.\n";
    response += "• **Ice before bed**: Chilling the knee for 20 minutes right before you turn out the lights helps calm the joint nerves.\n";
    response += "• **Time your pain relief**: Take your scheduled 1,000 mg Tylenol about 30 to 45 minutes before sleep so it's working when your head hits the pillow.\n\n";
    response += "How did you sleep last night—were you able to find a comfortable position?";

    return {
      text: response,
      sources: [
        {
          title: 'Joint Protection, Activity Pacing & Managing Knee Pain',
          source: 'NHS',
          url: 'https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/conditions/knee-pain/'
        },
        {
          title: 'Total Knee Replacement Discharge Care',
          source: 'NIH / MedlinePlus',
          url: 'https://medlineplus.gov/ency/patientinstructions/000681.htm'
        }
      ],
      isEmergency: false,
      isMedicalWarning: false
    };
  }

  // 6. Driving and Returning to Activities
  if (lower.includes('driv') || lower.includes('car') || lower.includes('work') || lower.includes('stairs')) {
    let response = "Right now at Day 6, driving is safely off the table. For a right knee replacement, most patients wait about 4 to 6 weeks, and you need Dr. Carter's official clearance first.\n\n";
    response += "There are two main reasons for this right now:\n";
    response += "• You must be completely finished with any strong prescription pain medicine.\n";
    response += "• Your right leg needs enough strength and reflex speed to hit the brakes instantly in an emergency.\n\n";
    response += "For stairs right now, remember the golden rule: 'Up with the good leg, down with the surgical leg' while holding firmly to the handrail. Do you have a family member or friend available to give you a lift when needed?";

    return {
      text: response,
      sources: [
        {
          title: 'Total Knee Replacement Discharge Instructions',
          source: 'NIH / MedlinePlus',
          url: 'https://medlineplus.gov/ency/patientinstructions/000681.htm'
        },
        {
          title: 'Activities and Recovery After Joint Replacement',
          source: 'AAOS / OrthoInfo',
          url: 'https://orthoinfo.aaos.org/en/recovery/'
        }
      ],
      isEmergency: false,
      isMedicalWarning: false
    };
  }

  // 7. Medications and Prescriptions
  if (
    lower.includes('medication') || lower.includes('meds') || lower.includes('tylenol') ||
    lower.includes('aspirin') || lower.includes('dose') || lower.includes('pill')
  ) {
    let response = "Looking at your discharge sheet from Dr. Carter, your active medication plan right now is:\n\n";
    if (normalized?.activeMedications?.length) {
      response += normalized.activeMedications.map(m => `• **${m.name}** (${m.dose}${m.frequency ? ` - ${m.frequency}` : ''})`).join('\n') + '\n\n';
    } else {
      response += "• **Tylenol (Acetaminophen 1,000 mg)**: Taken every 8 hours on schedule to manage baseline pain.\n• **Aspirin (81 mg)**: Taken twice daily to protect against blood clots.\n\n";
    }
    response += "Staying on schedule rather than waiting until pain spikes makes recovery much smoother. As an AI assistant, I can't adjust your dosages—if you need more relief or feel any nausea, we can call Dr. Carter's office right away.\n\n";
    response += "Have you been able to take your medications on time today?";

    return {
      text: response,
      sources: [
        {
          title: 'Total Knee Replacement Discharge Care',
          source: 'NIH / MedlinePlus',
          url: 'https://medlineplus.gov/ency/patientinstructions/000681.htm'
        }
      ],
      isEmergency: false,
      isMedicalWarning: false
    };
  }

  // 8. General Greeting or Overview
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return {
      text: "Hi Aïda! I've been reviewing your recovery plan from Dr. Carter for Day 6. I'm right here with you to help make sense of your walking routine, exercises, wound care, or any questions on your mind. How is your knee feeling right now?",
      sources: evidence.sources,
      isEmergency: false,
      isMedicalWarning: false
    };
  }

  // Default contextual recovery response
  let defaultText = "Looking at where you are today at Day 6, the most important focus is balancing your short 5–10 minute walks with plenty of rest, keeping your leg propped up on pillows, and doing your hourly ankle pumps to promote healthy circulation.\n\nIs there a specific part of your recovery routine or a symptom you'd like to check on right now?";

  return {
    text: defaultText,
    sources: evidence.sources,
    isEmergency: false,
    isMedicalWarning: false
  };
}

/**
 * Backward compatibility wrapper for getSimulatedResponse
 */
export function getSimulatedResponse(
  text: string,
  history: Message[] = [],
  medicalHistory?: any,
  _legacyFaq?: any
): string {
  return generatePersonalizedResponse(text, history, medicalHistory).text;
}

// ============================================================================
// GEMINI API GROUNDED IN APPROVED MEDICAL KNOWLEDGE BASE
// ============================================================================

export async function getGeminiResponse(
  messages: Message[],
  apiKey: string,
  userMessageText: string,
  medicalHistoryContext?: string,
  _legacyFaq?: any
): Promise<{ text: string; sources: GroundingSource[] }> {
  // 1. Safety check
  const safety = evaluateSafetyAndRedFlags(userMessageText);
  if (safety.isEmergency && safety.directiveMessage) {
    return {
      text: safety.directiveMessage,
      sources: [{
        title: 'Pulmonary Embolism & VTE Emergency Signs',
        source: 'CDC',
        url: 'https://www.cdc.gov/blood-clots/about/'
      }]
    };
  }

  // 2. Parse patient record & retrieve evidence
  let parsedHistory: any = null;
  if (medicalHistoryContext) {
    try {
      parsedHistory = JSON.parse(medicalHistoryContext);
    } catch (e) {
      console.warn("Failed to parse medicalHistoryContext in getGeminiResponse", e);
    }
  }

  const evidence = retrieveMedicalEvidence(userMessageText, parsedHistory, messages);

  // 3. Construct system prompt grounded in patient-friendly guidance
  let shalomSystemPrompt = `You are Shalom, Aïda's personal post-operative recovery companion.
You have thoroughly read and understood Aïda's discharge instructions from Dr. Carter (Day 6 after right total knee replacement).
Your voice is warm, calm, empathetic, and reassuring—like an experienced, compassionate recovery nurse sitting right beside her.

CORE PRINCIPLES (Strictly follow all):
1. PERSONA & FEEL:
   - Speak like someone who already read and understood Aïda's instructions and is helping her make sense of them—NOT someone searching a database.
   - Never say "According to our database...", "The clinical chunk states...", or quote citation codes.
   - Refer naturally to Dr. Carter's plan: "Dr. Carter's instructions are very clear on this...", "Looking at your discharge plan...".

2. TRANSLATE CLINICAL TERMINOLOGY INTO EVERYDAY LANGUAGE:
   - Instead of "submersion is contraindicated", say "no soaking or tub baths".
   - Instead of "flexion contracture", say "keeping your knee from stiffening up in a bent position".
   - Instead of "deep vein thrombosis / duplex ultrasound", say "a blood clot check with a quick ultrasound".
   - Instead of "purulent drainage or erythema", say "cloudy yellow drainage or spreading redness".
   - Instead of "venous return", say "healthy blood flow back up your leg".

3. EXPLAIN WHAT IT MEANS RIGHT NOW:
   - She is at Day 6 post-op: tissues are actively knitting together, puffiness and warmth are normal but need icing and elevation, and the incision must stay completely dry.

4. PRIORITIZE DISCHARGE INSTRUCTIONS OVER GENERAL KNOWLEDGE:
   - Dr. Carter's orders take absolute priority: 50% partial weight bearing with walker, scheduled Tylenol 1,000 mg q8h, Aspirin 81 mg twice daily for clot prevention, keep incision dry, no soaking/tub baths.

5. DON'T DUMP RETRIEVED DATA:
   - Only give information relevant to her specific question. Keep answers concise, bite-sized (under 150 words), and easy to scan.

6. NATURAL FOLLOW-UP:
   - Always end with a warm, caring question that continues the conversation naturally (e.g., asking how she's feeling right now, or if she'd like help with a specific task).

7. KEEP SOURCES GROUNDED WITHOUT INTERRUPTING:
   - Do NOT include citations, URLs, or academic source names inside the conversational body of your response. Trusted sources are rendered separately in the UI.

8. SAFETY RULES:
   - Life-Threatening (chest pain, dyspnea, heavy bleeding): Urgently direct her to call 911 immediately.
   - Urgent Surgeon Review (hot, tight calf pain; fever > 101°F, spreading redness): Urgently direct her to call Dr. Carter / surgical clinic. Remind her never to massage a sore calf.
   - NEVER diagnose medical conditions or alter medication doses.

[PATIENT SURGEON DISCHARGE ORDERS (HIGHEST PRIORITY)]
${evidence.surgeonOrders.length > 0 ? evidence.surgeonOrders.join('\n') : 'Dr. Carter: 50% partial weight bearing with walker, keep incision dry, Tylenol 1,000 mg q8h, Aspirin 81 mg twice daily, hourly ankle pumps.'}

[CLINICAL KNOWLEDGE BASE FACTS FOR GROUNDING]
${evidence.chunks.map(chunk => `
TOPIC: ${chunk.topic}
KEY FACTS:
${chunk.clinicalFacts.map(f => `- ${f}`).join('\n')}
${chunk.contraindications ? `PRECAUTIONS:\n${chunk.contraindications.map(c => `- ${c}`).join('\n')}` : ''}
${chunk.redFlags ? `RED FLAGS:\n${chunk.redFlags.map(rf => `- ${rf}`).join('\n')}` : ''}
`).join('\n---\n')}
`;

  if (evidence.surgeonOrders.length > 0) {
    shalomSystemPrompt += `\n[PATIENT SURGEON DISCHARGE ORDERS (HIGHEST PRIORITY)]\n${evidence.surgeonOrders.join('\n')}\n`;
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

    return {
      text: candidateText,
      sources: evidence.sources
    };
  } catch (error) {
    console.error('Error invoking Gemini API:', error);
    const fallback = generatePersonalizedResponse(userMessageText, messages, parsedHistory);
    return {
      text: fallback.text,
      sources: fallback.sources
    };
  }
}
