/**
 * ============================================================================
 * SHALOM RECOVERAI - KNEE INJURY & RECOVERY MEDICAL KNOWLEDGE BASE
 * ============================================================================
 * 
 * Sourced directly from approved clinical authorities:
 * - AAOS / OrthoInfo (American Academy of Orthopaedic Surgeons)
 * - NIH / MedlinePlus (National Library of Medicine)
 * - CDC (Centers for Disease Control and Prevention - Safety & Red Flags)
 * - NHS / NHS Inform (National Health Service - Symptoms & Triage)
 * - Mass General Hospital (MGH Sports Medicine - Rehabilitation Protocols)
 * 
 * NOTE: This is NOT an FAQ dataset. These are modular, structured clinical
 * knowledge chunks used for evidence retrieval, relevance ranking, and
 * personalized response synthesis by Shalom AI.
 */

export type MedicalSource = 
  | 'AAOS / OrthoInfo'
  | 'NIH / MedlinePlus'
  | 'CDC'
  | 'NHS'
  | 'Mass General';

export type KneeTopic = 
  | 'total_knee_replacement'
  | 'acl_injury_reconstruction'
  | 'meniscus_tear_repair'
  | 'meniscectomy'
  | 'collateral_ligaments'
  | 'blood_clots_vte'
  | 'infection_wound_safety'
  | 'rehabilitation_exercises'
  | 'pain_swelling_management'
  | 'home_safety_adl'
  | 'general_knee_injury';

export type SurgeryType = 
  | 'total_knee_replacement'
  | 'acl_reconstruction'
  | 'meniscus_repair'
  | 'arthroscopic_meniscectomy'
  | 'collateral_ligament_injury'
  | 'general_knee_injury';

export type RecoveryStage = 
  | 'acute_0_7_days'
  | 'early_1_6_weeks'
  | 'mid_6_12_weeks'
  | 'late_12_plus_weeks'
  | 'all_stages';

export type ClinicalUrgency = 
  | 'emergency_911'
  | 'urgent_call_surgeon'
  | 'discuss_at_next_visit'
  | 'standard_recovery';

export interface KnowledgeChunk {
  id: string;
  source: MedicalSource;
  sourceUrl: string;
  topic: KneeTopic;
  title: string;
  applicableSurgeries: SurgeryType[];
  recoveryStages: RecoveryStage[];
  urgencyLevel: ClinicalUrgency;
  keywords: string[];
  clinicalFacts: string[];
  summary: string;
  contraindications?: string[];
  redFlags?: string[];
}

export const KNEE_MEDICAL_KNOWLEDGE_BASE: KnowledgeChunk[] = [
  // ==========================================================================
  // 1. CDC - SAFETY & RED FLAGS (DVT, PE, SURGICAL SITE INFECTIONS)
  // ==========================================================================
  {
    id: 'cdc_dvt_symptoms_01',
    source: 'CDC',
    sourceUrl: 'https://www.cdc.gov/blood-clots/about/',
    topic: 'blood_clots_vte',
    title: 'Deep Vein Thrombosis (DVT) Warning Signs & Symptoms in the Lower Extremity',
    applicableSurgeries: ['total_knee_replacement', 'acl_reconstruction', 'meniscus_repair', 'arthroscopic_meniscectomy', 'general_knee_injury'],
    recoveryStages: ['acute_0_7_days', 'early_1_6_weeks', 'all_stages'],
    urgencyLevel: 'urgent_call_surgeon',
    keywords: ['blood clot', 'dvt', 'calf', 'calf pain', 'swelling in one leg', 'warmth', 'redness', 'tenderness', 'cramping', 'shin'],
    clinicalFacts: [
      'Deep Vein Thrombosis (DVT) occurs when a blood clot forms in a deep vein, most commonly in the calf, thigh, or pelvis following orthopedic surgery.',
      'Classic symptoms include swelling in one leg or calf that does not improve with elevation, tenderness or pain in the calf (often felt when flexing the foot upward), skin that is visibly red or discolored, and skin that feels warm or hot to the touch compared to the other leg.',
      'Orthopedic knee procedures, immobility, and tissue trauma significantly increase the risk of DVT during the first 6 weeks post-operatively.',
      'Patients must not massage a suspected blood clot, as rubbing can dislodge the clot into the bloodstream.'
    ],
    summary: 'DVT presents with unilateral calf swelling, redness, noticeable warmth, and localized calf tenderness. Suspected DVT requires immediate medical evaluation by the surgeon or acute care team.',
    redFlags: [
      'Calf swelling that is tense and painful',
      'Calf redness or purplish discoloration',
      'Skin on the calf that feels distinctly hotter than the other leg',
      'Pain when gently pulling toes toward the knee (Homan sign context)'
    ],
    contraindications: ['Never massage, vigorously rub, or apply direct heat wraps to a suspected DVT area.']
  },
  {
    id: 'cdc_pe_emergency_02',
    source: 'CDC',
    sourceUrl: 'https://www.cdc.gov/blood-clots/about/',
    topic: 'blood_clots_vte',
    title: 'Pulmonary Embolism (PE) Life-Threatening Emergency Protocol',
    applicableSurgeries: ['total_knee_replacement', 'acl_reconstruction', 'meniscus_repair', 'arthroscopic_meniscectomy', 'general_knee_injury'],
    recoveryStages: ['all_stages'],
    urgencyLevel: 'emergency_911',
    keywords: ['shortness of breath', 'chest pain', 'breathing difficulty', 'pulmonary embolism', 'pe', 'coughing blood', 'rapid pulse', 'dizziness', 'fainting', 'collapse'],
    clinicalFacts: [
      'Pulmonary Embolism (PE) occurs when a blood clot breaks free from a deep vein in the leg and travels to the lungs, blocking pulmonary blood flow.',
      'PE is a medical emergency that can be fatal if not treated immediately with emergency interventions.',
      'Primary signs include sudden, unexplained shortness of breath or rapid breathing.',
      'Sharp, stabbing chest pain that feels worse with deep inhalation, coughing, or bending.',
      'Rapid or irregular heartbeat (tachycardia), coughing up pink or bloody phlegm, severe lightheadedness, dizziness, or fainting.'
    ],
    summary: 'Pulmonary embolism presents with sudden shortness of breath, sharp chest pain with breathing, rapid pulse, and dizziness. This is a 911 emergency requiring immediate hospital evaluation.',
    redFlags: [
      'Sudden onset of shortness of breath',
      'Chest pain with inspiration or coughing',
      'Coughing up blood or blood-tinged mucus',
      'Sudden lightheadedness, syncopal episode, or loss of consciousness'
    ]
  },
  {
    id: 'cdc_vte_prevention_03',
    source: 'CDC',
    sourceUrl: 'https://www.cdc.gov/blood-clots/risk-factors/ha-vte.html',
    topic: 'blood_clots_vte',
    title: 'Healthcare-Associated VTE Prevention & Mobility Rules',
    applicableSurgeries: ['total_knee_replacement', 'acl_reconstruction', 'meniscus_repair', 'arthroscopic_meniscectomy'],
    recoveryStages: ['acute_0_7_days', 'early_1_6_weeks'],
    urgencyLevel: 'standard_recovery',
    keywords: ['prevention', 'blood thinner', 'aspirin', 'anticoagulant', 'ted hose', 'compression stockings', 'ankle pumps', 'walking', 'circulation'],
    clinicalFacts: [
      'Early mobilization is one of the most effective ways to prevent blood clots; calf muscles contract during walking, pumping venous blood back toward the heart.',
      'Ankle pumps (flexing and pointing the feet) should be performed 10 to 20 times every hour while awake to prevent blood pooling in lower leg veins.',
      'Surgeon-prescribed blood thinners (such as Aspirin 81 mg twice daily, Enoxaparin/Lovenox, Apixaban/Eliquis, or Xarelto) must be taken exactly on schedule without missed doses.',
      'Graduated compression stockings (TED hose) or pneumatic compression boots should be worn as directed by the hospital team, usually for 2 to 6 weeks after surgery.',
      'Staying well-hydrated prevents blood viscosity from thickening.'
    ],
    summary: 'Preventing clots requires taking prescribed blood thinners on time, performing hourly ankle pumps, wearing compression stockings, and taking short, frequent walks.'
  },
  {
    id: 'cdc_ssi_wound_infection_04',
    source: 'CDC',
    sourceUrl: 'https://www.cdc.gov/surgical-site-infections/index.html',
    topic: 'infection_wound_safety',
    title: 'Surgical Site Infection (SSI) Identification & Red Flags',
    applicableSurgeries: ['total_knee_replacement', 'acl_reconstruction', 'meniscus_repair', 'arthroscopic_meniscectomy'],
    recoveryStages: ['acute_0_7_days', 'early_1_6_weeks'],
    urgencyLevel: 'urgent_call_surgeon',
    keywords: ['infection', 'fever', 'pus', 'yellow drainage', 'green drainage', 'odor', 'redness spreading', 'warmth', 'chills', 'surgical site'],
    clinicalFacts: [
      'Surgical site infections can occur in the skin, subcutaneous tissue, or deep around the knee prosthetic implant or ligament graft.',
      'Key signs include persistent fever above 101.0°F (38.3°C) or shaking chills.',
      'Erythema (redness) that spreads more than 2 inches beyond the incision border, or red streaks traveling up the leg.',
      'Thick, cloudy, yellowish, or greenish purulent discharge leaking from the incision, especially if accompanied by a foul odor.',
      'Incision edges pulling apart (dehiscence) or sudden sharp increase in local pain that does not respond to prescribed medication.',
      'Mild post-op pinkness along the suture line and mild warmth are normal healing responses; spreading fiery redness and burning heat are not.'
    ],
    summary: 'Surgical site infections are marked by fever over 101°F, spreading redness > 2 inches from incision, cloudy or foul-smelling drainage, and opening of incision edges. Requires prompt call to the surgical team.',
    redFlags: [
      'Fever > 101.0°F (38.3°C) or chills',
      'Redness expanding significantly beyond the incision edges',
      'Opaque yellow, green, or foul-smelling wound drainage',
      'Separation or gaping of wound edges'
    ]
  },

  // ==========================================================================
  // 2. NIH / MEDLINEPLUS - DISCHARGE, WOUND CARE, AND AFTERCARE
  // ==========================================================================
  {
    id: 'medline_tkr_discharge_incision_01',
    source: 'NIH / MedlinePlus',
    sourceUrl: 'https://medlineplus.gov/ency/patientinstructions/000681.htm',
    topic: 'infection_wound_safety',
    title: 'Knee Replacement Discharge Instructions: Incision Care & Bathing Precautions',
    applicableSurgeries: ['total_knee_replacement'],
    recoveryStages: ['acute_0_7_days', 'early_1_6_weeks'],
    urgencyLevel: 'standard_recovery',
    keywords: ['dressing', 'bandage', 'shower', 'bath', 'soak', 'staples', 'steri-strips', 'incisions', 'wound care', 'washing'],
    clinicalFacts: [
      'The surgical dressing must be kept clean, dry, and undisturbed until your surgical team instructs you to change or remove it.',
      'Never submerge your knee in a bathtub, swimming pool, hot tub, or lake until your surgeon confirms the incision is completely closed and sealed (typically 4 to 6 weeks).',
      'When cleared for showering, use a waterproof sleeve or plastic barrier to protect the dressing; do not let high-pressure water spray directly onto the healing wound.',
      'If surgical tape strips (Steri-Strips) or skin glue were used, do not pick, peel, or scratch them off; allow them to fall off naturally over 10 to 14 days.',
      'Pat the skin dry with a fresh, clean towel; never rub or scrub the incision area.',
      'Do not apply antibiotic ointments, vitamin E, lotions, or scar creams to the incision unless specifically ordered by your surgeon.'
    ],
    summary: 'Keep knee dressings clean and dry. Strictly avoid submerging the knee in baths, pools, or hot tubs. Do not pick at surgical tape strips or apply unprescribed creams.',
    contraindications: [
      'Do not soak knee in a tub or pool.',
      'Do not scrub or rub incision.',
      'Do not apply over-the-counter ointments or creams without surgeon permission.'
    ]
  },
  {
    id: 'medline_tkr_activity_mobility_02',
    source: 'NIH / MedlinePlus',
    sourceUrl: 'https://medlineplus.gov/ency/patientinstructions/000681.htm',
    topic: 'total_knee_replacement',
    title: 'Knee Replacement Discharge: Walking Routine, Weight-Bearing & Home Safety',
    applicableSurgeries: ['total_knee_replacement'],
    recoveryStages: ['acute_0_7_days', 'early_1_6_weeks'],
    urgencyLevel: 'standard_recovery',
    keywords: ['walking', 'walker', 'crutches', 'cane', 'weight-bearing', 'stairs', 'tripping', 'rugs', 'home setup', 'exercise routine'],
    clinicalFacts: [
      'Patients should take short, frequent walks (5 to 10 minutes, 3 to 4 times daily) rather than one long, exhausting walk.',
      'Use your prescribed assistive device (walker, crutches, or cane) exactly as instructed by physical therapy until cleared by your surgeon to bear full weight unsupported.',
      'Maintain an upright posture while walking; avoid leaning excessively over your walker or looking down at your feet.',
      'Home safety: Remove throw rugs, loose electrical cords, and clutter from walking paths to prevent catastrophic falls.',
      'When climbing stairs: Step up with the non-operated (good) leg first ("up with the good"), then bring the operated leg and crutch up to the same step.',
      'When descending stairs: Step down with the crutch and operated leg first ("down with the bad"), then step down with the stronger leg.'
    ],
    summary: 'Walk 5-10 minutes 3 times daily with your walker. Remove throw rugs at home to prevent falls. Stair rule: Lead with good leg going up, lead with operated leg going down.'
  },
  {
    id: 'medline_tkr_pain_swelling_ice_03',
    source: 'NIH / MedlinePlus',
    sourceUrl: 'https://medlineplus.gov/ency/patientinstructions/000681.htm',
    topic: 'pain_swelling_management',
    title: 'Post-Op Knee Pain Control, Ice Application, and Elevation Mechanics',
    applicableSurgeries: ['total_knee_replacement', 'acl_reconstruction', 'meniscus_repair', 'arthroscopic_meniscectomy'],
    recoveryStages: ['acute_0_7_days', 'early_1_6_weeks'],
    urgencyLevel: 'standard_recovery',
    keywords: ['ice', 'elevation', 'swelling', 'pain relief', 'tylenol', 'cold therapy', 'pillows', 'straight leg'],
    clinicalFacts: [
      'Elevation reduces post-operative edema: Place pillows under the calf and ankle so the knee and foot are elevated above heart level.',
      'CRITICAL: Do NOT place pillows directly beneath the knee joint itself, as keeping the knee bent can cause a permanent flexion contracture (inability to straighten the knee).',
      'Ice should be applied for 15 to 20 minutes at a time, several times a day (especially after physical therapy and walking).',
      'Always place a thin cloth or towel between the ice pack and skin to prevent frostbite; never apply ice directly to bare skin.',
      'Take prescribed pain medications roughly 30 to 45 minutes prior to scheduled physical therapy to allow comfortable movement without excessive pain spikes.',
      'Mild warmth and swelling in the knee are normal post-op physiological responses that can persist for 3 to 6 months as tissues rebuild.'
    ],
    summary: 'Elevate with pillows under the calf and foot, NEVER directly under the knee. Ice 15-20 minutes with a cloth barrier. Mild warmth and swelling are normal for weeks post-op.',
    contraindications: ['Never put pillows directly under the knee joint, as this promotes permanent knee stiffness and extension loss.']
  },
  {
    id: 'medline_cl_aftercare_04',
    source: 'NIH / MedlinePlus',
    sourceUrl: 'https://medlineplus.gov/ency/patientinstructions/000671.htm',
    topic: 'collateral_ligaments',
    title: 'Medial & Lateral Collateral Ligament (MCL/LCL) Sprains & Aftercare',
    applicableSurgeries: ['collateral_ligament_injury', 'general_knee_injury'],
    recoveryStages: ['acute_0_7_days', 'early_1_6_weeks'],
    urgencyLevel: 'standard_recovery',
    keywords: ['mcl', 'lcl', 'collateral ligament', 'inner knee pain', 'outer knee', 'hinged brace', 'rice protocol', 'crutches'],
    clinicalFacts: [
      'The medial collateral ligament (MCL) runs along the inside of the knee, and the lateral collateral ligament (LCL) runs along the outside, providing side-to-side stability.',
      'Most isolated MCL injuries heal without surgery using R.I.C.E. (Rest, Ice, Compression, Elevation), protected weight-bearing with crutches, and a hinged knee brace.',
      'A hinged knee brace protects the ligament against sideways valgus or varus twisting forces while allowing safe flexion and extension.',
      'Physical therapy focuses on quadriceps and hamstring strengthening to provide muscular stability around the healing ligament.',
      'Surgery is usually reserved for complete tears involving multiple ligaments or high-grade LCL tears.'
    ],
    summary: 'Most MCL tears heal non-operatively with a hinged knee brace, R.I.C.E., crutches, and physical therapy. Avoid sideways twisting movements.'
  },
  {
    id: 'medline_acl_aftercare_05',
    source: 'NIH / MedlinePlus',
    sourceUrl: 'https://medlineplus.gov/ency/patientinstructions/000582.htm',
    topic: 'acl_injury_reconstruction',
    title: 'Anterior Cruciate Ligament (ACL) Injury & Post-Op Aftercare',
    applicableSurgeries: ['acl_reconstruction', 'general_knee_injury'],
    recoveryStages: ['acute_0_7_days', 'early_1_6_weeks', 'mid_6_12_weeks'],
    urgencyLevel: 'standard_recovery',
    keywords: ['acl', 'acl reconstruction', 'graft', 'pop', 'knee giving way', 'crutches', 'knee extension', 'quadriceps'],
    clinicalFacts: [
      'The ACL prevents the tibia from sliding forward relative to the femur and provides rotational stability during cutting and pivoting.',
      'Early post-operative goal is achieving full passive knee extension (0 degrees) identical to the opposite knee; achieving extension early prevents long-term walking limp.',
      'Quadriceps activation (quad sets, straight leg raises) must be initiated immediately to prevent arthrogenic muscle inhibition.',
      'Crutches and post-op knee brace locked in extension are worn for ambulation until the patient can perform a straight leg raise without extension lag.',
      'Return to high-demand cutting sports requires 6 to 12 months of structured neuromuscular and strength rehabilitation.'
    ],
    summary: 'ACL recovery prioritizes restoring full 0-degree extension immediately, reactivating the quadriceps, and protecting the graft with crutches until quad strength returns.'
  },
  {
    id: 'medline_meniscus_aftercare_06',
    source: 'NIH / MedlinePlus',
    sourceUrl: 'https://medlineplus.gov/ency/patientinstructions/000585.htm',
    topic: 'meniscus_tear_repair',
    title: 'Meniscus Injury & Tear Aftercare: Repair vs Meniscectomy',
    applicableSurgeries: ['meniscus_repair', 'arthroscopic_meniscectomy'],
    recoveryStages: ['acute_0_7_days', 'early_1_6_weeks'],
    urgencyLevel: 'standard_recovery',
    keywords: ['meniscus', 'cartilage', 'meniscus repair', 'meniscectomy', 'catching', 'locking', 'joint line pain', 'weight bearing'],
    clinicalFacts: [
      'The menisci are two C-shaped shock-absorbing fibrocartilage pads between the femur and tibia.',
      'Meniscus Repair (suturing the torn edges back together) requires strict protected weight-bearing (crutches) and restricting deep flexion past 90 degrees for 4 to 6 weeks to allow the biological repair to heal.',
      'Partial Meniscectomy (trimming away the torn flap) permits immediate weight-bearing as tolerated (WBAT) and quicker return to light activities (2 to 4 weeks), because there is no suture line that requires biological knitting.',
      'Patients must follow their surgeon specific operative note to know whether their meniscus was repaired or trimmed.'
    ],
    summary: 'Meniscus repair requires crutches and flexion restricted to 90° for 4-6 weeks to protect sutures. Partial meniscectomy allows immediate weight-bearing as tolerated.'
  },

  // ==========================================================================
  // 3. AAOS / ORTHOINFO - CLINICAL MECHANISMS & CONDITIONING PROGRAMS
  // ==========================================================================
  {
    id: 'aaos_common_knee_injuries_01',
    source: 'AAOS / OrthoInfo',
    sourceUrl: 'https://orthoinfo.aaos.org/en/diseases--conditions/common-knee-injuries/',
    topic: 'general_knee_injury',
    title: 'AAOS Overview: Knee Anatomy, Sprains, Tears, and Fractures',
    applicableSurgeries: ['general_knee_injury', 'total_knee_replacement', 'acl_reconstruction', 'meniscus_repair', 'collateral_ligament_injury'],
    recoveryStages: ['all_stages'],
    urgencyLevel: 'standard_recovery',
    keywords: ['anatomy', 'femur', 'tibia', 'patella', 'articular cartilage', 'synovial fluid', 'sprain', 'ligament tear', 'tendon'],
    clinicalFacts: [
      'The knee is the largest joint in the body, formed by the lower end of the femur, upper end of the tibia, and the patella (kneecap).',
      'Four primary ligaments hold the bones together: ACL (center-front), PCL (center-back), MCL (inner side), and LCL (outer side).',
      'Articular cartilage covers the ends of the bones, allowing smooth, low-friction gliding; in severe osteoarthritis, this cartilage wears away, leading to bone-on-bone pain that requires replacement.',
      'A pop accompanied by immediate swelling usually signals an acute ligament tear (ACL) or patellar dislocation.',
      'Initial management for acute knee injuries centers on R.I.C.E., temporary immobilization, and diagnostic imaging (X-rays, MRI).'
    ],
    summary: 'The knee relies on 4 major ligaments and 2 menisci for stability and shock absorption. Acute injuries presenting with a pop and rapid swelling require clinical imaging and protection.'
  },
  {
    id: 'aaos_conditioning_exercises_02',
    source: 'AAOS / OrthoInfo',
    sourceUrl: 'https://orthoinfo.aaos.org/en/recovery/knee-conditioning-program/',
    topic: 'rehabilitation_exercises',
    title: 'AAOS Knee Conditioning Exercise Program: Strength & Range of Motion',
    applicableSurgeries: ['total_knee_replacement', 'acl_reconstruction', 'meniscus_repair', 'arthroscopic_meniscectomy', 'general_knee_injury'],
    recoveryStages: ['acute_0_7_days', 'early_1_6_weeks', 'mid_6_12_weeks'],
    urgencyLevel: 'standard_recovery',
    keywords: ['exercises', 'quad sets', 'straight leg raises', 'heel slides', 'hamstring curls', 'calf raises', 'range of motion', 'conditioning'],
    clinicalFacts: [
      'Quad Sets: Lie on your back with the operated leg straight. Tighten your thigh muscle (quadriceps) by pushing the back of your knee flat down against the bed. Hold for 5 seconds, release for 5 seconds. Repeat 10 reps, 3 sets daily.',
      'Straight Leg Raises (SLR): Tighten the thigh muscle with knee completely straight. Lift the leg 6 to 12 inches off the bed without letting the knee bend or sag. Hold 3 to 5 seconds, slowly lower. 10 reps, 2 to 3 sets daily.',
      'Heel Slides: Lie on back. Gently slide your heel toward your buttocks, bending your knee until comfortable resistance or mild stretch is felt. Hold 5 seconds, slide back flat. Repeat 10 reps, 3 sets.',
      'Ankle Pumps: Pump foot up and down repeatedly; promotes blood circulation in the calf veins and prevents stiffness.',
      'Exercises should produce a gentle muscular burn or stretch, but NEVER sharp, stabbing, or tearing joint pain.'
    ],
    summary: 'AAOS core conditioning exercises: Quad sets (push knee flat, hold 5s), Straight leg raises (lift straight leg 6-12 in), Heel slides (bend knee within comfort), and hourly ankle pumps.'
  },
  {
    id: 'aaos_recovery_phases_03',
    source: 'AAOS / OrthoInfo',
    sourceUrl: 'https://orthoinfo.aaos.org/en/recovery/',
    topic: 'total_knee_replacement',
    title: 'AAOS Joint Replacement Recovery Milestones & Tissue Healing Pacing',
    applicableSurgeries: ['total_knee_replacement'],
    recoveryStages: ['acute_0_7_days', 'early_1_6_weeks', 'mid_6_12_weeks'],
    urgencyLevel: 'standard_recovery',
    keywords: ['milestones', 'tissue healing', 'pacing', 'stiffness', 'scar tissue', 'day 6', 'week 2', 'week 6', 'range of motion goals'],
    clinicalFacts: [
      'Day 1 to 7: The primary goals are independent transfers (in and out of bed/chair), walking 50 to 100 feet with walker/crutches, achieving at least 0° to 90° knee motion range, and controlling swelling with elevation.',
      'Scar tissue forms rapidly in the first 2 to 4 weeks; daily gentle knee bending and straightening are critical to avoid permanent joint tightness.',
      'Tiredness and low energy are very common for several weeks after major orthopedic surgery as the body expends large metabolic energy healing bone and muscle.',
      'Sleeping: Sleeping on your back with legs extended or slightly elevated on a calf pillow is ideal. If side-sleeping, sleep on the non-operated side with a pillow between your knees.'
    ],
    summary: 'Early recovery targets 0° extension to 90° flexion, walking with assistive device, and daily gentle motion to prevent stiff scar tissue formation.'
  },

  // ==========================================================================
  // 4. MASS GENERAL (MGH) - REHABILITATION PROTOCOLS
  // ==========================================================================
  {
    id: 'mgh_acl_rehab_protocol_01',
    source: 'Mass General',
    sourceUrl: 'https://www.massgeneral.org/assets/MGH/pdf/orthopaedics/sports-medicine/physical-therapy/rehabilitation-protocol-for-ACL.pdf',
    topic: 'acl_injury_reconstruction',
    title: 'Mass General ACL Reconstruction Physical Therapy Protocol (Phases I & II)',
    applicableSurgeries: ['acl_reconstruction'],
    recoveryStages: ['acute_0_7_days', 'early_1_6_weeks'],
    urgencyLevel: 'standard_recovery',
    keywords: ['mgh protocol', 'phase 1', 'extension lag', 'patellar mobilization', '90 degrees', 'quadriceps activation', 'weight bearing as tolerated'],
    clinicalFacts: [
      'Phase I (Weeks 0-2): Primary emphasis is full passive extension equal to contralateral limb, patellar mobility, effusion management, and voluntary quadriceps contraction.',
      'Weight bearing: WBAT (weight-bearing as tolerated) with crutches and brace locked in full extension until good quad control is demonstrated (no extension lag on SLR).',
      'Target range of motion by Day 14: 0° extension to 90° flexion.',
      'Patellar glides: Superior, inferior, and medial/lateral mobilizations performed 2 to 3 times daily to prevent patellofemoral adhesions.',
      'Phase II (Weeks 2-6): Discontinue crutches once gait is non-antalgic; progress stationary bicycling (seat high, zero resistance initially), closed kinetic chain leg press (0-60°).'
    ],
    summary: 'Mass General Phase I ACL protocol focuses on immediate 0° passive extension, 90° flexion by week 2, patellar glides, and brace locked in extension for walking until quad lag resolves.'
  },
  {
    id: 'mgh_meniscus_repair_protocol_02',
    source: 'Mass General',
    sourceUrl: 'https://www.massgeneral.org/assets/MGH/pdf/orthopaedics/sports-medicine/physical-therapy/rehabilitation-protocol-for-meniscus-repair.pdf',
    topic: 'meniscus_tear_repair',
    title: 'Mass General Meniscus Repair Rehabilitation Protocol (Protection Phase)',
    applicableSurgeries: ['meniscus_repair'],
    recoveryStages: ['acute_0_7_days', 'early_1_6_weeks'],
    urgencyLevel: 'standard_recovery',
    keywords: ['meniscus repair protocol', 'locked brace', 'restricted weight bearing', '0-90 degrees', 'no deep flexion', 'no squatting'],
    clinicalFacts: [
      'Phase I (Weeks 0-4 to 0-6): Meniscus repairs require biological protection because mechanical shear forces can disrupt surgical sutures.',
      'Weight-bearing status: Flat-foot partial weight-bearing or toe-touch weight-bearing in hinged brace locked at 0° extension during all standing and walking.',
      'Range of motion is restricted: PROM/AROM limited to 0° to 90° for the first 4 to 6 weeks. Flexion past 90 degrees puts high posterior compressive stress on repaired meniscus horns.',
      'No active hamstrings curls for medial meniscus repairs (semimembranosus insertion can pull on the posterior horn).',
      'Squatting, lunging, and twisting are strictly prohibited until Phase III (12+ weeks).'
    ],
    summary: 'MGH Meniscus Repair protocol requires walking in brace locked in extension, limiting flexion strictly to 0-90° for 4-6 weeks, and strictly avoiding squats or deep bends.'
  },
  {
    id: 'mgh_meniscectomy_protocol_03',
    source: 'Mass General',
    sourceUrl: 'https://www.massgeneral.org/assets/MGH/pdf/orthopaedics/sports-medicine/physical-therapy/rehabilitation-protocol-for-arthroscopic-partial-meniscectomy.pdf',
    topic: 'meniscectomy',
    title: 'Mass General Arthroscopic Partial Meniscectomy Accelerated Protocol',
    applicableSurgeries: ['arthroscopic_meniscectomy'],
    recoveryStages: ['acute_0_7_days', 'early_1_6_weeks'],
    urgencyLevel: 'standard_recovery',
    keywords: ['partial meniscectomy protocol', 'wbat', 'rapid recovery', 'full range of motion', 'swelling reduction'],
    clinicalFacts: [
      'Phase I (Weeks 0-2): Weight-bearing is WBAT (weight bearing as tolerated) immediately post-surgery. Crutches are discontinued as soon as swelling subsides and gait is normal (typically 2 to 7 days).',
      'No brace is required for isolated partial meniscectomy.',
      'Full active range of motion is encouraged immediately within pain and swelling tolerance.',
      'Key focus is rapid swelling reduction with compression, ice, and elevation, coupled with immediate isometric quadriceps strengthening.',
      'Patients typically return to sedentary work in 3 to 7 days and recreational sports in 3 to 6 weeks.'
    ],
    summary: 'Partial meniscectomy allows immediate full weight-bearing as tolerated, no brace, and rapid return to walking and cycling as swelling permits.'
  },

  // ==========================================================================
  // 5. NHS & NHS INFORM - SYMPTOM TRIAGE & SELF-CARE
  // ==========================================================================
  {
    id: 'nhs_knee_pain_triage_01',
    source: 'NHS',
    sourceUrl: 'https://www.nhs.uk/symptoms/knee-pain/',
    topic: 'pain_swelling_management',
    title: 'NHS Knee Pain & Symptom Triage Guidance',
    applicableSurgeries: ['general_knee_injury', 'total_knee_replacement', 'acl_reconstruction', 'meniscus_repair'],
    recoveryStages: ['all_stages'],
    urgencyLevel: 'standard_recovery',
    keywords: ['nhs triage', 'urgent knee pain', 'giving way', 'unable to bear weight', 'deformity', 'stiffness', 'self care'],
    clinicalFacts: [
      'Immediate emergency attention is needed if the knee is physically deformed, you heard a snap/pop accompanied by inability to take a single step, or you experience extreme agony.',
      'Same-day clinical contact is warranted if the knee is hot and very red accompanied by high temperature or feverish feeling, or if sudden intense calf swelling appears.',
      'For typical non-emergency post-injury or post-op ache: Rest the knee, ice for 20 minutes wrapped in towel, elevate while seated, take paracetamol (acetaminophen) or prescribed medication as instructed.',
      'Gentle regular movement is strongly advised: keeping the knee completely still for days creates stiff, painful joint adhesions.'
    ],
    summary: 'NHS triage advises urgent review if knee is deformed, cannot support any weight, or has burning heat with fever. For normal soreness, maintain gentle movement and R.I.C.E.'
  },
  {
    id: 'nhsinform_joint_pacing_02',
    source: 'NHS',
    sourceUrl: 'https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/leg-and-foot-problems-and-conditions/knee-problems/',
    topic: 'rehabilitation_exercises',
    title: 'NHS Inform Scotland: Activity Pacing & Joint Protection Principles',
    applicableSurgeries: ['total_knee_replacement', 'acl_reconstruction', 'meniscus_repair', 'arthroscopic_meniscectomy', 'general_knee_injury'],
    recoveryStages: ['all_stages'],
    urgencyLevel: 'standard_recovery',
    keywords: ['pacing', 'joint protection', 'circulation', 'sitting too long', 'quadriceps strength', 'daily routine'],
    clinicalFacts: [
      'Activity pacing prevents the "boom-and-bust" cycle where a patient over-exercises on a good day and suffers severe stiffness and inflammation for the next 48 hours.',
      'Avoid sitting in one position for longer than 45 to 60 minutes; stand up, stretch gently, and take 10 to 20 steps to restore synovial joint fluid circulation.',
      'Strengthening the quadriceps muscle group absorbs up to 40% of the impact force on the knee joint during daily walking.',
      'Use supportive footwear with cushioned soles and avoid walking barefoot on hard tile or hardwood floors during recovery.'
    ],
    summary: 'Pacing daily activity avoids flare-ups. Never sit motionless longer than an hour. Strong quadriceps absorb impact forces during walking.'
  }
];

/**
 * Quick retrieval & search helper
 */
export function searchMedicalKnowledgeBase(
  query: string, 
  patientSurgery?: SurgeryType, 
  recoveryStage?: RecoveryStage
): { chunk: KnowledgeChunk; score: number }[] {
  const lower = query.toLowerCase();
  const queryTokens = lower.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);

  const scored = KNEE_MEDICAL_KNOWLEDGE_BASE.map(chunk => {
    let score = 0;

    // Check title match
    const titleLower = chunk.title.toLowerCase();
    for (const token of queryTokens) {
      if (titleLower.includes(token)) score += 3.0;
    }

    // Check keyword match
    for (const kw of chunk.keywords) {
      const kwLower = kw.toLowerCase();
      if (lower.includes(kwLower)) {
        score += 4.5;
      } else {
        for (const token of queryTokens) {
          if (kwLower.includes(token)) score += 1.5;
        }
      }
    }

    // Check clinical facts match
    for (const fact of chunk.clinicalFacts) {
      const factLower = fact.toLowerCase();
      for (const token of queryTokens) {
        if (factLower.includes(token)) score += 0.8;
      }
    }

    // Boost by patient's surgery type
    if (patientSurgery && chunk.applicableSurgeries.includes(patientSurgery)) {
      score += 3.0;
    }

    // Boost by patient's recovery stage
    if (recoveryStage && (chunk.recoveryStages.includes(recoveryStage) || chunk.recoveryStages.includes('all_stages'))) {
      score += 2.0;
    }

    // Special safety boost for blood clots, infection, red flags
    if (
      (lower.includes('clot') || lower.includes('dvt') || lower.includes('calf') || lower.includes('breath') || lower.includes('chest')) &&
      chunk.topic === 'blood_clots_vte'
    ) {
      score += 15.0;
    }

    if (
      (lower.includes('infection') || lower.includes('fever') || lower.includes('pus') || lower.includes('drainage') || lower.includes('redness') || lower.includes('odor')) &&
      chunk.topic === 'infection_wound_safety'
    ) {
      score += 15.0;
    }

    if (
      (lower.includes('bath') || lower.includes('shower') || lower.includes('soak') || lower.includes('wash') || lower.includes('dressing')) &&
      (chunk.topic === 'infection_wound_safety' || chunk.topic === 'total_knee_replacement')
    ) {
      score += 12.0;
    }

    return { chunk, score };
  });

  return scored
    .filter(item => item.score > 2.0)
    .sort((a, b) => b.score - a.score);
}
