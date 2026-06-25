import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowRight, 
  Play, 
  CheckCircle, 
  RotateCcw,
  Volume2
} from 'lucide-react';
import { 
  type Message, 
  type CheckInAnswers, 
  type CareTeamReport,
  classifyRisk, 
  generateCareTeamReport, 
  getWarmFeedback, 
  evaluateSafety, 
  getGeminiResponse,
  searchFAQDataset
} from '../utils/shalomAgent';

interface ChatInterfaceProps {
  apiKey: string;
  onCheckInComplete: (
    answers: CheckInAnswers, 
    status: 'Green' | 'Yellow' | 'Red' | 'Emergency', 
    report: CareTeamReport
  ) => void;
  presetScenarioTrigger: CheckInAnswers | null;
  clearPresetScenarioTrigger: () => void;
  onResetStatus: () => void;
  medicalHistory: any | null;
  faqDataset: any | null;
  isTtsEnabled: boolean;
  selectedVoiceName: string;
  voices: SpeechSynthesisVoice[];
}

const parseCheckInAnswer = (text: string, step: number): any => {
  const lower = text.toLowerCase().trim();
  
  if (step === 0) { // Pain level (1-10)
    const match = lower.match(/\b([1-9]|10)\b/);
    if (match) return parseInt(match[1]);
    
    if (lower.includes("no pain") || lower.includes("none") || lower.includes("perfect") || lower.includes("great")) return 1;
    if (lower.includes("mild") || lower.includes("slight") || lower.includes("little")) return 2;
    if (lower.includes("moderate") || lower.includes("okay") || lower.includes("ok") || lower.includes("average")) return 5;
    if (lower.includes("severe") || lower.includes("worst") || lower.includes("unbearable") || lower.includes("intense") || lower.includes("extreme")) return 9;
    if (lower.includes("bad") || lower.includes("hurts") || lower.includes("aching")) return 6;
    return null;
  }
  
  if (step === 1) { // Fever (Yes/No & temperature)
    const hasNoKeywords = ["no", "don't", "dont", "false", "normal", "fine", "negative", "not running"].some(k => lower.includes(k));
    if (hasNoKeywords) {
      return { hasFever: false, temperature: 98.6 };
    }
    
    const hasYesKeywords = ["yes", "do", "have", "fever", "hot", "warm", "running a"].some(k => lower.includes(k));
    const tempMatch = lower.match(/\b(9[7-9]\.[0-9]|10[0-6]\.[0-9])\b/) || lower.match(/\b(9[7-9]|10[0-6])\b/);
    const temperature = tempMatch ? parseFloat(tempMatch[1]) : null;
    
    if (temperature) {
      return { hasFever: temperature > 99.5, temperature };
    }
    if (hasYesKeywords) {
      return { hasFever: true, temperature: 100.4 };
    }
    return null;
  }
  
  if (step === 2) { // Medications (Yes/No)
    const hasNoKeywords = ["no", "missed", "forgot", "didn't", "didnt", "not taken", "skipped"].some(k => lower.includes(k));
    if (hasNoKeywords) return false;
    
    const hasYesKeywords = ["yes", "took", "did", "taken", "have taken", "all"].some(k => lower.includes(k));
    if (hasYesKeywords) return true;
    
    return null;
  }
  
  if (step === 3) { // Incision site issues
    if (lower.includes("normal") || lower.includes("fine") || lower.includes("good") || lower.includes("perfect") || lower.includes("ok") || lower.includes("okay")) {
      return ["Normal"];
    }
    
    const issues: string[] = [];
    if (lower.includes("red") || lower.includes("redness")) issues.push("Mild Redness");
    if (lower.includes("swell") || lower.includes("swelling")) issues.push("Swelling");
    if (lower.includes("drain") || lower.includes("drainage") || lower.includes("discharge") || lower.includes("ooze") || lower.includes("oozing") || lower.includes("leaking")) issues.push("Drainage");
    if (lower.includes("worse") || lower.includes("worsening")) issues.push("Getting Worse");
    
    if (issues.length > 0) return issues;
    return null;
  }
  
  if (step === 4) { // Mobility
    if (lower.includes("okay") || lower.includes("ok") || lower.includes("good") || lower.includes("normal") || lower.includes("walking") || lower.includes("fine")) {
      return "Okay";
    }
    if (lower.includes("harder") || lower.includes("hard") || lower.includes("difficult") || lower.includes("struggle") || lower.includes("stiff") || lower.includes("slowing")) {
      return "Getting harder";
    }
    if (lower.includes("restricted") || lower.includes("bed") || lower.includes("chair") || lower.includes("cannot") || lower.includes("can't") || lower.includes("unable") || lower.includes("stuck")) {
      return "Restricted";
    }
    return null;
  }
  
  if (step === 5) { // Unusual symptoms
    if (lower.includes("none") || lower.includes("no") || lower.includes("good") || lower.includes("fine") || lower.includes("nothing")) {
      return ["None"];
    }
    
    const symptoms: string[] = [];
    if (lower.includes("chest pain") || lower.includes("heart pain") || lower.includes("chest")) symptoms.push("Chest pain");
    if (lower.includes("breathing") || lower.includes("breath") || lower.includes("shortness") || lower.includes("suffocating")) symptoms.push("Difficulty breathing");
    if (lower.includes("bleeding") || lower.includes("blood")) symptoms.push("Uncontrolled bleeding");
    if (lower.includes("unconscious") || lower.includes("passed out") || lower.includes("fainted") || lower.includes("faint")) symptoms.push("Loss of consciousness");
    if (lower.includes("vomit") || lower.includes("vomiting") || lower.includes("sick")) symptoms.push("Severe vomiting");
    if (lower.includes("dizzy") || lower.includes("dizziness") || lower.includes("giddy")) symptoms.push("Severe dizziness");
    if (lower.includes("worse") || lower.includes("worsening") || lower.includes("bad")) symptoms.push("Symptoms getting much worse");
    
    if (symptoms.length > 0) return symptoms;
    return null;
  }
  
  return null;
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  apiKey, 
  onCheckInComplete,
  presetScenarioTrigger,
  clearPresetScenarioTrigger,
  onResetStatus,
  medicalHistory,
  faqDataset,
  isTtsEnabled,
  selectedVoiceName,
  voices
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'shalom',
      text: "Hello! I am Shalom, your AI Post-Operative Recovery Assistant. I am here to help you monitor your recovery, track symptoms, and communicate with your care team.\n\nLet's complete your daily recovery check-in together.",
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatMode, setChatMode] = useState<'check-in' | 'faq'>('check-in');
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);

  const speakText = (text: string) => {
    if (!isTtsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    // Stop any ongoing speech and clear active references
    window.speechSynthesis.cancel();
    activeUtterancesRef.current = [];

    // Clean text: strip markdown and emojis for cleaner speech
    const cleanText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Strip bold asterisks
      .replace(/🚨|🟡|🟢|🔴|⚠️|✨|📋|✓/g, '') // Strip emojis
      .replace(/•/g, '') // Strip bullets
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Configure natural, alert, and warm speech parameters
    utterance.rate = 1.0;  // Standard speed for comfortable pacing
    utterance.pitch = 1.08; // Slightly higher pitch for a brighter, more supportive medical assistant tone
    utterance.volume = 1.0;
    
    const voice = voices.find(v => v.name === selectedVoiceName);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-US';
    }
    
    // Reference the utterance to prevent garbage collection cutting off the voice mid-speech
    activeUtterancesRef.current.push(utterance);
    
    utterance.onend = () => {
      activeUtterancesRef.current = activeUtterancesRef.current.filter(u => u !== utterance);
    };
    utterance.onerror = () => {
      activeUtterancesRef.current = activeUtterancesRef.current.filter(u => u !== utterance);
    };

    window.speechSynthesis.speak(utterance);
  };

  const getSuggestionChips = () => {
    if (chatMode === 'check-in') {
      if (checkInStep === -1) {
        return [
          { label: "📋 Start Daily Check-in", action: "check-in" },
          { label: "❓ How does check-in work?", action: "how-checkin" }
        ];
      } else {
        return [
          { label: "❌ Reset/Stop Check-in", action: "reset-checkin" }
        ];
      }
    } else {
      return [
        { label: "🚿 Can I take a shower?", action: "shower" },
        { label: "🚗 When can I drive again?", action: "drive" },
        { label: "🎈 Is swelling normal?", action: "swelling" },
        { label: "🩹 How do I clean my incision?", action: "incision" }
      ];
    }
  };

  const suggestionChips = getSuggestionChips();

  // Guided Check-in Steps: 
  // -1 = Not started, 0 = Pain, 1 = Fever, 2 = Medications, 3 = Incision, 4 = Mobility, 5 = Unusual Symptoms, 6 = Completed
  const [checkInStep, setCheckInStep] = useState<number>(-1);
  const [answers, setAnswers] = useState<CheckInAnswers>({
    painLevel: 3,
    hasFever: false,
    temperature: 98.6,
    medsTaken: true,
    incisionIssues: ['Normal'],
    mobility: 'Okay',
    unusualSymptoms: ['None']
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle preset scenarios triggered from outside (Home screen)
  useEffect(() => {
    if (presetScenarioTrigger) {
      const answersCopy = { ...presetScenarioTrigger };
      setAnswers(answersCopy);
      
      const status = classifyRisk(answersCopy);
      const report = generateCareTeamReport(answersCopy, status);
      
      const dialogMessages: Message[] = [
        {
          id: 'welcome',
          sender: 'shalom',
          text: "Hello! I am Shalom, your AI Post-Operative Recovery Assistant. Let's complete your daily recovery check-in together.",
          timestamp: new Date()
        }
      ];

      // Pain
      dialogMessages.push({
        id: 'q0',
        sender: 'shalom',
        text: "What is your pain level today from 1 to 10?",
        timestamp: new Date()
      });
      dialogMessages.push({
        id: 'a0',
        sender: 'user',
        text: `My pain level is ${answersCopy.painLevel} out of 10.`,
        timestamp: new Date()
      });
      dialogMessages.push({
        id: 'f0',
        sender: 'shalom',
        text: getWarmFeedback(0, answersCopy.painLevel),
        timestamp: new Date()
      });

      // Fever
      dialogMessages.push({
        id: 'q1',
        sender: 'shalom',
        text: "Do you have a fever?",
        timestamp: new Date()
      });
      dialogMessages.push({
        id: 'a1',
        sender: 'user',
        text: answersCopy.hasFever 
          ? `Yes, I have a fever. My temperature is ${answersCopy.temperature || 100.4}°F.` 
          : "No, I do not have a fever.",
        timestamp: new Date()
      });
      dialogMessages.push({
        id: 'f1',
        sender: 'shalom',
        text: getWarmFeedback(1, { hasFever: answersCopy.hasFever, temp: answersCopy.temperature }),
        timestamp: new Date()
      });

      // Meds
      dialogMessages.push({
        id: 'q2',
        sender: 'shalom',
        text: "Did you take your medication today?",
        timestamp: new Date()
      });
      dialogMessages.push({
        id: 'a2',
        sender: 'user',
        text: answersCopy.medsTaken 
          ? "Yes, I took all my scheduled recovery medications today." 
          : "No, I missed some or all of my recovery medications today.",
        timestamp: new Date()
      });
      dialogMessages.push({
        id: 'f2',
        sender: 'shalom',
        text: getWarmFeedback(2, answersCopy.medsTaken),
        timestamp: new Date()
      });

      // Incision
      dialogMessages.push({
        id: 'q3',
        sender: 'shalom',
        text: "Is your incision red, swollen, draining, or getting worse?",
        timestamp: new Date()
      });
      dialogMessages.push({
        id: 'a3',
        sender: 'user',
        text: `Incision status: ${answersCopy.incisionIssues.join(', ')}`,
        timestamp: new Date()
      });
      dialogMessages.push({
        id: 'f3',
        sender: 'shalom',
        text: getWarmFeedback(3, answersCopy.incisionIssues),
        timestamp: new Date()
      });

      // Mobility
      dialogMessages.push({
        id: 'q4',
        sender: 'shalom',
        text: "How is your mobility today?",
        timestamp: new Date()
      });
      dialogMessages.push({
        id: 'a4',
        sender: 'user',
        text: `My mobility status is: ${answersCopy.mobility === 'Okay' ? 'Okay (moving around normally)' : answersCopy.mobility === 'Getting harder' ? 'Getting harder' : 'Restricted (resting in bed/chair)'}.`,
        timestamp: new Date()
      });
      dialogMessages.push({
        id: 'f4',
        sender: 'shalom',
        text: getWarmFeedback(4, answersCopy.mobility),
        timestamp: new Date()
      });

      // Unusual Symptoms
      dialogMessages.push({
        id: 'q5',
        sender: 'shalom',
        text: "Do you have any unusual symptoms?",
        timestamp: new Date()
      });
      dialogMessages.push({
        id: 'a5',
        sender: 'user',
        text: `Unusual symptoms reported: ${answersCopy.unusualSymptoms.join(', ')}.`,
        timestamp: new Date()
      });
      dialogMessages.push({
        id: 'f5',
        sender: 'shalom',
        text: getWarmFeedback(5, answersCopy.unusualSymptoms),
        timestamp: new Date()
      });

      // Final response
      let finalResponseText = "";
      const isEmergency = status === 'Emergency';
      if (isEmergency) {
        finalResponseText = "🚨 **EMERGENCY WARNING** 🚨\n\nBased on your reported symptoms (such as chest pain or difficulty breathing), please **call 911 or go to the nearest emergency department immediately**. These symptoms require immediate medical attention.";
      } else if (status === 'Red') {
        finalResponseText = "Thank you for sharing that. I'm sorry you are feeling this way. Based on what you reported, **your symptoms may need review by your healthcare team**. Please contact your healthcare provider's office directly today.";
      } else if (status === 'Yellow') {
        finalResponseText = "Thank you for sharing that. I'm sorry you are experiencing some difficulties today. Your recovery **needs monitoring**, and I have logged these symptoms for your care team. Please contact your healthcare provider if these symptoms worsen or do not improve.";
      } else {
        finalResponseText = "Thank you for sharing. Your answers indicate your recovery is **stable and progressing well**. Continue to rest, take your medications, and follow your discharge instructions.";
      }

      dialogMessages.push({
        id: 'final-response',
        sender: 'shalom',
        text: finalResponseText,
        timestamp: new Date(),
        isEmergency,
        isMedicalWarning: status === 'Red'
      });

      setMessages(dialogMessages);
      setCheckInStep(6);
      onCheckInComplete(answersCopy, status, report);
      clearPresetScenarioTrigger();
      speakText(finalResponseText);
    }
  }, [presetScenarioTrigger]);

  // Guided Check-In Questions definitions
  const checkInQuestions = [
    "What is your pain level today from 1 to 10?",
    "Do you have a fever?",
    "Did you take your medication today?",
    "Is your incision red, swollen, draining, or getting worse?",
    "How is your mobility today?",
    "Do you have any unusual symptoms?"
  ];

  const handleStartCheckIn = () => {
    setCheckInStep(0);
    onResetStatus();
    
    // Reset answers
    setAnswers({
      painLevel: 3,
      hasFever: false,
      temperature: 98.6,
      medsTaken: true,
      incisionIssues: ['Normal'],
      mobility: 'Okay',
      unusualSymptoms: ['None']
    });

    setMessages([
      {
        id: 'welcome',
        sender: 'shalom',
        text: "Hello! I am Shalom, your AI Post-Operative Recovery Assistant. Let's complete your daily recovery check-in together.",
        timestamp: new Date()
      },
      {
        id: 'start-check-in-q0',
        sender: 'shalom',
        text: "Let's begin. " + checkInQuestions[0],
        timestamp: new Date()
      }
    ]);
    speakText("Hello! I am Shalom, your AI Post-Operative Recovery Assistant. Let's complete your daily recovery check-in together. Let's begin. " + checkInQuestions[0]);
  };

  const handleResetCheckIn = () => {
    setCheckInStep(-1);
    onResetStatus();
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'shalom',
        text: "Hello! I am Shalom, your AI Post-Operative Recovery Assistant. Ready when you are. Would you like to start your daily recovery check-in?",
        timestamp: new Date(),
      }
    ]);
    speakText("Hello! I am Shalom, your AI Post-Operative Recovery Assistant. Ready when you are. Would you like to start your daily recovery check-in?");
  };

  const handleInteractiveSubmit = (userText: string, updatedAnswers: CheckInAnswers, rawAnswerValue: any) => {
    setIsTyping(true);
    
    // Add user response bubble
    const userBubble: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userBubble]);

    const currentStep = checkInStep;
    const nextStep = checkInStep + 1;
    setCheckInStep(nextStep);

    setTimeout(() => {
      // Get empathetic reaction from Shalom
      const feedbackText = getWarmFeedback(currentStep, rawAnswerValue);
      const feedbackBubble: Message = {
        id: `shalom-fb-${Date.now()}`,
        sender: 'shalom',
        text: feedbackText,
        timestamp: new Date()
      };

      if (nextStep < 6) {
        // Ask the next question
        const nextQuestionText = checkInQuestions[nextStep];
        const nextQuestionBubble: Message = {
          id: `shalom-q-${Date.now()}`,
          sender: 'shalom',
          text: nextQuestionText,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, feedbackBubble, nextQuestionBubble]);
        setIsTyping(false);
        speakText(feedbackText + " " + nextQuestionText);
      } else {
        // Complete check-in and classify risk
        const status = classifyRisk(updatedAnswers);
        const report = generateCareTeamReport(updatedAnswers, status);
        
        let finalResponseText = "";
        const isEmergency = status === 'Emergency';
        
        if (isEmergency) {
          finalResponseText = "🚨 **EMERGENCY WARNING** 🚨\n\nBased on your reported symptoms (such as chest pain or difficulty breathing), please **call 911 or go to the nearest emergency department immediately**. These symptoms require immediate medical attention.";
        } else if (status === 'Red') {
          finalResponseText = "Thank you for sharing that. I'm sorry you are feeling this way. Based on what you reported, **your symptoms may need review by your healthcare team**. Please contact your healthcare provider's office directly today.";
        } else if (status === 'Yellow') {
          finalResponseText = "Thank you for sharing that. I'm sorry you are experiencing some difficulties today. Your recovery **needs monitoring**, and I have logged these symptoms for your care team. Please contact your healthcare provider if these symptoms worsen or do not improve.";
        } else {
          finalResponseText = "Thank you for sharing. Your answers indicate your recovery is **stable and progressing well**. Continue to rest, take your medications, and follow your discharge instructions.";
        }

        const finalBubble: Message = {
          id: `shalom-final-${Date.now()}`,
          sender: 'shalom',
          text: finalResponseText,
          timestamp: new Date(),
          isEmergency,
          isMedicalWarning: status === 'Red'
        };

        setMessages(prev => [...prev, feedbackBubble, finalBubble]);
        setIsTyping(false);
        onCheckInComplete(updatedAnswers, status, report);
        speakText(feedbackText + " " + finalResponseText);
      }
    }, 1000);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const lower = textToSend.toLowerCase().trim();
    const faqMatch = searchFAQDataset(textToSend, faqDataset);
    const { isEmergency, isMedicalAdvice } = evaluateSafety(textToSend);

    // Emergency check first
    if (isEmergency) {
      const userMessage: Message = {
        id: `user-msg-${Date.now()}`,
        sender: 'user',
        text: textToSend,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setInputText('');
      setIsTyping(true);
      
      setTimeout(() => {
        const resp = "🚨 **EMERGENCY WARNING** 🚨\n\nBased on your reported symptoms (such as chest pain or difficulty breathing), please **call 911 or go to the nearest emergency department immediately**. These symptoms require immediate medical attention.";
        setMessages(prev => [...prev, {
          id: `shalom-resp-${Date.now()}`,
          sender: 'shalom',
          text: resp,
          timestamp: new Date(),
          isEmergency: true
        }]);
        setIsTyping(false);
        speakText(resp);
      }, 800);
      return;
    }

    if (checkInStep !== -1) {
      // User is in the middle of a guided Check-in flow
      if (faqMatch.matched) {
        // Asked a general FAQ question during check-in!
        const userMessage: Message = {
          id: `user-msg-${Date.now()}`,
          sender: 'user',
          text: textToSend,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsTyping(true);

        setTimeout(async () => {
          let responseText = '';
          const serializedHistory = medicalHistory ? JSON.stringify(medicalHistory, null, 2) : undefined;
          if (apiKey.trim() && !isMedicalAdvice) {
            responseText = await getGeminiResponse([...messages, userMessage], apiKey, textToSend, serializedHistory, faqDataset);
          } else {
            responseText = faqMatch.response || '';
          }

          // Append check-in continuation prompt
          const continueText = `\n\n*(Continuing your daily check-in)*: Let's resume with step ${checkInStep + 1} of 6.\n**${checkInQuestions[checkInStep]}**`;
          responseText += continueText;

          setMessages(prev => [...prev, {
            id: `shalom-resp-${Date.now()}`,
            sender: 'shalom',
            text: responseText,
            timestamp: new Date(),
            isMedicalWarning: isMedicalAdvice
          }]);
          setIsTyping(false);
          speakText(responseText);
        }, 800);
      } else {
        // Attempt to parse the check-in answer locally
        const parsedVal = parseCheckInAnswer(textToSend, checkInStep);
        if (parsedVal !== null) {
          let formattedUserText = textToSend;
          let updatedAnswers = { ...answers };

          if (checkInStep === 0) {
            formattedUserText = `My pain level is ${parsedVal} out of 10.`;
            updatedAnswers.painLevel = parsedVal;
          } else if (checkInStep === 1) {
            formattedUserText = parsedVal.hasFever
              ? `Yes, I have a fever. My temperature is ${parsedVal.temperature}°F.`
              : "No, I do not have a fever.";
            updatedAnswers.hasFever = parsedVal.hasFever;
            updatedAnswers.temperature = parsedVal.temperature;
          } else if (checkInStep === 2) {
            formattedUserText = parsedVal
              ? "Yes, I took all my scheduled recovery medications today."
              : "No, I missed some or all of my recovery medications today.";
            updatedAnswers.medsTaken = parsedVal;
          } else if (checkInStep === 3) {
            formattedUserText = `Incision status reported: ${parsedVal.join(', ')}.`;
            updatedAnswers.incisionIssues = parsedVal;
          } else if (checkInStep === 4) {
            formattedUserText = `My mobility is: ${parsedVal === 'Okay' ? 'Okay (moving around normally)' : parsedVal === 'Getting harder' ? 'Getting harder' : 'Restricted (resting in bed/chair)'}.`;
            updatedAnswers.mobility = parsedVal;
          } else if (checkInStep === 5) {
            formattedUserText = `Unusual symptoms reported: ${parsedVal.join(', ')}.`;
            updatedAnswers.unusualSymptoms = parsedVal;
          }

          setInputText('');
          setAnswers(updatedAnswers);
          handleInteractiveSubmit(formattedUserText, updatedAnswers, checkInStep === 1 ? { hasFever: parsedVal.hasFever, temp: parsedVal.temperature } : parsedVal);
        } else {
          // Could not parse the user answer as a valid response to the current check-in question
          const userMessage: Message = {
            id: `user-msg-${Date.now()}`,
            sender: 'user',
            text: textToSend,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, userMessage]);
          setInputText('');
          setIsTyping(true);

          setTimeout(() => {
            const resp = `I couldn't quite parse that as an answer to our check-in question. Please answer: **${checkInQuestions[checkInStep]}** (You can also select from the option controls below).`;
            setMessages(prev => [...prev, {
              id: `shalom-resp-${Date.now()}`,
              sender: 'shalom',
              text: resp,
              timestamp: new Date()
            }]);
            setIsTyping(false);
            speakText(resp);
          }, 800);
        }
      }
    } else {
      // User is NOT in check-in flow (FAQ or Idle mode)
      if (lower.includes('check-in') || lower.includes('start check') || lower.includes('checkin')) {
        setInputText('');
        handleStartCheckIn();
      } else {
        const userMessage: Message = {
          id: `user-msg-${Date.now()}`,
          sender: 'user',
          text: textToSend,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsTyping(true);

        setTimeout(async () => {
          let responseText = '';
          const serializedHistory = medicalHistory ? JSON.stringify(medicalHistory, null, 2) : undefined;
          
          if (apiKey.trim() && !isMedicalAdvice) {
            // Live RAG via Gemini
            responseText = await getGeminiResponse([...messages, userMessage], apiKey, textToSend, serializedHistory, faqDataset);
          } else {
            // Local simulation RAG or fallback scope check
            if (faqMatch.matched) {
              responseText = faqMatch.response || '';
            } else {
              responseText = "I am Shalom, your AI Post-Operative Recovery Assistant. I can only answer questions related to your post-operative recovery that are covered in my grounding knowledge base. For other inquiries, please contact your healthcare provider's office directly.";
            }
          }

          setMessages(prev => [...prev, {
            id: `shalom-resp-${Date.now()}`,
            sender: 'shalom',
            text: responseText,
            timestamp: new Date(),
            isMedicalWarning: isMedicalAdvice
          }]);
          setIsTyping(false);
          speakText(responseText);
        }, 800);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputText);
    }
  };

  const handleChipClick = (action: string) => {
    if (action === "check-in") {
      handleStartCheckIn();
    } else if (action === "how-checkin") {
      handleSendMessage("How does the daily post-operative recovery check-in work?");
    } else if (action === "reset-checkin") {
      handleResetCheckIn();
    } else if (action === "shower") {
      handleSendMessage("Can I shower after surgery?");
    } else if (action === "drive") {
      handleSendMessage("Can I drive after surgery?");
    } else if (action === "swelling") {
      handleSendMessage("Is swelling normal after surgery?");
    } else if (action === "incision") {
      handleSendMessage("How do I keep my incision clean?");
    }
  };

  // Renders the interactive custom controls for each step of the check-in
  const renderInteractiveControls = () => {
    if (checkInStep === -1) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Ready to log your vitals and recovery status?</p>
          <button className="btn-primary" onClick={handleStartCheckIn} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '14px', borderRadius: '30px' }}>
            <Play size={16} /> Start Daily Recovery Check-In
          </button>
        </div>
      );
    }

    if (checkInStep === 0) { // Pain (1-10)
      return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '400px' }}>
            <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 'bold' }}>1 (Mild)</span>
            <strong style={{ fontSize: '18px', color: answers.painLevel >= 8 ? 'var(--emergency)' : answers.painLevel >= 5 ? 'var(--warning)' : 'var(--success)' }}>
              Pain Level: {answers.painLevel} / 10
            </strong>
            <span style={{ fontSize: '12px', color: 'var(--emergency)', fontWeight: 'bold' }}>10 (Severe)</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={answers.painLevel}
            onChange={(e) => setAnswers({ ...answers, painLevel: parseInt(e.target.value) })}
            style={{ width: '100%', maxWidth: '400px', accentColor: 'var(--primary)', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
          />
          <button 
            className="btn-primary" 
            onClick={() => handleInteractiveSubmit(`My pain level is ${answers.painLevel} out of 10.`, answers, answers.painLevel)}
            style={{ marginTop: '8px', padding: '10px 20px', fontSize: '13px', borderRadius: '20px' }}
          >
            Submit Pain Level <ArrowRight size={14} style={{ marginLeft: '6px' }} />
          </button>
        </div>
      );
    }

    if (checkInStep === 1) { // Fever (Yes/No)
      return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <div className="questionnaire-options-row" style={{ display: 'flex', gap: '16px' }}>
            <button 
              className={`checkbox-btn ${answers.hasFever ? 'active' : ''}`}
              onClick={() => setAnswers({ ...answers, hasFever: true, temperature: 100.6 })}
              style={{ width: '140px', padding: '14px', fontSize: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: answers.hasFever ? 'var(--warning-bg)' : '#fff', color: answers.hasFever ? 'var(--warning)' : 'inherit', fontWeight: answers.hasFever ? '600' : 'normal', cursor: 'pointer' }}
            >
              Yes, I have a fever
            </button>
            <button 
              className={`checkbox-btn ${!answers.hasFever ? 'active' : ''}`}
              onClick={() => setAnswers({ ...answers, hasFever: false, temperature: 98.6 })}
              style={{ width: '140px', padding: '14px', fontSize: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: !answers.hasFever ? 'var(--success-bg)' : '#fff', color: !answers.hasFever ? 'var(--success)' : 'inherit', fontWeight: !answers.hasFever ? '600' : 'normal', cursor: 'pointer' }}
            >
              No fever
            </button>
          </div>
          
          {answers.hasFever && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Temperature (°F):</label>
              <input
                type="number"
                step="0.1"
                min="97.0"
                max="106.0"
                value={answers.temperature}
                onChange={(e) => setAnswers({ ...answers, temperature: parseFloat(e.target.value) || 100.4 })}
                style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: '14px' }}
              />
            </div>
          )}

          <button 
            className="btn-primary" 
            onClick={() => {
              const text = answers.hasFever 
                ? `Yes, I have a fever. My temperature is ${answers.temperature}°F.` 
                : "No, I do not have a fever.";
              handleInteractiveSubmit(text, answers, { hasFever: answers.hasFever, temp: answers.temperature });
            }}
            style={{ padding: '10px 20px', fontSize: '13px', borderRadius: '20px' }}
          >
            Submit Fever Status <ArrowRight size={14} style={{ marginLeft: '6px' }} />
          </button>
        </div>
      );
    }

    if (checkInStep === 2) { // Medications (Yes/No)
      return (
        <div className="questionnaire-options-row" style={{ padding: '20px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button 
            className="checkbox-btn"
            onClick={() => {
              const updated = { ...answers, medsTaken: true };
              setAnswers(updated);
              handleInteractiveSubmit("Yes, I took all my scheduled recovery medications today.", updated, true);
            }}
            style={{ width: '180px', padding: '16px', fontSize: '14px', borderRadius: '8px', border: '1px solid var(--success)', color: 'var(--success)', backgroundColor: 'var(--success-bg)', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Yes, took medications
          </button>
          <button 
            className="checkbox-btn"
            onClick={() => {
              const updated = { ...answers, medsTaken: false };
              setAnswers(updated);
              handleInteractiveSubmit("No, I missed some or all of my recovery medications today.", updated, false);
            }}
            style={{ width: '180px', padding: '16px', fontSize: '14px', borderRadius: '8px', border: '1px solid var(--warning)', color: 'var(--warning)', backgroundColor: 'var(--warning-bg)', fontWeight: 'bold', cursor: 'pointer' }}
          >
            No, missed medication
          </button>
        </div>
      );
    }

    if (checkInStep === 3) { // Incision (Multi-select)
      const options = ["Normal", "Mild Redness", "Swelling", "Drainage", "Getting Worse"];
      
      const toggleIncision = (opt: string) => {
        let updatedIssues = [...answers.incisionIssues];
        if (opt === "Normal") {
          updatedIssues = ["Normal"];
        } else {
          updatedIssues = updatedIssues.filter(item => item !== "Normal");
          if (updatedIssues.includes(opt)) {
            updatedIssues = updatedIssues.filter(item => item !== opt);
            if (updatedIssues.length === 0) {
              updatedIssues = ["Normal"];
            }
          } else {
            updatedIssues.push(opt);
          }
        }
        setAnswers({ ...answers, incisionIssues: updatedIssues });
      };

      return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '500px' }}>
            {options.map(opt => {
              const isSelected = answers.incisionIssues.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggleIncision(opt)}
                  style={{ 
                    padding: '10px 16px', 
                    fontSize: '13px', 
                    borderRadius: '20px', 
                    border: '1px solid', 
                    borderColor: isSelected ? 'var(--primary)' : 'rgba(0,0,0,0.1)',
                    background: isSelected ? 'var(--primary)' : '#fff',
                    color: isSelected ? 'white' : 'var(--text-main)',
                    fontWeight: isSelected ? '600' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <button 
            className="btn-primary" 
            onClick={() => {
              const selected = answers.incisionIssues.join(', ');
              handleInteractiveSubmit(`Incision status reported: ${selected}.`, answers, answers.incisionIssues);
            }}
            style={{ marginTop: '8px', padding: '10px 20px', fontSize: '13px', borderRadius: '20px' }}
          >
            Submit Incision Status <ArrowRight size={14} style={{ marginLeft: '6px' }} />
          </button>
        </div>
      );
    }

    if (checkInStep === 4) { // Mobility
      const options: Array<{ label: string; val: 'Okay' | 'Getting harder' | 'Restricted' }> = [
        { label: "Okay (moving around normally)", val: 'Okay' },
        { label: "Getting harder to walk or exercise", val: 'Getting harder' },
        { label: "Restricted (resting in bed/chair most of the time)", val: 'Restricted' }
      ];

      return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '400px' }}>
            {options.map(opt => {
              const isSelected = answers.mobility === opt.val;
              return (
                <button
                  key={opt.val}
                  onClick={() => setAnswers({ ...answers, mobility: opt.val })}
                  style={{ 
                    padding: '12px 16px', 
                    fontSize: '13px', 
                    borderRadius: '8px', 
                    border: '1px solid', 
                    borderColor: isSelected ? 'var(--primary)' : 'rgba(0,0,0,0.1)',
                    background: isSelected ? 'var(--glass-bg)' : '#fff',
                    color: 'var(--text-main)',
                    fontWeight: isSelected ? '600' : 'normal',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <button 
            className="btn-primary" 
            onClick={() => {
              const label = options.find(o => o.val === answers.mobility)?.label || answers.mobility;
              handleInteractiveSubmit(`My mobility is: ${label}.`, answers, answers.mobility);
            }}
            style={{ marginTop: '8px', padding: '10px 20px', fontSize: '13px', borderRadius: '20px' }}
          >
            Submit Mobility <ArrowRight size={14} style={{ marginLeft: '6px' }} />
          </button>
        </div>
      );
    }

    if (checkInStep === 5) { // Unusual Symptoms (Emergency triggers check)
      const options = ["None", "Chest pain", "Difficulty breathing", "Uncontrolled bleeding", "Loss of consciousness", "Severe vomiting", "Severe dizziness", "Symptoms getting much worse"];
      
      const toggleSymptom = (opt: string) => {
        let updated = [...answers.unusualSymptoms];
        if (opt === "None") {
          updated = ["None"];
        } else {
          updated = updated.filter(item => item !== "None");
          if (updated.includes(opt)) {
            updated = updated.filter(item => item !== opt);
            if (updated.length === 0) {
              updated = ["None"];
            }
          } else {
            updated.push(opt);
          }
        }
        setAnswers({ ...answers, unusualSymptoms: updated });
      };

      return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '500px' }}>
            {options.map(opt => {
              const isSelected = answers.unusualSymptoms.includes(opt);
              const isEmergencyOpt = ["Chest pain", "Difficulty breathing", "Uncontrolled bleeding", "Loss of consciousness"].includes(opt);
              const isRedOpt = opt === "Symptoms getting much worse";
              
              let borderCol = 'rgba(0,0,0,0.1)';
              if (isSelected) borderCol = 'var(--primary)';
              else if (isEmergencyOpt) borderCol = '#ffc5c5';
              else if (isRedOpt) borderCol = '#ffd8be';

              return (
                <button
                  key={opt}
                  onClick={() => toggleSymptom(opt)}
                  style={{ 
                    padding: '10px 16px', 
                    fontSize: '13px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: borderCol,
                    background: isSelected ? 'var(--primary)' : '#fff',
                    color: isSelected ? 'white' : (isEmergencyOpt ? 'var(--emergency)' : 'var(--text-main)'),
                    fontWeight: isSelected ? '600' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  {opt} {isEmergencyOpt && <span style={{ color: 'var(--emergency)', marginLeft: '4px', fontSize: '11px', fontWeight: 'bold' }}>Alert</span>} {isRedOpt && !isSelected && <span style={{ color: 'var(--warning)', marginLeft: '4px', fontSize: '11px', fontWeight: 'bold' }}>Warning</span>}
                </button>
              );
            })}
          </div>
          <button 
            className="btn-primary" 
            onClick={() => {
              const selected = answers.unusualSymptoms.join(', ');
              handleInteractiveSubmit(`Unusual symptoms: ${selected}.`, answers, answers.unusualSymptoms);
            }}
            style={{ marginTop: '8px', padding: '10px 20px', fontSize: '13px', borderRadius: '20px' }}
          >
            Submit & Complete Check-In <ArrowRight size={14} style={{ marginLeft: '6px' }} />
          </button>
        </div>
      );
    }

    if (checkInStep === 6) { // Completed
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
            <CheckCircle size={22} />
            <strong style={{ fontSize: '15px' }}>Daily Check-In Completed Successfully</strong>
          </div>
          <button className="btn-secondary" onClick={handleResetCheckIn} style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RotateCcw size={14} /> Start New Check-In / Reset
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="chat-card">
      <div className="chat-header">
        <div className="chat-agent-info">
          <div className="agent-avatar">S</div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--primary-dark)' }}>Shalom AI Assistant</h3>
            <span className="agent-status">
              <span className="status-dot"></span> Active Demo MVP
            </span>
          </div>
        </div>
      </div>

      {/* Mode Selector Tab Group */}
      <div className="chat-mode-tabs" style={{
        display: 'flex',
        background: 'rgba(0, 0, 0, 0.03)',
        padding: '4px',
        borderRadius: '12px',
        margin: '12px 20px 0 20px',
        border: '1px solid rgba(0,0,0,0.02)'
      }}>
        <button 
          onClick={() => setChatMode('check-in')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '600',
            border: 'none',
            borderRadius: '8px',
            background: chatMode === 'check-in' ? '#ffffff' : 'transparent',
            color: chatMode === 'check-in' ? 'var(--primary-dark)' : 'var(--text-muted)',
            boxShadow: chatMode === 'check-in' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ fontSize: '14px' }}>📋</span> Check-in Mode
        </button>
        <button 
          onClick={() => setChatMode('faq')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '600',
            border: 'none',
            borderRadius: '8px',
            background: chatMode === 'faq' ? '#ffffff' : 'transparent',
            color: chatMode === 'faq' ? 'var(--primary-dark)' : 'var(--text-muted)',
            boxShadow: chatMode === 'faq' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ fontSize: '14px' }}>💬</span> Chat / Ask Shalom
        </button>
      </div>

      {/* Main chat window */}
      <div className="chat-messages-container">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`chat-bubble-wrapper ${isUser ? 'user-wrapper' : 'shalom-wrapper'}`}>
              {!isUser && <div className="bubble-avatar" style={{ backgroundColor: 'var(--primary-dark)' }}>S</div>}
              <div className={`chat-bubble ${isUser ? 'user-bubble' : 'shalom-bubble'} ${msg.isEmergency ? 'emergency-bubble' : ''} ${msg.isMedicalWarning ? 'warning-bubble' : ''}`}>
                
                {msg.isEmergency && (
                  <div className="bubble-alert-header emergency" style={{ color: 'var(--emergency)' }}>
                    <ShieldAlert size={12} /> <span style={{ fontWeight: 'bold' }}>EMERGENCY DIRECTIVE</span>
                  </div>
                )}

                {msg.isMedicalWarning && (
                  <div className="bubble-alert-header warning" style={{ color: 'var(--warning)' }}>
                    <AlertTriangle size={12} /> <span style={{ fontWeight: 'bold' }}>CLINICAL DIRECTIVE</span>
                  </div>
                )}

                <div className="bubble-text">
                  {msg.text.split('\n').map((line, idx) => {
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      return <li key={idx} className="bubble-li">{line.substring(2)}</li>;
                    }
                    return <p key={idx} className="bubble-paragraph" style={{ margin: '4px 0' }}>{line}</p>;
                  })}
                </div>

                <div className="bubble-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: '4px' }}>
                  {!isUser && (
                    <button 
                      onClick={() => speakText(msg.text)} 
                      className="replay-speech-btn"
                      title="Listen to this message"
                      type="button"
                    >
                      <Volume2 size={11} />
                      <span>Listen</span>
                    </button>
                  )}
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="chat-bubble-wrapper shalom-wrapper">
            <div className="bubble-avatar" style={{ backgroundColor: 'var(--primary-dark)' }}>S</div>
            <div className="chat-bubble shalom-bubble typing-bubble">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Interactive Questionnaire Panel */}
      {chatMode === 'check-in' && checkInStep !== -1 && (
        <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.04)', backgroundColor: 'rgba(255, 255, 255, 0.65)' }}>
          {renderInteractiveControls()}
        </div>
      )}

      {/* Futuristic Chat Console Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(0,0,0,0.03)', background: 'transparent' }}>
        {/* Recommendation Chips */}
        {suggestionChips.length > 0 && (
          <div className="pill-chips-container">
            {suggestionChips.map((chip, idx) => (
              <button 
                key={idx} 
                className={`pill-chip ${chip.action === 'emergency' ? 'emergency' : ''}`}
                onClick={() => handleChipClick(chip.action)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Chat Input Console */}
        <div className="console-container">
          <div className="console-input-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="text"
              placeholder={
                chatMode === 'check-in' && checkInStep !== -1
                  ? "Type your response or ask a question..."
                  : chatMode === 'check-in'
                  ? "Type 'check-in' to start or ask a question..."
                  : "Ask any recovery question..."
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              className="console-textarea"
              style={{ flex: 1 }}
            />
            <button 
              className="console-send-btn" 
              onClick={() => handleSendMessage(inputText)}
              disabled={!inputText.trim()}
              title="Send message"
            >
              Send <Send size={13} style={{ marginLeft: '4px' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
