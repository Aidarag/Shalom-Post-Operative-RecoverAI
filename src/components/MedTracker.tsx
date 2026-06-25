import React, { useState } from 'react';
import { Plus, Check, Clock, Trash2, Calendar, ShieldAlert } from 'lucide-react';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  times: string[]; // ['Morning', 'Afternoon', 'Evening', 'Bedtime']
  instructions: string;
  recipient: string;
  completedDosesForToday?: string[]; // Times checked off today
}

export const MedTracker: React.FC = () => {
  const [meds, setMeds] = useState<Medication[]>([
    {
      id: 'med-1',
      name: 'Apixaban (Eliquis)',
      dosage: '2.5mg (1 pill)',
      times: ['Morning', 'Evening'],
      instructions: 'DVT blood thinner. Take twice daily to prevent blood clots. Complete the full 12 days.',
      recipient: 'Arthur',
      completedDosesForToday: ['Morning']
    },
    {
      id: 'med-2',
      name: 'Acetaminophen (Tylenol)',
      dosage: '650mg (2 pills)',
      times: ['Morning', 'Afternoon', 'Evening', 'Bedtime'],
      instructions: 'For mild to moderate pain. Max 3000mg/24 hours from all sources.',
      recipient: 'Arthur',
      completedDosesForToday: ['Morning', 'Afternoon']
    },
    {
      id: 'med-3',
      name: 'Oxycodone',
      dosage: '5mg (1 pill)',
      times: ['Afternoon'],
      instructions: 'For severe pain. Take only as needed. Always take with food. Risk of dependency.',
      recipient: 'Arthur',
      completedDosesForToday: ['Afternoon']
    },
    {
      id: 'med-4',
      name: 'Colace (Stool Softener)',
      dosage: '100mg',
      times: ['Morning', 'Evening'],
      instructions: 'Take while taking Oxycodone to prevent opioid-induced constipation. Drink plenty of water.',
      recipient: 'Arthur',
      completedDosesForToday: []
    }
  ]);

  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newRecipient, setNewRecipient] = useState('Arthur');
  const [newTimes, setNewTimes] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const availableTimes = ['Morning', 'Afternoon', 'Evening', 'Bedtime'];

  const toggleTimeSelection = (time: string) => {
    setNewTimes(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  const handleAddMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDosage.trim() || newTimes.length === 0) return;

    const newMed: Medication = {
      id: Date.now().toString(),
      name: newName,
      dosage: newDosage,
      instructions: newInstructions,
      recipient: newRecipient,
      times: newTimes,
      completedDosesForToday: []
    };

    setMeds(prev => [...prev, newMed]);
    setNewName('');
    setNewDosage('');
    setNewInstructions('');
    setNewRecipient('Arthur');
    setNewTimes([]);
    setIsAdding(false);
  };

  const handleDeleteMedication = (id: string) => {
    setMeds(prev => prev.filter(med => med.id !== id));
  };

  const toggleDoseCompleted = (medId: string, time: string) => {
    setMeds(prev => prev.map(med => {
      if (med.id !== medId) return med;
      
      const currentCompleted = med.completedDosesForToday || [];
      const updatedCompleted = currentCompleted.includes(time)
        ? currentCompleted.filter(t => t !== time)
        : [...currentCompleted, time];
        
      return {
        ...med,
        completedDosesForToday: updatedCompleted
      };
    }));
  };

  // Group medications for the schedule view
  const scheduleSlots = availableTimes.map(slotName => {
    const medsForSlot = meds.filter(med => med.times.includes(slotName));
    return {
      name: slotName,
      meds: medsForSlot
    };
  });

  return (
    <div className="tool-card">
      <div className="tool-header">
        <div>
          <h2>Post-Operative Medication Tracker</h2>
          <p className="tool-subtitle">Organize surgical recovery medications, track daily compliance, and review safety guidelines.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : 'Add Medication'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddMedication} className="med-form">
          <h3>Add New Recovery Medication</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Medication Name</label>
              <input
                type="text"
                placeholder="e.g., Eliquis, Acetaminophen"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Dosage</label>
              <input
                type="text"
                placeholder="e.g., 2.5mg or 650mg"
                value={newDosage}
                onChange={e => setNewDosage(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Recipient</label>
              <input
                type="text"
                placeholder="e.g., Arthur"
                value={newRecipient}
                onChange={e => setNewRecipient(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Times of Day</label>
              <div className="checkbox-group">
                {availableTimes.map(time => (
                  <button
                    key={time}
                    type="button"
                    className={`checkbox-btn ${newTimes.includes(time) ? 'active' : ''}`}
                    onClick={() => toggleTimeSelection(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group full-width">
              <label>Special Instructions / Notes</label>
              <input
                type="text"
                placeholder="e.g., Take with food. Limit total acetaminophen daily intake."
                value={newInstructions}
                onChange={e => setNewInstructions(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary form-submit-btn">
            <Plus size={16} style={{ marginRight: '6px' }} /> Save Medication
          </button>
        </form>
      )}

      <div className="meds-dashboard-grid">
        {/* Daily Checklist Column */}
        <div className="meds-column checklist-column">
          <div className="column-header">
            <Calendar size={18} className="header-icon" />
            <h3>Today's Post-Op Med Checklist</h3>
          </div>
          
          <div className="slots-list">
            {scheduleSlots.map(slot => (
              <div key={slot.name} className="schedule-slot-card">
                <h4 className="slot-title">
                  <Clock size={14} style={{ marginRight: '6px' }} /> {slot.name}
                </h4>
                
                {slot.meds.length === 0 ? (
                  <p className="no-meds-msg">No medications scheduled.</p>
                ) : (
                  <ul className="slot-meds-list">
                    {slot.meds.map(med => {
                      const isCompleted = med.completedDosesForToday?.includes(slot.name);
                      return (
                        <li 
                          key={med.id} 
                          className={`slot-med-item ${isCompleted ? 'completed' : ''}`}
                          onClick={() => toggleDoseCompleted(med.id, slot.name)}
                        >
                          <div className={`checkbox-indicator ${isCompleted ? 'checked' : ''}`}>
                            {isCompleted && <Check size={12} />}
                          </div>
                          <div className="slot-med-info">
                            <span className="med-name">{med.name}</span>
                            <span className="med-dosage">{med.dosage} ({med.recipient})</span>
                            {med.instructions && (
                              <span className="med-inst-preview">Note: {med.instructions}</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Master List Column */}
        <div className="meds-column master-list-column">
          <div className="column-header">
            <ShieldAlert size={18} className="header-icon" />
            <h3>Active Post-Op Medications ({meds.length})</h3>
          </div>

          {meds.length === 0 ? (
            <div className="empty-meds-state">
              <p>No active medications added yet. Click "Add Medication" above to start building your records.</p>
            </div>
          ) : (
            <div className="med-cards-container">
              {meds.map(med => (
                <div key={med.id} className="med-card-item">
                  <div className="med-card-top">
                    <div>
                      <span className="badge-recipient">{med.recipient}</span>
                      <h4>{med.name}</h4>
                      <p className="med-dosage-text">{med.dosage}</p>
                    </div>
                    <button 
                      className="delete-icon-btn" 
                      onClick={() => handleDeleteMedication(med.id)}
                      title="Delete Medication"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="med-card-body">
                    <div className="med-scheduled-times">
                      <strong>Times:</strong> {med.times.join(', ')}
                    </div>
                    {med.instructions && (
                      <div className="med-special-instructions">
                        <strong>Instructions:</strong> {med.instructions}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="safety-box">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={16} /> Post-Operative Medication Safety Warnings
            </h4>
            <ul>
              <li><strong>Acetaminophen limit:</strong> Do not exceed 3000mg in 24 hours to prevent liver toxicity. Many cold/pain meds contain Acetaminophen.</li>
              <li><strong>Narcotics (Oxycodone):</strong> Use only as needed for severe breakthrough pain. Opioids cause significant drowsiness and severe constipation.</li>
              <li><strong>Blood Thinners (Eliquis):</strong> Crucial for preventing deep vein thrombosis (DVT). Take exactly as scheduled, do not double-dose, and monitor for unusual bleeding or bruising.</li>
              <li><strong>Never adjust dosages</strong> or stop taking medications without discussing it with your surgeon or clinical team first.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
