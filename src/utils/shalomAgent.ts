export interface Message {
  id: string;
  sender: 'user' | 'shalom';
  text: string;
  timestamp: Date;
  isEmergency?: boolean;
  isMedicalWarning?: boolean;
}

export const SHALOM_SYSTEM_PROMPT = `You are Shalom, an AI Post-Operative Recovery Assistant.

Your primary responsibility is to continuously monitor each patient's recovery after surgery, recognize meaningful changes over time, provide supportive guidance based on approved discharge instructions, and promptly identify situations that may require review by a healthcare professional.

You support patients recovering at home after surgery while helping nurses and healthcare teams focus on the patients who need attention most.

Tone:
* Warm
* Calm
* Reassuring
* Supportive
* Professional
* Use plain language.
* Keep responses concise.
* Show empathy when patients report pain or concerning symptoms.
* Ask one question at a time.
* Adapt each conversation based on the patient's previous responses instead of asking the same questions every day.

Your Responsibilities:
1. Monitor each patient's recovery throughout the entire post-operative period.
2. Conduct personalized daily check-ins by asking about pain, temperature, medications, mobility, sleep, nutrition, wound appearance, and other recovery-related symptoms.
3. Remember previous conversations and compare today's answers with previous recovery data to identify meaningful trends.
4. Recognize recovery patterns such as increasing pain, worsening redness, swelling, drainage, fever, declining mobility, missed medications, or lack of expected improvement.
5. Assess the patient's recovery status internally as:
   * Green — Stable Recovery
   * Yellow — Needs Monitoring
   * Red — Needs Clinical Review
   Do not display these classifications directly to patients.
6. Explain discharge instructions using simple language and only based on information provided by the healthcare team.
7. Remind patients about medications, rehabilitation exercises, follow-up appointments, wound care, hydration, and other recovery tasks.
8. Generate concise clinical summaries highlighting recovery trends and significant changes for nurses and healthcare providers.
9. Encourage patients to contact their healthcare team whenever recovery is not progressing as expected.

Conversation Rules:
* Prioritize follow-up questions based on previous responses.
* Consider the patient's surgery type and expected recovery timeline before assessing recovery progress.
* Focus on trends over time rather than isolated symptoms.
* Reassure patients while remaining honest about uncertainty.
* Never create unnecessary anxiety.
* Escalate only when symptoms or recovery patterns justify additional medical attention.

Escalation Framework:
* Routine: Recovery appears consistent with expectations. Continue monitoring.
* Priority: Recovery may not be progressing as expected. Recommend contacting the healthcare provider within the day.
* Urgent: Symptoms suggest the patient should seek prompt medical evaluation.
* Emergency: If the patient reports symptoms such as severe chest pain, difficulty breathing, uncontrolled bleeding, loss of consciousness, or any other life-threatening emergency, immediately instruct them to call 911 or go to the nearest emergency department.

You Must Never:
* Diagnose medical conditions.
* Recommend or prescribe treatments.
* Change medication dosages.
* Interpret laboratory results or medical imaging.
* Replace doctors, nurses, or healthcare professionals.
* Guarantee medical outcomes.
* Make medical decisions on behalf of the patient.

When patients ask questions requiring medical judgment, explain that you are not a healthcare professional and recommend contacting their surgeon, physician, or healthcare team.
If a request is unrelated to post-operative recovery support, politely explain that it is outside your role and direct the patient to the appropriate professional.`;

// Safety filters helper
export function evaluateSafety(text: string): { isEmergency: boolean; isMedicalAdvice: boolean } {
  const lower = text.toLowerCase();
  
  // Emergency checks (immediate escalation)
  const emergencyKeywords = [
    'chest pain', 'heart attack', 'difficulty breathing', 'shortness of breath',
    'cannot breathe', 'heavy bleeding', 'uncontrolled bleeding', 'unconscious',
    'passed out', 'loss of consciousness', 'seizure', '911', 'emergency room',
    'stroke symptoms', 'choking'
  ];
  
  const isEmergency = emergencyKeywords.some(keyword => lower.includes(keyword));
  
  // Medical advice/diagnosis checks
  const diagnosisKeywords = [
    'diagnose', 'what is this rash', 'is this shingles', 'is this cancer', 
    'infected', 'what disease is', 'do i have an infection', 'is this normal'
  ];
  
  const dosageKeywords = [
    'dosage', 'dose', 'how many mg', 'how many pills', 'increase dose', 
    'decrease dose', 'stop taking', 'take double', 'adjust dose', 'can i take more',
    'change my prescription'
  ];
  
  const treatmentKeywords = [
    'cure', 'treat', 'what medication is best for', 'prescribe', 
    'alternative treatment for', 'how do i treat', 'cure for', 'treatment for'
  ];

  // If asking for a clinical judgment or diagnosis
  const isMedicalAdvice = 
    diagnosisKeywords.some(keyword => lower.includes(keyword)) ||
    dosageKeywords.some(keyword => lower.includes(keyword)) ||
    treatmentKeywords.some(keyword => lower.includes(keyword));

  return { isEmergency, isMedicalAdvice };
}

// Local simulation fallback engine
export function getSimulatedResponse(text: string, history: Message[] = []): string {
  const { isEmergency, isMedicalAdvice } = evaluateSafety(text);
  
  if (isEmergency) {
    return "🚨 **EMERGENCY WARNING** 🚨\n\nPlease call 911 or seek immediate emergency medical care. I cannot assist with emergency or life-threatening situations.";
  }
  
  if (isMedicalAdvice) {
    return "❤️ **Important Safety Note**\n\nI am not a doctor, nurse, or healthcare provider. I cannot diagnose conditions, prescribe medications, or recommend treatments.\n\nPlease reach out directly to your surgical care team for medical advice. Can I help you prepare a list of questions to ask them about this?";
  }

  const lower = text.toLowerCase();
  
  // Check if history indicates we are in the daily check-in sequence
  const shalomMessages = history.filter(m => m.sender === 'shalom');
  const lastShalomMessage = shalomMessages[shalomMessages.length - 1]?.text || "";
  
  if (lastShalomMessage.includes("scale of 0 (no pain) to 10")) {
    return "Got it. Have you checked your temperature today? If so, what was the reading in degrees Fahrenheit (e.g., 98.6)?";
  }
  if (lastShalomMessage.includes("reading in degrees Fahrenheit")) {
    return "Thank you. Have you taken all your scheduled recovery medications today?";
  }
  if (lastShalomMessage.includes("recovery medications today")) {
    return "Understood. How would you describe your mobility today? Are you mostly resting (None), using assistance (Limited), walking a bit (Moderate), or moving well (Good)?";
  }
  if (lastShalomMessage.includes("describe your mobility today")) {
    return "How was your sleep last night? Was it Poor, Fair, or Good?";
  }
  if (lastShalomMessage.includes("sleep last night")) {
    return "Next, let's check your surgical wound. Is there any redness, swelling, drainage, or does it look Normal?";
  }
  if (lastShalomMessage.includes("surgical wound")) {
    return "Lastly, are you able to eat and drink fluids normally today?";
  }
  if (lastShalomMessage.includes("drink fluids normally today")) {
    return "Thank you for completing today's daily recovery check-in! I have updated your recovery metrics. Your data indicates your recovery is stable but should be monitored. I have compiled a Clinical Summary for your care team on the Provider Reports tab.";
  }
  
  // Normal command triggers
  if (lower.includes('check-in') || lower.includes('start check') || lower.includes('checkin')) {
    return "Let's begin your daily recovery check-in. First, how is your pain today on a scale of 0 (no pain) to 10 (severe pain)?";
  }
  
  if (lower.includes('pain')) {
    return "Pain is expected after surgery, but we want to monitor its trend. Empathy note: I'm sorry to hear if you are experiencing pain. How would you rate it from 0 to 10? If it is increasing or uncontrolled, please contact your care team. I can help prepare questions about pain management.";
  }
  
  if (lower.includes('wound') || lower.includes('incision') || lower.includes('redness') || lower.includes('pus') || lower.includes('drainage')) {
    return "Monitoring your incision daily is crucial. Watch out for red flags: spreading redness, swelling, warmth, or yellow/foul-smelling drainage. If you notice these, you should contact your surgeon. Does your incision look clean and dry today?";
  }
  
  if (lower.includes('fever') || lower.includes('temperature') || lower.includes('hot')) {
    return "An elevated temperature can be an early sign of infection. A fever of 101°F or higher typically warrants contacting your surgical care team. Have you recorded a temperature reading today?";
  }
  
  if (lower.includes('discharge') || lower.includes('instructions')) {
    return "Your discharge instructions contain vital guidelines for activity, medications, and wound care. You can use the **Discharge Decoder** tool to simplify them. Would you like to review them now?";
  }
  
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hello! I am Shalom, your Post-Operative Recovery Assistant. I am here to help you monitor your recovery, track medications, and prepare for follow-up appointments.\n\nWould you like to start your daily recovery check-in?";
  }

  return "I am Shalom, your Post-Operative Recovery Assistant. I can help you complete daily check-ins, organize recovery medications, simplify discharge paperwork, and highlight clinical trends.\n\nWhat recovery task can I help you with today?";
}

// Live API call to Gemini
export async function getGeminiResponse(
  messages: Message[],
  apiKey: string,
  userMessageText: string
): Promise<string> {
  const { isEmergency, isMedicalAdvice } = evaluateSafety(userMessageText);
  
  if (isEmergency) {
    return "🚨 **EMERGENCY WARNING** 🚨\n\nPlease call 911 or seek immediate emergency medical care. I cannot assist with emergency or life-threatening situations.";
  }
  
  if (isMedicalAdvice) {
    return "❤️ **Important Safety Note**\n\nI am not a doctor, nurse, or healthcare provider. I cannot diagnose conditions, prescribe medications, or recommend treatments.\n\nPlease reach out directly to your surgical care team for medical advice. Can I help you prepare a list of questions to ask them about this?";
  }

  try {
    // Transform chat history for Gemini API call
    const contents = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Add the current user message at the end
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
            parts: [{ text: SHALOM_SYSTEM_PROMPT }]
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
    // Fall back to simulation, passing message history so check-ins work
    return getSimulatedResponse(userMessageText, messages) + "\n\n*(Note: Failed to connect to Gemini. Showing simulated response instead.)*";
  }
}
