import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Clock,
  Pill,
  Sparkles,
  ChevronDown,
  Check
} from 'lucide-react';

export interface WebAppHeaderProps {
  onNavigateToHome: () => void;
  onNavigateToProfile: () => void;
  onNavigateToPlan?: () => void;
  patientName?: string;
}

interface ReminderItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'med' | 'exercise' | 'hydration';
  unread: boolean;
}

export const WebAppHeader: React.FC<WebAppHeaderProps> = ({
  onNavigateToHome,
  onNavigateToProfile,
  onNavigateToPlan,
  patientName = 'Aïda Garba'
}) => {
  const [showReminders, setShowReminders] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [reminders, setReminders] = useState<ReminderItem[]>([
    {
      id: 'rem-1',
      title: 'Medication Reminder',
      message: 'Celebrex 200mg due at 2:00 PM with food.',
      time: 'in 45 mins',
      type: 'med',
      unread: true
    },
    {
      id: 'rem-2',
      title: 'PT Exercise Reminder',
      message: 'Quad sets & ankle pumps session (10 reps).',
      time: '3:30 PM',
      type: 'exercise',
      unread: true
    },
    {
      id: 'rem-3',
      title: 'Hydration Target',
      message: 'Drink 1 glass of water (Target: 64 oz today).',
      time: 'Hourly',
      type: 'hydration',
      unread: false
    }
  ]);

  const unreadCount = reminders.filter(r => r.unread).length;

  const markAllAsRead = () => {
    setReminders(prev => prev.map(r => ({ ...r, unread: false })));
  };

  // Close reminders popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowReminders(false);
      }
    };
    if (showReminders) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReminders]);

  return (
    <header className="web-app-header" role="banner">
      <div className="header-container">
        
        {/* Shalom AI Bubble Logo */}
        <button 
          type="button"
          className="header-brand"
          onClick={onNavigateToHome}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateToHome();
            }
          }}
          aria-label="Shalom AI Home Dashboard"
          title="Shalom AI - Home Dashboard"
        >
          <div className="shalom-bubble-logo" role="img" aria-label="Shalom AI 3D Bubble Logo">
            <div className="bubble-halo" />
            <div className="bubble-sphere">
              <div className="bubble-sheen" />
              <div className="bubble-highlight" />
              <div className="bubble-glow-core" />
            </div>
            <span className="bubble-pulse-dot" title="Shalom AI Continuous Intelligence Active" />
          </div>
          <div className="header-brand-text">
            <div className="header-brand-title-row">
              <strong className="header-brand-title">Shalom</strong>
              <span className="header-brand-ai-badge">AI</span>
            </div>
            <span className="header-brand-subtitle">RecoverAI</span>
          </div>
        </button>

        {/* Right Section: Notification Icon for Reminders + Profile */}
        <div className="header-right">
          
          {/* Notification Icon for Reminders */}
          <div className="header-reminder-container" ref={popoverRef}>
            <button 
              type="button"
              className={`header-icon-btn ${showReminders ? 'active' : ''}`}
              onClick={() => setShowReminders(prev => !prev)}
              aria-label={`Reminders & Notifications (${unreadCount} unread)`}
              aria-expanded={showReminders}
              title="Reminders &amp; Schedule Alerts"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="header-reminder-badge">{unreadCount}</span>
              )}
            </button>

            {/* Reminders Popover Panel */}
            {showReminders && (
              <>
                <div 
                  className="reminder-popover-backdrop" 
                  onClick={() => setShowReminders(false)} 
                  aria-hidden="true"
                />
                <div className="header-reminder-popover" role="dialog" aria-label="Reminders Panel">
                <div className="reminder-popover-header">
                  <div className="reminder-header-title-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '13.5px', color: 'var(--text-main)', fontWeight: 800 }}>
                        Reminders
                      </strong>
                      {unreadCount > 0 && (
                        <span className="reminder-pill-count">{unreadCount} new</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        type="button" 
                        className="reminder-mark-read-btn" 
                        onClick={markAllAsRead}
                      >
                        <Check size={12} style={{ marginRight: '3px' }} /> Mark all read
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Daily medication &amp; rehabilitation reminders
                  </span>
                </div>

                <div className="reminder-items-list">
                  {reminders.map((item) => (
                    <div 
                      key={item.id} 
                      className={`reminder-item ${item.unread ? 'unread' : ''}`}
                      onClick={() => {
                        setReminders(prev => 
                          prev.map(r => r.id === item.id ? { ...r, unread: false } : r)
                        );
                        if (onNavigateToPlan) {
                          setShowReminders(false);
                          onNavigateToPlan();
                        }
                      }}
                    >
                      <div className={`reminder-icon-box ${item.type}`}>
                        {item.type === 'med' && <Pill size={14} />}
                        {item.type === 'exercise' && <Sparkles size={14} />}
                        {item.type === 'hydration' && <Clock size={14} />}
                      </div>
                      <div className="reminder-content">
                        <div className="reminder-title-row">
                          <strong className="reminder-item-title">{item.title}</strong>
                          <span className="reminder-item-time">{item.time}</span>
                        </div>
                        <p className="reminder-item-message">{item.message}</p>
                      </div>
                      {item.unread && <span className="reminder-unread-dot" />}
                    </div>
                  ))}
                </div>

                {onNavigateToPlan && (
                  <div className="reminder-popover-footer">
                    <button 
                      type="button" 
                      className="reminder-footer-action"
                      onClick={() => {
                        setShowReminders(false);
                        onNavigateToPlan();
                      }}
                    >
                      View All Schedule Reminders &rarr;
                    </button>
                  </div>
                )}
              </div>
            </>
            )}
          </div>

          {/* Profile */}
          <div 
            className="header-profile-capsule"
            onClick={onNavigateToProfile}
            role="button"
            tabIndex={0}
            title={`${patientName} • Profile &amp; Settings`}
          >
            <div className="header-avatar-circle">
              <span>AG</span>
              <span className="header-online-status-dot" />
            </div>
            <div className="header-profile-meta">
              <span className="header-profile-name">{patientName}</span>
              <span className="header-profile-role">Profile</span>
            </div>
            <ChevronDown size={13} className="header-profile-arrow" />
          </div>

        </div>

      </div>
    </header>
  );
};
