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
  Palette,
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
  Sun,
  PhoneCall,
  X,
  Trophy,
  Flame,
  Target,
  Star
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
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    return localStorage.getItem('shalom_theme') || 'bio-iris';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('shalom_theme', currentTheme);
  }, [currentTheme]);

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
  const [faqDataset, setFaqDataset] = useState<any | null>(null);

  // Unified State for Redesign
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [checkInComplete, setCheckInComplete] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hydrationGlasses, setHydrationGlasses] = useState<number>(4);
  const [showAppointmentSummaryModal, setShowAppointmentSummaryModal] = useState<boolean>(false);
  
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
  const [progressSubTab, setProgressSubTab] = useState<'overview' | 'checkins' | 'trends'>('overview');
  const [planCategoryFilter, setPlanCategoryFilter] = useState<'all' | 'medication' | 'activity' | 'wound' | 'checkin'>('all');
  
  // Sliders Form State (Screen 3)
  const [showCheckInForm, setShowCheckInForm] = useState<boolean>(false);
  const [sliderPain, setSliderPain] = useState<number>(4);
  const [sliderSwelling, setSliderSwelling] = useState<number>(3);
  const [sliderTemp, setSliderTemp] = useState<number>(98.6);
  const [sliderMobility, setSliderMobility] = useState<number>(4);
  const [sliderSleep, setSliderSleep] = useState<number>(7);
  const [sliderMood, setSliderMood] = useState<number>(6);
  const [selectedLogIndex, setSelectedLogIndex] = useState<number>(6);

  // Rotating monitor card state (15s rotation)
  const [monitorSlideIndex, setMonitorSlideIndex] = useState<number>(0);
  const [isMonitorPaused, setIsMonitorPaused] = useState<boolean>(false);
  const [monitorProgress, setMonitorProgress] = useState<number>(0);
  const [isSpeakingHero, setIsSpeakingHero] = useState<boolean>(false);

  useEffect(() => {
    if (isMonitorPaused) return;

    // Advance progress smoothly over 15 seconds (150ms intervals)
    const intervalMs = 150;
    const step = (intervalMs / 15000) * 100;

    const timer = setInterval(() => {
      setMonitorProgress((prev) => {
        if (prev >= 100) {
          setMonitorSlideIndex((slide) => (slide + 1) % 4);
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isMonitorPaused]);

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

  const goToSlide = (idx: number) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeakingHero(false);
    }
    setMonitorSlideIndex(idx);
    setMonitorProgress(0);
  };
  const nextSlide = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeakingHero(false);
    }
    setMonitorSlideIndex((prev) => (prev + 1) % 4);
    setMonitorProgress(0);
  };
  const prevSlide = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeakingHero(false);
    }
    setMonitorSlideIndex((prev) => (prev === 0 ? 3 : prev - 1));
    setMonitorProgress(0);
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
    const loadDefaultFaq = async () => {
      try {
        const response = await fetch('/Dataset_main_patient.json');
        if (response.ok) {
          const data = await response.json();
          setFaqDataset(data);
        }
      } catch (e) {
        console.error("Failed to load default FAQ dataset", e);
      }
    };
    
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

    loadDefaultFaq();
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
        // 💊 Category 1: Medications
        { id: 'med-1', name: 'Oxycodone (Pain Relief)', dose: '5 mg • Take 1 tablet', type: 'medication', timeSlot: 'Oxycodone 5mg', timeHour: '08:00 AM', completed: false, instructions: 'Take with light meal & plenty of water. Do not drive.', tag: 'Pain Relief', streak: 4, bestTime: 'Morning' },
        { id: 'med-2', name: 'Cephalexin (Antibiotic)', dose: '500 mg • Take 1 capsule', type: 'medication', timeSlot: 'Cephalexin 500mg', timeHour: '01:00 PM', completed: false, instructions: 'Take every 8 hours with full glass of water.', tag: 'Infection Shield', streak: 6, bestTime: 'Afternoon' },
        { id: 'med-3', name: 'Aspirin (Blood Thinner)', dose: '81 mg • Take 1 tablet', type: 'medication', timeSlot: 'Aspirin 81mg', timeHour: '06:00 PM', completed: false, instructions: 'Take with evening meal to prevent blood clots (DVT).', tag: 'DVT Prevention', streak: 6, bestTime: 'Evening' },
        { id: 'med-4', name: 'Colace (Stool Softener)', dose: '100 mg • Take 1 capsule', type: 'medication', timeSlot: 'Colace 100mg', timeHour: '09:00 PM', completed: false, instructions: 'Take at bedtime with plenty of fluids.', tag: 'GI Comfort', streak: 4, bestTime: 'Night' },

        // 🏃 Category 2: Physical Therapy & Mobility
        { id: 'pt-1', name: 'Quad Sets & Ankle Pumps', dose: '10 reps • 3 sets (hold 5s)', type: 'activity', timeSlot: 'PT Exercise', timeHour: '10:00 AM', completed: false, instructions: 'Tighten thigh muscles down flat. Flex & point toes to boost circulation.', tag: 'Strength PT', streak: 5, bestTime: 'Morning' },
        { id: 'pt-2', name: 'Assisted Walker Walk', dose: '5–10 min slow walk', type: 'activity', timeSlot: 'Mobility Goal', timeHour: '03:30 PM', completed: false, instructions: 'Keep posture upright with walker. Stop if you experience sharp knee pain.', tag: 'Mobility Goal', streak: 3, bestTime: 'Afternoon' },
        { id: 'pt-3', name: 'Heel Slides & Range of Motion', dose: '8–10 reps (gentle bend)', type: 'activity', timeSlot: 'Flexion PT', timeHour: '07:30 PM', completed: false, instructions: 'Slide heel smoothly toward hip on bed. Pause at comfortable resistance.', tag: 'Flexion PT', streak: 4, bestTime: 'Evening' },

        // 🩹 Category 3: Wound & Recovery Care
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
    setSelectedLogIndex(historyLogs.length);
  };

  const handleTriggerPreset = (type: 'green' | 'yellow' | 'red' | 'emergency') => {
    const data = PRESET_SCENARIOS[type];
    setPresetScenarioTrigger(data);
    setActiveTab('chat');
  };

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
    setProgressSubTab('checkins');
  };

  // ==========================================
  // RENDER TAB 1: Today (Home Tab - Screen 1)
  // ==========================================
  const renderHomeTab = () => {
    // Group tasks dynamically for the Dashboard segments
    const medicationTasks = todayTasks.filter(t => t.type === 'medication');
    const activityTasks = todayTasks.filter(t => t.type === 'activity');

    const totalMeds = medicationTasks.length;
    const completedMeds = medicationTasks.filter(t => t.completed).length;

    return (
      <div className="home-tab-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
        {/* Top Greeting Row with Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '14px', border: '2px solid #ffffff',
              boxShadow: '0 4px 12px rgba(0, 31, 63, 0.1)'
            }}>
              AÏ
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Recovery Plan</span>
              <strong style={{ fontSize: '16px', color: 'var(--text-main)', fontWeight: '800' }}>Good morning Aïda!</strong>
            </div>
          </div>
          <button className="bell-btn" style={{ 
            width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-glass-card)', 
            border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'var(--transition-fluid)'
          }} onClick={() => triggerMockCheckInDirect('green')} title="Mock checkin stable">
            <CheckCircle2 size={15} style={{ color: 'var(--primary)' }} />
          </button>
        </div>

        {/* Interactive Shalom Recover AI Bubble Hero Card (15s rotation + TTS voice) */}
        <div 
          className="shalom-hero-card"
          onMouseEnter={() => setIsMonitorPaused(true)}
          onMouseLeave={() => setIsMonitorPaused(false)}
        >
          {/* Subtle glossy background orbs */}
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(20px)', pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '130px', height: '130px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', filter: 'blur(16px)', pointerEvents: 'none' }}></div>

          {/* Header Row: Shalom AI Avatar Presence + Live Online + Controls */}
          <div className="shalom-ai-header-row">
            <div 
              className="shalom-ai-presence" 
              onClick={() => {
                const currentMsg = [
                  'Good morning Aïda! Take 2 minutes to check in your pain and vitals so I can keep Dr. Smith and your care team updated.',
                  'Aïda, remember to stay hydrated! Sip water steadily toward your 8-glass goal, and take your scheduled medications with food to prevent nausea.',
                  'Time for your gentle knee rehab! Complete your 3 sets of ankle pumps and quad sets, and take a short supported walk with your walker.',
                  'Remember to keep your incision dressing clean and dry today. Prop your leg on 2 pillows under your calf to keep swelling down.'
                ][monitorSlideIndex];
                toggleHeroSpeech(currentMsg);
              }}
              title={isSpeakingHero ? "Click to stop speaking" : "Tap to hear Shalom AI speak"}
            >
              <div className="shalom-avatar-orb"></div>
              <div className="shalom-presence-info">
                <span className="shalom-ai-name">
                  Shalom Recover AI
                  {isSpeakingHero && (
                    <span className="shalom-audio-wave">
                      <span></span><span></span><span></span>
                    </span>
                  )}
                </span>
                <span className="shalom-live-status">
                  <span className="shalom-status-dot"></span>
                  {isSpeakingHero ? 'Speaking...' : 'Online & Monitoring'}
                </span>
              </div>
            </div>

            {/* Slide Dots + Audio Speak Button + Nav Arrows */}
            <div className="shalom-nav-controls">
              {/* Speaker / Listen toggle button */}
              <button
                type="button"
                className={`shalom-audio-btn ${isSpeakingHero ? 'speaking' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const currentMsg = [
                    'Good morning Aïda! Take 2 minutes to check in your pain and vitals so I can keep Dr. Smith and your care team updated.',
                    'Aïda, remember to stay hydrated! Sip water steadily toward your 8-glass goal, and take your scheduled medications with food to prevent nausea.',
                    'Time for your gentle knee rehab! Complete your 3 sets of ankle pumps and quad sets, and take a short supported walk with your walker.',
                    'Remember to keep your incision dressing clean and dry today. Prop your leg on 2 pillows under your calf to keep swelling down.'
                  ][monitorSlideIndex];
                  toggleHeroSpeech(currentMsg);
                }}
                title={isSpeakingHero ? 'Click to stop / mute voice' : 'Listen to Shalom AI voice'}
              >
                {isSpeakingHero ? (
                  <>
                    <div className="audio-mini-bars">
                      <span></span><span></span><span></span>
                    </div>
                    <VolumeX size={12} />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={13} />
                    <span>Listen</span>
                  </>
                )}
              </button>

              {/* Dot indicators */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`shalom-dot-btn ${monitorSlideIndex === idx ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToSlide(idx);
                    }}
                    title={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Prev / Next */}
              <button
                type="button"
                className="monitor-arrow-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  prevSlide();
                }}
                title="Previous message"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                className="monitor-arrow-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                title="Next message"
              >
                <ChevronRightIcon size={14} />
              </button>
            </div>
          </div>

          {/* Interactive Speech Bubble */}
          <div 
            key={monitorSlideIndex} 
            className="shalom-speech-bubble"
            onClick={() => {
              if (monitorSlideIndex === 0) setShowCheckInForm(true);
              else if (monitorSlideIndex === 1) setHydrationGlasses(prev => Math.min(8, prev + 1));
              else if (monitorSlideIndex === 2) { setActiveTab('plan'); setPlanCategoryFilter('activity'); }
              else if (monitorSlideIndex === 3) { setActiveTab('plan'); setPlanCategoryFilter('wound'); }
            }}
          >
            {monitorSlideIndex === 0 && (
              <>
                <div className="shalom-bubble-tag">
                  <Heart size={11} fill="currentColor" />
                  <span>Daily Morning Triage • Day 6</span>
                </div>
                <p className="shalom-bubble-message">
                  “Good morning Aïda! How are you feeling today? Take 2 minutes to check in your pain &amp; temperature so I can keep Dr. Smith and your care team updated.”
                </p>
              </>
            )}

            {monitorSlideIndex === 1 && (
              <>
                <div className="shalom-bubble-tag">
                  <Droplets size={11} />
                  <span>Diet &amp; Hydration Goal</span>
                </div>
                <p className="shalom-bubble-message">
                  “Aïda, don’t forget your hydration goal! Sip water steadily toward your 8 glasses, and take scheduled medications with a light meal to prevent nausea.”
                </p>
              </>
            )}

            {monitorSlideIndex === 2 && (
              <>
                <div className="shalom-bubble-tag">
                  <Activity size={11} />
                  <span>Physical Therapy &amp; Movement</span>
                </div>
                <p className="shalom-bubble-message">
                  “Time for gentle knee exercises! Let's do your 3 sets of ankle pumps &amp; quad sets, and take a short 5-minute walk with your walker. Stop if you feel sharp pain.”
                </p>
              </>
            )}

            {monitorSlideIndex === 3 && (
              <>
                <div className="shalom-bubble-tag">
                  <ShieldAlert size={11} />
                  <span>Incision &amp; Wound Safety</span>
                </div>
                <p className="shalom-bubble-message">
                  “Remember to keep your incision dressing clean &amp; strictly dry. Propping your leg on 2 pillows under your calf will help keep any swelling down.”
                </p>
              </>
            )}
          </div>

          {/* Action Row */}
          <div className="shalom-action-row">
            {monitorSlideIndex === 0 && (
              <>
                <button
                  type="button"
                  className="shalom-primary-btn"
                  onClick={() => setShowCheckInForm(true)}
                >
                  <Heart size={13} fill="currentColor" />
                  <span>{checkInComplete ? 'Review Check-In' : 'Start Morning Check-In'}</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#ffffff' }}>
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: checkInComplete ? (activeReport?.status === 'Green' ? '#10B981' : activeReport?.status === 'Yellow' ? '#F59E0B' : '#EF4444') : '#94A3B8',
                    boxShadow: checkInComplete ? '0 0 8px #10B981' : 'none'
                  }}></span>
                  <span>{checkInComplete ? `Triage Status: ${activeReport?.status || 'Green'}` : 'Pending Today’s Log'}</span>
                </div>
              </>
            )}

            {monitorSlideIndex === 1 && (
              <>
                <button
                  type="button"
                  className="shalom-primary-btn"
                  onClick={() => setHydrationGlasses(prev => Math.min(8, prev + 1))}
                >
                  <Droplets size={13} />
                  <span>+ Log 1 Glass ({hydrationGlasses}/8)</span>
                </button>

                <span style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>
                  {hydrationGlasses >= 8 ? 'Hydration Goal Reached!' : `${8 - hydrationGlasses} glasses left today`}
                </span>
              </>
            )}

            {monitorSlideIndex === 2 && (
              <>
                <button
                  type="button"
                  className="shalom-primary-btn"
                  onClick={() => {
                    setActiveTab('plan');
                    setPlanCategoryFilter('activity');
                  }}
                >
                  <Activity size={13} />
                  <span>Open PT Exercises</span>
                </button>

                <span style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>
                  {todayTasks.filter(t => t.type === 'activity' && t.completed).length} of {todayTasks.filter(t => t.type === 'activity').length} exercises completed
                </span>
              </>
            )}

            {monitorSlideIndex === 3 && (
              <>
                <button
                  type="button"
                  className="shalom-primary-btn"
                  onClick={() => {
                    setActiveTab('plan');
                    setPlanCategoryFilter('wound');
                  }}
                >
                  <ShieldAlert size={13} />
                  <span>View Wound Protocol</span>
                </button>

                <span style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>
                  Next cold compress: 02:30 PM
                </span>
              </>
            )}
          </div>

          {/* 15s Countdown Progress line */}
          <div className="shalom-timer-bar" style={{ width: `${monitorProgress}%` }}></div>
        </div>

        {/* Talk to Shalom AI - Compact Horizontal Link Card */}
        <div className="glass-card talk-shalom-bar" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '12px 18px',
          borderRadius: '18px',
          border: '1.5px solid var(--border-glass)',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(6, 182, 212, 0.03) 100%)',
          marginBottom: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }} onClick={() => setActiveTab('chat')}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
            flexShrink: 0
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="white" />
              <path d="M12 6.5v5M9.5 9h5" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '2px' }}>
            <strong style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>Talk to Shalom AI</strong>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: '1.3' }}>Ask anything about recovery instructions or pain limits</span>
          </div>
          <ChevronRightIcon size={16} style={{ color: 'var(--primary)' }} />
        </div>

        {/* Today's Tasks Section Header */}
        <div className="section-header-row" style={{ gridColumn: 'span 2', marginBottom: '10px' }}>
          <span className="section-title">Clinical Recovery Dashboard</span>
          <button className="section-link" onClick={() => setActiveTab('plan')}>View full schedule</button>
        </div>

        {/* 4 Core Recovery Dashboard Cards Grid */}
        <div className="home-dashboard-4grid">
          
          {/* Card 1: Scheduled Medications */}
          <div className="dashboard-card-pro">
            <div className="dashboard-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Pill size={14} />
                </div>
                <strong style={{ fontSize: '13px', color: 'var(--text-main)', letterSpacing: '0.2px' }}>
                  Scheduled Medications
                </strong>
              </div>
              <span className="dashboard-card-badge">
                {completedMeds} of {totalMeds} completed
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {medicationTasks.map(task => (
                <div key={task.id} className={`task-card-row ${task.completed ? 'completed' : ''}`} onClick={() => setSelectedTaskId(task.id)}>
                  <div className="task-card-left">
                    <div className="task-card-icon-wrap" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                      <Pill size={13} />
                    </div>
                    <div className="task-card-text">
                      <span className="task-card-title">{task.name}</span>
                      <span className="task-card-subtitle">{task.dose}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="task-card-time">{task.timeHour}</span>
                    <span className={`task-checkbox-indicator ${task.completed ? 'checked' : ''}`} onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskCompleted(task.id);
                    }}>
                      {task.completed ? '✓' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Activities & Limits */}
          <div className="dashboard-card-pro">
            <div className="dashboard-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <Activity size={14} />
                </div>
                <strong style={{ fontSize: '13px', color: 'var(--text-main)', letterSpacing: '0.2px' }}>
                  Activities &amp; Limits
                </strong>
              </div>
              <span className="dashboard-card-badge" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-dark)' }}>
                {activityTasks.filter(t => t.completed).length} of {activityTasks.length} done
              </span>
            </div>
            
            {/* Exercises items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {activityTasks.map(task => (
                <div key={task.id} className={`task-card-row ${task.completed ? 'completed' : ''}`} onClick={() => setSelectedTaskId(task.id)} style={{ padding: '10px' }}>
                  <div className="task-card-left">
                    <span className={`task-checkbox-indicator ${task.completed ? 'checked' : ''}`} style={{ marginRight: '8px' }} onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskCompleted(task.id);
                    }}>
                      {task.completed ? '✓' : ''}
                    </span>
                    <div className="task-card-text">
                      <span className="task-card-title" style={{ fontSize: '11.5px' }}>{task.name}</span>
                    </div>
                  </div>
                  <span className="task-card-time" style={{ fontSize: '10px' }}>{task.timeHour}</span>
                </div>
              ))}
            </div>

            {/* Restrictions list */}
            <div style={{ background: 'rgba(217, 119, 6, 0.06)', padding: '10px 12px', borderRadius: '14px', border: '1px solid rgba(217, 119, 6, 0.15)', marginTop: '8px' }}>
              <strong style={{ fontSize: '10.5px', color: 'var(--color-yellow)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <AlertTriangle size={12} />
                <span>Active Restrictions</span>
              </strong>
              <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <li>Do not lift objects heavier than 10 lbs.</li>
                <li>Do not drive while taking pain medication.</li>
                <li>Keep walking to flat surfaces. No running.</li>
              </ul>
            </div>
          </div>

          {/* Card 3: Incision Care & Dressing */}
          <div className="dashboard-card-pro">
            <div className="dashboard-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red)' }}>
                  <ShieldAlert size={14} />
                </div>
                <strong style={{ fontSize: '13px', color: 'var(--text-main)', letterSpacing: '0.2px' }}>
                  Incision Care &amp; Dressing
                </strong>
              </div>
              <span className="dashboard-card-badge" style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-red)' }}>
                Next due: 6:00 PM
              </span>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', margin: '8px 0 10px 0' }}>
              Dressing change due at <strong>6:00 PM</strong>. Follow surgical sterile steps:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="task-card-row" style={{ padding: '8px 12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: '600' }}>1. Wash hands thoroughly with soap &amp; warm water</span>
              </div>
              <div className="task-card-row" style={{ padding: '8px 12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: '600' }}>2. Inspect wound for excess redness or fluid drainage</span>
              </div>
              <div className="task-card-row" style={{ padding: '8px 12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: '600' }}>3. Clean gently with sterile saline &amp; apply fresh dry gauze</span>
              </div>
              <div className="task-card-row" style={{ padding: '8px 12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: '600' }}>4. Keep incision completely dry during sponge bathing</span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-green)', padding: '8px 12px', borderRadius: '12px', border: '1px solid rgba(5, 150, 105, 0.15)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-green)' }}></span>
              <span style={{ fontSize: '10.5px', color: 'var(--color-green)', fontWeight: '700' }}>Status: Incision clean &amp; healing normally (Day 6)</span>
            </div>
          </div>

          {/* Card 4: Follow-Up Appointments */}
          <div className="dashboard-card-pro">
            <div className="dashboard-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Calendar size={14} />
                </div>
                <strong style={{ fontSize: '13px', color: 'var(--text-main)', letterSpacing: '0.2px' }}>
                  Follow-Up Appointments
                </strong>
              </div>
              <span className="dashboard-card-badge">
                In 6 Days
              </span>
            </div>

            <div style={{ background: 'var(--primary-light)', padding: '12px 14px', borderRadius: '16px', border: '1px solid var(--border-glass)', margin: '10px 0 12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <strong style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>Dr. Robert Smith</strong>
                <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '700', background: '#ffffff', padding: '2px 8px', borderRadius: '8px' }}>Orthopedic Surgical</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: '1.4' }}>
                <Calendar size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span><strong>Sept 5, 2026 at 10:30 AM</strong> • Orthopedic Clinic Suite 400</span>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ClipboardList size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span><strong>Preparation Checklist:</strong> Bring current medications &amp; symptom logs from Days 3–5.</span>
              </span>
            </div>

            <button 
              className="meds-action-btn"
              style={{ fontSize: '11.5px', padding: '10px 14px', width: '100%', textTransform: 'none', borderRadius: '14px' }}
              onClick={() => setShowAppointmentSummaryModal(true)}
            >
              Prep Instructions &amp; Pre-Visit Report
            </button>
          </div>

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
        faqDataset={faqDataset}
        isTtsEnabled={isTtsEnabled}
        selectedVoiceName={selectedVoiceName}
        voices={voices}
        ttsSpeed={ttsSpeed}
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
        icon: '✓'
      },
      {
        id: 'm2',
        day: 2,
        title: 'First Assisted Steps',
        subtitle: 'Weight-bearing initiated with crutches',
        date: 'Aug 24, 2026',
        status: 'completed' as const,
        achievement: 'Two 10-minute walks completed; morning swelling controlled.',
        icon: '✓'
      },
      {
        id: 'm3',
        day: 4,
        title: 'Pain & Swelling Stabilization',
        subtitle: 'Transitioned to mild oral analgesic',
        date: 'Aug 26, 2026',
        status: 'completed' as const,
        achievement: 'Resting pain dropped to 4/10; incision clean and dry.',
        icon: '✓'
      },
      {
        id: 'm4',
        day: 6,
        title: 'Active Rehabilitation Phase',
        subtitle: '75° Knee Flexion • Unassisted indoor walking',
        date: 'Aug 28, 2026 (Today)',
        status: 'current' as const,
        achievement: '12/12 PT sessions completed; 6-day check-in streak!',
        icon: '🌟'
      },
      {
        id: 'm5',
        day: 9,
        title: 'Incision & Suture Healing Review',
        subtitle: 'Wound closure check with Shalom AI',
        date: 'Aug 31, 2026',
        status: 'upcoming' as const,
        achievement: 'Target: Dressing-free showering & scar tissue mobilization.',
        icon: '🔒'
      },
      {
        id: 'm6',
        day: 14,
        title: 'Surgical Clinic Evaluation',
        subtitle: 'In-person follow-up with Dr. Smith',
        date: 'Sept 5, 2026',
        status: 'upcoming' as const,
        achievement: 'Target: 90° flexion & graduation to Phase 2 active recovery.',
        icon: '🏆'
      }
    ];

    // This Week's Wins Data
    const weeklyWins = [
      {
        id: 'streak',
        icon: '🔥',
        title: 'Daily Check-In Streak',
        metric: '6 Days',
        tag: '100% Consistent',
        desc: 'You logged every morning on time, keeping your surgical team fully updated.',
        color: '#FF6B6B'
      },
      {
        id: 'meds',
        icon: '💊',
        title: 'Medication Precision',
        metric: '96% On-Time',
        tag: 'Clinical Standard',
        desc: 'Prescribed anti-inflammatories and supplements taken on schedule with meals.',
        color: '#008C8C'
      },
      {
        id: 'pt',
        icon: '🏃‍♀️',
        title: 'Mobility & PT Progress',
        metric: '+35% Range',
        tag: 'Ahead of Target',
        desc: 'All 12 prescribed quad extensions and heel slides completed this week.',
        color: '#00BFFF'
      },
      {
        id: 'pain',
        icon: '📉',
        title: 'Comfort Improvement',
        metric: '-3 Points Pain',
        tag: 'Healing Faster',
        desc: 'Dropped from 7/10 on Day 1 to a calm 4/10 today, beating the clinical curve.',
        color: '#218C74'
      }
    ];

    // Celebration Hero Banner Component
    const renderCelebrationHero = () => (
      <div className="celebration-hero-card">
        <div className="celebration-hero-orb celebration-hero-orb-1" />
        <div className="celebration-hero-orb celebration-hero-orb-2" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px', zIndex: 5, position: 'relative' }}>
          <div className="celebration-badge gold">
            <Trophy size={14} style={{ color: '#FFD166' }} />
            <span>Day 6 Milestone Achieved</span>
          </div>
          <div className="celebration-badge emerald">
            <Sparkles size={14} style={{ color: '#00FFC2' }} />
            <span>Ahead of Recovery Curve</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', zIndex: 5, position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.4px', lineHeight: 1.2 }}>
              You're making amazing progress, Aïda! 🎉
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', margin: 0, lineHeight: 1.55, maxWidth: '520px' }}>
              Your knee mobility, steady pain reduction, and routine consistency this week put you in the top 10% of ACL recovery adherence. Every small effort is adding up!
            </p>

            <div style={{ display: 'flex', gap: '14px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.95)' }}>
                <Flame size={14} style={{ color: '#FFAA00' }} /> 6-Day Streak
              </span>
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
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
              This Week's Wins 🏅
            </h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>4 of 4 Milestones Hit</span>
        </div>

        <div className="wins-grid">
          {weeklyWins.map(win => (
            <div key={win.id} className="win-card">
              <div className="win-card-header">
                <div className="win-card-icon-wrap" style={{ background: `${win.color}15`, color: win.color }}>
                  <span>{win.icon}</span>
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
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
              Recovery Milestones 🗺️
            </h3>
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
                      background: isCompleted ? '#218C74' : isCurrent ? 'linear-gradient(to bottom, #008C8C, rgba(0,0,0,0.1))' : 'rgba(0,0,0,0.08)',
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
                      color: isCompleted ? '#218C74' : isCurrent ? '#ffffff' : 'var(--text-muted)'
                    }}>
                      {isCompleted ? 'Achieved ✓' : isCurrent ? 'You Are Here 🌟' : 'Upcoming Target'}
                    </span>
                  </div>

                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {m.subtitle} &bull; <strong style={{ color: 'var(--text-main)' }}>{m.date}</strong>
                  </span>

                  <div style={{ 
                    marginTop: '4px', 
                    padding: '8px 12px', 
                    borderRadius: '12px', 
                    background: isCurrent ? 'rgba(0, 140, 140, 0.08)' : 'rgba(255, 255, 255, 0.5)',
                    border: `1px solid ${isCurrent ? 'rgba(0, 140, 140, 0.18)' : 'rgba(0,0,0,0.04)'}`,
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

    // Simple Progress Trends & Healing Trajectory Component
    const renderSimpleTrends = () => (
      <div className="glass-card" style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-glass)', padding: '22px', borderRadius: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Comfort & Recovery Pace
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
              Your Healing Trajectory 📈
            </h3>
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Tap dots to view guide</span>
        </div>

        {/* Positive Clinical Affirmation Callout */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(33, 140, 116, 0.08) 0%, rgba(0, 255, 194, 0.04) 100%)',
          border: '1px solid rgba(33, 140, 116, 0.22)',
          borderRadius: '16px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '50%', background: '#218C74', 
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
          }}>
            <Sparkles size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <strong style={{ fontSize: '12px', color: '#1B6B58' }}>Ahead of Standard Timeline</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Your pain level of <strong>4/10</strong> is below the typical Day 6 postoperative baseline (4.8/10). Tissue inflammation is resolving ahead of schedule!
            </span>
          </div>
        </div>

        {/* The SVG Pain Curve Chart */}
        {renderTrendsChart()}

        {/* 4 Uplifting Vital Recovery Snapshot Chips */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '8px', marginTop: '16px', 
          background: 'rgba(255,255,255,0.5)', 
          padding: '12px', borderRadius: '16px',
          border: '1px solid rgba(0, 140, 140, 0.06)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Knee Flexion</span>
            <strong style={{ fontSize: '13px', color: 'var(--primary)', marginTop: '2px' }}>75°</strong>
            <span style={{ fontSize: '8.5px', color: '#218C74', fontWeight: 700 }}>Ahead of avg</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Temperature</span>
            <strong style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '2px' }}>98.6°F</strong>
            <span style={{ fontSize: '8.5px', color: '#218C74', fontWeight: 700 }}>Optimal</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Swelling</span>
            <strong style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '2px' }}>Level 3/10</strong>
            <span style={{ fontSize: '8.5px', color: '#218C74', fontWeight: 700 }}>-40% since Day 2</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Sleep Quality</span>
            <strong style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '2px' }}>7.5 hrs</strong>
            <span style={{ fontSize: '8.5px', color: '#218C74', fontWeight: 700 }}>Restorative</span>
          </div>
        </div>

        {/* Selected Log Senior Guide */}
        {historyLogs[selectedLogIndex] && (() => {
          const log = historyLogs[selectedLogIndex];
          const summary = getSeniorFriendlySummary(log);
          return (
            <div style={{ 
              marginTop: '16px', 
              padding: '14px 16px', 
              borderRadius: '16px', 
              border: '1px solid rgba(0, 140, 140, 0.1)',
              background: 'linear-gradient(135deg, rgba(0, 140, 140, 0.03) 0%, rgba(255, 255, 255, 0.6) 100%)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary-dark)' }}>
                  Clinical Note &bull; {log.date} ({log.time})
                </span>
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: 800, 
                  color: log.status === 'Green' ? '#218C74' : log.status === 'Yellow' ? '#D97706' : '#DC2626' 
                }}>
                  ● Status: {summary.painText}
                </span>
              </div>
              <p style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
                {summary.painAdvice}
              </p>
            </div>
          );
        })()}
      </div>
    );

    // Personalized "Look How Far You've Come" Shalom AI Letter Component
    const renderShalomLetter = () => (
      <div className="shalom-letter-card">
        <div className="shalom-letter-quote">“</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', position: 'relative', zIndex: 2 }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #e6f7ff 35%, #00BFFF 70%, #008C8C 100%)',
            boxShadow: '0 8px 18px rgba(0, 140, 140, 0.25), inset -2px -2px 6px rgba(0, 140, 140, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Sparkles size={20} style={{ color: '#ffffff' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 800 }}>Shalom (AI Assistant)</strong>
              <span style={{ 
                fontSize: '9.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '8px', 
                background: 'rgba(0, 140, 140, 0.1)', color: 'var(--primary)', textTransform: 'uppercase' 
              }}>
                Recovery Letter
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
              Personalized Milestone Review &bull; August 28, 2026
            </span>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.2px' }}>
            Look how far you've come, Aïda! 🌟
          </h4>

          <p style={{ fontSize: '12.5px', lineHeight: '1.65', color: 'var(--text-main)', margin: 0, fontWeight: 400 }}>
            Take a moment to pause and reflect on <strong>Day 1</strong>. Getting out of bed was an uphill struggle, standing for two minutes pushed your pain to a 7/10, and taking every medicine on time felt exhausting.
          </p>

          <p style={{ fontSize: '12.5px', lineHeight: '1.65', color: 'var(--text-main)', margin: 0, fontWeight: 400 }}>
            Look at where you stand today on <strong>Day 6</strong>:
          </p>

          <div style={{ 
            background: 'rgba(0, 140, 140, 0.04)', 
            borderLeft: '3px solid var(--primary)', 
            padding: '10px 14px', 
            borderRadius: '0 12px 12px 0',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px',
            fontSize: '12px',
            color: 'var(--text-main)'
          }}>
            <div>• <strong>15-Minute Unassisted Walks:</strong> You completed your indoor morning walking routine with confidence.</div>
            <div>• <strong>75° Knee Flexion:</strong> You surpassed your initial 40° restriction, moving closer to the 90° target.</div>
            <div>• <strong>Unbroken 6-Day Check-in Streak:</strong> Giving your surgical team crystal-clear visibility into your healing trajectory.</div>
          </div>

          <p style={{ fontSize: '12.5px', lineHeight: '1.65', color: 'var(--text-main)', margin: 0, fontWeight: 400 }}>
            Recovery is not simply waiting for days to pass — it is the patience, hydration, and gentle movement you show yourself every morning. Dr. Smith’s care team will be delighted to review this at your upcoming Day 14 surgical evaluation.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--primary-dark)', fontWeight: 600 }}>
              With pride & clinical care, your Shalom AI Assistant
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="choice-pill-btn" 
                style={{ fontSize: '11px', padding: '6px 14px', background: 'var(--primary)', color: '#ffffff', fontWeight: 700 }}
                onClick={() => setShowAppointmentSummaryModal(true)}
              >
                View Pre-Visit Report
              </button>
              <button 
                className="choice-pill-btn" 
                style={{ fontSize: '11px', padding: '6px 14px' }}
                onClick={() => setActiveTab('chat')}
              >
                Message Shalom AI
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    // Check-in History List Component
    const renderCheckinHistory = () => (
      <div className="glass-card" style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-glass)', padding: '20px', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Clinical Records
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
              Daily Check-In History 📋
            </h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{historyLogs.length} logs recorded</span>
        </div>

        <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
          {historyLogs.slice().reverse().map((log, idx) => {
            const originalIdx = historyLogs.length - 1 - idx;
            const isSelected = originalIdx === selectedLogIndex;
            return (
              <div 
                key={idx} 
                className={`history-item-row ${isSelected ? 'selected' : ''}`} 
                onClick={() => setSelectedLogIndex(originalIdx)}
                style={{
                  borderColor: isSelected ? 'var(--primary)' : 'var(--border-glass)',
                  background: isSelected ? 'var(--primary-light)' : 'var(--bg-glass-card)',
                  cursor: 'pointer',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div className="history-item-left">
                  <span className="history-item-date" style={{ fontWeight: 700, fontSize: '12.5px' }}>
                    {log.date} &bull; <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{log.time}</span>
                  </span>
                </div>
                <div className="history-item-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ 
                    fontSize: '11.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '8px',
                    background: log.status === 'Green' ? 'rgba(33, 140, 116, 0.1)' : log.status === 'Yellow' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                    color: log.status === 'Green' ? '#218C74' : log.status === 'Yellow' ? '#D97706' : '#DC2626'
                  }}>
                    Pain {log.painLevel}/10
                  </span>
                  <Smile size={18} style={{ 
                    color: log.status === 'Green' ? 'var(--color-green)' : log.status === 'Yellow' ? 'var(--color-yellow)' : 'var(--color-red)'
                  }} />
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
          {/* Left Column: Hero Celebration, Weekly Wins & Shalom Letter */}
          <div className="progress-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {renderCelebrationHero()}
            {renderWeeklyWins()}
            {renderShalomLetter()}
          </div>

          {/* Right Column: Milestones Roadmap, Healing Trajectory & History */}
          <div className="progress-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {renderRecoveryJourney()}
            {renderSimpleTrends()}
            {renderCheckinHistory()}
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
          >
            🎉 Celebration
          </button>
          <button 
            className={`tab-header-btn ${progressSubTab === 'trends' ? 'active' : ''}`}
            onClick={() => setProgressSubTab('trends')}
          >
            🗺️ Milestones
          </button>
          <button 
            className={`tab-header-btn ${progressSubTab === 'checkins' ? 'active' : ''}`}
            onClick={() => setProgressSubTab('checkins')}
          >
            📋 Records
          </button>
        </div>

        {progressSubTab === 'overview' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {renderCelebrationHero()}
            {renderWeeklyWins()}
            {renderRecoveryJourney()}
            {renderSimpleTrends()}
            {renderShalomLetter()}
          </div>
        ) : progressSubTab === 'trends' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {renderRecoveryJourney()}
            {renderSimpleTrends()}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {renderCheckinHistory()}
            {renderSimpleTrends()}
          </div>
        )}
      </div>
    );
  };

  const renderTrendsChart = () => {
    const width = 340;
    const height = 135;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2.5;

    const points = historyLogs.map((log, idx) => {
      const x = padding + (idx / (historyLogs.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - ((log.painLevel - 1) / 9) * chartHeight;
      return { x, y, pain: log.painLevel };
    });

    // Compute expected target recovery progression points
    const targetPoints = historyLogs.map((log, idx) => {
      const x = padding + (idx / (historyLogs.length - 1 || 1)) * chartWidth;
      const dayNum = log.day || (idx + 1);
      // Expected normal curve declines from 6.5 down to 1.5 gradually
      const expectedPain = Math.max(1.5, 6.5 - (dayNum - 1) * 0.95);
      const y = padding + chartHeight - ((expectedPain - 1) / 9) * chartHeight;
      return { x, y };
    });

    let pathD = "";
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
      }
    }

    let targetPathD = "";
    if (targetPoints.length > 0) {
      targetPathD = `M ${targetPoints[0].x} ${targetPoints[0].y}`;
      for (let i = 1; i < targetPoints.length; i++) {
        targetPathD += ` L ${targetPoints[i].x} ${targetPoints[i].y}`;
      }
    }

    return (
      <div className="svg-chart-wrapper" style={{ height: 'auto' }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Severity background color zones for older patient triage context */}
          {/* Mild Zone (Green status log) */}
          <rect x={padding} y={padding} width={chartWidth} height={chartHeight} fill="none" />
          <rect x={padding} y={padding + chartHeight * 0.7} width={chartWidth} height={chartHeight * 0.3} fill="var(--bg-green)" rx="4" />
          {/* Moderate Zone (Yellow status log) */}
          <rect x={padding} y={padding + chartHeight * 0.3} width={chartWidth} height={chartHeight * 0.4} fill="var(--bg-yellow)" rx="4" />
          {/* Severe Zone (Red status log) */}
          <rect x={padding} y={padding} width={chartWidth} height={chartHeight * 0.3} fill="var(--bg-red)" rx="4" />

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
          <line x1={padding} y1={padding + chartHeight * 0.3} x2={width - padding} y2={padding + chartHeight * 0.3} stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
          <line x1={padding} y1={padding + chartHeight * 0.7} x2={width - padding} y2={padding + chartHeight * 0.7} stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
          <line x1={padding} y1={padding + chartHeight} x2={width - padding} y2={padding + chartHeight} stroke="rgba(0,0,0,0.06)" strokeWidth="1.5" />
          
          {points.length > 1 && (
            <path
              d={`${pathD} L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`}
              fill="url(#chartGrad)"
            />
          )}

          {/* Expected Normal Recovery Path (dashed baseline) */}
          {targetPoints.length > 0 && (
            <path 
              d={targetPathD} 
              fill="none" 
              stroke="var(--accent)" 
              strokeWidth="1.8" 
              strokeDasharray="4,4" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}

          <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive node points with labels */}
          {points.map((pt, idx) => {
            const isSelected = idx === selectedLogIndex;
            const log = historyLogs[idx];
            const dateNum = log.date.split(',').pop()?.trim().split(' ').pop() || log.date;
            
            return (
              <g key={idx} onClick={() => setSelectedLogIndex(idx)} style={{ cursor: 'pointer' }}>
                {/* Large clickable overlay */}
                <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />
                
                {/* Selection ring */}
                {isSelected && (
                  <circle cx={pt.x} cy={pt.y} r="8" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="3,3" />
                )}
                
                <circle 
                  cx={pt.x} cy={pt.y} 
                  r={isSelected ? "5" : "4"} 
                  fill={isSelected ? "var(--primary)" : "#fff"} 
                  stroke="var(--primary)" 
                  strokeWidth="2" 
                />
                
                {/* Pain value indicator */}
                <text x={pt.x} y={pt.y - 8} textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--text-main)">
                  {pt.pain}
                </text>
                
                {/* Date/day indicator */}
                <text 
                  x={pt.x} y={height - 2} 
                  textAnchor="middle" 
                  fontSize="8.5" 
                  fontWeight={isSelected ? "800" : "600"} 
                  fill={isSelected ? "var(--primary)" : "var(--text-muted)"}
                >
                  {dateNum}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', background: 'var(--primary)', borderRadius: '1.5px', display: 'inline-block' }}></span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Your Pain</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '0px', borderTop: '2px dashed var(--accent)', display: 'inline-block' }}></span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Expected Curve</span>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER TAB 5: Profile (Settings - Screen 10)
  // ==========================================
  const renderSettingsTab = () => {
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

        {/* My Recovery details section */}
        <div className="profile-menu-section">
          <span className="profile-menu-title">My Recovery</span>
          <div className="profile-menu-card">
            <div className="profile-menu-row">
              <span className="profile-menu-left">Surgery Details</span>
              <span className="profile-menu-value">{normalized?.surgeryType || 'ACL Reconstruction'}</span>
            </div>
            <div className="profile-menu-row">
              <span className="profile-menu-left">Surgeon</span>
              <span className="profile-menu-value">Dr. James Carter</span>
            </div>
            <div className="profile-menu-row">
              <span className="profile-menu-left">Surgery Date</span>
              <span className="profile-menu-value">May 6, 2025</span>
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
              borderColor: isDragging ? 'var(--primary)' : isSuccess ? 'var(--color-green)' : 'rgba(192, 122, 176, 0.35)',
              background: isDragging ? 'rgba(192, 122, 176, 0.05)' : isSuccess ? 'rgba(33, 140, 116, 0.02)' : '#ffffff',
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
              <CheckCircle2 size={18} style={{ color: 'var(--color-green)' }} />
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

        {/* Triage Simulator triggers */}
        <div className="profile-menu-section">
          <span className="profile-menu-title">Simulation triggers</span>
          <div className="profile-menu-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Status Log Trigger:</span>
            <div className="sim-btn-group">
              <button className="sim-pill green" onClick={() => triggerMockCheckInDirect('green')}>Stable</button>
              <button className="sim-pill yellow" onClick={() => triggerMockCheckInDirect('yellow')}>Warning</button>
              <button className="sim-pill red" onClick={() => triggerMockCheckInDirect('red')}>Urgent</button>
              <button className="sim-pill emergency" onClick={() => triggerMockCheckInDirect('emergency')}>Emergency</button>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>AI Chat Flow Trigger:</span>
            <div className="sim-btn-group">
              <button className="sim-pill green" onClick={() => handleTriggerPreset('green')}>Stable Chat</button>
              <button className="sim-pill yellow" onClick={() => handleTriggerPreset('yellow')}>Warning Chat</button>
              <button className="sim-pill red" onClick={() => handleTriggerPreset('red')}>Urgent Chat</button>
              <button className="sim-pill emergency" onClick={() => handleTriggerPreset('emergency')}>Emergency Chat</button>
            </div>
          </div>
        </div>

        {/* Aesthetic Theme Palette section */}
        <div className="profile-menu-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', paddingLeft: '4px' }}>
            <span className="profile-menu-title" style={{ margin: 0, padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={13} style={{ color: 'var(--primary)' }} />
              Aesthetic &amp; Color Palette
            </span>
            <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> Live Switcher
            </span>
          </div>
          <div className="profile-menu-card" style={{ padding: '14px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
              Customize your visual healing sanctuary with curated medical color harmonies:
            </p>
            <div className="theme-picker-grid">
              <button 
                type="button"
                className={`theme-chip-btn ${currentTheme === 'bio-iris' ? 'active' : ''}`}
                onClick={() => setCurrentTheme('bio-iris')}
              >
                <span className="theme-swatch" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)' }}></span>
                <div>
                  <span className="theme-chip-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={11} /> Bio-Iris</span>
                  <span className="theme-chip-desc">Indigo &amp; Cyan</span>
                </div>
              </button>

              <button 
                type="button"
                className={`theme-chip-btn ${currentTheme === 'nordic-sage' ? 'active' : ''}`}
                onClick={() => setCurrentTheme('nordic-sage')}
              >
                <span className="theme-swatch" style={{ background: 'linear-gradient(135deg, #0D9488 0%, #10B981 100%)' }}></span>
                <div>
                  <span className="theme-chip-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Leaf size={11} /> Bio-Sage</span>
                  <span className="theme-chip-desc">Pine &amp; Jade</span>
                </div>
              </button>

              <button 
                type="button"
                className={`theme-chip-btn ${currentTheme === 'cosmic-aurora' ? 'active' : ''}`}
                onClick={() => setCurrentTheme('cosmic-aurora')}
              >
                <span className="theme-swatch" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #00E5FF 100%)' }}></span>
                <div>
                  <span className="theme-chip-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Palette size={11} /> Aurora</span>
                  <span className="theme-chip-desc">Violet &amp; Neon</span>
                </div>
              </button>

              <button 
                type="button"
                className={`theme-chip-btn ${currentTheme === 'rose-sanctuary' ? 'active' : ''}`}
                onClick={() => setCurrentTheme('rose-sanctuary')}
              >
                <span className="theme-swatch" style={{ background: 'linear-gradient(135deg, #E11D48 0%, #F59E0B 100%)' }}></span>
                <div>
                  <span className="theme-chip-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sun size={11} /> Sanctuary</span>
                  <span className="theme-chip-desc">Rose &amp; Amber</span>
                </div>
              </button>
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

        {/* Preferences section */}
        <div className="profile-menu-section">
          <span className="profile-menu-title">Preferences</span>
          <div className="profile-menu-card">
            <div className="profile-menu-row">
              <span className="profile-menu-left">Reminders</span>
              <ChevronRightIcon size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="profile-menu-row">
              <span className="profile-menu-left">Notifications</span>
              <ChevronRightIcon size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="profile-menu-row">
              <span className="profile-menu-left">Privacy &amp; Security</span>
              <ChevronRightIcon size={14} style={{ color: 'var(--text-muted)' }} />
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

        {/* Reminder bottom box */}
        <div className="reminder-footer-card">
          <Clock size={14} style={{ color: 'var(--primary)' }} />
          <span>REMINDER: <strong>{task.timeHour || '8:30 AM'} &bull; Daily</strong></span>
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
    </div>
  );
}

export default App;
