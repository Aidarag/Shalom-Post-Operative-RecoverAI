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
  Info
} from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { type CheckInAnswers, type CareTeamReport, normalizePatientRecord } from './utils/shalomAgent';
import { extractTextFromPdf } from './utils/pdfParser';

type TabType = 'home' | 'plan' | 'chat' | 'trends' | 'settings';

interface TodayTask {
  id: string;
  name: string;
  dose?: string;
  type: 'medication' | 'activity' | 'checkin';
  timeSlot?: string;
  timeHour?: string;
  completed: boolean;
  instructions?: string;
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
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
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
  const [planSubTab, setPlanSubTab] = useState<'schedule' | 'tasks'>('schedule');
  const [progressSubTab, setProgressSubTab] = useState<'overview' | 'checkins' | 'trends'>('overview');
  const [checklistSpaceFilter, setChecklistSpaceFilter] = useState<'all' | 'medication' | 'wound' | 'exercise' | 'hydration'>('all');
  
  // Sliders Form State (Screen 3)
  const [showCheckInForm, setShowCheckInForm] = useState<boolean>(false);
  const [sliderPain, setSliderPain] = useState<number>(4);
  const [sliderSwelling, setSliderSwelling] = useState<number>(3);
  const [sliderTemp, setSliderTemp] = useState<number>(98.6);
  const [sliderMobility, setSliderMobility] = useState<number>(4);
  const [sliderSleep, setSliderSleep] = useState<number>(7);
  const [sliderMood, setSliderMood] = useState<number>(6);
  const [selectedLogIndex, setSelectedLogIndex] = useState<number>(6);

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
          timeHour: idx === 0 ? '10:00 AM' : idx === 1 ? '2:00 PM' : '8:00 PM',
          completed: false,
          instructions: m.frequency,
          streak: 4 + idx,
          bestTime: 'Morning'
        }));

        const activities: TodayTask[] = (normalized.dischargeInstructions?.activity || []).map((act, idx) => ({
          id: `act-${idx}`,
          name: act,
          type: 'activity',
          timeSlot: 'Upcoming',
          timeHour: idx === 0 ? '11:00 AM' : '6:00 PM',
          completed: false,
          streak: 3 + idx,
          bestTime: 'Afternoon'
        }));

        const checkInTask: TodayTask = {
          id: 'task-checkin',
          name: 'Daily Check-In',
          type: 'checkin',
          timeSlot: 'Log pain & vitals',
          timeHour: 'Morning',
          completed: checkInComplete,
          streak: historyLogs.length,
          bestTime: 'Morning'
        };

        list = [...meds, ...activities, checkInTask];
      }
    } else {
      // Default fallback matching user requirements
      list = [
        { id: 'task-checkin', name: 'Daily Check-In', type: 'checkin', timeSlot: 'Log pain & vitals', timeHour: '08:30 AM', completed: checkInComplete, streak: historyLogs.length, bestTime: 'Morning' },
        { id: 'med-1', name: 'Oxycodone (Pain relief)', dose: '5mg - Take 1 tablet', type: 'medication', timeSlot: 'Oxycodone 5mg', timeHour: '10:00 AM', completed: false, instructions: 'Take with water', streak: 4, bestTime: 'Morning' },
        { id: 'act-1', name: 'Physical Therapy: Knee Exercises', dose: '10 reps, hold 5s', type: 'activity', timeSlot: 'Knee exercises', timeHour: '11:00 AM', completed: false, instructions: 'Do not overextend', streak: 5, bestTime: 'Afternoon' },
        { id: 'med-2', name: 'Aspirin (Blood thinner)', dose: '81mg - Take 1 tablet', type: 'medication', timeSlot: 'Aspirin 81mg', timeHour: '02:00 PM', completed: false, instructions: 'Take with food', streak: 6, bestTime: 'Afternoon' },
        { id: 'act-2', name: 'Physical Therapy: Cold Compress', dose: 'Apply ice pack 20 mins', type: 'activity', timeSlot: 'Cold compress', timeHour: '06:00 PM', completed: false, instructions: 'Wrap in towel', streak: 3, bestTime: 'Evening' },
        { id: 'med-3', name: 'Colace (Stool softener)', dose: '100mg - Take 1 capsule', type: 'medication', timeSlot: 'Colace 100mg', timeHour: '08:00 PM', completed: false, instructions: 'Take with plenty of fluids', streak: 4, bestTime: 'Evening' }
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
        { id: 'task-checkin', name: 'Daily Check-In', type: 'checkin', timeSlot: 'Log pain & vitals', timeHour: '08:30 AM', completed: false, streak: historyLogs.length, bestTime: 'Morning' },
        { id: 'med-1', name: 'Oxycodone (Pain relief)', dose: '5mg - Take 1 tablet', type: 'medication', timeSlot: 'Oxycodone 5mg', timeHour: '10:00 AM', completed: false, instructions: 'Take with water', streak: 4, bestTime: 'Morning' },
        { id: 'act-1', name: 'Physical Therapy: Knee Exercises', dose: '10 reps, hold 5s', type: 'activity', timeSlot: 'Knee exercises', timeHour: '11:00 AM', completed: false, instructions: 'Do not overextend', streak: 5, bestTime: 'Afternoon' },
        { id: 'med-2', name: 'Aspirin (Blood thinner)', dose: '81mg - Take 1 tablet', type: 'medication', timeSlot: 'Aspirin 81mg', timeHour: '02:00 PM', completed: false, instructions: 'Take with food', streak: 6, bestTime: 'Afternoon' },
        { id: 'act-2', name: 'Physical Therapy: Cold Compress', dose: 'Apply ice pack 20 mins', type: 'activity', timeSlot: 'Cold compress', timeHour: '06:00 PM', completed: false, instructions: 'Wrap in towel', streak: 3, bestTime: 'Evening' },
        { id: 'med-3', name: 'Colace (Stool softener)', dose: '100mg - Take 1 capsule', type: 'medication', timeSlot: 'Colace 100mg', timeHour: '08:00 PM', completed: false, instructions: 'Take with plenty of fluids', streak: 4, bestTime: 'Evening' }
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '15px', border: '2px solid #ffffff',
              boxShadow: '0 4px 12px rgba(0, 31, 63, 0.1)'
            }}>
              AÏ
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Recovery Plan</span>
              <strong style={{ fontSize: '17px', color: 'var(--text-main)', fontWeight: '800' }}>Good morning Aïda!</strong>
            </div>
          </div>
          <button className="bell-btn" style={{ 
            width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg-glass-card)', 
            border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'var(--transition-fluid)'
          }} onClick={() => triggerMockCheckInDirect('green')} title="Mock checkin stable">
            <CheckCircle2 size={16} style={{ color: 'var(--primary)' }} />
          </button>
        </div>

        {/* Main Glowing Daily Check-In Card */}
        <div className="main-checkin-glowing-card" style={{
          background: 'linear-gradient(135deg, #001F3F 0%, #008C8C 50%, #00BFFF 100%)',
          borderRadius: '28px',
          padding: '24px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 16px 36px rgba(0, 140, 140, 0.15)',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          cursor: 'pointer'
        }} onClick={() => setShowCheckInForm(true)}>
          {/* Decorative glossy orbs inside card */}
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(20px)' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Monitoring Log
            </div>
            <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>Day 6 of Recovery</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', lineHeight: '1.2', margin: 0 }}>How are you feeling today?</h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5', margin: 0 }}>
              {checkInComplete 
                ? 'Your daily vitals and symptoms are successfully recorded. Tap to adjust check-in values.'
                : 'Take 2 minutes to log your pain level, temperature, and surgical incision status.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <button style={{
              background: '#ffffff', color: '#001F3F', border: 'none', 
              padding: '10px 22px', borderRadius: '18px', fontWeight: '800', 
              fontSize: '12px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}>
              {checkInComplete ? 'Update Log' : 'Start Check-In'}
            </button>
            {checkInComplete && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: '#ffffff', marginLeft: '8px' }}>
                <span style={{ 
                  width: '6px', height: '6px', borderRadius: '50%', 
                  background: activeReport?.status === 'Green' ? '#00FF66' : activeReport?.status === 'Yellow' ? '#FFCC00' : '#FF3B30', 
                  display: 'inline-block', 
                  boxShadow: activeReport?.status === 'Green' ? '0 0 8px #00FF66' : activeReport?.status === 'Yellow' ? '0 0 8px #FFCC00' : '0 0 8px #FF3B30'
                }}></span>
                Report Active ({activeReport?.status || 'Green'})
              </div>
            )}
          </div>
        </div>

        {/* Talk to Shalom AI - Horizontal Link Card */}
        <div className="glass-card talk-shalom-bar" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '16px 20px',
          borderRadius: '24px',
          border: '1.5px solid var(--border-glass)',
          background: 'linear-gradient(135deg, rgba(0, 140, 140, 0.04) 0%, rgba(0, 191, 255, 0.01) 100%)',
          marginBottom: '24px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }} onClick={() => setActiveTab('chat')}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="white" />
              <path d="M12 6.5v5M9.5 9h5" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '2px' }}>
            <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>Talk to Shalom AI</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.3' }}>Ask anything about recovery instructions or pain limits</span>
          </div>
          <ChevronRightIcon size={16} style={{ color: 'var(--primary)' }} />
        </div>

        {/* Today's Tasks Section Header */}
        <div className="section-header-row" style={{ marginBottom: '14px' }}>
          <span className="section-title">Today's Routine</span>
          <button className="section-link" onClick={() => setActiveTab('plan')}>View checklist</button>
        </div>

        {/* Left Column / Main content */}
        <div className="home-main-col" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Section 1: Scheduled Medications */}
          <div className="dashboard-section-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pill size={14} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                  Scheduled Medications
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)' }}>
                {completedMeds} of {totalMeds} completed
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

          {/* Section 2: Wound & Incision Care Checklist */}
          <div className="dashboard-section-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <ShieldAlert size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                Incision Care & Dressing
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', margin: '0 0 10px 0' }}>
              Dressing change due at <strong>6:00 PM</strong>. Follow steps carefully:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="task-card-row" style={{ padding: '8px 12px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-main)', fontWeight: '600' }}>1. Wash hands thoroughly with soap & warm water</span>
              </div>
              <div className="task-card-row" style={{ padding: '8px 12px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-main)', fontWeight: '600' }}>2. Remove old dressing & inspect wound condition</span>
              </div>
              <div className="task-card-row" style={{ padding: '8px 12px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-main)', fontWeight: '600' }}>3. Clean with sterile water; apply clean gauze dressing</span>
              </div>
              <div className="task-card-row" style={{ padding: '8px 12px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-main)', fontWeight: '600' }}>4. Keep incision completely dry during bathing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column / Sidebar elements */}
        <div className="home-side-col" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Section 3: Activities & Restrictions */}
          <div className="glass-card" style={{ padding: '16px', borderRadius: '20px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Activity size={15} style={{ color: 'var(--accent)' }} />
              <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-main)', letterSpacing: '0.3px' }}>Activities & Limits</strong>
            </div>
            
            {/* Exercises items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
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
            <div style={{ background: 'rgba(205,97,51,0.03)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(205,97,51,0.05)' }}>
              <strong style={{ fontSize: '10.5px', color: 'var(--color-yellow)', display: 'block', marginBottom: '4px' }}>⚠️ Active Restrictions</strong>
              <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <li>Do not lift objects heavier than 10 lbs.</li>
                <li>Do not drive while taking pain medication.</li>
                <li>Keep walking to flat surfaces. No running.</li>
              </ul>
            </div>
          </div>

          {/* Section 4: Diet & Hydration */}
          <div className="glass-card" style={{ padding: '16px', borderRadius: '20px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={15} style={{ color: 'var(--primary)' }} />
                <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-main)', letterSpacing: '0.3px' }}>Diet & Hydration</strong>
              </div>
              <strong style={{ fontSize: '12px', color: 'var(--primary)' }}>{hydrationGlasses} / 8 Glasses</strong>
            </div>

            {/* Hydration quick log panel */}
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
              background: 'rgba(255,255,255,0.4)', padding: '8px 12px', borderRadius: '14px', marginBottom: '12px',
              border: '1px solid rgba(0, 140, 140, 0.05)'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hydration Goal</span>
              <button 
                className="choice-pill-btn" 
                style={{ padding: '4px 10px', fontSize: '10px', marginLeft: 'auto', background: 'var(--primary)', color: '#fff' }}
                onClick={() => setHydrationGlasses(prev => Math.min(8, prev + 1))}
              >
                + Log 1 Glass
              </button>
            </div>

            {/* Nutrition Guidelines */}
            <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>High-fiber foods recommended for digestion.</li>
              <li>Avoid alcohol intake during recovery.</li>
              <li>Take your medications with a light meal.</li>
            </ul>
          </div>

          {/* Section 5: Follow-Up Appointments */}
          <div className="glass-card" style={{ padding: '16px', borderRadius: '20px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Calendar size={15} style={{ color: 'var(--primary)' }} />
              <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-main)', letterSpacing: '0.3px' }}>Follow-Up Surgical Visit</strong>
            </div>

            <div style={{ background: 'rgba(0,140,140,0.03)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(0,140,140,0.05)', marginBottom: '10px' }}>
              <strong style={{ fontSize: '11.5px', color: 'var(--text-main)' }}>Dr. Smith &bull; Sept 5</strong>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Post-op evaluation in 6 days at 10:30 AM</span>
            </div>

            <button 
              className="meds-action-btn"
              style={{ fontSize: '11px', padding: '8px 12px', width: '100%', textTransform: 'none' }}
              onClick={() => setShowAppointmentSummaryModal(true)}
            >
              Prep Instructions & Pre-Visit Report
            </button>
          </div>

        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER TAB 2: Plan (Timeline & Tasks list - Screen 2 & 8)
  // ==========================================
  const renderPlanTab = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease-out' }}>
        {/* Sub-tabs header */}
        <div className="tabs-header-row">
          <button 
            className={`tab-header-btn ${planSubTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setPlanSubTab('schedule')}
          >
            Today's Plan
          </button>
          <button 
            className={`tab-header-btn ${planSubTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setPlanSubTab('tasks')}
          >
            Checklist Tasks
          </button>
        </div>

        {planSubTab === 'schedule' ? (
          <>
            {/* Month & Year header */}
            <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px', paddingLeft: '6px' }}>
              {selectedDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
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
              <div className="checkin-prompt-info">
                <span className="checkin-prompt-title">Daily Check-In</span>
                <span className="checkin-prompt-desc">How are you feeling today?</span>
                <button className="checkin-prompt-btn" onClick={() => setShowCheckInForm(true)}>Check in now</button>
              </div>
            </div>

            {/* Today's Schedule timeline */}
            <div style={{ marginBottom: '8px' }}>
              <span className="section-title" style={{ display: 'block', marginBottom: '14px' }}>Today's Schedule</span>
              
              <div className="timeline-list">
                <div className="timeline-vertical-line"></div>
                {todayTasks.map((task) => (
                  <div key={task.id} className={`timeline-item ${task.completed ? 'completed' : ''}`}>
                    <span className="timeline-hour">{task.timeHour}</span>
                    <div className="timeline-dot-anchor"></div>
                    <div className="timeline-card-content" onClick={() => setSelectedTaskId(task.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className="timeline-item-title">{task.name}</span>
                        <p className="timeline-item-desc">{task.dose || task.instructions}</p>
                      </div>
                      <span className={`task-checkbox-indicator ${task.completed ? 'checked' : ''}`} style={{ flexShrink: 0, marginLeft: '12px' }} onClick={(e) => {
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
          </>
        ) : (
          /* Tasks tab (Screen 8) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Space Filters Bar */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '4px' }}>
              {[
                { id: 'all', label: 'All Spaces' },
                { id: 'medication', label: 'Medications' },
                { id: 'wound', label: 'Wound Care' },
                { id: 'exercise', label: 'PT Exercises' },
                { id: 'hydration', label: 'Hydration' }
              ].map(f => (
                <button 
                  key={f.id}
                  onClick={() => setChecklistSpaceFilter(f.id as any)}
                  style={{
                    border: 'none', padding: '6px 14px', borderRadius: '12px', fontSize: '10.5px', fontWeight: '700',
                    background: checklistSpaceFilter === f.id ? 'var(--primary)' : 'rgba(0,0,0,0.03)',
                    color: checklistSpaceFilter === f.id ? 'white' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'var(--transition-fluid)', flexShrink: 0
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Medications Space */}
            {(checklistSpaceFilter === 'all' || checklistSpaceFilter === 'medication') && (
              <div className="dashboard-section-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Pill size={14} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                    Medication Routine
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todayTasks.filter(t => t.type === 'medication').map(task => (
                    <div key={task.id} className={`task-card-row ${task.completed ? 'completed' : ''}`} onClick={() => setSelectedTaskId(task.id)}>
                      <div className="task-card-left">
                        <div className="task-checkbox-indicator checked" style={{ 
                          width: '20px', height: '20px', borderRadius: '50%', border: '1.5px solid var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px',
                          background: task.completed ? 'var(--primary)' : 'transparent', color: task.completed ? '#fff' : 'transparent', fontSize: '10px'
                        }} onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskCompleted(task.id);
                        }}>
                          ✓
                        </div>
                        <span className="task-card-title" style={{ fontSize: '12px' }}>{task.name}</span>
                      </div>
                      <span className="task-card-time" style={{ fontSize: '11px' }}>{task.timeHour}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wound Incision Care Space */}
            {(checklistSpaceFilter === 'all' || checklistSpaceFilter === 'wound') && (
              <div className="dashboard-section-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <ShieldAlert size={14} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                    Wound & Incision Care Checklist
                  </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>✓ Wash hands thoroughly with soap.</li>
                  <li>✓ Inspect wound for redness/swelling (Report to Shalom AI if increased).</li>
                  <li>✓ Clean with sterile water; apply clean gauze.</li>
                  <li>✓ Keep incision dry.</li>
                </ul>
              </div>
            )}

            {/* Rehabilitation Activity Space */}
            {(checklistSpaceFilter === 'all' || checklistSpaceFilter === 'exercise') && (
              <div className="dashboard-section-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Activity size={14} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                    Activity & Exercises
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todayTasks.filter(t => t.type === 'activity').map(task => (
                    <div key={task.id} className={`task-card-row ${task.completed ? 'completed' : ''}`} onClick={() => setSelectedTaskId(task.id)}>
                      <div className="task-card-left">
                        <div className="task-checkbox-indicator checked" style={{ 
                          width: '20px', height: '20px', borderRadius: '50%', border: '1.5px solid var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px',
                          background: task.completed ? 'var(--accent)' : 'transparent', color: task.completed ? '#fff' : 'transparent', fontSize: '10px'
                        }} onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskCompleted(task.id);
                        }}>
                          ✓
                        </div>
                        <span className="task-card-title" style={{ fontSize: '12px' }}>{task.name}</span>
                      </div>
                      <span className="task-card-time" style={{ fontSize: '11px' }}>{task.timeHour}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diet & Hydration Space */}
            {(checklistSpaceFilter === 'all' || checklistSpaceFilter === 'hydration') && (
              <div className="dashboard-section-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={14} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                      Diet & Hydration
                    </span>
                  </div>
                  <strong style={{ fontSize: '11px', color: 'var(--primary)' }}>{hydrationGlasses} of 8 glasses logged</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="choice-pill-btn" 
                    style={{ fontSize: '10px', padding: '6px 12px' }}
                    onClick={() => setHydrationGlasses(prev => Math.min(8, prev + 1))}
                  >
                    + Log Hydration Glass
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // RENDER TAB 3: AI Coach (Sparkles - Screen 6 & 7)
  // ==========================================
  const renderChatTab = () => {
    return (
      <div className="chat-tab-container">
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
        />
      </div>
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

    if (isDesktop) {
      return (
        <div className="progress-desktop-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '32px', animation: 'fadeIn 0.3s ease-out' }}>
          {/* Left Column: Progress, Stats and Guide */}
          <div className="progress-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Recovery Progress Card */}
            <div className="recovery-card" style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-glass)', margin: 0 }}>
              <div className="recovery-card-info">
                <span className="recovery-card-day" style={{ fontSize: '14px' }}>Recovery Progress</span>
                <span className="recovery-card-desc">You're on the right track! Keep following your plan.</span>
              </div>
              <div className="recovery-card-ring">
                <svg className="recovery-ring-svg" viewBox="0 0 100 100">
                  <circle className="recovery-ring-bg" cx="50" cy="50" r="42" />
                  <circle 
                    className="recovery-ring-val" 
                    cx="50" cy="50" r="42" 
                    strokeDasharray="263.89"
                    strokeDashoffset={263.89 - (263.89 * progress) / 100}
                  />
                </svg>
                <div className="recovery-ring-text">
                  <span className="recovery-ring-percent">{progress}%</span>
                  <span className="recovery-ring-lbl">Recovered</span>
                </div>
              </div>
            </div>

            {/* 3 Stats Columns Grid */}
            <div className="stats-grid-3col">
              <div className="stat-box-card">
                <span className="stat-box-lbl">Check-Ins</span>
                <span className="stat-box-num">6/7</span>
                <span className="stat-box-tag">Great job!</span>
              </div>
              <div className="stat-box-card">
                <span className="stat-box-lbl">Plan Adherence</span>
                <span className="stat-box-num">86%</span>
                <span className="stat-box-tag">Excellent</span>
              </div>
              <div className="stat-box-card">
                <span className="stat-box-lbl">Tasks Completed</span>
                <span className="stat-box-num">18/22</span>
                <span className="stat-box-tag">Keep it up!</span>
              </div>
            </div>

            {/* Senior Care Guide Card */}
            {historyLogs[selectedLogIndex] && (() => {
              const log = historyLogs[selectedLogIndex];
              const summary = getSeniorFriendlySummary(log);
              return (
                <div className="glass-card" style={{ 
                  padding: '20px', 
                  borderRadius: '20px', 
                  border: '1px solid var(--border-glass)',
                  background: 'linear-gradient(135deg, rgba(0, 140, 140, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  boxShadow: '0 4px 14px rgba(0,31,63,0.01)',
                  margin: 0
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary-dark)' }}>
                      Senior Care Guide &bull; {log.date}
                    </span>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      Logged at {log.time}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        width: '8px', height: '8px', borderRadius: '50%', 
                        background: log.status === 'Green' ? 'var(--color-green)' : log.status === 'Yellow' ? 'var(--color-yellow)' : 'var(--color-red)'
                      }}></span>
                      <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>
                        Status: {summary.painText} ({log.painLevel}/10)
                      </strong>
                    </div>
                    
                    <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-muted)', fontWeight: 500, margin: 0 }}>
                      {summary.painAdvice}
                    </p>
                    
                    {/* Vitals Summary Grid for Seniors */}
                    <div style={{ 
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', 
                      gap: '8px', marginTop: '8px', 
                      background: 'rgba(255,255,255,0.4)', 
                      padding: '12px', borderRadius: '14px',
                      border: '1px solid rgba(0, 140, 140, 0.05)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Swelling</span>
                        <strong style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>{log.swellingLevel}/10</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Vitals Temp</span>
                        <strong style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>{log.temperature.toFixed(1)}°F</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Sleep</span>
                        <strong style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>{log.sleepLevel}/10</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right Column: Trend Chart & Check-In History List */}
          <div className="progress-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Pain Trend SVG chart */}
            <div className="glass-card" style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-glass)', padding: '20px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="section-title" style={{ fontSize: '16px' }}>Pain Trend</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tap dots to view guide</span>
              </div>
              {renderTrendsChart()}
            </div>

            {/* Check-In History List */}
            <div className="glass-card" style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-glass)', padding: '20px', borderRadius: '24px' }}>
              <span className="section-title" style={{ display: 'block', marginBottom: '12px', fontSize: '16px' }}>Check-In History</span>
              <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
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
                        <span className="history-item-date" style={{ fontWeight: 700, fontSize: '12px' }}>
                          {log.date} &bull; <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{log.time}</span>
                        </span>
                      </div>
                      <div className="history-item-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="history-item-status" style={{ fontWeight: 700, fontSize: '12px' }}>Pain {log.painLevel}</span>
                        <Smile size={16} style={{ 
                          color: log.status === 'Green' ? 'var(--color-green)' : log.status === 'Yellow' ? 'var(--color-yellow)' : 'var(--color-red)'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="progress-scroller">
        {/* Sub-tabs progress */}
        <div className="tabs-header-row">
          <button 
            className={`tab-header-btn ${progressSubTab === 'overview' ? 'active' : ''}`}
            onClick={() => setProgressSubTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-header-btn ${progressSubTab === 'checkins' ? 'active' : ''}`}
            onClick={() => setProgressSubTab('checkins')}
          >
            Check-Ins
          </button>
          <button 
            className={`tab-header-btn ${progressSubTab === 'trends' ? 'active' : ''}`}
            onClick={() => setProgressSubTab('trends')}
          >
            Trends Chart
          </button>
        </div>

        {progressSubTab === 'overview' ? (
          <>
            {/* Recovery Progress Card */}
            <div className="recovery-card" style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-glass)' }}>
              <div className="recovery-card-info">
                <span className="recovery-card-day" style={{ fontSize: '14px' }}>Recovery Progress</span>
                <span className="recovery-card-desc">You're on the right track! Keep following your plan.</span>
              </div>
              <div className="recovery-card-ring">
                <svg className="recovery-ring-svg" viewBox="0 0 100 100">
                  <circle className="recovery-ring-bg" cx="50" cy="50" r="42" />
                  <circle 
                    className="recovery-ring-val" 
                    cx="50" cy="50" r="42" 
                    strokeDasharray="263.89"
                    strokeDashoffset={263.89 - (263.89 * progress) / 100}
                  />
                </svg>
                <div className="recovery-ring-text">
                  <span className="recovery-ring-percent">{progress}%</span>
                  <span className="recovery-ring-lbl">Recovered</span>
                </div>
              </div>
            </div>

            {/* 3 Stats Columns Grid */}
            <div className="stats-grid-3col">
              <div className="stat-box-card">
                <span className="stat-box-lbl">Check-Ins</span>
                <span className="stat-box-num">6/7</span>
                <span className="stat-box-tag">Great job!</span>
              </div>
              <div className="stat-box-card">
                <span className="stat-box-lbl">Plan Adherence</span>
                <span className="stat-box-num">86%</span>
                <span className="stat-box-tag">Excellent</span>
              </div>
              <div className="stat-box-card">
                <span className="stat-box-lbl">Tasks Completed</span>
                <span className="stat-box-num">18/22</span>
                <span className="stat-box-tag">Keep it up!</span>
              </div>
            </div>

            {/* Pain Trend SVG chart */}
            <div className="glass-card" style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="section-title">Pain Trend</span>
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Tap dots to view guide</span>
              </div>
              {renderTrendsChart()}
            </div>

            {/* Senior Care Guide Card */}
            {historyLogs[selectedLogIndex] && (() => {
              const log = historyLogs[selectedLogIndex];
              const summary = getSeniorFriendlySummary(log);
              return (
                <div className="glass-card" style={{ 
                  marginTop: '14px', 
                  padding: '16px', 
                  borderRadius: '20px', 
                  border: '1px solid var(--border-glass)',
                  background: 'linear-gradient(135deg, rgba(0, 140, 140, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  boxShadow: '0 4px 14px rgba(0,31,63,0.01)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary-dark)' }}>
                      Senior Care Guide &bull; {log.date}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Logged at {log.time}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        width: '8px', height: '8px', borderRadius: '50%', 
                        background: log.status === 'Green' ? 'var(--color-green)' : log.status === 'Yellow' ? 'var(--color-yellow)' : 'var(--color-red)'
                      }}></span>
                      <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                        Status: {summary.painText} ({log.painLevel}/10)
                      </strong>
                    </div>
                    
                    <p style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {summary.painAdvice}
                    </p>
                    
                    {/* Vitals Summary Grid for Seniors */}
                    <div style={{ 
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', 
                      gap: '8px', marginTop: '6px', 
                      background: 'rgba(255,255,255,0.4)', 
                      padding: '8px', borderRadius: '12px',
                      border: '1px solid rgba(0, 140, 140, 0.05)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>Swelling</span>
                        <strong style={{ fontSize: '11.5px', color: 'var(--text-main)' }}>{log.swellingLevel}/10</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>Vitals Temp</span>
                        <strong style={{ fontSize: '11.5px', color: 'var(--text-main)' }}>{log.temperature.toFixed(1)}°F</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>Sleep</span>
                        <strong style={{ fontSize: '11.5px', color: 'var(--text-main)' }}>{log.sleepLevel}/10</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        ) : progressSubTab === 'checkins' ? (
          /* Check-In History List (Screen 9) */
          <div className="history-list">
            <span className="section-title" style={{ display: 'block', marginBottom: '8px' }}>Check-In History</span>
            {historyLogs.slice().reverse().map((log, idx) => {
              const originalIdx = historyLogs.length - 1 - idx;
              const isSelected = originalIdx === selectedLogIndex;
              return (
                <div 
                  key={idx} 
                  className={`history-item-row ${isSelected ? 'selected' : ''}`} 
                  onClick={() => {
                    setSelectedLogIndex(originalIdx);
                    setProgressSubTab('overview');
                  }}
                  style={{
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border-glass)',
                    background: isSelected ? 'var(--primary-light)' : 'var(--bg-glass-card)',
                    animation: 'slideInFade 0.2s ease-out'
                  }}
                >
                  <div className="history-item-left">
                    <span className="history-item-date" style={{ fontWeight: 700 }}>
                      {log.date} &bull; <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 500 }}>{log.time}</span>
                    </span>
                  </div>
                  <div className="history-item-right">
                    <span className="history-item-status" style={{ fontWeight: 700 }}>Pain {log.painLevel}</span>
                    <Smile size={16} style={{ 
                      color: log.status === 'Green' ? 'var(--color-green)' : log.status === 'Yellow' ? 'var(--color-yellow)' : 'var(--color-red)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Trends chart details */
          <>
            <div className="glass-card" style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '24px' }}>
              <span className="section-title" style={{ display: 'block', marginBottom: '14px' }}>Recovery Adherence Timeline</span>
              {renderTrendsChart()}
            </div>
            {/* Senior Care Guide Card */}
            {historyLogs[selectedLogIndex] && (() => {
              const log = historyLogs[selectedLogIndex];
              const summary = getSeniorFriendlySummary(log);
              return (
                <div className="glass-card" style={{ 
                  marginTop: '14px', 
                  padding: '16px', 
                  borderRadius: '20px', 
                  border: '1px solid var(--border-glass)',
                  background: 'linear-gradient(135deg, rgba(0, 140, 140, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  boxShadow: '0 4px 14px rgba(0,31,63,0.01)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary-dark)' }}>
                      Senior Care Guide &bull; {log.date}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Logged at {log.time}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        width: '8px', height: '8px', borderRadius: '50%', 
                        background: log.status === 'Green' ? 'var(--color-green)' : log.status === 'Yellow' ? 'var(--color-yellow)' : 'var(--color-red)'
                      }}></span>
                      <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                        Status: {summary.painText} ({log.painLevel}/10)
                      </strong>
                    </div>
                    <p style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {summary.painAdvice}
                    </p>
                  </div>
                </div>
              );
            })()}
          </>
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
          <rect x={padding} y={padding + chartHeight * 0.7} width={chartWidth} height={chartHeight * 0.3} fill="rgba(33, 140, 116, 0.05)" rx="4" />
          {/* Moderate Zone (Yellow status log) */}
          <rect x={padding} y={padding + chartHeight * 0.3} width={chartWidth} height={chartHeight * 0.4} fill="rgba(205, 97, 51, 0.05)" rx="4" />
          {/* Severe Zone (Red status log) */}
          <rect x={padding} y={padding} width={chartWidth} height={chartHeight * 0.3} fill="rgba(179, 57, 57, 0.05)" rx="4" />

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
              stroke="rgba(0, 140, 140, 0.45)" 
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
                  fill={isSelected ? "var(--primary-dark)" : "var(--text-muted)"}
                >
                  {dateNum}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', background: 'var(--primary)', borderRadius: '1.5px', display: 'inline-block' }}></span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Your Pain</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '0px', borderTop: '2px dashed rgba(0, 140, 140, 0.6)', display: 'inline-block' }}></span>
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
          <div className="detail-hero-pill" style={{ color: task.completed ? 'var(--color-green)' : 'var(--color-yellow)' }}>
            {task.completed ? 'Today: Taken ✓' : 'Today: Pending'}
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
      {/* Decorative ambient gradients */}
      <div className="decor-orb pink"></div>
      <div className="decor-orb blue"></div>
      <div className="decor-orb green"></div>

      {/* Centered Mobile Web Viewport matching Aïda mockup */}
      <div className="web-app-viewport">
        {/* Viewport-level animated background orbs */}
        <div className="screen-orb teal"></div>
        <div className="screen-orb blue"></div>

        {/* Core Screen */}
        <div className="viewport-screen">
          {renderActiveTabContent()}
        </div>

        {/* Bottom Floating Navigation bar with signature floating center sphere */}
        <nav className="viewport-tab-bar">
          {/* Desktop Sidebar Branding Logo */}
          <div className="sidebar-logo-area" style={{ display: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="white" />
                  <path d="M12 6.5v5M9.5 9h5" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '16px', color: 'var(--text-main)', lineHeight: '1.2', fontWeight: 800 }}>Shalom</strong>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>Recovery AI</span>
              </div>
            </div>
          </div>

          <button 
            className={`tab-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => { setShowCheckInForm(false); setSelectedTaskId(null); setActiveTab('home'); }}
          >
            <Home size={18} />
            <span>Today</span>
          </button>

          <button 
            className={`tab-item ${activeTab === 'plan' ? 'active' : ''}`}
            onClick={() => { setShowCheckInForm(false); setSelectedTaskId(null); setActiveTab('plan'); }}
          >
            <Calendar size={18} />
            <span>Plan</span>
          </button>

          {/* Floating center sphere AI Assistant button */}
          <button 
            className={`tab-item chat-btn-floating ${activeTab === 'chat' ? 'active' : ''}`} 
            onClick={() => { setShowCheckInForm(false); setSelectedTaskId(null); setActiveTab('chat'); }}
            title="Shalom (AI Assistant)"
          >
            <div className="tab-chat-sphere"></div>
            <span className="sidebar-chat-label" style={{ display: 'none' }}>AI Assistant</span>
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
        </nav>
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
                style={{ border: 'none', background: 'rgba(0,0,0,0.04)', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 800 }}>Dr. Carter &bull; Post-Op Follow-Up</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5', margin: 0 }}>
              Scheduled for <strong>September 5, 2026 at 10:30 AM</strong>. Please review the clinical preparation instructions and share your recovery history below.
            </p>

            {/* Before Appointment Instructions */}
            <div style={{ background: 'rgba(0,140,140,0.03)', padding: '14px', borderRadius: '16px', border: '1px solid rgba(0,140,140,0.05)', marginBottom: '18px', marginTop: '16px' }}>
              <strong style={{ fontSize: '12px', color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>📋 Preparation Guidelines</strong>
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
