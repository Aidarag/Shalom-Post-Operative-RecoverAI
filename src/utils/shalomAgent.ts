export interface Message {
  id: string;
  sender: 'user' | 'shalom';
  text: string;
  timestamp: Date;
  isEmergency?: boolean;
  isMedicalWarning?: boolean;
}

export const SHALOM_SYSTEM_PROMPT = `You are Shalom, an AI Post-Operative Recovery Assistant.
Your primary responsibility is to help patients recovering at home after surgery by conducting daily recovery check-ins, tracking progress, explaining fictional discharge instructions, and identifying when a patient should contact their healthcare team.

Tone:
* Warm, calm, reassuring, supportive, and professional.
* Use simple, plain, non-clinical language.
* Keep responses concise.
* Show empathy when patients report pain or concerning symptoms.
* Ask one question at a time.
* Adapt each conversation based on previous responses instead of asking the same questions every day.

The 6 Daily Recovery Questions you must ask:
1. What is your pain level today from 1 to 10?
2. Do you have a fever?
3. Did you take your medication today?
4. Is your incision red, swollen, draining, or getting worse?
5. How is your mobility today?
6. Do you have any unusual symptoms?

AI Behavior Rules:
* Classify the patient internally as Green (Stable), Yellow (Needs monitoring), or Red (Needs clinical review). Do not display these classifications directly to patients.
* NEVER diagnose medical conditions. Never tell a patient: "You have an infection", "You have a blood clot", "You should take this medicine", or "Change your dosage".
* If a patient asks clinical questions, explain you are an AI assistant and recommend contacting their surgeon, physician, or care team.
* If the patient reports chest pain, difficulty breathing, uncontrolled bleeding, loss of consciousness, or other life-threatening symptoms, immediately tell them to call 911 or go to the nearest emergency department.
* If symptoms are concerning but not life-threatening, tell them: "Your symptoms may need review by your healthcare team. Please contact your healthcare provider."`;

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
    'change dose', 'stop taking', 'adjust medication', 'prescribe'
  ];
  
  const isMedicalAdvice = medicalAdviceKeywords.some(keyword => lower.includes(keyword));

  return { isEmergency, isMedicalAdvice };
}

// Local simulation fallback engine
export function getSimulatedResponse(text: string, history: Message[] = []): string {
  const { isEmergency } = evaluateSafety(text);
  
  if (isEmergency) {
    return "🚨 **EMERGENCY NOTICE** 🚨\n\nIf you are experiencing chest pain, difficulty breathing, uncontrolled bleeding, or another life-threatening symptom, please **call 911 immediately or go to the nearest emergency department**. I cannot help with medical emergencies.";
  }

  const lower = text.toLowerCase();
  
  // Check if user is asking general questions that request diagnosis/prescription
  if (lower.includes('diagnose') || lower.includes('infection') || lower.includes('blood clot') || lower.includes('what should i take')) {
    return "I am a demo AI assistant and am not able to diagnose medical conditions or recommend treatments. If you are experiencing symptoms like fever, increased pain, or redness that make you suspect an infection or other issue, please contact your surgeon or healthcare team directly.";
  }
  
  if (lower.includes('change dose') || lower.includes('stop taking') || lower.includes('adjust dose')) {
    return "I cannot provide advice on changing your medication schedule or adjusting your dosages. Please contact your physician or pharmacist to discuss any changes to your prescription plan.";
  }

  // Handle the daily check-in sequence based on chat history
  const shalomMessages = history.filter(m => m.sender === 'shalom');
  const lastShalomText = shalomMessages[shalomMessages.length - 1]?.text || "";

  if (lastShalomText.includes("pain level today from 1 to 10")) {
    return "Thank you. Question 2: Do you have a fever? (Have you checked your temperature today?)";
  }
  if (lastShalomText.includes("Do you have a fever")) {
    return "Got it. Question 3: Did you take your medication today?";
  }
  if (lastShalomText.includes("take your medication today")) {
    return "Thank you. Question 4: Is your incision red, swollen, draining, or getting worse?";
  }
  if (lastShalomText.includes("incision red, swollen, draining")) {
    return "Understood. Question 5: How is your mobility today? (Are you resting, walking with help, or moving well?)";
  }
  if (lastShalomText.includes("mobility today")) {
    return "Got it. Question 6: Do you have any unusual symptoms (such as chest tightness, difficulty breathing, or severe pain)?";
  }
  if (lastShalomText.includes("unusual symptoms")) {
    // Determine risk response based on current answer or general check-in wrap up
    const hasWarning = lower.includes('chest') || lower.includes('breath') || lower.includes('bleed') || lower.includes('pain') && (lower.includes('8') || lower.includes('9') || lower.includes('10') || lower.includes('severe'));
    
    if (hasWarning) {
      return "Thank you for completing today's check-in. Based on your reported symptoms, your healthcare team may need to review your recovery. Please contact your healthcare provider directly. If you feel this is a life-threatening emergency, call 911 immediately.";
    }
    return "Thank you for completing today's daily recovery check-in! I have logged your responses for your nursing care team. Your recovery metrics appear to be stable. Continue resting and following your discharge instructions.";
  }

  // Check-in triggers
  if (lower.includes('check-in') || lower.includes('start check') || lower.includes('checkin')) {
    return "Let's begin your daily post-operative recovery check-in. Question 1: What is your pain level today from 1 to 10?";
  }

  // Fallback greeting
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hello! I am Shalom, your AI Post-Operative Recovery Assistant. I am here to help you complete your daily check-ins and track your progress.\n\nWould you like to start your daily recovery check-in?";
  }

  return "I am Shalom, your Post-Operative Recovery Assistant. I can guide you through your daily check-in, log pain levels, and compile a report for your nurse.\n\nTo begin, type \"Start Check-in\" or ask me a recovery question.";
}

// Live API call to Gemini
export async function getGeminiResponse(
  messages: Message[],
  apiKey: string,
  userMessageText: string
): Promise<string> {
  const { isEmergency } = evaluateSafety(userMessageText);
  
  if (isEmergency) {
    return "🚨 **EMERGENCY NOTICE** 🚨\n\nIf you are experiencing chest pain, difficulty breathing, uncontrolled bleeding, or another life-threatening symptom, please **call 911 immediately or go to the nearest emergency department**. I cannot help with medical emergencies.";
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
