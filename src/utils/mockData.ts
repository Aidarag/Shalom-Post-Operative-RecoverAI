export interface RecoveryLog {
  day: number;
  date: string;
  painLevel: number; // 0-10
  temperature: number; // °F
  mobility: 'None' | 'Limited' | 'Moderate' | 'Good';
  sleepQuality: 'Poor' | 'Fair' | 'Good';
  woundAppearance: 'Normal' | 'Mild Redness' | 'Redness & Swelling' | 'Drainage' | 'Infected';
  medsAdherence: number; // Percentage, e.g. 100
  notes: string;
}

export interface VisitQuestionTemplate {
  specialty: string;
  suggestedQuestions: string[];
}

export const MOCK_RECOVERY_HISTORY: RecoveryLog[] = [
  {
    day: 1,
    date: 'June 21',
    painLevel: 7,
    temperature: 99.1,
    mobility: 'None',
    sleepQuality: 'Poor',
    woundAppearance: 'Normal',
    medsAdherence: 100,
    notes: 'First day home after hip surgery. Sore, sleepy, resting in bed.'
  },
  {
    day: 2,
    date: 'June 22',
    painLevel: 6,
    temperature: 98.9,
    mobility: 'Limited',
    sleepQuality: 'Fair',
    woundAppearance: 'Normal',
    medsAdherence: 100,
    notes: 'Began walking short distances with the walker. Taking pain meds on schedule.'
  },
  {
    day: 3,
    date: 'June 23',
    painLevel: 5,
    temperature: 98.6,
    mobility: 'Limited',
    sleepQuality: 'Fair',
    woundAppearance: 'Normal',
    medsAdherence: 100,
    notes: 'Pain is manageable. Sleeping slightly better. Dressing dry and intact.'
  },
  {
    day: 4,
    date: 'June 24',
    painLevel: 4,
    temperature: 98.7,
    mobility: 'Moderate',
    sleepQuality: 'Good',
    woundAppearance: 'Mild Redness',
    medsAdherence: 100,
    notes: 'Noticed slight redness around the edge of the dressing. No drainage, no fever.'
  },
  {
    day: 5,
    date: 'June 25',
    painLevel: 5,
    temperature: 99.5,
    mobility: 'Limited',
    sleepQuality: 'Fair',
    woundAppearance: 'Redness & Swelling',
    medsAdherence: 75,
    notes: 'Missed morning meds because of stomach upset. Redness seems to have spread slightly, feeling warm.'
  }
];

export const VISIT_QUESTION_TEMPLATES: VisitQuestionTemplate[] = [
  {
    specialty: "Orthopedic Surgery Follow-Up (Hip/Knee/Shoulder)",
    suggestedQuestions: [
      "Is the swelling and redness around my incision normal for this stage of recovery?",
      "When can I transition from a walker to a cane, and eventually walk unassisted?",
      "What is my target range of motion, and am I making appropriate progress?",
      "When is it safe for me to shower normally, drive, or sleep on my side?",
      "How long should I expect to continue outpatient physical therapy?"
    ]
  },
  {
    specialty: "General & Abdominal Surgery Follow-Up",
    suggestedQuestions: [
      "When can I begin lifting objects heavier than 10 pounds?",
      "How should I manage persistent abdominal bloating or mild bowel changes?",
      "Are my incision sites healing properly, and when will the sutures/staples dissolve or be removed?",
      "What is the timeline for returning to work and resuming light cardiovascular exercise?",
      "Should I continue taking stool softeners or dietary fiber supplements?"
    ]
  },
  {
    specialty: "Cardiothoracic Surgery Follow-Up (CABG/Valve)",
    suggestedQuestions: [
      "Is my sternum healing stably, and are there physical limits on pushing/pulling?",
      "What target blood pressure and heart rate ranges are you looking for during recovery?",
      "When will it be safe to resume sexual activity or light driving?",
      "How can I safely increase my walking distance, and should I enroll in cardiac rehabilitation?",
      "Are there specific side effects from my heart medications that I should watch for?"
    ]
  },
  {
    specialty: "Neurosurgery & Spine Follow-Up",
    suggestedQuestions: [
      "Are my lingering neurological symptoms (numbness, tingling) expected to fade over time?",
      "What is the safest sleeping position to support spine alignment?",
      "When is my follow-up imaging (X-Ray/MRI) scheduled to check fusion/healing progress?",
      "What spine precautions (bending, lifting, twisting) must I still observe?",
      "When can I begin physical therapy to build core stability?"
    ]
  }
];

export const SAMPLE_DISCHARGE_TEXTS = [
  {
    title: "Post-Hip Replacement (Orthopedic)",
    text: `DISCHARGE SUMMARY & INSTRUCTIONS
    
PROCEDURE: Left Total Hip Arthroplasty (Anterior Approach)
    
ACTIVITY GUIDELINES:
- Weight-bearing as tolerated with walker. Transition to cane as directed by PT.
- Do not cross legs at the knees or ankles.
- Do not bend hip past 90 degrees (no low chairs, use elevated toilet seat).
- Sleep on back with abduction pillow between legs for the next 4 weeks.
    
WOUND CARE:
- Keep dressing dry and intact. Aquacel dressing in place. Do not remove.
- May shower with water-resistant dressing, but do not submerge in tub.
- Inspect incision daily for erythema, purulent drainage, or warmth.
    
PHARMACOTHERAPY:
- Apixaban (Eliquis) 2.5mg PO BID for 12 days for DVT prophylaxis. First dose tonight.
- Acetaminophen 650mg PO Q6H PRN for mild pain. Max 3000mg/24hr.
- Oxycodone 5mg PO Q4-6H PRN for severe pain. Take with food to prevent nausea.
- Colace 100mg PO BID to prevent opioid-induced constipation.
    
FOLLOW-UP CARE:
- Outpatient physical therapy to start within 72 hours.
- Follow up in clinic with Dr. Chen in 14 days for staple removal.`
  },
  {
    title: "Post-Gallbladder Removal (General)",
    text: `POST-OPERATIVE DISCHARGE INSTRUCTIONS
    
PROCEDURE: Laparoscopic Cholecystectomy
    
ACTIVITY LIMITATIONS:
- No lifting anything greater than 10-15 lbs for the next 4 weeks.
- Avoid strenuous activities or heavy exercises. Walking is highly encouraged.
- You may climb stairs carefully.
    
WOUND & DRESSING CARE:
- Incisions are closed with Dermabond (skin glue) and Steri-Strips.
- May shower after 48 hours. Let soapy water run over incisions; pat dry.
- Do not soak in tub, swim, or submerge incision sites for 2 weeks.
- Mild bruising or hard ridges under the incisions is normal.
    
DIETARY GUIDELINES:
- Advance diet as tolerated. Focus on low-fat, bland foods for the first week.
- Drink plenty of fluids (6-8 glasses of water daily) to avoid constipation.
    
PAIN MANAGEMENT:
- Ibuprofen 400-600mg every 6 hours with food.
- Tramadol 50mg every 6 hours as needed for severe pain.
- Call office if pain is not controlled by medications or if you develop shoulder pain.
    
ALERT SYMPTOMS (Notify Surgeon):
- Temperature > 101.5°F.
- Persistent nausea, vomiting, or inability to keep liquids down.
- Spreading redness, swelling, or foul-smelling yellow drainage from incisions.
- Yellowing of skin or eyes (jaundice).`
  }
];
