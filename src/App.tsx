import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Pill,
  CheckCircle2,
  Home,
  UploadCloud,
  Loader2,
  TrendingUp,
  Clock,
  Trash2,
  ChevronLeft,
  Calendar,
  User,
  Activity,
  ChevronRight as ChevronRightIcon,
  Plus,
  Heart,
  ShieldAlert,
  Smile,
  Frown,
  AlertCircle,
  Thermometer,
  Moon,
  Info,
  Sparkles,
  Droplets,
  Volume2,
  VolumeX,
  AlertTriangle,
  ClipboardList,
  Check,
  Leaf,
  Zap,
  Feather,
  PhoneCall,
  X,
  Trophy,
  Flame,
  Target,
  Star,
  Award,
  TrendingDown,
  Bell,
  BellOff,
  ShieldCheck,
  Lock,
  Download,
  Key
} from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { type CheckInAnswers, type CareTeamReport, normalizePatientRecord } from './utils/shalomAgent';
import { extractTextFromPdf } from './utils/pdfParser';

type TabType = 'home' | 'plan' | 'chat' | 'trends' | 'settings';

interface TodayTask {
  id: string;
  name: string;
  dose?: string;
  type: 'medication' | 'activity' | 'wound' | 'checkin' | 'hydration';
  timeSlot?: string;
  timeHour?: string;
  completed: boolean;
  instructions?: string;
  tag?: string;
  streak?: number;
  bestTime?: string;
}

interface ChartLog {
  day: number;
  date: string;
  time: string;
  painLevel: number;
  swellingLevel: number;
  temperature: number;
  mobilityLevel: number;
  sleepLevel: number;
  moodLevel: number;
  medsAdherence: number;
  status: 'Green' | 'Yellow' | 'Red' | 'Emergency';
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isDesktop, setIsDesktop] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const currentTheme = 'bio-iris';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('shalom_theme', currentTheme);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [apiKey] = useState<string>('');
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfUploadedName, setPdfUploadedName] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  
  // Speech synthesis states
  const [isTtsEnabled] = useState<boolean>(true);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsSpeed, setTtsSpeed] = useState<number>(0.82);

  // Preset check-in triggers
  const [presetScenarioTrigger, setPresetScenarioTrigger] = useState<CheckInAnswers | null>(null);
  const [activeReport, setActiveReport] = useState<CareTeamReport | null>(null);

  // Grounding datasets
  const [medicalHistory, setMedicalHistory] = useState<any | null>(null);

  // Unified State for Redesign
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [checkInComplete, setCheckInComplete] = useState<boolean>(false);
  const [lastCheckInAnswers, setLastCheckInAnswers] = useState<CheckInAnswers>({
    painLevel: 4,
    hasFever: false,
    temperature: 98.6,
    medsTaken: true,
    incisionIssues: ['Normal'],
    mobility: 'Okay',
    unusualSymptoms: ['None']
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hydrationGlasses, setHydrationGlasses] = useState<number>(5); // 5 of 8 glasses as shown in reference
  const [woundCheckDone, setWoundCheckDone] = useState<boolean>(true);
  const [woundStatus, setWoundStatus] = useState<'clear' | 'pending' | 'attention'>('clear');
  const [showIncisionCheckModal, setShowIncisionCheckModal] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const [showAppointmentSummaryModal, setShowAppointmentSummaryModal] = useState<boolean>(false);
  const [homeCardSummary, setHomeCardSummary] = useState<'all' | 'activity' | 'water' | 'wound' | 'recovery' | 'appointment' | null>(null);
  const [walkSessions, setWalkSessions] = useState<{
    id: string;
    title: string;
    timeHour: string;
    duration: string;
    completed: boolean;
    location: string;
    instructions: string;
  }[]>([
    {
      id: 'walk-1',
      title: 'Morning Circulation Walk',
      timeHour: '10:00 AM',
      duration: '5–10 min',
      completed: true,
      location: 'Hallway / Living Area',
      instructions: 'Completed after breakfast with walker. Good steady rhythm.'
    },
    {
      id: 'walk-2',
      title: 'Mid-Day Mobility Walk',
      timeHour: '02:30 PM',
      duration: '5–10 min',
      completed: false,
      location: 'Main floor / Kitchen circuit',
      instructions: 'Practice standing tall. Keep walker or cane close to you.'
    },
    {
      id: 'walk-3',
      title: 'Evening Gentle Walk',
      timeHour: '06:30 PM',
      duration: '5–10 min',
      completed: false,
      location: 'Living area stroll',
      instructions: 'Gentle walk before dinner. Follow with 15–20 min ice and leg elevation.'
    }
  ]);

  const triggerToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => {
      setToastNotification(null);
    }, 3200);
  };
  
  // Calendar and date-based task states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 7, 28)); // August 28, 2026
  const [tasksByDate, setTasksByDate] = useState<Record<string, TodayTask[]>>({});

  const getDateKey = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getCalendarDays = () => {
    const days: Date[] = [];
    const baseDate = new Date(2026, 7, 28); // August 28, 2026
    for (let i = -7; i <= 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      days.push(d);
    }
    return days;
  };
  
  // Screen sub-tab toggles
  const [progressSubTab, setProgressSubTab] = useState<'overview' | 'trends'>('overview');
  const [planCategoryFilter, setPlanCategoryFilter] = useState<'all' | 'medication' | 'activity' | 'wound' | 'checkin'>('all');
  const [showFullHistoryPage, setShowFullHistoryPage] = useState<boolean>(false);
  const [showSurgeryDetailPage, setShowSurgeryDetailPage] = useState<boolean>(false);
  const [showNotificationSettingsPage, setShowNotificationSettingsPage] = useState<boolean>(false);
  const [showPrivacySecurityPage, setShowPrivacySecurityPage] = useState<boolean>(false);
  const [privacySettings, setPrivacySettings] = useState<{ [key: string]: boolean }>({
    biometricLock: true,
    twoFactorAuth: true,
    sessionTimeout: true,
    shieldIncisionPhotos: true,
    careTeamSync: true,
    emergencyResponderAccess: true,
    anonymizedResearch: false,
  });
  const [showAuditLogModal, setShowAuditLogModal] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [individualReminders, setIndividualReminders] = useState<{ [key: string]: boolean }>({
    morningCheckin: true,
    medicationDoses: true,
    physicalTherapy: true,
    hydrationGoals: true,
    careTeamMessages: true,
    soundAlerts: true
  });
  const [taskReminders, setTaskReminders] = useState<{ [key: string]: boolean }>({});
  
  // Sliders Form State (Screen 3)
  const [showCheckInForm, setShowCheckInForm] = useState<boolean>(false);
  const [sliderPain, setSliderPain] = useState<number>(4);
  const [sliderSwelling, setSliderSwelling] = useState<number>(3);
  const [sliderTemp, setSliderTemp] = useState<number>(98.6);
  const [sliderMobility, setSliderMobility] = useState<number>(4);
  const [sliderSleep, setSliderSleep] = useState<number>(7);
  const [sliderMood, setSliderMood] = useState<number>(6);

  const [isSpeakingHero, setIsSpeakingHero] = useState<boolean>(false);

  const activeHeroUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopHeroSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    setIsSpeakingHero(false);
    activeHeroUtteranceRef.current = null;
  };

  const toggleHeroSpeech = (text: string) => {
    if (isSpeakingHero) {
      stopHeroSpeech();
    } else {
      speakHeroMessage(text);
    }
  };

  const speakHeroMessage = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    // Cancel prior speech without early returning
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // Ignore
    }

    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = ttsSpeed || 0.82; // Relaxed, natural, comforting tempo
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Dynamically query fresh live voices
    const freshVoices = window.speechSynthesis.getVoices();
    const available = freshVoices.length > 0 ? freshVoices : voices;

    let chosenVoice: SpeechSynthesisVoice | undefined;
    if (selectedVoiceName) {
      chosenVoice = available.find(v => v.name === selectedVoiceName);
    }
    if (!chosenVoice) {
      chosenVoice = available.find(v => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Daniel') || v.name.includes('Karen') || v.name.includes('Victoria')))
        || available.find(v => v.lang.startsWith('en'))
        || available[0];
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    } else {
      utterance.lang = 'en-US';
    }

    activeHeroUtteranceRef.current = utterance;

    utterance.onstart = () => setIsSpeakingHero(true);
    utterance.onend = () => {
      setIsSpeakingHero(false);
      activeHeroUtteranceRef.current = null;
    };
    utterance.onerror = (e) => {
      console.warn("Speech synthesis notice:", e);
      setIsSpeakingHero(false);
      activeHeroUtteranceRef.current = null;
    };

    // 50ms timeout ensures cancel() cleanly clears the WebKit/Blink audio queue
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("SpeechSynthesis speak failed:", err);
        setIsSpeakingHero(false);
      }
    }, 50);
  };



  // History seed logs matching screen 9 with times
  const [historyLogs, setHistoryLogs] = useState<ChartLog[]>([
    { day: 1, date: 'Wed, May 7', time: '09:30 AM', painLevel: 4, swellingLevel: 3, temperature: 98.6, mobilityLevel: 6, sleepLevel: 8, moodLevel: 7, medsAdherence: 100, status: 'Green' },
    { day: 2, date: 'Thu, May 8', time: '10:15 AM', painLevel: 5, swellingLevel: 4, temperature: 98.8, mobilityLevel: 5, sleepLevel: 7, moodLevel: 6, medsAdherence: 100, status: 'Green' },
    { day: 3, date: 'Fri, May 9', time: '08:45 AM', painLevel: 6, swellingLevel: 4, temperature: 99.0, mobilityLevel: 5, sleepLevel: 6, moodLevel: 6, medsAdherence: 80, status: 'Green' },
    { day: 4, date: 'Sat, May 10', time: '11:00 AM', painLevel: 7, swellingLevel: 6, temperature: 100.2, mobilityLevel: 3, sleepLevel: 4, moodLevel: 4, medsAdherence: 60, status: 'Yellow' },
    { day: 5, date: 'Sun, May 11', time: '02:15 PM', painLevel: 6, swellingLevel: 5, temperature: 99.4, mobilityLevel: 4, sleepLevel: 6, moodLevel: 5, medsAdherence: 100, status: 'Green' },
    { day: 6, date: 'Mon, May 12', time: '09:00 AM', painLevel: 5, swellingLevel: 3, temperature: 98.7, mobilityLevel: 5, sleepLevel: 7, moodLevel: 6, medsAdherence: 100, status: 'Green' },
    { day: 7, date: 'Tue, May 13', time: '10:30 AM', painLevel: 6, swellingLevel: 4, temperature: 98.9, mobilityLevel: 4, sleepLevel: 6, moodLevel: 6, medsAdherence: 100, status: 'Green' }
  ]);

  // Seeding scenarios
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
      medsTaken: false,
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

  // Load default datasets
  useEffect(() => {
    const loadDefaultPatient = async () => {
      try {
        const response = await fetch('/patient_record.json');
        if (response.ok) {
          const data = await response.json();
          setMedicalHistory(data);
        }
      } catch (e) {
        console.error("Failed to load default patient record", e);
      }
    };

    loadDefaultPatient();
  }, []);

  // Initialize tasks
  useEffect(() => {
    let list: TodayTask[] = [];
    if (medicalHistory) {
      const normalized = normalizePatientRecord(medicalHistory);
      if (normalized) {
        const meds: TodayTask[] = normalized.activeMedications.map((m, idx) => ({
          id: `med-${idx}-${m.name}`,
          name: m.name,
          dose: m.dose,
          type: 'medication',
          timeSlot: m.frequency || 'Upcoming',
          timeHour: idx === 0 ? '08:00 AM' : idx === 1 ? '01:00 PM' : idx === 2 ? '06:00 PM' : '09:00 PM',
          completed: false,
          instructions: m.frequency || 'Take with food and water',
          tag: idx === 0 ? 'Pain Relief' : idx === 1 ? 'Infection Shield' : idx === 2 ? 'DVT Prevention' : 'GI Comfort',
          streak: 4 + idx,
          bestTime: 'Morning'
        }));

        const activities: TodayTask[] = (normalized.dischargeInstructions?.activity || []).map((act, idx) => ({
          id: `act-${idx}`,
          name: act,
          dose: idx === 0 ? '10 reps • 3 sets' : idx === 1 ? '5–10 min walk' : '8–10 reps',
          type: 'activity',
          timeSlot: 'Physical Therapy',
          timeHour: idx === 0 ? '10:00 AM' : idx === 1 ? '03:30 PM' : '07:30 PM',
          completed: false,
          instructions: 'Maintain steady breathing and stop if sharp pain occurs.',
          tag: idx === 0 ? 'Strength PT' : idx === 1 ? 'Mobility Goal' : 'Range of Motion',
          streak: 3 + idx,
          bestTime: 'Afternoon'
        }));

        const woundTasks: TodayTask[] = [
          { id: 'wound-1', name: 'Incision Inspection & Dryness Check', dose: 'Visual Exam', type: 'wound', timeHour: '09:00 AM', completed: false, instructions: 'Ensure wound margins are clean and dry with no spreading redness.', tag: 'Wound Care', streak: 6 },
          { id: 'wound-2', name: 'Cold Compression / Ice Therapy', dose: '20 min session', type: 'wound', timeHour: '02:30 PM', completed: false, instructions: 'Wrap ice pack in clean towel. Apply to knee to soothe swelling.', tag: 'Swelling Relief', streak: 4 },
          { id: 'wound-3', name: 'Leg Elevation & Rest Session', dose: '30 min session', type: 'wound', timeHour: '05:30 PM', completed: false, instructions: 'Elevate leg with 2 pillows under calves/ankles above heart level.', tag: 'Circulation', streak: 5 }
        ];

        const checkInTask: TodayTask = {
          id: 'task-checkin',
          name: 'Morning Vitals & Pain Check-In',
          dose: 'Temp & Pain Scale',
          type: 'checkin',
          timeSlot: 'Daily Log',
          timeHour: '08:30 AM',
          completed: checkInComplete,
          instructions: 'Record oral temperature, pain score (0-10), and symptoms.',
          tag: 'Daily Triage',
          streak: historyLogs.length,
          bestTime: 'Morning'
        };

        const hydrationTask: TodayTask = {
          id: 'task-hydration',
          name: 'Hydration Target (8 Glasses)',
          dose: 'Target: 64 oz',
          type: 'hydration',
          timeSlot: 'Hydration',
          timeHour: '12:30 PM',
          completed: false,
          instructions: 'Sip water steadily throughout the day to support healing tissue.',
          tag: 'Hydration',
          streak: 5
        };

        list = [...meds, ...activities, ...woundTasks, checkInTask, hydrationTask];
      }
    } else {
      // Default fallback matching clinically structured post-op protocol
      list = [
        // Category 1: Medications
        { id: 'med-1', name: 'Oxycodone (Pain Relief)', dose: '5 mg • Take 1 tablet', type: 'medication', timeSlot: 'Oxycodone 5mg', timeHour: '08:00 AM', completed: false, instructions: 'Take with light meal & plenty of water. Do not drive.', tag: 'Pain Relief', streak: 4, bestTime: 'Morning' },
        { id: 'med-2', name: 'Cephalexin (Antibiotic)', dose: '500 mg • Take 1 capsule', type: 'medication', timeSlot: 'Cephalexin 500mg', timeHour: '01:00 PM', completed: false, instructions: 'Take every 8 hours with full glass of water.', tag: 'Infection Shield', streak: 6, bestTime: 'Afternoon' },
        { id: 'med-3', name: 'Aspirin (Blood Thinner)', dose: '81 mg • Take 1 tablet', type: 'medication', timeSlot: 'Aspirin 81mg', timeHour: '06:00 PM', completed: false, instructions: 'Take with evening meal to prevent blood clots (DVT).', tag: 'DVT Prevention', streak: 6, bestTime: 'Evening' },
        { id: 'med-4', name: 'Colace (Stool Softener)', dose: '100 mg • Take 1 capsule', type: 'medication', timeSlot: 'Colace 100mg', timeHour: '09:00 PM', completed: false, instructions: 'Take at bedtime with plenty of fluids.', tag: 'GI Comfort', streak: 4, bestTime: 'Night' },

        // Category 2: Physical Therapy & Mobility
        { id: 'pt-1', name: 'Quad Sets & Ankle Pumps', dose: '10 reps • 3 sets (hold 5s)', type: 'activity', timeSlot: 'PT Exercise', timeHour: '10:00 AM', completed: false, instructions: 'Tighten thigh muscles down flat. Flex & point toes to boost circulation.', tag: 'Strength PT', streak: 5, bestTime: 'Morning' },
        { id: 'pt-2', name: 'Assisted Walker Walk', dose: '5–10 min slow walk', type: 'activity', timeSlot: 'Mobility Goal', timeHour: '03:30 PM', completed: false, instructions: 'Keep posture upright with walker. Stop if you experience sharp knee pain.', tag: 'Mobility Goal', streak: 3, bestTime: 'Afternoon' },
        { id: 'pt-3', name: 'Heel Slides & Range of Motion', dose: '8–10 reps (gentle bend)', type: 'activity', timeSlot: 'Flexion PT', timeHour: '07:30 PM', completed: false, instructions: 'Slide heel smoothly toward hip on bed. Pause at comfortable resistance.', tag: 'Flexion PT', streak: 4, bestTime: 'Evening' },

        // Category 3: Wound & Recovery Care
        { id: 'wound-1', name: 'Morning Incision Inspection', dose: 'Visual Check', type: 'wound', timeSlot: 'Incision Check', timeHour: '09:00 AM', completed: false, instructions: 'Ensure incision is dry with clean margins. Report redness spreading >1 inch.', tag: 'Wound Care', streak: 6, bestTime: 'Morning' },
        { id: 'wound-2', name: 'Cold Compression / Ice Therapy', dose: '20 min session', type: 'wound', timeSlot: 'Cold Compress', timeHour: '02:30 PM', completed: false, instructions: 'Wrap ice pack in clean cloth. Apply to knee to soothe swelling.', tag: 'Swelling Relief', streak: 4, bestTime: 'Afternoon' },
        { id: 'wound-3', name: 'Leg Elevation & Rest Session', dose: '30 min session', type: 'wound', timeSlot: 'Elevation', timeHour: '05:30 PM', completed: false, instructions: 'Place 2 pillows under calves/ankles above heart level (not directly under knee).', tag: 'Circulation', streak: 5, bestTime: 'Evening' },

        // 🩺 Category 4: Clinical Vitals & Wellness
        { id: 'checkin-1', name: 'Morning Vitals & Pain Check-In', dose: 'Temp & Pain Scale', type: 'checkin', timeSlot: 'Daily Log', timeHour: '08:30 AM', completed: checkInComplete, instructions: 'Record your oral temperature, pain score (0-10), and symptoms.', tag: 'Daily Triage', streak: historyLogs.length, bestTime: 'Morning' },
        { id: 'checkin-2', name: 'Hydration Target (8 Glasses)', dose: 'Target: 64 oz', type: 'hydration', timeSlot: 'Hydration', timeHour: '12:30 PM', completed: false, instructions: 'Maintain steady hydration throughout the day to support tissue healing.', tag: 'Hydration', streak: 5, bestTime: 'Afternoon' }
      ];
    }
    
    // Save to tasksByDate for today
    const todayKey = '2026-08-28';
    setTasksByDate(prev => ({ ...prev, [todayKey]: list }));
    
    // If selectedDate is today, setTodayTasks immediately
    if (getDateKey(selectedDate) === todayKey) {
      setTodayTasks(list);
    }
  }, [medicalHistory, checkInComplete]);

  // Observer for selected calendar date
  useEffect(() => {
    const key = getDateKey(selectedDate);
    if (tasksByDate[key]) {
      setTodayTasks(tasksByDate[key]);
    } else {
      // Seed default baseline tasks for this date
      const base: TodayTask[] = [
        { id: 'med-1', name: 'Oxycodone (Pain Relief)', dose: '5 mg • Take 1 tablet', type: 'medication', timeSlot: 'Oxycodone 5mg', timeHour: '08:00 AM', completed: false, instructions: 'Take with light meal & plenty of water. Do not drive.', tag: 'Pain Relief', streak: 4, bestTime: 'Morning' },
        { id: 'med-2', name: 'Cephalexin (Antibiotic)', dose: '500 mg • Take 1 capsule', type: 'medication', timeSlot: 'Cephalexin 500mg', timeHour: '01:00 PM', completed: false, instructions: 'Take every 8 hours with full glass of water.', tag: 'Infection Shield', streak: 6, bestTime: 'Afternoon' },
        { id: 'med-3', name: 'Aspirin (Blood Thinner)', dose: '81 mg • Take 1 tablet', type: 'medication', timeSlot: 'Aspirin 81mg', timeHour: '06:00 PM', completed: false, instructions: 'Take with evening meal to prevent blood clots (DVT).', tag: 'DVT Prevention', streak: 6, bestTime: 'Evening' },
        { id: 'med-4', name: 'Colace (Stool Softener)', dose: '100 mg • Take 1 capsule', type: 'medication', timeSlot: 'Colace 100mg', timeHour: '09:00 PM', completed: false, instructions: 'Take at bedtime with plenty of fluids.', tag: 'GI Comfort', streak: 4, bestTime: 'Night' },
        { id: 'pt-1', name: 'Quad Sets & Ankle Pumps', dose: '10 reps • 3 sets (hold 5s)', type: 'activity', timeSlot: 'PT Exercise', timeHour: '10:00 AM', completed: false, instructions: 'Tighten thigh muscles down flat. Flex & point toes to boost circulation.', tag: 'Strength PT', streak: 5, bestTime: 'Morning' },
        { id: 'pt-2', name: 'Assisted Walker Walk', dose: '5–10 min slow walk', type: 'activity', timeSlot: 'Mobility Goal', timeHour: '03:30 PM', completed: false, instructions: 'Keep posture upright with walker. Stop if you experience sharp knee pain.', tag: 'Mobility Goal', streak: 3, bestTime: 'Afternoon' },
        { id: 'pt-3', name: 'Heel Slides & Range of Motion', dose: '8–10 reps (gentle bend)', type: 'activity', timeSlot: 'Flexion PT', timeHour: '07:30 PM', completed: false, instructions: 'Slide heel smoothly toward hip on bed. Pause at comfortable resistance.', tag: 'Flexion PT', streak: 4, bestTime: 'Evening' },
        { id: 'wound-1', name: 'Morning Incision Inspection', dose: 'Visual Check', type: 'wound', timeSlot: 'Incision Check', timeHour: '09:00 AM', completed: false, instructions: 'Ensure incision is dry with clean margins. Report redness spreading >1 inch.', tag: 'Wound Care', streak: 6, bestTime: 'Morning' },
        { id: 'wound-2', name: 'Cold Compression / Ice Therapy', dose: '20 min session', type: 'wound', timeSlot: 'Cold Compress', timeHour: '02:30 PM', completed: false, instructions: 'Wrap ice pack in clean cloth. Apply to knee to soothe swelling.', tag: 'Swelling Relief', streak: 4, bestTime: 'Afternoon' },
        { id: 'wound-3', name: 'Leg Elevation & Rest Session', dose: '30 min session', type: 'wound', timeSlot: 'Elevation', timeHour: '05:30 PM', completed: false, instructions: 'Place 2 pillows under calves/ankles above heart level (not directly under knee).', tag: 'Circulation', streak: 5, bestTime: 'Evening' },
        { id: 'checkin-1', name: 'Morning Vitals & Pain Check-In', dose: 'Temp & Pain Scale', type: 'checkin', timeSlot: 'Daily Log', timeHour: '08:30 AM', completed: false, instructions: 'Record your oral temperature, pain score (0-10), and symptoms.', tag: 'Daily Triage', streak: historyLogs.length, bestTime: 'Morning' },
        { id: 'checkin-2', name: 'Hydration Target (8 Glasses)', dose: 'Target: 64 oz', type: 'hydration', timeSlot: 'Hydration', timeHour: '12:30 PM', completed: false, instructions: 'Maintain steady hydration throughout the day to support tissue healing.', tag: 'Hydration', streak: 5, bestTime: 'Afternoon' }
      ];
      
      const today = new Date(2026, 7, 28);
      const dCopy = new Date(selectedDate);
      dCopy.setHours(0,0,0,0);
      const todayCopy = new Date(today);
      todayCopy.setHours(0,0,0,0);
      
      let seeded = base;
      if (dCopy.getTime() < todayCopy.getTime()) {
        // Seed past days as completed (mostly) to simulate historical logs
        seeded = base.map((t, idx) => ({ ...t, completed: idx % 3 !== 0 }));
      }
      
      setTasksByDate(prev => ({ ...prev, [key]: seeded }));
      setTodayTasks(seeded);
    }
  }, [selectedDate]);

  // Speech synthesizer voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        const englishVoices = availableVoices.filter(v => v.lang.startsWith('en'));
        setVoices(englishVoices.length > 0 ? englishVoices : availableVoices);
        
        if (englishVoices.length > 0) {
          const preferred = englishVoices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || englishVoices[0];
          setSelectedVoiceName(preferred.name);
        } else if (availableVoices.length > 0) {
          setSelectedVoiceName(availableVoices[0].name);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const handleCheckInComplete = (
    submittedAnswers: CheckInAnswers,
    status: 'Green' | 'Yellow' | 'Red' | 'Emergency',
    report: CareTeamReport
  ) => {
    console.log("Check-in complete report logged:", report);
    setCheckInComplete(true);
    setLastCheckInAnswers(submittedAnswers);
    setActiveReport(report);

    // Append to logs
    const nextDay = historyLogs.length + 1;
    const medChecked = todayTasks.filter(t => t.type === 'medication' && t.completed).length;
    const medTotal = todayTasks.filter(t => t.type === 'medication').length;
    const adherencePercent = medTotal > 0 ? Math.round((medChecked / medTotal) * 100) : 100;

    const newLog: ChartLog = {
      day: nextDay,
      date: new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      painLevel: submittedAnswers.painLevel,
      swellingLevel: sliderSwelling,
      temperature: submittedAnswers.temperature || 98.6,
      mobilityLevel: sliderMobility,
      sleepLevel: sliderSleep,
      moodLevel: sliderMood,
      medsAdherence: adherencePercent,
      status: status
    };
    setHistoryLogs(prev => [...prev, newLog]);
  };

  const handleTriggerPreset = (type: 'green' | 'yellow' | 'red' | 'emergency') => {
    const data = PRESET_SCENARIOS[type];
    setPresetScenarioTrigger(data);
    setActiveTab('chat');
  };
  void handleTriggerPreset;

  const triggerMockCheckInDirect = (type: 'green' | 'yellow' | 'red' | 'emergency') => {
    const answers: CheckInAnswers = PRESET_SCENARIOS[type];
    const reportTitle = type === 'green' ? 'Stable Progress' : type === 'yellow' ? 'Monitoring Alert' : type === 'red' ? 'Urgent Alert' : 'Emergency Triage';
    const reportAlert = type === 'green' ? 'Daily summary shared' : type === 'yellow' ? 'Report sent to your care team' : 'Urgent alert sent';
    
    const mockReport: CareTeamReport = {
      title: reportTitle,
      status: type === 'green' ? 'Green' : type === 'yellow' ? 'Yellow' : type === 'red' ? 'Red' : 'Emergency',
      reportAlertText: reportAlert,
      painLevel: answers.painLevel,
      keySymptoms: answers.incisionIssues.concat(answers.unusualSymptoms).filter(s => s !== 'Normal' && s !== 'None'),
      aiSummary: `Mock checkin triggered: status ${type.toUpperCase()}`,
      generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    handleCheckInComplete(answers, mockReport.status, mockReport);
  };
  void triggerMockCheckInDirect;

  const handleResetCheckIn = () => {
    setCheckInComplete(false);
  };

  const toggleTaskCompleted = (taskId: string) => {
    const key = getDateKey(selectedDate);
    setTodayTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          return { ...t, completed: !t.completed };
        }
        return t;
      });
      setTasksByDate(dict => ({ ...dict, [key]: updated }));
      return updated;
    });
  };

  // Calculate wellness percentage matching Screen 5 Recovery progress
  const calculateRecoveryProgress = () => {
    const total = todayTasks.length;
    if (total === 0) return 28; // Default fallback from Screen 1
    const completed = todayTasks.filter(t => t.completed).length;
    return Math.round((completed / total) * 100) || 28;
  };

  const handlePdfFile = useCallback(async (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfError('Please upload a valid PDF file.');
      return;
    }
    setPdfError(null);
    setPdfUploading(true);
    try {
      const text = await extractTextFromPdf(file);
      setMedicalHistory({ pdfText: text, fileName: file.name, uploadedAt: new Date().toISOString() });
      setPdfUploadedName(file.name);
      setTimeout(() => setActiveTab('home'), 900);
    } catch (err: any) {
      setPdfError(err?.message || 'Failed to parse PDF.');
    } finally {
      setPdfUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handlePdfFile(file);
  }, [handlePdfFile]);

  // Save Sliders Form check-in (Screen 3)
  const saveCheckInFormSliders = () => {
    const answers: CheckInAnswers = {
      painLevel: sliderPain,
      hasFever: sliderTemp >= 100,
      temperature: sliderTemp,
      medsTaken: true,
      incisionIssues: sliderSwelling > 5 ? ['Swelling'] : ['Normal'],
      mobility: sliderMobility > 6 ? 'Okay' : sliderMobility > 3 ? 'Getting harder' : 'Restricted',
      unusualSymptoms: ['None']
    };

    const status = answers.painLevel > 7 || answers.hasFever ? 'Red' : answers.painLevel > 4 ? 'Yellow' : 'Green';
    const report: CareTeamReport = {
      title: 'Daily Patient Summary',
      status: status,
      reportAlertText: status === 'Green' ? 'Daily summary shared' : 'Report sent to your care team',
      painLevel: answers.painLevel,
      keySymptoms: answers.incisionIssues,
      aiSummary: 'Patient logged symptoms through check-in sliders form.',
      generatedAt: new Date().toLocaleTimeString()
    };

    handleCheckInComplete(answers, status, report);
    setShowCheckInForm(false);
    setActiveTab('trends');
    setProgressSubTab('overview');
  };

  // ==========================================
  // INCISION & WOUND SAFETY CHECK MODAL
  // ==========================================
  const renderIncisionCheckModal = () => {
    if (!showIncisionCheckModal) return null;

    const handleConfirmClear = () => {
      setWoundCheckDone(true);
      setWoundStatus('clear');
      const woundTask = todayTasks.find(t => t.type === 'wound');
      if (woundTask && !woundTask.completed) {
        toggleTaskCompleted(woundTask.id);
      }
      setShowIncisionCheckModal(false);
      triggerToast("Incision check verified: All clear today. Great job keeping your wound protected!");
    };

    const handleReportConcern = () => {
      setWoundCheckDone(true);
      setWoundStatus('attention');
      setShowIncisionCheckModal(false);
      triggerToast("Concern flagged: Care team alerted. Please keep leg elevated.");
    };

    return (
      <div className="glass-modal-overlay" style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', animation: 'fadeIn 0.2s ease-out'
      }}>
        <div className="glass-card" style={{
          background: 'rgba(255, 255, 255, 0.98)',
          border: '1.5px solid var(--border-glass)',
          borderRadius: '26px',
          width: '100%',
          maxWidth: '500px',
          padding: '24px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={18} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#7C3AED', letterSpacing: '0.5px' }}>
                Incision &amp; Wound Safety Check
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowIncisionCheckModal(false)}
              style={{ border: 'none', background: 'rgba(0,0,0,0.05)', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={15} />
            </button>
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
            Daily Knee Incision Inspection
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: '1.4' }}>
            Inspect your left knee surgical dressing and skin margins. Look for normal closure and verify that no concerning symptoms are present.
          </p>

          {/* Checklist questions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-glass)' }}>
              <strong style={{ fontSize: '12px', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                1. Incision Dressing Condition
              </strong>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: '#DCFCE7', color: '#15803D', fontWeight: 700 }}>Clean &amp; Dry ✓</span>
                <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: '#F1F5F9', color: '#64748B' }}>Minor Clear Fluid</span>
                <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: '#F1F5F9', color: '#64748B' }}>Heavy Drainage</span>
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-glass)' }}>
              <strong style={{ fontSize: '12px', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                2. Redness &amp; Swelling Margins
              </strong>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: '#DCFCE7', color: '#15803D', fontWeight: 700 }}>Normal / Mild (&lt; 1 inch) ✓</span>
                <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: '#F1F5F9', color: '#64748B' }}>Spreading Redness</span>
                <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: '#F1F5F9', color: '#64748B' }}>Hot to Touch</span>
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-glass)' }}>
              <strong style={{ fontSize: '12px', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                3. Body Temperature
              </strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Thermometer size={14} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>98.6°F &bull; Normal (No fever detected)</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={handleConfirmClear}
              style={{
                background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '12px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
              }}
            >
              <CheckCircle2 size={16} /> Confirm All Clear &bull; Healing on Track
            </button>

            <button
              type="button"
              onClick={handleReportConcern}
              style={{
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#DC2626',
                borderRadius: '14px',
                padding: '10px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <AlertTriangle size={14} />
              <span>Report a Concern to Dr. Carter's Office</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // UNIFIED RECOVERY MASTER CARD (HERO AI STATUS BANNER)
  // ==========================================
  const renderUnifiedRecoveryMasterCard = () => {
    return (
      <div 
        className="recovery-master-card"
        role="region"
        aria-label="Recovery Plan Master Overview"
        onClick={() => setHomeCardSummary('all')}
        style={{ cursor: 'pointer' }}
        title="Click to view daily recovery summary"
      >
        {/* Master Header: Brand + Speech Greeting + Signature 3D Glowing Orb */}
        <div className="recovery-master-header">
          <div className="recovery-master-brand-box">
            <div className="recovery-master-brand-row">
              <div className="recovery-master-icon-badge">
                <Heart size={16} fill="#FFFFFF" color="#FFFFFF" />
              </div>
              <span className="recovery-master-title">Shalom Recover AI</span>
              <div className="recovery-master-live-badge">
                <span className="carousel-live-dot" />
                <span>Continuous AI Care &bull; Day 6</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleHeroSpeech("Good morning, Aïda. Your swelling is mild and your recovery is progressing beautifully. Let’s keep your healing on track today.");
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '16px',
                  padding: '2px 8px',
                  color: '#C4B5FD',
                  fontSize: '10.5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
                title={isSpeakingHero ? "Stop speaking" : "Listen to Shalom AI"}
              >
                {isSpeakingHero ? <VolumeX size={11} /> : <Volume2 size={11} />}
                <span>{isSpeakingHero ? "Mute" : "Listen"}</span>
              </button>
            </div>
            <div className="recovery-master-speech">
              <Sparkles size={13} style={{ color: '#C084FC', display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
              <strong>Good morning, Aïda.</strong> Your swelling is mild and your recovery is progressing beautifully. Let’s keep your healing on track today.
            </div>
          </div>

          {/* Signature Animated Luminous 3D Orb */}
          <div className="recovery-master-orb-wrap">
            <div className="recovery-master-orb-reflection" />
            <div className="recovery-master-orb-ring" />
            <div className="recovery-master-orb">
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, rgba(216, 180, 254, 0.45) 0%, rgba(99, 102, 241, 0.2) 50%, transparent 80%)',
                filter: 'blur(4px)', position: 'absolute'
              }} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // 4 RECOVERY SUB-CARDS (ORGANIZED UNDER & NEXT TO MEDS)
  // ==========================================
  const renderSubcardShalomAi = () => {
    const currentStatus = activeReport?.status || (checkInComplete ? 'Green' : 'Pending');
    return (
      <div 
        className="recovery-subcard" 
        onClick={() => setHomeCardSummary('recovery')} 
        style={{ cursor: 'pointer', transition: 'all 0.22s ease' }} 
        title="Click to view Shalom AI recovery status & vitals summary"
      >
        <div className="recovery-subcard-top">
          <div className="recovery-subcard-badge">
            <div className="recovery-subcard-icon" style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%)', color: '#FFFFFF' }}>
              <Heart size={14} fill="#FFFFFF" color="#FFFFFF" />
            </div>
            <span className="recovery-subcard-track">SHALOM AI</span>
          </div>
          <span className="recovery-subcard-pill" style={{ background: 'rgba(124, 58, 237, 0.08)', color: '#6D28D9', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
            {currentStatus === 'Green' ? 'Stable' : 'Day 6'}
          </span>
        </div>
        <div className="recovery-subcard-body">
          <h4 className="recovery-subcard-headline">Recovery On Track</h4>
          <p className="recovery-subcard-subtitle">Pain: 4/10 &bull; Mild Swelling</p>
        </div>
        <div>
          <div className="recovery-subcard-meter-bg">
            <div className="recovery-subcard-meter-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #7C3AED, #A855F7)' }} />
          </div>
          <div className="recovery-subcard-footer">
            <span>Clinical Protocol</span>
            <span>Normal &amp; Stable</span>
          </div>
        </div>
      </div>
    );
  };

  const renderSubcardActivity = () => {
    const completedWalks = walkSessions.filter(w => w.completed).length;
    const totalWalks = walkSessions.length;
    return (
      <div 
        className="recovery-subcard" 
        onClick={() => setHomeCardSummary('activity')} 
        style={{ cursor: 'pointer', transition: 'all 0.22s ease' }} 
        title="Click to view Time to Move routine & summary"
      >
        <div className="recovery-subcard-top">
          <div className="recovery-subcard-badge">
            <div className="recovery-subcard-icon" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)', color: '#FFFFFF' }}>
              <Activity size={14} color="#FFFFFF" />
            </div>
            <span className="recovery-subcard-track">ACTIVITY</span>
          </div>
          <span className="recovery-subcard-pill" style={{ background: 'rgba(124, 58, 237, 0.08)', color: '#6D28D9', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
            {completedWalks} of {totalWalks} Done
          </span>
        </div>
        <div className="recovery-subcard-body">
          <h4 className="recovery-subcard-headline">Time to Move</h4>
          <p className="recovery-subcard-subtitle">Walk 5–10 minutes three times daily &bull; 3x today</p>
        </div>
        <div>
          <div className="recovery-subcard-meter-bg">
            <div 
              className="recovery-subcard-meter-fill" 
              style={{ 
                width: `${Math.min(100, Math.round((completedWalks / totalWalks) * 100))}%`, 
                background: 'linear-gradient(90deg, #7C3AED, #C084FC)' 
              }} 
            />
          </div>
          <div className="recovery-subcard-footer">
            <span>Prescribed Routine</span>
            <span>Next: 10:00 AM</span>
          </div>
        </div>
      </div>
    );
  };

  const renderSubcardWaterLog = () => {
    return (
      <div 
        className="recovery-subcard" 
        onClick={() => setHomeCardSummary('water')} 
        style={{ cursor: 'pointer', transition: 'all 0.22s ease' }} 
        title="Click to view Water Log & Hydration summary"
      >
        <div className="recovery-subcard-top">
          <div className="recovery-subcard-badge">
            <div className="recovery-subcard-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #C084FC 100%)', color: '#FFFFFF' }}>
              <Droplets size={14} color="#FFFFFF" />
            </div>
            <span className="recovery-subcard-track">WATER LOG</span>
          </div>
          <span className="recovery-subcard-pill" style={{ background: 'rgba(124, 58, 237, 0.08)', color: '#6D28D9', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
            {hydrationGlasses} of 8 Glasses
          </span>
        </div>
        <div className="recovery-subcard-body">
          <h4 className="recovery-subcard-headline">Stay Hydrated</h4>
          <p className="recovery-subcard-subtitle">{hydrationGlasses < 8 ? `${8 - hydrationGlasses} glasses to daily goal` : 'Daily goal achieved!'}</p>
        </div>
        <div>
          <div className="recovery-subcard-meter-bg">
            <div 
              className="recovery-subcard-meter-fill" 
              style={{ 
                width: `${Math.min(100, Math.round((hydrationGlasses / 8) * 100))}%`, 
                background: 'linear-gradient(90deg, #8B5CF6, #C084FC)' 
              }} 
            />
          </div>
          <div className="recovery-subcard-footer">
            <span>Tissue Recovery</span>
            <span>Next: 2:00 PM</span>
          </div>
        </div>
      </div>
    );
  };

  const renderSubcardWoundSafety = () => {
    return (
      <div 
        className="recovery-subcard" 
        onClick={() => setHomeCardSummary('wound')} 
        style={{ cursor: 'pointer', transition: 'all 0.22s ease' }} 
        title="Click to view Wound Safety & Incision summary"
      >
        <div className="recovery-subcard-top">
          <div className="recovery-subcard-badge">
            <div className="recovery-subcard-icon" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)', color: '#FFFFFF' }}>
              <ShieldCheck size={14} color="#FFFFFF" />
            </div>
            <span className="recovery-subcard-track">WOUND SAFETY</span>
          </div>
          <span className="recovery-subcard-pill" style={{ 
            background: woundStatus === 'clear' ? 'rgba(124, 58, 237, 0.08)' : 'rgba(245, 158, 11, 0.12)', 
            color: woundStatus === 'clear' ? '#6D28D9' : '#B45309', 
            border: `1px solid ${woundStatus === 'clear' ? 'rgba(124, 58, 237, 0.2)' : 'rgba(245, 158, 11, 0.25)'}` 
          }}>
            {woundStatus === 'clear' ? 'All Clear' : 'Needs Review'}
          </span>
        </div>
        <div className="recovery-subcard-body">
          <h4 className="recovery-subcard-headline">Incision Secure</h4>
          <p className="recovery-subcard-subtitle">Dressing Clean &amp; Dry &bull; No Swelling</p>
        </div>
        <div>
          <div className="recovery-subcard-meter-bg">
            <div className="recovery-subcard-meter-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #7C3AED, #A855F7)' }} />
          </div>
          <div className="recovery-subcard-footer">
            <span>Infection Defense</span>
            <span>{woundCheckDone ? 'Checked Today ✓' : 'Next: 12:00 PM'}</span>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // HOME CARD SUMMARY PAGE (DAILY ROUTINE & SAFETY BREAKDOWN)
  // ==========================================
  const renderHomeCardSummaryPage = () => {
    const completedWalks = walkSessions.filter(w => w.completed).length;
    const totalWalks = walkSessions.length;
    const glassesRemaining = Math.max(0, 8 - hydrationGlasses);

    const toggleWalkSession = (walkId: string) => {
      setWalkSessions(prev => prev.map(w => {
        if (w.id === walkId) {
          const nextState = !w.completed;
          triggerToast(nextState ? `Marked ${w.title} completed! Great job.` : `Reset ${w.title} status.`);
          return { ...w, completed: nextState };
        }
        return w;
      }));
    };

    return (
      <div className="summary-page-scroller">
        {/* Top Navigation Bar */}
        <div className="summary-top-nav">
          <button
            type="button"
            className="summary-back-btn"
            onClick={() => setHomeCardSummary(null)}
          >
            <ChevronLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-light)', padding: '4px 10px', borderRadius: '12px' }}>
              Day 6 Post-Op
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', background: 'rgba(0,0,0,0.04)', padding: '4px 10px', borderRadius: '12px' }}>
              Right Knee TKA
            </span>
          </div>
        </div>

        {/* Page Title & Reassurance Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>
            Daily Recovery Summary
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
            A simple, clear guide to today's movement, hydration, incision care, and clinic follow-up.
          </p>
        </div>

        {/* Segmented Filter Pills */}
        <div className="summary-segmented-bar">
          <button
            type="button"
            className={`summary-tab-pill ${homeCardSummary === 'all' ? 'active' : ''}`}
            onClick={() => setHomeCardSummary('all')}
          >
            <ClipboardList size={14} />
            <span>All Summaries</span>
          </button>
          <button
            type="button"
            className={`summary-tab-pill ${homeCardSummary === 'activity' ? 'active' : ''}`}
            onClick={() => setHomeCardSummary('activity')}
          >
            <Activity size={14} />
            <span>Time to Move</span>
          </button>
          <button
            type="button"
            className={`summary-tab-pill ${homeCardSummary === 'water' ? 'active' : ''}`}
            onClick={() => setHomeCardSummary('water')}
          >
            <Droplets size={14} />
            <span>Water Log</span>
          </button>
          <button
            type="button"
            className={`summary-tab-pill ${homeCardSummary === 'wound' ? 'active' : ''}`}
            onClick={() => setHomeCardSummary('wound')}
          >
            <ShieldCheck size={14} />
            <span>Wound Safety</span>
          </button>
          <button
            type="button"
            className={`summary-tab-pill ${homeCardSummary === 'recovery' ? 'active' : ''}`}
            onClick={() => setHomeCardSummary('recovery')}
          >
            <Heart size={14} />
            <span>Vitals &amp; Status</span>
          </button>
          <button
            type="button"
            className={`summary-tab-pill ${homeCardSummary === 'appointment' ? 'active' : ''}`}
            onClick={() => setHomeCardSummary('appointment')}
          >
            <Calendar size={14} />
            <span>Next Visit</span>
          </button>
        </div>

        {/* SECTION 1: TIME TO MOVE */}
        {(homeCardSummary === 'all' || homeCardSummary === 'activity') && (
          <div className="summary-card" style={{ borderLeft: '4px solid #7C3AED' }}>
            <div className="summary-section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      Time to Move
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', background: 'rgba(124, 58, 237, 0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                      Prescribed Routine
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Walk 5–10 minutes three times daily &bull; 3x today &bull; Next: 10:00 AM
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#7C3AED' }}>
                  {completedWalks} of {totalWalks} Completed
                </span>
                <div style={{ width: '130px', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '6px', overflow: 'hidden', marginTop: '4px' }}>
                  <div style={{ width: `${Math.round((completedWalks / totalWalks) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #7C3AED, #C084FC)', borderRadius: '6px', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            </div>

            {/* 3 Walk Sessions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              {walkSessions.map((walk) => (
                <div key={walk.id} className={`summary-session-row ${walk.completed ? 'completed' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => toggleWalkSession(walk.id)}
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        border: walk.completed ? 'none' : '2px solid #CBD5E1',
                        background: walk.completed ? 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)' : '#FFFFFF',
                        color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0
                      }}
                      title={walk.completed ? "Click to mark as incomplete" : "Click to mark as completed"}
                    >
                      {walk.completed ? <Check size={16} strokeWidth={3} /> : null}
                    </button>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text-main)' }}>{walk.title}</strong>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                          {walk.timeHour}
                        </span>
                        <span style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 600 }}>
                          ({walk.duration})
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                        {walk.instructions}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleWalkSession(walk.id)}
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: walk.completed ? '1px solid rgba(124, 58, 237, 0.2)' : 'none',
                      background: walk.completed ? 'rgba(124, 58, 237, 0.08)' : 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
                      color: walk.completed ? '#7C3AED' : '#FFFFFF',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {walk.completed ? 'Completed ✓' : 'Mark Done'}
                  </button>
                </div>
              ))}
            </div>

            {/* Why 3 Daily Walks Are Crucial */}
            <div className="summary-tip-box">
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#FFFFFF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(124, 58, 237, 0.1)' }}>
                <Info size={16} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-dark)', lineHeight: '1.55' }}>
                <strong style={{ color: '#581C87', display: 'block', marginBottom: '2px' }}>Why 5–10 Minutes 3 Times Daily?</strong>
                Taking three short walks throughout the day is much safer and more effective than one long walk. Each step acts as a calf muscle pump, returning blood to your heart to prevent blood clots (DVT) and preventing your new knee joint from stiffening up.
              </div>
            </div>

            {/* Safety Checklist */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(226, 232, 240, 0.8)' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '8px' }}>
                Walking Safety Rules
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(2, 1fr)' : '1fr', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-dark)' }}>
                  <CheckCircle2 size={14} color="#7C3AED" />
                  <span>Use walker or cane for steady support</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-dark)' }}>
                  <CheckCircle2 size={14} color="#7C3AED" />
                  <span>Wear non-slip, supportive flat shoes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-dark)' }}>
                  <CheckCircle2 size={14} color="#7C3AED" />
                  <span>Stand tall and look forward, not down</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-dark)' }}>
                  <CheckCircle2 size={14} color="#7C3AED" />
                  <span>Ice knee for 15–20 min after your walk</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: WATER LOG (HYDRATION) */}
        {(homeCardSummary === 'all' || homeCardSummary === 'water') && (
          <div className="summary-card" style={{ borderLeft: '4px solid #8B5CF6' }}>
            <div className="summary-section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #8B5CF6 0%, #C084FC 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Droplets size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      WATER LOG: Stay Hydrated
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#6D28D9', background: 'rgba(124, 58, 237, 0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                      {hydrationGlasses} of 8 Glasses
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    {glassesRemaining > 0 ? `${glassesRemaining} glasses to daily goal` : 'Daily hydration goal achieved!'} &bull; Tissue Recovery &bull; Next: 2:00 PM
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (hydrationGlasses > 0) {
                      setHydrationGlasses(prev => prev - 1);
                      triggerToast("Adjusted water log (-1 glass)");
                    }
                  }}
                  style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    border: '1.5px solid rgba(124, 58, 237, 0.2)',
                    background: '#FFFFFF', color: '#7C3AED',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontWeight: 800, fontSize: '16px'
                  }}
                  title="Remove 1 glass"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHydrationGlasses(prev => {
                      const next = Math.min(12, prev + 1);
                      triggerToast(`Logged a glass of water (${next} of 8 glasses)`);
                      return next;
                    });
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
                    color: '#FFFFFF', fontWeight: 700, fontSize: '12px',
                    border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.2)'
                  }}
                >
                  <Plus size={14} strokeWidth={3} />
                  <span>Log 1 Glass</span>
                </button>
              </div>
            </div>

            {/* 8 Visual Glass Indicators */}
            <div style={{ marginTop: '14px', padding: '16px', borderRadius: '16px', background: 'rgba(248, 250, 252, 0.8)', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  Today's Hydration Progress: <strong>{Math.round((hydrationGlasses / 8) * 100)}%</strong>
                </span>
                <span style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 700 }}>
                  Target: 64 oz / 2 Liters Daily
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((glassNum) => {
                  const isFilled = glassNum <= hydrationGlasses;
                  return (
                    <div
                      key={glassNum}
                      className={`summary-glass-cup ${isFilled ? 'filled' : ''}`}
                      onClick={() => {
                        setHydrationGlasses(glassNum);
                        triggerToast(`Hydration set to ${glassNum} of 8 glasses`);
                      }}
                      title={`Glass #${glassNum}: ${isFilled ? 'Drank ✓' : 'Tap to log'}`}
                    >
                      <div className="summary-glass-water-level" style={{ height: isFilled ? '75%' : '0%' }} />
                      <span style={{
                        position: 'relative', zIndex: 2, fontSize: '10px', fontWeight: 800,
                        color: isFilled ? '#FFFFFF' : 'var(--text-muted)', marginBottom: '4px'
                      }}>
                        {isFilled ? '✓' : `#${glassNum}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Why Hydration Matters for Knee Healing */}
            <div className="summary-tip-box">
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#FFFFFF', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(124, 58, 237, 0.1)' }}>
                <Droplets size={16} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-dark)', lineHeight: '1.55' }}>
                <strong style={{ color: '#581C87', display: 'block', marginBottom: '2px' }}>Why Hydration Equals Tissue Recovery</strong>
                Water flushes post-surgery medications and anesthesia out of your body, keeps the synovial fluid around your knee implant smooth and lubricated, promotes rapid surgical incision healing, and prevents constipation caused by pain medication.
              </div>
            </div>

            {/* Hydration Timing Guide */}
            <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr', gap: '10px' }}>
              <div style={{ padding: '10px 12px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#7C3AED' }}>🌅 Morning (8 AM – 12 PM)</span>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>3 glasses with breakfast, morning pills, and first walk.</p>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#7C3AED' }}>☀️ Afternoon (12 PM – 5 PM)</span>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>3 glasses with lunch, afternoon walk, and PT exercises.</p>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#7C3AED' }}>🌙 Evening (5 PM – 8 PM)</span>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>2 glasses with dinner; taper after 8 PM for uninterrupted sleep.</p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: WOUND SAFETY (INCISION CARE) */}
        {(homeCardSummary === 'all' || homeCardSummary === 'wound') && (
          <div className="summary-card" style={{ borderLeft: '4px solid #7C3AED' }}>
            <div className="summary-section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      WOUND SAFETY: Incision Secure
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#6D28D9', background: 'rgba(124, 58, 237, 0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                      All Clear
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Dressing Clean &amp; Dry &bull; No Swelling &bull; Infection Defense Verified Today &bull; Next: 12:00 PM
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIncisionCheckModal(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '10px',
                  background: 'rgba(124, 58, 237, 0.08)',
                  color: '#7C3AED', fontWeight: 700, fontSize: '12px',
                  border: '1px solid rgba(124, 58, 237, 0.2)', cursor: 'pointer'
                }}
              >
                <span>Re-Inspect Wound</span>
                <span>&rarr;</span>
              </button>
            </div>

            {/* 5-Point Daily Inspection Checklist */}
            <div style={{ marginTop: '14px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '8px' }}>
                Daily Incision Inspection Checklist (Day 6)
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="summary-checklist-item">
                  <CheckCircle2 size={16} color="#7C3AED" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--text-dark)' }}>Dressing is Dry &amp; Secure</strong>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Bandage edges adhere smoothly; no fluid leaking through.</p>
                  </div>
                </div>

                <div className="summary-checklist-item">
                  <CheckCircle2 size={16} color="#7C3AED" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--text-dark)' }}>No Spreading Redness</strong>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Normal faint pink seam; no angry red blotches spreading outward.</p>
                  </div>
                </div>

                <div className="summary-checklist-item">
                  <CheckCircle2 size={16} color="#7C3AED" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--text-dark)' }}>Normal Healing Warmth</strong>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Knee feels gently warm from active blood circulation, not burning hot.</p>
                  </div>
                </div>

                <div className="summary-checklist-item">
                  <CheckCircle2 size={16} color="#7C3AED" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--text-dark)' }}>No Yellow or Foul Drainage</strong>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>No cloudy, yellowish-green drainage or unpleasant odor detected.</p>
                  </div>
                </div>

                <div className="summary-checklist-item">
                  <CheckCircle2 size={16} color="#7C3AED" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--text-dark)' }}>Surgical Tape (Steri-Strips) Intact</strong>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Tape strips remain undisturbed; they will loosen and fall off naturally.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Crucial Home Care Rules */}
            <div style={{ marginTop: '14px', padding: '14px', borderRadius: '14px', background: 'rgba(248, 250, 252, 0.9)', border: '1px solid rgba(226, 232, 240, 0.9)' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#581C87', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '8px' }}>
                Simple Incision Rules for Home
              </span>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-dark)', lineHeight: '1.6' }}>
                <li><strong>Keep dressing dry:</strong> Use a plastic wrap or waterproof shower sleeve during quick showers.</li>
                <li><strong>Never soak in water:</strong> No bathtubs, hot tubs, or swimming pools until Dr. Carter signs off.</li>
                <li><strong>Hands off scabs:</strong> Do not peel or scratch peeling tape or scabs.</li>
                <li><strong>Pat dry:</strong> If damp, pat gently with a clean towel; never rub vigorously.</li>
              </ul>
            </div>

            {/* Red Flag Warning Box with Direct Clinic Call */}
            <div className="summary-call-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', maxWidth: '440px' }}>
                <AlertTriangle size={20} color="#DC2626" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: '13px', color: '#991B1B' }}>When to Call Dr. Carter Immediately</strong>
                  <p style={{ fontSize: '11.5px', color: '#7F1D1D', margin: '2px 0 0 0', lineHeight: '1.45' }}>
                    Call right away if temperature exceeds 101.0°F, redness spreads rapidly, drainage soaks through the dressing, or you develop sudden calf pain.
                  </p>
                </div>
              </div>

              <a
                href="tel:5550192834"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '10px',
                  background: '#DC2626', color: '#FFFFFF',
                  fontWeight: 700, fontSize: '12px', textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)', whiteSpace: 'nowrap'
                }}
              >
                <PhoneCall size={14} />
                <span>Call Clinic: (555) 019-2834</span>
              </a>
            </div>
          </div>
        )}

        {/* SECTION 4: CLINICAL VITALS & STATUS (SHALOM AI) */}
        {(homeCardSummary === 'all' || homeCardSummary === 'recovery') && (
          <div className="summary-card" style={{ borderLeft: '4px solid #6D28D9' }}>
            <div className="summary-section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={18} fill="#FFFFFF" color="#FFFFFF" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      SHALOM AI: Recovery On Track
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#6D28D9', background: 'rgba(124, 58, 237, 0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                      Clinical Protocol: Normal &amp; Stable
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Pain: 4/10 &bull; Mild Swelling &bull; Continuous AI Monitoring Active
                  </p>
                </div>
              </div>
            </div>

            {/* Vitals Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: '10px', marginTop: '14px' }}>
              <div style={{ padding: '12px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Pain Level</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#7C3AED', marginTop: '2px' }}>4 / 10</div>
                <span style={{ fontSize: '10.5px', color: 'var(--color-green)', fontWeight: 600 }}>Controlled with Tylenol</span>
              </div>

              <div style={{ padding: '12px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Body Temp</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>98.6°F</div>
                <span style={{ fontSize: '10.5px', color: 'var(--color-green)', fontWeight: 600 }}>Normal &bull; No Fever</span>
              </div>

              <div style={{ padding: '12px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Knee Flexion</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#7C3AED', marginTop: '2px' }}>88°</div>
                <span style={{ fontSize: '10.5px', color: 'var(--color-green)', fontWeight: 600 }}>Target: 90° (On Pace)</span>
              </div>

              <div style={{ padding: '12px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Blood Pressure</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>122/78</div>
                <span style={{ fontSize: '10.5px', color: 'var(--color-green)', fontWeight: 600 }}>Optimal Range</span>
              </div>
            </div>

            {/* Shalom AI Guidance Quote */}
            <div className="summary-tip-box" style={{ marginTop: '14px' }}>
              <Sparkles size={16} color="#7C3AED" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-dark)', lineHeight: '1.55' }}>
                <strong style={{ color: '#581C87', display: 'block', marginBottom: '2px' }}>Shalom AI Recovery Note</strong>
                "Good morning, Aïda. Your swelling is mild and your recovery is progressing beautifully. Day 6 is a key transition where joint mobility increases. Stay dedicated to your 3 short walks and balance them with ice packs and rest."
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: FOLLOW-UP APPOINTMENT SUMMARY */}
        {(homeCardSummary === 'all' || homeCardSummary === 'appointment') && (
          <div className="summary-card" style={{ borderLeft: '4px solid #4F46E5' }}>
            <div className="summary-section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      Follow-Up Appointment
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#4F46E5', background: 'rgba(79, 70, 229, 0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                      In 6 Days
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Thursday, Sept 5, 2026 &bull; 10:30 AM &bull; Suite 400 &bull; Orthopedic Rehabilitation Clinic
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAppointmentSummaryModal(true)}
                style={{
                  padding: '6px 14px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  color: '#FFFFFF', fontWeight: 700, fontSize: '12px',
                  border: 'none', cursor: 'pointer'
                }}
              >
                Pre-Visit Instructions &rarr;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr', gap: '10px', marginTop: '14px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>👨‍⚕️ Surgeon</strong>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>Dr. James Carter, MD &bull; Orthopedics</p>
              </div>
              <div style={{ padding: '12px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>📍 Location</strong>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>Suite 400 &bull; Main Orthopedic Wing</p>
              </div>
              <div style={{ padding: '12px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>⏱️ Visit Goal</strong>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>Incision check, X-ray &amp; PT plan review</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // RENDER TAB 1: Today (Home Tab - Screen 1)
  // ==========================================
  const renderHomeTab = () => {
    if (homeCardSummary !== null) {
      return renderHomeCardSummaryPage();
    }

    return (
      <div className="home-tab-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
        {/* Top Greeting Row with Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '14px', border: '2px solid #ffffff',
              boxShadow: '0 4px 12px rgba(0, 31, 63, 0.1)'
            }}>
              AÏ
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Recovery Plan</span>
              <strong style={{ fontSize: '16px', color: 'var(--text-main)', fontWeight: '800' }}>Good morning, Aïda!</strong>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-light)', padding: '4px 10px', borderRadius: '12px' }}>
              Day 6 Post-Op
            </span>
          </div>
        </div>

        {/* Recovery Plan Dashboard Section Header */}
        <div className="section-header-row" style={{ gridColumn: 'span 2', marginBottom: '8px' }}>
          <span className="section-title">Recovery Plan Dashboard</span>
          <button className="section-link" onClick={() => setActiveTab('plan')}>View full schedule &rarr;</button>
        </div>

        {/* Hero AI Status Banner (Master Card) */}
        {renderUnifiedRecoveryMasterCard()}

        {/* The 4 Recovery Cards - Moved Up and Reorganized for Optimal UX */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
          gap: '14px',
          marginTop: '14px',
          marginBottom: '16px'
        }}>
          {renderSubcardShalomAi()}
          {renderSubcardActivity()}
          {renderSubcardWaterLog()}
          {renderSubcardWoundSafety()}
        </div>

        {/* Follow-Up Appointment - The Last Card */}
        <div 
          className="glass-card" 
          onClick={() => setHomeCardSummary('appointment')}
          style={{
            padding: '16px 22px',
            borderRadius: '20px',
            border: '1.5px solid var(--border-glass)',
            background: 'var(--bg-glass-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 4px 18px rgba(0, 31, 63, 0.04)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Click to view Follow-Up Appointment Summary"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Calendar size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-main)', fontWeight: 800 }}>Follow-Up Appointment</strong>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '8px' }}>
                  In 6 Days
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>Dr. James Carter, MD</strong> &bull; Sept 5, 2026 at 10:30 AM &bull; Suite 400 &bull; Orthopedic Rehabilitation Clinic
              </span>
            </div>
          </div>

          <button
            type="button"
            className="meds-action-btn"
            style={{ fontSize: '12px', padding: '10px 18px', borderRadius: '12px', whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: 700 }}
            onClick={(e) => {
              e.stopPropagation();
              setHomeCardSummary('appointment');
            }}
          >
            Pre-Visit Instructions &rarr;
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER TAB 2: Plan (Structured & Grouped Recovery Schedule)
  // ==========================================
  const renderPlanTab = () => {
    const totalTasks = todayTasks.length;
    const completedTasks = todayTasks.filter(t => t.completed).length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const medTasks = todayTasks.filter(t => t.type === 'medication');
    const medDone = medTasks.filter(t => t.completed).length;

    const ptTasks = todayTasks.filter(t => t.type === 'activity');
    const ptDone = ptTasks.filter(t => t.completed).length;

    const woundTasks = todayTasks.filter(t => t.type === 'wound');
    const woundDone = woundTasks.filter(t => t.completed).length;

    const vitalsTasks = todayTasks.filter(t => t.type === 'checkin' || t.type === 'hydration');
    const vitalsDone = vitalsTasks.filter(t => t.completed).length;

    const showMeds = planCategoryFilter === 'all' || planCategoryFilter === 'medication';
    const showPT = planCategoryFilter === 'all' || planCategoryFilter === 'activity';
    const showWound = planCategoryFilter === 'all' || planCategoryFilter === 'wound';
    const showVitals = planCategoryFilter === 'all' || planCategoryFilter === 'checkin';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease-out' }}>
        {/* Month & Year header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingLeft: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
            {selectedDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700' }}>
            Day 6 of Recovery
          </span>
        </div>
        
        {/* Horizontal Dates row */}
        <div className="date-bar-container">
          {getCalendarDays().map((d) => {
            const isSelected = getDateKey(d) === getDateKey(selectedDate);
            const dayName = d.toLocaleDateString([], { weekday: 'short' });
            const dayNum = d.getDate();
            return (
              <div 
                key={getDateKey(d)} 
                className={`date-bar-day ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedDate(d)}
              >
                <span className="date-day-name">{dayName}</span>
                <span className="date-day-num">{dayNum}</span>
              </div>
            );
          })}
        </div>

        {/* Daily Check-in Card banner */}
        <div className="plan-checkin-prompt">
          <div className="checkin-prompt-icon-wrap">
            <Heart size={20} fill="var(--primary)" />
          </div>
          <div className="checkin-prompt-info" style={{ flexGrow: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="checkin-prompt-title">Daily Clinical Check-In</span>
              {checkInComplete && (
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-green)', background: 'var(--bg-green)', padding: '2px 8px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  Recorded <Check size={11} />
                </span>
              )}
            </div>
            <span className="checkin-prompt-desc">
              {checkInComplete 
                ? 'Your daily pain, swelling, and vitals log is up to date.'
                : 'Log your pain level, temperature, and surgical incision status today.'}
            </span>
            <button className="checkin-prompt-btn" onClick={() => setShowCheckInForm(true)}>
              {checkInComplete ? 'Review Check-In' : 'Check In Now'}
            </button>
          </div>
        </div>

        {/* Daily Progress Summary Card */}
        <div className="plan-summary-banner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '13.5px', color: 'var(--text-main)', display: 'block' }}>Today's Structured Plan</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {completedTasks} of {totalTasks} recovery actions completed ({progressPercent}%)
              </span>
            </div>
            <span style={{ 
              fontSize: '14px', fontWeight: '800', color: 'var(--primary)', 
              background: 'var(--primary-light)', padding: '6px 12px', borderRadius: '14px' 
            }}>
              {progressPercent}%
            </span>
          </div>

          <div className="plan-progress-bar-bg">
            <div className="plan-progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        {/* Category Filters Bar */}
        <div className="plan-category-filters">
          <button 
            type="button"
            className={`plan-filter-chip ${planCategoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setPlanCategoryFilter('all')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Sparkles size={12} />
            <span>All Groups ({completedTasks}/{totalTasks})</span>
          </button>
          
          <button 
            type="button"
            className={`plan-filter-chip ${planCategoryFilter === 'medication' ? 'active' : ''}`}
            onClick={() => setPlanCategoryFilter('medication')}
          >
            <Pill size={12} />
            <span>Medications ({medDone}/{medTasks.length})</span>
          </button>

          <button 
            type="button"
            className={`plan-filter-chip ${planCategoryFilter === 'activity' ? 'active' : ''}`}
            onClick={() => setPlanCategoryFilter('activity')}
          >
            <Activity size={12} />
            <span>Physical Therapy ({ptDone}/{ptTasks.length})</span>
          </button>

          <button 
            type="button"
            className={`plan-filter-chip ${planCategoryFilter === 'wound' ? 'active' : ''}`}
            onClick={() => setPlanCategoryFilter('wound')}
          >
            <ShieldAlert size={12} />
            <span>Wound Care ({woundDone}/{woundTasks.length})</span>
          </button>

          <button 
            type="button"
            className={`plan-filter-chip ${planCategoryFilter === 'checkin' ? 'active' : ''}`}
            onClick={() => setPlanCategoryFilter('checkin')}
          >
            <Heart size={12} />
            <span>Vitals &amp; Care ({vitalsDone}/{vitalsTasks.length})</span>
          </button>
        </div>

        {/* Grouped Structure List */}
        <div className="plan-groups-list">

          {/* GROUP 1: MEDICATIONS */}
          {showMeds && medTasks.length > 0 && (
            <div className="plan-group-card">
              <div className="plan-group-header">
                <div className="plan-group-title-wrap">
                  <div className="plan-group-icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    <Pill size={18} />
                  </div>
                  <div>
                    <h4 className="plan-group-name">Prescribed Medications</h4>
                    <span className="plan-group-subtitle">Dosages, pain relief &amp; infection prevention</span>
                  </div>
                </div>
                <span className="plan-group-badge">
                  {medDone} of {medTasks.length} taken
                </span>
              </div>

              <div className="plan-group-tip">
                <Info size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span>Tip: Take pain medications 30–45 mins before Physical Therapy for optimal comfort during movement.</span>
              </div>

              <div className="plan-tasks-container">
                {medTasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`plan-task-item ${task.completed ? 'completed' : ''}`}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div className="plan-task-left">
                      <span className="plan-task-time">{task.timeHour}</span>
                      <div className="plan-task-body">
                        <div className="plan-task-header-row">
                          <span className="plan-task-title">{task.name}</span>
                          {task.tag && <span className="plan-task-tag">{task.tag}</span>}
                        </div>
                        {task.dose && <span className="plan-task-dose">{task.dose}</span>}
                        {task.instructions && <span className="plan-task-desc">{task.instructions}</span>}
                      </div>
                    </div>

                    <span 
                      className={`task-checkbox-indicator ${task.completed ? 'checked' : ''}`}
                      style={{ flexShrink: 0, marginLeft: '12px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskCompleted(task.id);
                      }}
                      title="Toggle medication taken"
                    >
                      {task.completed ? '✓' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GROUP 2: PHYSICAL THERAPY & MOBILITY */}
          {showPT && ptTasks.length > 0 && (
            <div className="plan-group-card">
              <div className="plan-group-header">
                <div className="plan-group-title-wrap">
                  <div className="plan-group-icon-wrap" style={{ background: 'var(--accent-light)', color: 'var(--accent-dark)' }}>
                    <Activity size={18} />
                  </div>
                  <div>
                    <h4 className="plan-group-name">Physical Therapy &amp; Mobility</h4>
                    <span className="plan-group-subtitle">Strength exercises, gait training &amp; flexion</span>
                  </div>
                </div>
                <span className="plan-group-badge" style={{ background: 'var(--accent-light)', color: 'var(--accent-dark)' }}>
                  {ptDone} of {ptTasks.length} done
                </span>
              </div>

              <div className="plan-group-tip" style={{ background: 'rgba(6, 182, 212, 0.04)' }}>
                <Info size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span>Tip: Move steadily and breathe evenly. Stop if you experience sharp catching or sudden swelling.</span>
              </div>

              <div className="plan-tasks-container">
                {ptTasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`plan-task-item ${task.completed ? 'completed' : ''}`}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div className="plan-task-left">
                      <span className="plan-task-time" style={{ background: 'var(--accent-light)', color: 'var(--accent-dark)' }}>
                        {task.timeHour}
                      </span>
                      <div className="plan-task-body">
                        <div className="plan-task-header-row">
                          <span className="plan-task-title">{task.name}</span>
                          {task.tag && <span className="plan-task-tag">{task.tag}</span>}
                        </div>
                        {task.dose && <span className="plan-task-dose">{task.dose}</span>}
                        {task.instructions && <span className="plan-task-desc">{task.instructions}</span>}
                      </div>
                    </div>

                    <span 
                      className={`task-checkbox-indicator ${task.completed ? 'checked' : ''}`}
                      style={{ flexShrink: 0, marginLeft: '12px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskCompleted(task.id);
                      }}
                      title="Toggle exercise completed"
                    >
                      {task.completed ? '✓' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GROUP 3: WOUND & INCISION CARE */}
          {showWound && woundTasks.length > 0 && (
            <div className="plan-group-card">
              <div className="plan-group-header">
                <div className="plan-group-title-wrap">
                  <div className="plan-group-icon-wrap" style={{ background: 'var(--bg-yellow)', color: 'var(--color-yellow)' }}>
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <h4 className="plan-group-name">Wound &amp; Incision Recovery</h4>
                    <span className="plan-group-subtitle">Incision hygiene, swelling control &amp; elevation</span>
                  </div>
                </div>
                <span className="plan-group-badge" style={{ background: 'var(--bg-yellow)', color: 'var(--color-yellow)' }}>
                  {woundDone} of {woundTasks.length} done
                </span>
              </div>

              <div className="plan-group-tip" style={{ background: 'rgba(217, 119, 6, 0.04)' }}>
                <Info size={14} style={{ color: 'var(--color-yellow)', flexShrink: 0 }} />
                <span>Tip: Keep incision completely dry. Elevate leg with pillows under calves, not directly behind the knee.</span>
              </div>

              <div className="plan-tasks-container">
                {woundTasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`plan-task-item ${task.completed ? 'completed' : ''}`}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div className="plan-task-left">
                      <span className="plan-task-time" style={{ background: 'var(--bg-yellow)', color: 'var(--color-yellow)' }}>
                        {task.timeHour}
                      </span>
                      <div className="plan-task-body">
                        <div className="plan-task-header-row">
                          <span className="plan-task-title">{task.name}</span>
                          {task.tag && <span className="plan-task-tag">{task.tag}</span>}
                        </div>
                        {task.dose && <span className="plan-task-dose">{task.dose}</span>}
                        {task.instructions && <span className="plan-task-desc">{task.instructions}</span>}
                      </div>
                    </div>

                    <span 
                      className={`task-checkbox-indicator ${task.completed ? 'checked' : ''}`}
                      style={{ flexShrink: 0, marginLeft: '12px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskCompleted(task.id);
                      }}
                      title="Toggle wound care task"
                    >
                      {task.completed ? '✓' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GROUP 4: CLINICAL VITALS & WELLNESS */}
          {showVitals && vitalsTasks.length > 0 && (
            <div className="plan-group-card">
              <div className="plan-group-header">
                <div className="plan-group-title-wrap">
                  <div className="plan-group-icon-wrap" style={{ background: 'var(--bg-green)', color: 'var(--color-green)' }}>
                    <Heart size={18} />
                  </div>
                  <div>
                    <h4 className="plan-group-name">Clinical Vitals &amp; Wellness</h4>
                    <span className="plan-group-subtitle">Temperature, symptom tracking &amp; hydration</span>
                  </div>
                </div>
                <span className="plan-group-badge" style={{ background: 'var(--bg-green)', color: 'var(--color-green)' }}>
                  {vitalsDone} of {vitalsTasks.length} done
                </span>
              </div>

              <div className="plan-group-tip" style={{ background: 'rgba(5, 150, 105, 0.04)' }}>
                <Info size={14} style={{ color: 'var(--color-green)', flexShrink: 0 }} />
                <span>Tip: Recording your vitals at the same time each morning helps Shalom AI detect subtle healing patterns early.</span>
              </div>

              <div className="plan-tasks-container">
                {vitalsTasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`plan-task-item ${task.completed ? 'completed' : ''}`}
                    onClick={() => {
                      if (task.type === 'checkin') {
                        setShowCheckInForm(true);
                      } else {
                        setSelectedTaskId(task.id);
                      }
                    }}
                  >
                    <div className="plan-task-left">
                      <span className="plan-task-time" style={{ background: 'var(--bg-green)', color: 'var(--color-green)' }}>
                        {task.timeHour}
                      </span>
                      <div className="plan-task-body">
                        <div className="plan-task-header-row">
                          <span className="plan-task-title">{task.name}</span>
                          {task.tag && <span className="plan-task-tag">{task.tag}</span>}
                        </div>
                        {task.dose && <span className="plan-task-dose">{task.dose}</span>}
                        {task.instructions && <span className="plan-task-desc">{task.instructions}</span>}
                      </div>
                    </div>

                    <span 
                      className={`task-checkbox-indicator ${task.completed ? 'checked' : ''}`}
                      style={{ flexShrink: 0, marginLeft: '12px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskCompleted(task.id);
                      }}
                      title="Toggle vitals/hydration completed"
                    >
                      {task.completed ? '✓' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER TAB 3: AI Coach (Sparkles - Screen 6 & 7)
  // ==========================================
  const renderChatTab = () => {
    return (
      <ChatInterface 
        apiKey={apiKey} 
        onCheckInComplete={handleCheckInComplete}
        presetScenarioTrigger={presetScenarioTrigger}
        clearPresetScenarioTrigger={() => setPresetScenarioTrigger(null)}
        onResetStatus={handleResetCheckIn}
        medicalHistory={medicalHistory}
        isTtsEnabled={isTtsEnabled}
        selectedVoiceName={selectedVoiceName}
        voices={voices}
        ttsSpeed={ttsSpeed}
        checkInComplete={checkInComplete}
        lastCheckInAnswers={lastCheckInAnswers}
        currentRecoveryStatus={activeReport?.status || (checkInComplete ? 'Green' : 'Pending')}
        onNavigateToProgress={() => setActiveTab('trends')}
      />
    );
  };

  // ==========================================
  // RENDER TAB 4: Progress (Trends - Screen 5 & 9)
  // ==========================================
  const getSeniorFriendlySummary = (log: ChartLog) => {
    if (!log) return { painText: "", painAdvice: "" };
    let painText = "";
    let painAdvice = "";
    
    if (log.painLevel >= 8) {
      painText = "Severe Pain";
      painAdvice = "Your pain is high. Please rest immediately, elevate your knee, and check if you have taken your scheduled pain medication. If pain persists or you feel warm, contact your caregiver or doctor.";
    } else if (log.painLevel >= 4) {
      painText = "Moderate Pain";
      painAdvice = "Your pain is moderate. This is a normal part of healing! Keep doing your gentle leg stretches, apply ice packs to reduce swelling, and get plenty of rest today.";
    } else {
      painText = "Mild Pain";
      painAdvice = "Wonderful! Your pain is very low and you are recovering nicely. Continue with short, light walks around the house and stay on schedule with your standard medications.";
    }
    
    return { painText, painAdvice };
  };

  const renderTrendsTab = () => {
    const progress = calculateRecoveryProgress();

    // Recovery Milestones Data
    const recoveryMilestones = [
      {
        id: 'm1',
        day: 0,
        title: 'Surgery & Safe Return Home',
        subtitle: 'Procedure successful • Rest & cold therapy',
        date: 'Aug 22, 2026',
        status: 'completed' as const,
        achievement: 'Discharge criteria met safely with elevation plan.',
        icon: <Check size={14} strokeWidth={3} />
      },
      {
        id: 'm2',
        day: 2,
        title: 'First Assisted Steps',
        subtitle: 'Weight-bearing initiated with crutches',
        date: 'Aug 24, 2026',
        status: 'completed' as const,
        achievement: 'Two 10-minute walks completed; morning swelling controlled.',
        icon: <Check size={14} strokeWidth={3} />
      },
      {
        id: 'm3',
        day: 4,
        title: 'Pain & Swelling Stabilization',
        subtitle: 'Transitioned to mild oral analgesic',
        date: 'Aug 26, 2026',
        status: 'completed' as const,
        achievement: 'Resting pain dropped to 4/10; incision clean and dry.',
        icon: <Check size={14} strokeWidth={3} />
      },
      {
        id: 'm4',
        day: 6,
        title: 'Active Rehabilitation Phase',
        subtitle: '75° Knee Flexion • Unassisted indoor walking',
        date: 'Aug 28, 2026 (Today)',
        status: 'current' as const,
        achievement: '12/12 PT sessions completed; 6-day check-in streak!',
        icon: <Star size={14} fill="#ffffff" />
      },
      {
        id: 'm5',
        day: 9,
        title: 'Incision & Suture Healing Review',
        subtitle: 'Wound closure check with Shalom AI',
        date: 'Aug 31, 2026',
        status: 'upcoming' as const,
        achievement: 'Target: Dressing-free showering & scar tissue mobilization.',
        icon: <Clock size={14} />
      },
      {
        id: 'm6',
        day: 14,
        title: 'Surgical Clinic Evaluation',
        subtitle: 'In-person follow-up with Dr. Smith',
        date: 'Sept 5, 2026',
        status: 'upcoming' as const,
        achievement: 'Target: 90° flexion & graduation to Phase 2 active recovery.',
        icon: <Trophy size={14} />
      }
    ];

    // This Week's Wins Data
    const weeklyWins = [
      {
        id: 'streak',
        icon: <Flame size={20} style={{ color: 'var(--primary)' }} />,
        title: 'Daily Check-In Streak',
        metric: '6 Days',
        tag: '100% Consistent',
        desc: 'You logged every morning on time, keeping your surgical team fully updated.',
        color: 'var(--primary)'
      },
      {
        id: 'meds',
        icon: <Pill size={20} style={{ color: 'var(--primary)' }} />,
        title: 'Medication Precision',
        metric: '96% On-Time',
        tag: 'Clinical Standard',
        desc: 'Prescribed anti-inflammatories and supplements taken on schedule with meals.',
        color: 'var(--primary)'
      },
      {
        id: 'pt',
        icon: <Activity size={20} style={{ color: 'var(--accent)' }} />,
        title: 'Mobility & PT Progress',
        metric: '+35% Range',
        tag: 'Ahead of Target',
        desc: 'All 12 prescribed quad extensions and heel slides completed this week.',
        color: 'var(--accent)'
      },
      {
        id: 'pain',
        icon: <TrendingDown size={20} style={{ color: 'var(--accent)' }} />,
        title: 'Comfort Improvement',
        metric: '-3 Points Pain',
        tag: 'Healing Faster',
        desc: 'Dropped from 7/10 on Day 1 to a calm 4/10 today, beating the clinical curve.',
        color: 'var(--accent)'
      }
    ];

    // Celebration Hero Banner Component
    const renderCelebrationHero = () => (
      <div className="celebration-hero-card">
        <div className="celebration-hero-orb celebration-hero-orb-1" />
        <div className="celebration-hero-orb celebration-hero-orb-2" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', zIndex: 5, position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.4px', lineHeight: 1.2 }}>
              You're making amazing progress, Aïda!
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', margin: 0, lineHeight: 1.55, maxWidth: '520px' }}>
              Your knee mobility, steady pain reduction, and routine consistency this week put you in the top 10% of ACL recovery adherence. Every small effort is adding up!
            </p>

            <div style={{ display: 'flex', gap: '14px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.95)' }}>
                <CheckCircle2 size={14} style={{ color: '#00FFC2' }} /> 18/22 Tasks Done
              </span>
              <span style={{ fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.95)' }}>
                <Target size={14} style={{ color: '#70D6FF' }} /> Next: 90° Flexion
              </span>
            </div>
          </div>

          <div className="celebration-ring-wrapper">
            <svg className="celebration-ring-svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="40" 
                fill="none" 
                stroke="url(#celebrationRingGrad)" 
                strokeWidth="8" 
                strokeLinecap="round"
                strokeDasharray="251.32"
                strokeDashoffset={251.32 - (251.32 * progress) / 100}
                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
              />
              <defs>
                <linearGradient id="celebrationRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00FFC2" />
                  <stop offset="50%" stopColor="#00BFFF" />
                  <stop offset="100%" stopColor="#FFD166" />
                </linearGradient>
              </defs>
            </svg>
            <div className="celebration-ring-text">
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{progress}%</span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', marginTop: '2px' }}>Healed</span>
            </div>
          </div>
        </div>
      </div>
    );

    // This Week's Wins Section Component
    const renderWeeklyWins = () => (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Recognizing Your Dedication
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                This Week's Wins
              </h3>
              <Award size={18} style={{ color: 'var(--primary)' }} />
            </div>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>4 of 4 Milestones Hit</span>
        </div>

        <div className="wins-grid">
          {weeklyWins.map(win => (
            <div key={win.id} className="win-card">
              <div className="win-card-header">
                <div className="win-card-icon-wrap" style={{ background: `${win.color}15`, color: win.color }}>
                  {win.icon}
                </div>
                <span className="win-card-tag" style={{ background: `${win.color}15`, color: win.color }}>
                  {win.tag}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span className="win-card-metric" style={{ color: win.color }}>{win.metric}</span>
                <span className="win-card-title">{win.title}</span>
              </div>
              <p className="win-card-desc">{win.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );

    // Visual Recovery Journey with Milestones Component
    const renderRecoveryJourney = () => (
      <div className="glass-card" style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-glass)', padding: '22px', borderRadius: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Your Road to Full Recovery
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Recovery Milestones
              </h3>
              <Target size={18} style={{ color: 'var(--primary)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,140,140,0.08)', padding: '4px 10px', borderRadius: '12px' }}>
            <Star size={13} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>3/6 Completed</span>
          </div>
        </div>

        <div className="milestone-timeline">
          {recoveryMilestones.map((m, idx) => {
            const isCompleted = m.status === 'completed';
            const isCurrent = m.status === 'current';
            const isUpcoming = m.status === 'upcoming';

            return (
              <div 
                key={m.id} 
                className={`milestone-card ${isCurrent ? 'active-step' : isCompleted ? 'completed-step' : ''}`}
              >
                <div className="milestone-node-col">
                  <div className={`milestone-node-circle ${m.status}`}>
                    {m.icon}
                  </div>
                  {idx < recoveryMilestones.length - 1 && (
                    <div style={{ 
                      width: '2px', 
                      flexGrow: 1, 
                      minHeight: '28px',
                      background: isCompleted ? 'var(--primary)' : isCurrent ? 'linear-gradient(to bottom, #7C3AED, rgba(124, 58, 237, 0.1))' : 'rgba(0,0,0,0.08)',
                      margin: '6px 0',
                      borderRadius: '1px'
                    }} />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: isCurrent ? 'var(--primary)' : 'var(--text-main)' }}>
                      {m.title}
                    </span>
                    <span style={{ 
                      fontSize: '10.5px', 
                      fontWeight: 700, 
                      padding: '2px 8px', 
                      borderRadius: '8px',
                      background: isCompleted ? 'rgba(33, 140, 116, 0.1)' : isCurrent ? 'var(--primary)' : 'rgba(0,0,0,0.04)',
                      color: isCompleted ? '#218C74' : isCurrent ? '#ffffff' : 'var(--text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {isCompleted ? (
                        <>
                          <Check size={11} strokeWidth={3} /> Achieved
                        </>
                      ) : isCurrent ? (
                        <>
                          <Star size={11} fill="#ffffff" /> You Are Here
                        </>
                      ) : (
                        <span>Upcoming Target</span>
                      )}
                    </span>
                  </div>

                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {m.subtitle} &bull; <strong style={{ color: 'var(--text-main)' }}>{m.date}</strong>
                  </span>

                  <div style={{ 
                    marginTop: '4px', 
                    padding: '8px 12px', 
                    borderRadius: '12px', 
                    background: isCurrent ? 'rgba(124, 58, 237, 0.08)' : 'rgba(255, 255, 255, 0.5)',
                    border: `1px solid ${isCurrent ? 'rgba(124, 58, 237, 0.18)' : 'rgba(0,0,0,0.04)'}`,
                    fontSize: '11px',
                    color: isCurrent ? 'var(--primary-dark)' : 'var(--text-muted)',
                    lineHeight: 1.45
                  }}>
                    <strong>{isUpcoming ? 'Goal: ' : 'Highlight: '}</strong>{m.achievement}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );

    // ==========================================
    // DESKTOP LAYOUT (>= 1024px)
    // ==========================================
    if (isDesktop) {
      return (
        <div className="progress-desktop-layout" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: '32px', animation: 'fadeIn 0.3s ease-out' }}>
          {/* Left Column: Hero Celebration & Weekly Wins */}
          <div className="progress-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {renderCelebrationHero()}
            {renderWeeklyWins()}
          </div>

          {/* Right Column: Milestones Roadmap */}
          <div className="progress-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {renderRecoveryJourney()}
          </div>
        </div>
      );
    }

    // ==========================================
    // MOBILE / TABLET LAYOUT (< 1024px)
    // ==========================================
    return (
      <div className="progress-scroller" style={{ animation: 'fadeIn 0.3s ease-out' }}>
        {/* Mobile View Switcher */}
        <div className="tabs-header-row" style={{ marginBottom: '18px' }}>
          <button 
            className={`tab-header-btn ${progressSubTab === 'overview' ? 'active' : ''}`}
            onClick={() => setProgressSubTab('overview')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Sparkles size={13} /> Celebration
          </button>
          <button 
            className={`tab-header-btn ${progressSubTab === 'trends' ? 'active' : ''}`}
            onClick={() => setProgressSubTab('trends')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Target size={13} /> Milestones
          </button>
        </div>

        {progressSubTab === 'overview' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {renderCelebrationHero()}
            {renderWeeklyWins()}
            {renderRecoveryJourney()}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {renderRecoveryJourney()}
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // FULL DAILY CHECK-IN HISTORY PAGE
  // ==========================================
  const renderFullHistoryPage = () => {
    return (
      <div className="detail-scroller" style={{ animation: 'fadeIn 0.28s ease-out' }}>
        {/* Top Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <button 
            type="button"
            className="choice-pill-btn" 
            onClick={() => setShowFullHistoryPage(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: 700, fontSize: '12px' }}
          >
            <ChevronLeft size={16} /> Back to Profile
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px',
              background: 'var(--primary-light)', color: 'var(--primary)'
            }}>
              Patient Record &bull; Aïda Garba
            </span>
          </div>
        </div>

        {/* Page Title & Clinical Subtitle */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'var(--primary-light)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <ClipboardList size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>
                Daily Check-In History
              </h2>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Comprehensive medical records of daily symptoms, pain metrics &amp; surgical team status
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Summary Bar (Key Metrics) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', 
          gap: '12px', 
          marginBottom: '24px' 
        }}>
          <div className="glass-card" style={{ padding: '14px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Calendar size={13} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Check-Ins</span>
            </div>
            <strong style={{ fontSize: '18px', color: 'var(--text-main)' }}>{historyLogs.length} Days</strong>
            <span style={{ fontSize: '9.5px', color: 'var(--primary)', fontWeight: 700, display: 'block', marginTop: '2px' }}>
              100% Adherence Streak
            </span>
          </div>

          <div className="glass-card" style={{ padding: '14px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <TrendingDown size={13} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Latest Pain Score</span>
            </div>
            <strong style={{ fontSize: '18px', color: 'var(--primary)' }}>
              {historyLogs[historyLogs.length - 1]?.painLevel || 4}/10
            </strong>
            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginTop: '2px' }}>
              Down from 7/10 on Day 1
            </span>
          </div>

          <div className="glass-card" style={{ padding: '14px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Thermometer size={13} style={{ color: '#D97706' }} />
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Temperature Trend</span>
            </div>
            <strong style={{ fontSize: '18px', color: 'var(--text-main)' }}>
              {historyLogs[historyLogs.length - 1]?.temperature || 98.6}°F
            </strong>
            <span style={{ fontSize: '9.5px', color: 'var(--primary)', fontWeight: 700, display: 'block', marginTop: '2px' }}>
              Optimal / Afebrile
            </span>
          </div>

          <div className="glass-card" style={{ padding: '14px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Activity size={13} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Mobility Flexion</span>
            </div>
            <strong style={{ fontSize: '18px', color: 'var(--primary)' }}>75° Target</strong>
            <span style={{ fontSize: '9.5px', color: 'var(--primary)', fontWeight: 700, display: 'block', marginTop: '2px' }}>
              Next Goal: 90° Flexion
            </span>
          </div>
        </div>

        {/* Full Chronological Logs Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
          {historyLogs.slice().reverse().map((log, idx) => {
            const originalIdx = historyLogs.length - 1 - idx;
            const summary = getSeniorFriendlySummary(log);
            const isLatest = idx === 0;

            return (
              <div 
                key={idx}
                className="glass-card" 
                style={{
                  background: 'var(--bg-glass-card)',
                  border: isLatest ? '1.5px solid rgba(124, 58, 237, 0.35)' : '1px solid var(--border-glass)',
                  padding: '18px 20px',
                  borderRadius: '20px',
                  boxShadow: isLatest ? '0 8px 24px rgba(124, 58, 237, 0.1)' : '0 4px 12px rgba(15, 23, 42, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Header Row: Date, Day Chip & Clinical Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: log.status === 'Green' ? 'rgba(5, 150, 105, 0.12)' : log.status === 'Yellow' ? 'rgba(217, 119, 6, 0.12)' : 'rgba(225, 29, 72, 0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Smile size={18} style={{ 
                        color: log.status === 'Green' ? 'var(--color-green)' : log.status === 'Yellow' ? 'var(--color-yellow)' : 'var(--color-red)'
                      }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                          Day {originalIdx + 1} Post-Op
                        </span>
                        {isLatest && (
                          <span style={{
                            fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '6px',
                            background: 'var(--primary)', color: '#ffffff', textTransform: 'uppercase'
                          }}>
                            Latest
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {log.date} &bull; {log.time}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '11.5px', fontWeight: 800, padding: '4px 10px', borderRadius: '10px',
                      background: log.status === 'Green' ? 'rgba(5, 150, 105, 0.1)' : log.status === 'Yellow' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(225, 29, 72, 0.1)',
                      color: log.status === 'Green' ? '#059669' : log.status === 'Yellow' ? '#D97706' : '#E11D48'
                    }}>
                      Pain {log.painLevel}/10 &bull; {log.status === 'Green' ? 'Stable' : log.status === 'Yellow' ? 'Warning' : 'Urgent'}
                    </span>
                  </div>
                </div>

                {/* Vitals Snapshot Track */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.6)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-glass)'
                }}>
                  <div>
                    <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', display: 'block' }}>Pain Level</span>
                    <strong style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>{log.painLevel}/10</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', display: 'block' }}>Temperature</span>
                    <strong style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>{log.temperature || 98.6}°F</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', display: 'block' }}>Swelling</span>
                    <strong style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>Level {log.swellingLevel || 3}/10</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', display: 'block' }}>Adherence</span>
                    <strong style={{ fontSize: '12.5px', color: 'var(--primary)' }}>{log.medsAdherence || 100}%</strong>
                  </div>
                </div>

                {/* Shalom AI Clinical Note */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.04) 0%, rgba(255, 255, 255, 0.8) 100%)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={13} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-dark)', letterSpacing: '0.4px' }}>
                      Shalom AI Clinical Guidance &bull; {summary.painText}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-main)', margin: 0 }}>
                    {summary.painAdvice}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-glass)', flexWrap: 'wrap', gap: '10px' }}>
          <button 
            type="button"
            className="choice-pill-btn" 
            onClick={() => setShowFullHistoryPage(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', fontWeight: 700 }}
          >
            <ChevronLeft size={16} /> Back to Profile
          </button>

          <button 
            type="button"
            className="choice-pill-btn"
            onClick={() => {
              setShowFullHistoryPage(false);
              setActiveTab('chat');
            }}
            style={{ padding: '8px 18px', background: 'var(--primary)', color: '#ffffff', fontWeight: 700 }}
          >
            Ask Shalom AI About My History
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // STRUCTURED SURGERY DETAILS PAGE
  // ==========================================
  const renderSurgeryDetailPage = () => {
    const normalized = normalizePatientRecord(medicalHistory);
    const surgeryTitle = normalized?.surgeryType || 'Total Knee Replacement';
    const surgeonName = 'Dr. James Carter, MD, FAAOS';
    const clinicPhone = '(555) 234-8901';
    const surgeryDate = 'May 6, 2025';

    return (
      <div className="detail-scroller" style={{ animation: 'fadeIn 0.28s ease-out' }}>
        {/* Top Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <button 
            type="button"
            className="choice-pill-btn" 
            onClick={() => setShowSurgeryDetailPage(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: 700, fontSize: '12px' }}
          >
            <ChevronLeft size={16} /> Back to Profile
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px',
              background: 'var(--primary-light)', color: 'var(--primary)'
            }}>
              Surgical Case: #ORT-2025-0506 &bull; Aïda Garba
            </span>
          </div>
        </div>

        {/* Page Title & Clinical Subtitle */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'var(--primary-light)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Activity size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>
                Surgery &amp; Provider Details
              </h2>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Organized documentation of your surgical procedure, lead care team &amp; clinical contact numbers
              </span>
            </div>
          </div>
        </div>

        {/* Hero Clinical Snapshot Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', 
          gap: '12px', 
          marginBottom: '24px' 
        }}>
          <div className="glass-card" style={{ padding: '14px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Activity size={13} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Surgery Type</span>
            </div>
            <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>{surgeryTitle}</strong>
            <span style={{ fontSize: '9.5px', color: 'var(--primary)', fontWeight: 700, display: 'block', marginTop: '2px' }}>
              Left Knee &bull; Primary Joint
            </span>
          </div>

          <div className="glass-card" style={{ padding: '14px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <User size={13} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Lead Surgeon</span>
            </div>
            <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>Dr. James Carter</strong>
            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginTop: '2px' }}>
              MD, FAAOS &bull; Orthopedic Lead
            </span>
          </div>

          <div className="glass-card" style={{ padding: '14px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Calendar size={13} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Surgery Date</span>
            </div>
            <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>{surgeryDate}</strong>
            <span style={{ fontSize: '9.5px', color: 'var(--primary)', fontWeight: 700, display: 'block', marginTop: '2px' }}>
              Day 6 Post-Operative
            </span>
          </div>

          <div className="glass-card" style={{ padding: '14px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <PhoneCall size={13} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Clinic Direct Line</span>
            </div>
            <strong style={{ fontSize: '14px', color: 'var(--primary)', display: 'block' }}>{clinicPhone}</strong>
            <span style={{ fontSize: '9.5px', color: 'var(--primary)', fontWeight: 700, display: 'block', marginTop: '2px' }}>
              Mon-Fri 8:00 AM - 4:30 PM
            </span>
          </div>
        </div>

        {/* Section 1: Lead Surgeon & Contact Card */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--border-glass)', marginBottom: '16px', background: 'var(--bg-glass-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(168, 85, 247, 0.22) 100%)',
                color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px'
              }}>
                JC
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {surgeonName}
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Chief of Adult Joint Reconstruction &bull; St. Jude Orthopedic Specialty Center
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <a 
                href={`tel:${clinicPhone.replace(/[^0-9]/g, '')}`}
                className="choice-pill-btn"
                style={{ background: 'var(--primary)', color: '#ffffff', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 14px' }}
              >
                <PhoneCall size={14} /> Call Office
              </a>
              <button 
                type="button"
                className="choice-pill-btn"
                onClick={() => {
                  setShowSurgeryDetailPage(false);
                  setActiveTab('chat');
                }}
                style={{ fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
              >
                <Sparkles size={14} style={{ color: 'var(--primary)' }} /> Message AI
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clinic Phone</span>
              <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>{clinicPhone}</strong>
            </div>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hospital Extension</span>
              <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Ext. 4410 (Orthopedic OR Suite)</strong>
            </div>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clinic Location</span>
              <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Suite 400, Pavilion B, St. Jude Hospital</strong>
            </div>
          </div>
        </div>

        {/* Section 2: Detailed Surgical Procedure Records */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--border-glass)', marginBottom: '16px', background: 'var(--bg-glass-card)' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
            Operative Procedure Specifications
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(2, 1fr)' : '1fr', gap: '14px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '14px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Procedure Name</span>
              <strong style={{ fontSize: '13.5px', color: 'var(--text-main)', display: 'block', marginTop: '2px' }}>
                Primary Total Knee Arthroplasty (Left Leg)
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Performed under regional block with complete joint surface resurfacing
              </span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '14px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date &amp; Facility</span>
              <strong style={{ fontSize: '13.5px', color: 'var(--text-main)', display: 'block', marginTop: '2px' }}>
                Tuesday, May 6, 2025 &bull; OR Suite 4
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                St. Jude Orthopedic Specialty Hospital &bull; Inpatient recovery 2 days
              </span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '14px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Anesthesia Protocol</span>
              <strong style={{ fontSize: '13.5px', color: 'var(--text-main)', display: 'block', marginTop: '2px' }}>
                Spinal + Continuous Adductor Canal Nerve Block
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Motor-sparing analgesia for expedited day-of-surgery mobilization
              </span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '14px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Incision &amp; Wound Dressing</span>
              <strong style={{ fontSize: '13.5px', color: 'var(--text-main)', display: 'block', marginTop: '2px' }}>
                6-Inch Anterior Midline Incision
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Dermabond Prineo waterproof skin closure system (keep dry until Day 14)
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Multidisciplinary Care Team Directory */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--border-glass)', marginBottom: '16px', background: 'var(--bg-glass-card)' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
            Care Team Direct Contacts
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr', gap: '10px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '12px 14px' }}>
              <strong style={{ fontSize: '12.5px', color: 'var(--text-main)', display: 'block' }}>Emily Zhang, PA-C</strong>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>Surgical Physician Assistant</span>
              <a href="tel:5552348915" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700, marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                <PhoneCall size={12} /> (555) 234-8915
              </a>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '12px 14px' }}>
              <strong style={{ fontSize: '12.5px', color: 'var(--text-main)', display: 'block' }}>Marcus Vance, PT, DPT</strong>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>Lead Physical Therapist</span>
              <a href="tel:5558821920" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700, marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                <PhoneCall size={12} /> (555) 882-1920
              </a>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '12px 14px' }}>
              <strong style={{ fontSize: '12.5px', color: 'var(--text-main)', display: 'block' }}>Sarah Jenkins, RN</strong>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>Post-Op Care Coordinator</span>
              <a href="tel:5552348920" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700, marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                <PhoneCall size={12} /> (555) 234-8920
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-glass)', flexWrap: 'wrap', gap: '10px' }}>
          <button 
            type="button"
            className="choice-pill-btn" 
            onClick={() => setShowSurgeryDetailPage(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', fontWeight: 700 }}
          >
            <ChevronLeft size={16} /> Back to Profile
          </button>

          <button 
            type="button"
            className="choice-pill-btn"
            onClick={() => {
              setShowSurgeryDetailPage(false);
              setActiveTab('chat');
            }}
            style={{ padding: '8px 18px', background: 'var(--primary)', color: '#ffffff', fontWeight: 700 }}
          >
            Ask Shalom AI About My Surgery
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // REMINDERS & NOTIFICATIONS SETTINGS PAGE
  // ==========================================
  const renderNotificationSettingsPage = () => {
    const toggleGranular = (key: string) => {
      setIndividualReminders(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    };

    return (
      <div className="detail-scroller" style={{ animation: 'fadeIn 0.28s ease-out' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <button 
            type="button"
            className="choice-pill-btn" 
            onClick={() => setShowNotificationSettingsPage(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: 700, fontSize: '12px' }}
          >
            <ChevronLeft size={16} /> Back to Profile
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px',
              background: remindersEnabled && notificationsEnabled ? 'var(--primary-light)' : 'rgba(217, 119, 6, 0.12)', 
              color: remindersEnabled && notificationsEnabled ? 'var(--primary)' : '#D97706'
            }}>
              {remindersEnabled && notificationsEnabled ? 'All Systems Active' : 'Partially Muted'}
            </span>
          </div>
        </div>

        {/* Page Title & Subtitle */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Bell size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>
                Reminders &amp; Notifications
              </h2>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Switch and customize alerts for medications, daily check-ins, walking sessions &amp; doctor messages
              </span>
            </div>
          </div>
        </div>

        {/* Master Control Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(2, 1fr)' : '1fr', gap: '14px', marginBottom: '24px' }}>
          {/* Master Reminders Switch Card */}
          <div className="glass-card" style={{ padding: '16px 18px', borderRadius: '18px', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-glass-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: remindersEnabled ? 'var(--primary-light)' : 'rgba(100, 116, 139, 0.12)',
                color: remindersEnabled ? 'var(--primary)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Clock size={18} />
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>Recovery Reminders</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {remindersEnabled ? 'All scheduled check-ins & meds active' : 'All recovery reminders paused'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: remindersEnabled ? 'var(--primary)' : 'var(--text-muted)' }}>
                {remindersEnabled ? 'ON' : 'OFF'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={remindersEnabled}
                onClick={() => setRemindersEnabled(prev => !prev)}
                style={{
                  width: '46px', height: '26px', borderRadius: '13px',
                  background: remindersEnabled ? 'var(--primary)' : '#CBD5E1',
                  border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                  display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                }}
                title={remindersEnabled ? "Switch Reminders Off" : "Switch Reminders On"}
              >
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  transform: remindersEnabled ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)', display: 'block'
                }} />
              </button>
            </div>
          </div>

          {/* Master Notifications Switch Card */}
          <div className="glass-card" style={{ padding: '16px 18px', borderRadius: '18px', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-glass-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: notificationsEnabled ? 'rgba(79, 70, 229, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                color: notificationsEnabled ? 'var(--primary)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>Care Team Alerts</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {notificationsEnabled ? 'Critical alerts & doctor updates active' : 'Push and triage alerts muted'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: notificationsEnabled ? 'var(--primary)' : 'var(--text-muted)' }}>
                {notificationsEnabled ? 'ON' : 'OFF'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={notificationsEnabled}
                onClick={() => setNotificationsEnabled(prev => !prev)}
                style={{
                  width: '46px', height: '26px', borderRadius: '13px',
                  background: notificationsEnabled ? 'var(--primary)' : '#CBD5E1',
                  border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                  display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                }}
                title={notificationsEnabled ? "Switch Notifications Off" : "Switch Notifications On"}
              >
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  transform: notificationsEnabled ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)', display: 'block'
                }} />
              </button>
            </div>
          </div>
        </div>

        {/* Section 1: Daily Recovery Reminders */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--border-glass)', marginBottom: '16px', background: 'var(--bg-glass-card)' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '12px' }}>
            Daily Recovery Reminders
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* 1. Morning Check-In */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.75)', border: '1px solid var(--border-glass)',
              borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Heart size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Daily Morning Check-In</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Daily at 8:30 AM &bull; Pain score, temperature &amp; symptom triage</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: (individualReminders.morningCheckin && remindersEnabled) ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {(individualReminders.morningCheckin && remindersEnabled) ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={individualReminders.morningCheckin && remindersEnabled}
                  onClick={() => toggleGranular('morningCheckin')}
                  style={{
                    width: '42px', height: '24px', borderRadius: '12px',
                    background: (individualReminders.morningCheckin && remindersEnabled) ? 'var(--primary)' : '#CBD5E1',
                    border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                  }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transform: (individualReminders.morningCheckin && remindersEnabled) ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease', display: 'block'
                  }} />
                </button>
              </div>
            </div>

            {/* 2. Scheduled Medications */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.75)', border: '1px solid var(--border-glass)',
              borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Pill size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Scheduled Medications</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Every 6 hours &bull; Oxycodone, Lisinopril, Aspirin with meals</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: (individualReminders.medicationDoses && remindersEnabled) ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {(individualReminders.medicationDoses && remindersEnabled) ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={individualReminders.medicationDoses && remindersEnabled}
                  onClick={() => toggleGranular('medicationDoses')}
                  style={{
                    width: '42px', height: '24px', borderRadius: '12px',
                    background: (individualReminders.medicationDoses && remindersEnabled) ? 'var(--primary)' : '#CBD5E1',
                    border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                  }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transform: (individualReminders.medicationDoses && remindersEnabled) ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease', display: 'block'
                  }} />
                </button>
              </div>
            </div>

            {/* 3. Physical Therapy & Walking */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.75)', border: '1px solid var(--border-glass)',
              borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Activity size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Physical Therapy &amp; Walking</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>10:00 AM, 2:30 PM, 6:00 PM &bull; Ankle pumps, quad sets &amp; 15-min walk</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: (individualReminders.physicalTherapy && remindersEnabled) ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {(individualReminders.physicalTherapy && remindersEnabled) ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={individualReminders.physicalTherapy && remindersEnabled}
                  onClick={() => toggleGranular('physicalTherapy')}
                  style={{
                    width: '42px', height: '24px', borderRadius: '12px',
                    background: (individualReminders.physicalTherapy && remindersEnabled) ? 'var(--primary)' : '#CBD5E1',
                    border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                  }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transform: (individualReminders.physicalTherapy && remindersEnabled) ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease', display: 'block'
                  }} />
                </button>
              </div>
            </div>

            {/* 4. Hydration & Ice Pack Elevation */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.75)', border: '1px solid var(--border-glass)',
              borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.1)', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Droplets size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Hydration &amp; Ice Pack Elevation</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Every 2 hours &bull; 8-glass water goal &amp; 20-min ice sessions</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: (individualReminders.hydrationGoals && remindersEnabled) ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {(individualReminders.hydrationGoals && remindersEnabled) ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={individualReminders.hydrationGoals && remindersEnabled}
                  onClick={() => toggleGranular('hydrationGoals')}
                  style={{
                    width: '42px', height: '24px', borderRadius: '12px',
                    background: (individualReminders.hydrationGoals && remindersEnabled) ? 'var(--primary)' : '#CBD5E1',
                    border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                  }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transform: (individualReminders.hydrationGoals && remindersEnabled) ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease', display: 'block'
                  }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Care Team & Critical Notifications */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--border-glass)', marginBottom: '20px', background: 'var(--bg-glass-card)' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '12px' }}>
            Care Team &amp; Clinical Notifications
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* 1. Care Team Messages */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.75)', border: '1px solid var(--border-glass)',
              borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Dr. Carter &amp; Care Team Alerts</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Direct post-op clinical updates, lab results &amp; nurse notes</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: (individualReminders.careTeamMessages && notificationsEnabled) ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {(individualReminders.careTeamMessages && notificationsEnabled) ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={individualReminders.careTeamMessages && notificationsEnabled}
                  onClick={() => toggleGranular('careTeamMessages')}
                  style={{
                    width: '42px', height: '24px', borderRadius: '12px',
                    background: (individualReminders.careTeamMessages && notificationsEnabled) ? 'var(--primary)' : '#CBD5E1',
                    border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                  }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transform: (individualReminders.careTeamMessages && notificationsEnabled) ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease', display: 'block'
                  }} />
                </button>
              </div>
            </div>

            {/* 2. Voice Chimes & Audible Alerts */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.75)', border: '1px solid var(--border-glass)',
              borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(217, 119, 6, 0.1)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Volume2 size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Voice Chimes &amp; Spoken Guidance</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gentle audible chime when new reminder or triage advice arrives</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: (individualReminders.soundAlerts && notificationsEnabled) ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {(individualReminders.soundAlerts && notificationsEnabled) ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={individualReminders.soundAlerts && notificationsEnabled}
                  onClick={() => toggleGranular('soundAlerts')}
                  style={{
                    width: '42px', height: '24px', borderRadius: '12px',
                    background: (individualReminders.soundAlerts && notificationsEnabled) ? 'var(--primary)' : '#CBD5E1',
                    border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                  }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transform: (individualReminders.soundAlerts && notificationsEnabled) ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease', display: 'block'
                  }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-glass)', flexWrap: 'wrap', gap: '10px' }}>
          <button 
            type="button"
            className="choice-pill-btn" 
            onClick={() => setShowNotificationSettingsPage(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', fontWeight: 700 }}
          >
            <ChevronLeft size={16} /> Back to Profile
          </button>

          <button 
            type="button"
            className="choice-pill-btn"
            onClick={() => setShowNotificationSettingsPage(false)}
            style={{ padding: '8px 22px', background: 'var(--primary)', color: '#ffffff', fontWeight: 700 }}
          >
            Save Preferences
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // PRIVACY & DATA SECURITY SETTINGS PAGE
  // ==========================================
  const renderPrivacySecurityPage = () => {
    const togglePrivacySetting = (key: string) => {
      setPrivacySettings(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    };

    const handleExportData = () => {
      setExportNotice("Preparing 256-bit encrypted archive for Aïda Garba...");
      setTimeout(() => {
        const dummyData = {
          patient: "Aïda Garba",
          surgery: "Total Knee Replacement",
          leadSurgeon: "Dr. James Carter, MD, FAAOS",
          surgeryDate: "2025-05-06",
          postOpDay: 6,
          clinicalCheckinsRecorded: historyLogs.length,
          generatedAt: new Date().toISOString(),
          compliance: "HIPAA Omnibus & HITECH Rule Certified (45 CFR §164.312)",
          encryption: "AES-256 GCM Zero-Knowledge Key"
        };
        const blob = new Blob([JSON.stringify(dummyData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ShalomRecoverAI_AidaGarba_EncryptedRecord_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportNotice("Encrypted patient archive downloaded successfully.");
        setTimeout(() => setExportNotice(null), 4000);
      }, 700);
    };

    return (
      <div className="detail-scroller" style={{ animation: 'fadeIn 0.28s ease-out' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <button 
            type="button"
            className="choice-pill-btn" 
            onClick={() => setShowPrivacySecurityPage(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: 700, fontSize: '12px' }}
          >
            <ChevronLeft size={16} /> Back to Profile
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px',
              background: 'var(--primary-light)', color: 'var(--primary)',
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
              <ShieldCheck size={13} /> HIPAA &amp; HITECH Certified
            </span>
          </div>
        </div>

        {/* Page Title & Subtitle */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'var(--primary-light)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Lock size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>
                Privacy &amp; Data Security
              </h2>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Manage end-to-end encryption, biometric app lock, care team data access &amp; audit trails
              </span>
            </div>
          </div>
        </div>

        {/* Security Status Hero Banner */}
        <div className="glass-card" style={{
          padding: '20px',
          borderRadius: '20px',
          border: '1px solid var(--border-glass)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(124, 58, 237, 0.05) 100%)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px var(--primary-glow)', flexShrink: 0
            }}>
              <ShieldCheck size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>Your Health Data is Strictly Confidential</strong>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  256-BIT AES ENCRYPTED
                </span>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                Shalom AI operates with zero-knowledge architecture. Your surgical history, daily pain logs, knee mobility recordings, and communications with Dr. James Carter are end-to-end encrypted and never sold or shared with advertisers.
              </p>

              {/* 3 Trust Pillars */}
              <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr', gap: '8px' }}>
                <div style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.8)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>BAA On File (St. Jude)</span>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.8)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>TLS 1.3 In-Transit</span>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.8)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>Audit Logged Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Authentication & Access Security */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--border-glass)', marginBottom: '16px', background: 'var(--bg-glass-card)' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '12px' }}>
            Device Authentication &amp; Access Controls
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* 1. Biometric App Lock */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.75)', border: '1px solid var(--border-glass)',
              borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Lock size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Biometric App Lock (Face ID / Touch ID)</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Require biometric scan whenever opening Shalom Recover AI</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: privacySettings.biometricLock ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {privacySettings.biometricLock ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={privacySettings.biometricLock}
                  onClick={() => togglePrivacySetting('biometricLock')}
                  style={{
                    width: '42px', height: '24px', borderRadius: '12px',
                    background: privacySettings.biometricLock ? 'var(--primary)' : '#CBD5E1',
                    border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                  }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transform: privacySettings.biometricLock ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease', display: 'block'
                  }} />
                </button>
              </div>
            </div>

            {/* 2. Two-Factor Authentication */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.75)', border: '1px solid var(--border-glass)',
              borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Key size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Two-Factor Authentication (2FA)</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Send SMS verification code when logging in from an unrecognized browser</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: privacySettings.twoFactorAuth ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {privacySettings.twoFactorAuth ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={privacySettings.twoFactorAuth}
                  onClick={() => togglePrivacySetting('twoFactorAuth')}
                  style={{
                    width: '42px', height: '24px', borderRadius: '12px',
                    background: privacySettings.twoFactorAuth ? 'var(--primary)' : '#CBD5E1',
                    border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                  }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transform: privacySettings.twoFactorAuth ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease', display: 'block'
                  }} />
                </button>
              </div>
            </div>

            {/* 3. Automatic Session Timeout */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.75)', border: '1px solid var(--border-glass)',
              borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(217, 119, 6, 0.1)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>15-Minute Inactive Session Timeout</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Automatically lock active session if screen is left idle</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: privacySettings.sessionTimeout ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {privacySettings.sessionTimeout ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={privacySettings.sessionTimeout}
                  onClick={() => togglePrivacySetting('sessionTimeout')}
                  style={{
                    width: '42px', height: '24px', borderRadius: '12px',
                    background: privacySettings.sessionTimeout ? 'var(--primary)' : '#CBD5E1',
                    border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                  }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transform: privacySettings.sessionTimeout ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease', display: 'block'
                  }} />
                </button>
              </div>
            </div>

            {/* 4. Incision Photo Sandboxing */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.75)', border: '1px solid var(--border-glass)',
              borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.1)', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Wound &amp; Incision Photo Shield</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Keep post-op photos isolated inside encrypted app sandbox; never save to phone gallery</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: privacySettings.shieldIncisionPhotos ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {privacySettings.shieldIncisionPhotos ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={privacySettings.shieldIncisionPhotos}
                  onClick={() => togglePrivacySetting('shieldIncisionPhotos')}
                  style={{
                    width: '42px', height: '24px', borderRadius: '12px',
                    background: privacySettings.shieldIncisionPhotos ? 'var(--primary)' : '#CBD5E1',
                    border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                  }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transform: privacySettings.shieldIncisionPhotos ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease', display: 'block'
                  }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Healthcare Provider Data Sharing */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--border-glass)', marginBottom: '16px', background: 'var(--bg-glass-card)' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '12px' }}>
            Care Team Data Permissions
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* 1. Dr. Carter Surgical Team Sync */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.75)', border: '1px solid var(--border-glass)',
              borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Dr. James Carter &amp; St. Jude Care Team</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sync daily pain scores, vital logs, and recovery milestones with orthopedic clinic</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: privacySettings.careTeamSync ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {privacySettings.careTeamSync ? 'SYNCING' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={privacySettings.careTeamSync}
                  onClick={() => togglePrivacySetting('careTeamSync')}
                  style={{
                    width: '42px', height: '24px', borderRadius: '12px',
                    background: privacySettings.careTeamSync ? 'var(--primary)' : '#CBD5E1',
                    border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                  }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transform: privacySettings.careTeamSync ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease', display: 'block'
                  }} />
                </button>
              </div>
            </div>

            {/* 2. Emergency First-Responder Access */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.75)', border: '1px solid var(--border-glass)',
              borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Emergency First-Responder 911 Access</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Permit hospital ER staff to view surgical implant specifications during emergency 911 calls</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: privacySettings.emergencyResponderAccess ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {privacySettings.emergencyResponderAccess ? 'ENABLED' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={privacySettings.emergencyResponderAccess}
                  onClick={() => togglePrivacySetting('emergencyResponderAccess')}
                  style={{
                    width: '42px', height: '24px', borderRadius: '12px',
                    background: privacySettings.emergencyResponderAccess ? 'var(--primary)' : '#CBD5E1',
                    border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                  }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transform: privacySettings.emergencyResponderAccess ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease', display: 'block'
                  }} />
                </button>
              </div>
            </div>

            {/* 3. Anonymized Research Participation */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.75)', border: '1px solid var(--border-glass)',
              borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(100, 116, 139, 0.1)', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Activity size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Anonymized Knee Recovery Research</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Contribute stripped, de-identified recovery mobility metrics to improve orthopedic patient outcomes</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: privacySettings.anonymizedResearch ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {privacySettings.anonymizedResearch ? 'OPTED-IN' : 'DISABLED'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={privacySettings.anonymizedResearch}
                  onClick={() => togglePrivacySetting('anonymizedResearch')}
                  style={{
                    width: '42px', height: '24px', borderRadius: '12px',
                    background: privacySettings.anonymizedResearch ? 'var(--primary)' : '#CBD5E1',
                    border: 'none', padding: '2px', cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', transition: 'background 0.2s ease', flexShrink: 0
                  }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transform: privacySettings.anonymizedResearch ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease', display: 'block'
                  }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Clinical Access Audit Log & Patient Data Rights */}
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(2, 1fr)' : '1fr', gap: '14px', marginBottom: '20px' }}>
          {/* Card: Clinical Access Audit Trail */}
          <div className="glass-card" style={{ padding: '18px', borderRadius: '18px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong style={{ fontSize: '13.5px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClipboardList size={16} style={{ color: 'var(--primary)' }} />
                Provider Access Audit Trail
              </strong>
              <button
                type="button"
                onClick={() => setShowAuditLogModal(prev => !prev)}
                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                {showAuditLogModal ? 'Hide Log' : 'View Full Trail'}
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
              Every access request by doctors, nurses, and clinics is logged with a cryptographic timestamp.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '10.5px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Dr. James Carter, MD</strong> &bull; Reviewed Day 6 Check-in</span>
                <span style={{ color: 'var(--text-muted)' }}>Today, 9:15 AM</span>
              </div>
              <div style={{ fontSize: '10.5px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Sarah Jenkins, RN</strong> &bull; Verified Oxycodone log</span>
                <span style={{ color: 'var(--text-muted)' }}>Today, 8:45 AM</span>
              </div>
              {showAuditLogModal && (
                <>
                  <div style={{ fontSize: '10.5px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>Marcus Vance, PT</strong> &bull; Knee flexion ROM logs</span>
                    <span style={{ color: 'var(--text-muted)' }}>Yesterday, 4:20 PM</span>
                  </div>
                  <div style={{ fontSize: '10.5px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>St. Jude Surgical OR 4</strong> &bull; Operative Summary PDF</span>
                    <span style={{ color: 'var(--text-muted)' }}>May 6, 2025</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card: Export Medical Data */}
          <div className="glass-card" style={{ padding: '18px', borderRadius: '18px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass-card)' }}>
            <strong style={{ fontSize: '13.5px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Download size={16} style={{ color: 'var(--primary)' }} />
              Patient Data Rights &amp; Export
            </strong>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
              Under HIPAA Privacy Rules, you have full ownership of your data. Download your complete encrypted recovery timeline at any time.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="choice-pill-btn"
                onClick={handleExportData}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, fontSize: '12px' }}
              >
                <Download size={14} /> Download Encrypted Archive (.json)
              </button>

              {exportNotice && (
                <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, textAlign: 'center', background: 'var(--primary-light)', padding: '6px', borderRadius: '8px' }}>
                  {exportNotice}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-glass)', flexWrap: 'wrap', gap: '10px' }}>
          <button 
            type="button"
            className="choice-pill-btn" 
            onClick={() => setShowPrivacySecurityPage(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', fontWeight: 700 }}
          >
            <ChevronLeft size={16} /> Back to Profile
          </button>

          <button 
            type="button"
            className="choice-pill-btn"
            onClick={() => {
              setShowPrivacySecurityPage(false);
            }}
            style={{ padding: '8px 22px', background: 'var(--primary)', color: '#ffffff', fontWeight: 700 }}
          >
            Save Security Settings
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER TAB 5: Profile (Settings - Screen 10)
  // ==========================================
  const renderSettingsTab = () => {
    if (showSurgeryDetailPage) {
      return renderSurgeryDetailPage();
    }
    if (showNotificationSettingsPage) {
      return renderNotificationSettingsPage();
    }
    if (showPrivacySecurityPage) {
      return renderPrivacySecurityPage();
    }
    if (showFullHistoryPage) {
      return renderFullHistoryPage();
    }

    const isSuccess = !!pdfUploadedName && !pdfUploading;
    const normalized = normalizePatientRecord(medicalHistory);

    return (
      <div className="profile-scroller" style={{ animation: 'fadeIn 0.3s ease-out' }}>
        
        {/* Profile Card Header */}
        <div className="profile-card">
          <div className="profile-card-left">
            <div className="profile-avatar-circle">
              {/* Fallback gradient avatar initials */}
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold'
              }}>
                AG
              </div>
            </div>
            <div className="profile-info">
              <span className="profile-name">Aïda Garba</span>
              <span className="profile-email">aidagarba@gmail.com</span>
            </div>
          </div>
          <button className="profile-edit-btn" onClick={() => pdfInputRef.current?.click()}>
            <Plus size={16} />
          </button>
        </div>

        {/* Surgery Details Entry Card (Clickable to open Structured Surgery Details Page) */}
        <div className="profile-menu-section">
          <span className="profile-menu-title">Surgical Information</span>
          <div 
            className="profile-menu-card history-entry-card" 
            onClick={() => setShowSurgeryDetailPage(true)}
            style={{ 
              padding: '16px 18px', 
              cursor: 'pointer',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(124, 58, 237, 0.04) 100%)',
              border: '1px solid var(--border-glass)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'var(--primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)',
                flexShrink: 0
              }}>
                <Activity size={22} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Surgery Details
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {normalized?.surgeryType || 'Total Knee Replacement'} &bull; Dr. James Carter &bull; (555) 234-8901 &bull; May 6, 2025
                  </span>
                  <span style={{ 
                    fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '6px', 
                    background: 'var(--primary-light)', color: 'var(--primary)' 
                  }}>
                    Day 6 Post-Op
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--primary)' }}>
                View Details
              </span>
              <ChevronRightIcon size={16} style={{ color: 'var(--primary)' }} />
            </div>
          </div>
        </div>

        {/* Daily Check-In History Card (Clickable to open Full History Page) */}
        <div className="profile-menu-section">
          <span className="profile-menu-title">Clinical History</span>
          <div 
            className="profile-menu-card history-entry-card" 
            onClick={() => setShowFullHistoryPage(true)}
            style={{ 
              padding: '16px 18px', 
              cursor: 'pointer',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(124, 58, 237, 0.04) 100%)',
              border: '1px solid var(--border-glass)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'var(--primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)',
                flexShrink: 0
              }}>
                <ClipboardList size={22} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Daily Check-In History
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {historyLogs.length} verified clinical records &bull; Latest pain: {historyLogs[historyLogs.length - 1]?.painLevel ?? 4}/10
                  </span>
                  <span style={{ 
                    fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '6px', 
                    background: 'var(--primary-light)', color: 'var(--primary)' 
                  }}>
                    Normal Vitals
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--primary)' }}>
                View Full History
              </span>
              <ChevronRightIcon size={16} style={{ color: 'var(--primary)' }} />
            </div>
          </div>
        </div>

        {/* PDF discharge instructions uploading */}
        <div className="profile-menu-section">
          <span className="profile-menu-title">Discharge Summary</span>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !pdfUploading && pdfInputRef.current?.click()}
            className="pdf-drop-box"
            style={{
              borderColor: isDragging ? 'var(--primary)' : isSuccess ? 'var(--primary)' : 'rgba(124, 58, 237, 0.25)',
              background: isDragging ? 'var(--primary-light)' : isSuccess ? 'var(--primary-light)' : '#ffffff',
            }}
          >
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); }}
            />
            {pdfUploading ? (
              <Loader2 size={18} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
            ) : isSuccess ? (
              <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />
            ) : (
              <UploadCloud size={18} style={{ color: 'var(--primary)' }} />
            )}
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)' }}>
              {isSuccess ? 'Discharge Guidelines Loaded' : 'Upload Discharge Instructions PDF'}
            </span>
          </div>
          {pdfError && (
            <div style={{ fontSize: '10.5px', color: 'var(--color-red)', marginTop: '6px', textAlign: 'center' }}>
              {pdfError}
            </div>
          )}
        </div>

        {/* Reminders & Notifications Section with On/Off Switches */}
        <div className="profile-menu-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingLeft: '4px' }}>
            <span className="profile-menu-title" style={{ margin: 0, padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={13} style={{ color: 'var(--primary)' }} />
              Reminders &amp; Notifications
            </span>
            <button
              type="button"
              onClick={() => setShowNotificationSettingsPage(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              Configure <ChevronRightIcon size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Reminders Card with On/Off Switch */}
            <div 
              className="profile-menu-card history-entry-card"
              style={{ 
                padding: '14px 16px',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: 'var(--bg-glass-card)'
              }}
              onClick={() => setShowNotificationSettingsPage(true)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: remindersEnabled ? 'var(--primary-light)' : 'rgba(100, 116, 139, 0.1)',
                  color: remindersEnabled ? 'var(--primary)' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Clock size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text-main)' }}>Recovery Reminders</strong>
                    <span style={{ 
                      fontSize: '9.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px',
                      background: remindersEnabled ? 'var(--primary-light)' : 'rgba(100, 116, 139, 0.12)',
                      color: remindersEnabled ? 'var(--primary)' : 'var(--text-muted)'
                    }}>
                      {remindersEnabled ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '1px' }}>
                    Daily check-ins, scheduled medications &amp; physical therapy prompts
                  </span>
                </div>
              </div>

              {/* On / Off Switch Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: remindersEnabled ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {remindersEnabled ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={remindersEnabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRemindersEnabled(prev => !prev);
                  }}
                  style={{
                    width: '46px',
                    height: '26px',
                    borderRadius: '13px',
                    background: remindersEnabled ? 'var(--primary)' : '#CBD5E1',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background 0.2s ease',
                    flexShrink: 0
                  }}
                  title={remindersEnabled ? "Switch Reminders Off" : "Switch Reminders On"}
                >
                  <span style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    transform: remindersEnabled ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'block'
                  }} />
                </button>
              </div>
            </div>

            {/* Notifications Card with On/Off Switch */}
            <div 
              className="profile-menu-card history-entry-card"
              style={{ 
                padding: '14px 16px',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: 'var(--bg-glass-card)'
              }}
              onClick={() => setShowNotificationSettingsPage(true)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: notificationsEnabled ? 'var(--primary-light)' : 'rgba(100, 116, 139, 0.1)',
                  color: notificationsEnabled ? 'var(--primary)' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text-main)' }}>Push &amp; Sound Notifications</strong>
                    <span style={{ 
                      fontSize: '9.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px',
                      background: notificationsEnabled ? 'var(--primary-light)' : 'rgba(100, 116, 139, 0.12)',
                      color: notificationsEnabled ? 'var(--primary)' : 'var(--text-muted)'
                    }}>
                      {notificationsEnabled ? 'ENABLED' : 'MUTED'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '1px' }}>
                    Doctor Carter alerts, triage threshold warnings &amp; voice updates
                  </span>
                </div>
              </div>

              {/* On / Off Switch Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: notificationsEnabled ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {notificationsEnabled ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationsEnabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotificationsEnabled(prev => !prev);
                  }}
                  style={{
                    width: '46px',
                    height: '26px',
                    borderRadius: '13px',
                    background: notificationsEnabled ? 'var(--primary)' : '#CBD5E1',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background 0.2s ease',
                    flexShrink: 0
                  }}
                  title={notificationsEnabled ? "Switch Notifications Off" : "Switch Notifications On"}
                >
                  <span style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    transform: notificationsEnabled ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'block'
                  }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Voice & Speech Pace Section */}
        <div className="profile-menu-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', paddingLeft: '4px' }}>
            <span className="profile-menu-title" style={{ margin: 0, padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Volume2 size={13} style={{ color: 'var(--primary)' }} />
              Shalom AI Voice Speed
            </span>
            <button
              type="button"
              onClick={() => speakHeroMessage("Hello Aïda, this is your Shalom Recover AI assistant speaking at a relaxed, comforting pace.")}
              style={{
                background: 'var(--primary-light)',
                border: '1px solid var(--border-glass)',
                color: 'var(--primary)',
                fontSize: '10.5px',
                fontWeight: '700',
                padding: '4px 10px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Volume2 size={12} />
              <span>Test Voice</span>
            </button>
          </div>
          <div className="profile-menu-card" style={{ padding: '14px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
              Select your preferred speaking tempo for care instructions and reminders:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                className={`theme-chip-btn ${ttsSpeed <= 0.80 ? 'active' : ''}`}
                style={{ padding: '10px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                onClick={() => {
                  setTtsSpeed(0.78);
                  speakHeroMessage("Voice speed set to gentle and calm.");
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}><Feather size={12} /> Gentle</span>
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>0.78x Speed</span>
              </button>

              <button
                type="button"
                className={`theme-chip-btn ${ttsSpeed > 0.80 && ttsSpeed < 0.90 ? 'active' : ''}`}
                style={{ padding: '10px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                onClick={() => {
                  setTtsSpeed(0.82);
                  speakHeroMessage("Voice speed set to natural and comfortable.");
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}><Leaf size={12} /> Natural</span>
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>0.82x Speed</span>
              </button>

              <button
                type="button"
                className={`theme-chip-btn ${ttsSpeed >= 0.90 ? 'active' : ''}`}
                style={{ padding: '10px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                onClick={() => {
                  setTtsSpeed(0.92);
                  speakHeroMessage("Voice speed set to brisk.");
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={12} /> Brisk</span>
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>0.92x Speed</span>
              </button>
            </div>
          </div>
        </div>

        {/* Privacy & Security Card (Clickable to open Dedicated Privacy & Security Page) */}
        <div className="profile-menu-section">
          <span className="profile-menu-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={13} style={{ color: 'var(--primary)' }} />
            Privacy &amp; Data Security
          </span>
          <div 
            className="profile-menu-card history-entry-card" 
            onClick={() => setShowPrivacySecurityPage(true)}
            style={{ 
              padding: '16px 18px', 
              cursor: 'pointer',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(124, 58, 237, 0.04) 100%)',
              border: '1px solid var(--border-glass)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'var(--primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)',
                flexShrink: 0
              }}>
                <ShieldCheck size={22} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Privacy &amp; Security Controls
                  </span>
                  <span style={{ 
                    fontSize: '9.5px', fontWeight: 700, padding: '1px 7px', borderRadius: '6px', 
                    background: 'var(--primary-light)', color: 'var(--primary)' 
                  }}>
                    HIPAA Shielded
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  AES-256 Bit Encryption &bull; Biometrics &bull; Care Team Sync &bull; Audit Trail
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--primary)' }}>
                Manage Security
              </span>
              <ChevronRightIcon size={16} style={{ color: 'var(--primary)' }} />
            </div>
          </div>
        </div>

        <div className="safety-disclaimer-text">
          Shalom Recovery AI supports clinical guidance but does not replace professional emergency care triage.
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER SLIDERS FORM VIEW (Screen 3)
  // ==========================================
  const renderCheckInFormSliders = () => {
    return (
      <div className="detail-scroller" style={{ animation: 'fadeIn 0.28s ease-out' }}>
        {/* Header bar */}
        <div className="detail-header-row" style={{ marginBottom: '10px' }}>
          <button className="detail-back-btn" onClick={() => setShowCheckInForm(false)}>
            <ChevronLeft size={16} />
          </button>
          <span className="detail-title">Daily Check-In</span>
          <button className="detail-menu-btn" title="Information dialog">
            <Info size={16} />
          </button>
        </div>

        {/* Titles info */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>How are you feeling today?</h3>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Your answers help Shalom personalize your care.</p>
        </div>

        {/* Sliders list */}
        <div className="checkin-sliders-list">
          {/* Pain Level */}
          <div className="checkin-slider-card">
            <div className="slider-card-header">
              <span className="slider-card-label"><Frown size={14} style={{ color: 'var(--primary)' }} /> Pain Level</span>
              <span className="slider-value-badge">{sliderPain} &bull; {sliderPain > 7 ? 'Severe' : sliderPain > 4 ? 'Moderate' : 'Mild'}</span>
            </div>
            <input 
              type="range" min="1" max="10" className="custom-range-slider"
              value={sliderPain} onChange={e => setSliderPain(Number(e.target.value))}
            />
            <div className="slider-ticks-row"><span>1</span><span>10</span></div>
          </div>

          {/* Swelling */}
          <div className="checkin-slider-card">
            <div className="slider-card-header">
              <span className="slider-card-label"><AlertCircle size={14} style={{ color: 'var(--primary)' }} /> Swelling</span>
              <span className="slider-value-badge">{sliderSwelling} &bull; {sliderSwelling > 7 ? 'Severe' : sliderSwelling > 4 ? 'Moderate' : 'Mild'}</span>
            </div>
            <input 
              type="range" min="1" max="10" className="custom-range-slider"
              value={sliderSwelling} onChange={e => setSliderSwelling(Number(e.target.value))}
            />
            <div className="slider-ticks-row"><span>1</span><span>10</span></div>
          </div>

          {/* Temperature */}
          <div className="checkin-slider-card">
            <div className="slider-card-header">
              <span className="slider-card-label"><Thermometer size={14} style={{ color: 'var(--primary)' }} /> Temperature</span>
              <span className="slider-value-badge">{sliderTemp.toFixed(1)} °F &bull; {sliderTemp >= 100 ? 'Fever' : 'Normal'}</span>
            </div>
            <input 
              type="range" min="97.0" max="103.0" step="0.1" className="custom-range-slider"
              value={sliderTemp} onChange={e => setSliderTemp(Number(e.target.value))}
            />
            <div className="slider-ticks-row"><span>97.0</span><span>103.0</span></div>
          </div>

          {/* Mobility */}
          <div className="checkin-slider-card">
            <div className="slider-card-header">
              <span className="slider-card-label"><Activity size={14} style={{ color: 'var(--primary)' }} /> Mobility</span>
              <span className="slider-value-badge">{sliderMobility} &bull; {sliderMobility > 7 ? 'Good' : sliderMobility > 4 ? 'Moderate' : 'Restricted'}</span>
            </div>
            <input 
              type="range" min="1" max="10" className="custom-range-slider"
              value={sliderMobility} onChange={e => setSliderMobility(Number(e.target.value))}
            />
            <div className="slider-ticks-row"><span>1</span><span>10</span></div>
          </div>

          {/* Sleep Quality */}
          <div className="checkin-slider-card">
            <div className="slider-card-header">
              <span className="slider-card-label"><Moon size={14} style={{ color: 'var(--primary)' }} /> Sleep Quality</span>
              <span className="slider-value-badge">{sliderSleep} &bull; {sliderSleep > 7 ? 'Excellent' : 'Moderate'}</span>
            </div>
            <input 
              type="range" min="1" max="10" className="custom-range-slider"
              value={sliderSleep} onChange={e => setSliderSleep(Number(e.target.value))}
            />
            <div className="slider-ticks-row"><span>1</span><span>10</span></div>
          </div>

          {/* Mood */}
          <div className="checkin-slider-card">
            <div className="slider-card-header">
              <span className="slider-card-label"><Smile size={14} style={{ color: 'var(--primary)' }} /> Mood</span>
              <span className="slider-value-badge">{sliderMood} &bull; {sliderMood > 7 ? 'Excellent' : sliderMood > 4 ? 'Good' : 'Poor'}</span>
            </div>
            <input 
              type="range" min="1" max="10" className="custom-range-slider"
              value={sliderMood} onChange={e => setSliderMood(Number(e.target.value))}
            />
            <div className="slider-ticks-row"><span>1</span><span>10</span></div>
          </div>
        </div>

        {/* Submit */}
        <button className="meds-action-btn" onClick={saveCheckInFormSliders}>
          Save Check-In
        </button>
      </div>
    );
  };

  // ==========================================
  // RENDER DETAILED TASK OVERVIEW (Screen 3 detail)
  // ==========================================
  const renderTaskDetailTab = (taskId: string) => {
    const todayList = tasksByDate['2026-08-28'] || [];
    const task = todayTasks.find(t => t.id === taskId) || todayList.find(t => t.id === taskId);
    if (!task) return null;

    const weeklyDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return (
      <div className="detail-scroller" style={{ animation: 'slideInFade 0.28s var(--ease-out) both' }}>
        <div className="detail-header-row">
          <button className="detail-back-btn" onClick={() => setSelectedTaskId(null)}>
            <ChevronLeft size={16} />
          </button>
          <span className="detail-title">Plan Detail</span>
          <button className="detail-menu-btn" onClick={() => handleDeleteTask(task.id)} title="Delete action">
            <Trash2 size={16} style={{ color: 'var(--color-red)' }} />
          </button>
        </div>

        {/* Hero Card */}
        <div className="detail-hero-card">
          <div className="detail-hero-pill" style={{ color: task.completed ? 'var(--color-green)' : 'var(--color-yellow)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {task.completed ? <><Check size={11} /> Today: Taken</> : 'Today: Pending'}
          </div>
          <h2 className="detail-hero-name">{task.name}</h2>
          <p className="detail-hero-desc">
            {task.instructions || `Scheduled recovery ${task.type} to support clinical rehabilitation guidelines.`}
          </p>
        </div>

        {/* Parameters Grid */}
        <div className="detail-grid">
          <div className="detail-grid-box">
            <span className="detail-box-lbl">Daily Dose</span>
            <span className="detail-box-val">{task.dose || '1 session'}</span>
          </div>
          <div className="detail-grid-box">
            <span className="detail-box-lbl">Best Time</span>
            <span className="detail-box-val">{task.bestTime || task.timeHour || 'Anytime'}</span>
          </div>
          <div className="detail-grid-box">
            <span className="detail-box-lbl">Streak</span>
            <span className="detail-box-val">{task.streak || 0} days</span>
          </div>
          <div className="detail-grid-box">
            <span className="detail-box-lbl">This Week</span>
            <span className="detail-box-val">{task.completed ? '6/7' : '5/7'}</span>
          </div>
        </div>

        {/* Consistency */}
        <div className="consistency-card">
          <div className="consistency-header">
            <span className="consistency-title">Weekly Consistency</span>
            <span className="consistency-percentage">71%</span>
          </div>
          <div className="consistency-grid">
            {weeklyDays.map((day, idx) => {
              const checked = idx < (task.streak || 4);
              return (
                <div key={idx} className="consistency-day">
                  <span className="consistency-day-lbl">{day}</span>
                  <div 
                    className={`consistency-day-bubble ${checked ? 'success' : ''}`}
                    onClick={() => toggleTaskCompleted(task.id)}
                  >
                    {checked ? '✓' : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reminder bottom box with on/off switch */}
        <div className="reminder-footer-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={14} style={{ color: 'var(--primary)' }} />
            <span>REMINDER: <strong>{task.timeHour || '8:30 AM'} &bull; Daily</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: (taskReminders[task.id] !== false && remindersEnabled) ? 'var(--primary)' : 'var(--text-muted)' }}>
              {(taskReminders[task.id] !== false && remindersEnabled) ? 'ON' : 'OFF'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={taskReminders[task.id] !== false && remindersEnabled}
              onClick={() => setTaskReminders(prev => ({ ...prev, [task.id]: prev[task.id] === false }))}
              style={{
                width: '42px',
                height: '24px',
                borderRadius: '12px',
                background: (taskReminders[task.id] !== false && remindersEnabled) ? 'var(--primary)' : '#CBD5E1',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                transition: 'background 0.2s ease',
                flexShrink: 0
              }}
              title={(taskReminders[task.id] !== false && remindersEnabled) ? "Switch Reminder Off" : "Switch Reminder On"}
            >
              <span style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transform: (taskReminders[task.id] !== false && remindersEnabled) ? 'translateX(18px)' : 'translateX(0)',
                transition: 'transform 0.2s ease',
                display: 'block'
              }} />
            </button>
          </div>
        </div>

        <button 
          className="meds-action-btn"
          style={{ background: task.completed ? 'var(--text-muted)' : 'var(--primary-dark)', marginTop: '4px' }}
          onClick={() => {
            toggleTaskCompleted(task.id);
            setTimeout(() => setSelectedTaskId(null), 300);
          }}
        >
          {task.completed ? 'Mark as Pending' : 'Mark as Completed'}
        </button>
      </div>
    );
  };

  const handleDeleteTask = (taskId: string) => {
    const key = getDateKey(selectedDate);
    setTodayTasks(prev => {
      const updated = prev.filter(t => t.id !== taskId);
      setTasksByDate(dict => ({ ...dict, [key]: updated }));
      return updated;
    });
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
  };

  const renderActiveTabContent = () => {
    // If Daily Check-In sliders form is active
    if (showCheckInForm) {
      return renderCheckInFormSliders();
    }

    // On mobile, if a task detail sheet is open, show it as full screen overlay
    if (!isDesktop && selectedTaskId && (activeTab === 'home' || activeTab === 'plan')) {
      return renderTaskDetailTab(selectedTaskId);
    }

    switch (activeTab) {
      case 'home':
        return renderHomeTab();
      case 'plan':
        if (isDesktop) {
          // Desktop split view for plan tab!
          return (
            <div className="plan-desktop-split-layout" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '32px', height: '100%', alignItems: 'start' }}>
              <div className="plan-split-left-panel">
                {renderPlanTab()}
              </div>
              <div className="plan-split-right-panel" style={{ position: 'sticky', top: '0' }}>
                {selectedTaskId ? (
                  renderTaskDetailTab(selectedTaskId)
                ) : (
                  <div className="glass-card plan-empty-detail-placeholder" style={{ 
                    padding: '32px 24px', 
                    borderRadius: '24px', 
                    border: '1px dashed var(--border-glass)',
                    background: 'var(--bg-glass-card)',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    minHeight: '280px',
                    marginTop: '46px'
                  }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <Pill size={20} />
                    </div>
                    <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>Plan Task Details</strong>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                      Select any medication or exercise to view clinical instructions, weekly adherence stats, and schedule reminders.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        }
        return renderPlanTab();
      case 'chat':
        return renderChatTab();
      case 'trends':
        return renderTrendsTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return renderHomeTab();
    }
  };

  return (
    <div className="desktop-layout">
      {/* Centered Web Viewport / App Shell */}
      <div className="web-app-viewport">
        {/* Left Sidebar Navigation (Desktop) / Bottom Bar (Mobile) */}
        <nav className="viewport-tab-bar">
          {/* Desktop Sidebar Branding & Patient Profile */}
          <div className="sidebar-logo-area">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px var(--primary-glow)'
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="white" />
                  <path d="M12 6.5v5M9.5 9h5" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '16px', color: 'var(--text-main)', lineHeight: '1.2', fontWeight: 800 }}>Shalom</strong>
                <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700 }}>Recovery AI</span>
              </div>
            </div>

            {/* Patient Profile Card */}
            <div style={{
              background: 'var(--bg-glass-card)',
              border: '1px solid var(--border-glass)',
              borderRadius: '16px',
              padding: '10px 12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '800'
              }}>
                AG
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>Aïda Garba</strong>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Knee Post-Op • Day 6</span>
              </div>
            </div>
          </div>

          <button 
            className={`tab-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => { setShowCheckInForm(false); setSelectedTaskId(null); setActiveTab('home'); }}
          >
            <Home size={18} />
            <span>Home</span>
          </button>

          <button 
            className={`tab-item ${activeTab === 'plan' ? 'active' : ''}`}
            onClick={() => { setShowCheckInForm(false); setSelectedTaskId(null); setActiveTab('plan'); }}
          >
            <Calendar size={18} />
            <span>Plan</span>
          </button>

          {/* Animated Shalom AI Sphere Assistant button */}
          <button 
            className={`tab-item chat-btn-floating ${activeTab === 'chat' ? 'active' : ''}`} 
            onClick={() => { setShowCheckInForm(false); setSelectedTaskId(null); setActiveTab('chat'); }}
            title="Shalom (AI Recovery Assistant)"
          >
            <div className="shalom-avatar-orb"></div>
            <span className="sidebar-chat-label">Shalom</span>
          </button>

          <button 
            className={`tab-item ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => { setShowCheckInForm(false); setSelectedTaskId(null); setActiveTab('trends'); }}
          >
            <TrendingUp size={18} />
            <span>Progress</span>
          </button>

          <button 
            className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => { setShowCheckInForm(false); setSelectedTaskId(null); setActiveTab('settings'); }}
          >
            <User size={18} />
            <span>Profile</span>
          </button>

          {/* Desktop Care Team Hotline */}
          <div className="sidebar-careteam-footer">
            <div style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '14px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}>
              <span style={{ fontSize: '9.5px', fontWeight: '800', color: 'var(--color-red)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <PhoneCall size={11} /> Care Team Hotline
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: '700' }}>
                Dr. Smith's Office
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Emergency Hotline: 911
              </span>
            </div>
          </div>
        </nav>

        {/* Main Content Workspace (Scrollable & Responsive) */}
        <main className={`viewport-screen ${activeTab === 'chat' ? 'chat-active-viewport' : ''}`}>
          {renderActiveTabContent()}
        </main>
      </div>

      {showAppointmentSummaryModal && (
        <div className="glass-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out', padding: '20px'
        }}>
          <div className="glass-card" style={{
            background: 'rgba(255, 255, 255, 0.96)',
            border: '1.5px solid var(--border-glass)',
            borderRadius: '28px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 24px 60px rgba(0, 31, 63, 0.15)',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>Pre-Visit Recovery Report</span>
              <button 
                onClick={() => setShowAppointmentSummaryModal(false)}
                style={{ border: 'none', background: 'rgba(0,0,0,0.04)', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}
              >
                <X size={15} />
              </button>
            </div>

            <h3 style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 800 }}>Dr. Carter &bull; Post-Op Follow-Up</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5', margin: 0 }}>
              Scheduled for <strong>September 5, 2026 at 10:30 AM</strong>. Please review the clinical preparation instructions and share your recovery history below.
            </p>

            {/* Before Appointment Instructions */}
            <div style={{ background: 'var(--primary-light)', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-glass)', marginBottom: '18px', marginTop: '16px' }}>
              <strong style={{ fontSize: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><ClipboardList size={13} style={{ color: 'var(--primary)' }} /> Preparation Guidelines</strong>
              <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.5' }}>
                <li>Bring your current active medications list.</li>
                <li>Be prepared to review symptom logs from Days 3–5.</li>
                <li>Do not eat after midnight if instructed by surgical team.</li>
              </ul>
            </div>

            {/* Print-ready summary */}
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '18px', border: '1px solid var(--border-glass)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)' }}>SHALOM AI PATIENT DISCHARGE REPORT</span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Date: Aug 28, 2026</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-main)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Days Since Surgery:</span>
                  <strong>{historyLogs.length} days</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Average Pain Level:</span>
                  <strong>{(historyLogs.reduce((acc, log) => acc + log.painLevel, 0) / historyLogs.length).toFixed(1)}/10</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Highest Recorded Pain:</span>
                  <strong>{Math.max(...historyLogs.map(log => log.painLevel))}/10</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Fever Episodes:</span>
                  <strong>{historyLogs.some(log => log.temperature >= 100) ? "1 episode (100.2°F)" : "None"}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Medication Adherence:</span>
                  <strong>{Math.round(historyLogs.reduce((acc, log) => acc + log.medsAdherence, 0) / historyLogs.length)}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Incision Redness / Swelling:</span>
                  <strong>Reported on Days 3–5</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Current Status:</span>
                  <strong style={{ color: 'var(--color-green)' }}>Mild Swelling (Stable)</strong>
                </div>
              </div>
            </div>

            <button 
              className="meds-action-btn"
              style={{ marginTop: '10px', width: '100%', textTransform: 'none' }}
              onClick={() => {
                alert("Summary copied to clipboard! You can share this report with Dr. Carter.");
                setShowAppointmentSummaryModal(false);
              }}
            >
              Copy Report Summary
            </button>
          </div>
        </div>
      )}

      {/* Incision & Wound Safety Check Modal */}
      {renderIncisionCheckModal()}

      {/* Toast Notification Alert */}
      {toastNotification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '20px',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
          fontSize: '12px',
          fontWeight: 700,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <Sparkles size={14} style={{ color: '#A855F7' }} />
          <span>{toastNotification}</span>
        </div>
      )}
    </div>
  );
}

export default App;

