import { defineStore } from 'pinia'
import { reactive, computed, watch, ref } from 'vue'

// ─── Domain constants ───────────────────────────────────────────────

export const ENTITIES = [
  { id: 'cronos', label: 'Cronos',        color: 'teal',  isPrimary: true,  alwaysVisible: true },
  { id: 'gov',    label: 'Government',    color: 'blue',  isPrimary: false, alwaysVisible: false },
  { id: 'sub',    label: 'Subcontractor', color: 'amber', isPrimary: false, alwaysVisible: false },
]

export const ROLES = [
  { id: 'engineering', label: 'Engineering Tasks',        icon: 'ti-cpu' },
  { id: 'pm',          label: 'Project Management Tasks', icon: 'ti-clipboard-list' },
  { id: 'technician',  label: 'Technician Tasks',         icon: 'ti-tool' },
]

export const LIFECYCLE_PHASES = [
  { id: 'cost-estimate',    label: 'Develop Cost Estimate' },
  { id: 'system-design',    label: 'System Design' },
  { id: 'equip-procure',    label: 'Equipment Procurement' },
  { id: 'pre-delivery',     label: 'Pre-System Delivery Phase' },
  { id: 'system-delivery',  label: 'System Delivery Phase' },
  { id: 'project-closeout', label: 'Project Close Out' },
]

// ─── Labor Categories ───────────────────────────────────────────────
// role = which accordion section this cat appears in (filters the dropdown)
// defaultRate = $/hr auto-filled when a new row is created; editable per row

export const LABOR_CATS = [
  { id: 'eng1',  label: 'ENG I',    role: 'engineering', defaultRate: 85  },
  { id: 'eng2',  label: 'ENG II',   role: 'engineering', defaultRate: 110 },
  { id: 'eng3',  label: 'ENG III',  role: 'engineering', defaultRate: 135 },
  { id: 'prog1', label: 'PROG I',   role: 'programming', defaultRate: 75  },
  { id: 'prog2', label: 'PROG II',  role: 'programming', defaultRate: 100 },
  { id: 'prog3', label: 'PROG III', role: 'programming', defaultRate: 125 },
  { id: 'pm1',   label: 'PM',       role: 'pm',         defaultRate: 95  },
  { id: 'pm2',   label: 'PM SPT',   role: 'pm',         defaultRate: 125 },
  { id: 'proc',  label: 'PROC',     role: 'pm',         defaultRate: 80  },
  { id: 'wh',    label: 'WH I',     role: 'pm',         defaultRate: 55  },
  { id: 'tech1', label: 'TECH I',   role: 'technician', defaultRate: 65  },
  { id: 'tech2', label: 'TECH II',  role: 'technician', defaultRate: 75  },
  { id: 'tech3', label: 'TECH III', role: 'technician', defaultRate: 90  },
]

// ─── Task default day counts ────────────────────────────────────────
// Used only by baseline templates (Baseline A/B/C/D) to preload Days.
// Picking a task from the dropdown does NOT auto-fill these — Days stays 0.

export const TASK_DEFAULTS = {
  'eng-ce-site-survey': 2, 'eng-ce-sow-conceptual': 3, 'eng-ce-rom-equip': 1, 'eng-ce-meetings': 3,
  'eng-sd-pdr-brief': 2,   'eng-sd-pdr-attend': 1,
  'eng-sd-cdr-brief': 2,   'eng-sd-cdr-attend': 1,  'eng-sd-cdr-present': 1,
  'eng-sd-sdr-brief': 2,   'eng-sd-sdr-attend': 1,
  'pm-sd-pdr-attend': 1,   'pm-sd-cdr-attend': 1,   'pm-sd-cdr-present': 1,  'pm-sd-sdr-attend': 1,
  'eng-sd-tdp-room': 2,    'eng-sd-tdp-schem': 3,   'eng-sd-tdp-rack': 2,
  'eng-sd-tdp-mel': 2,     'eng-sd-tdp-mpl': 1,     'eng-sd-tdp-plate': 1,  'eng-sd-tdp-research': 2,
  'eng-pd-kickoff': 1,     'eng-pd-test-stage5': 2, 'eng-pd-test-stage7': 2,
  'eng-pd-user-guide': 3,  'eng-pd-control': 5,     'eng-pd-config-test': 3,
  'eng-sd2-test-onsite': 3, 'eng-sd2-train-onsite': 2,
  'eng-pc-asbuilt': 2, 'eng-pc-training': 2, 'eng-pc-artifacts': 1,
  'pm-pc-artifacts': 1, 'tech-pc-closeout': 1,
  'pm-ce-meetings': 2,
  'pm-ep-purchase': 3,     'pm-ep-warehouse': 2,
  'pm-pd-kickoff': 1,      'pm-pd-schedule': 2,     'pm-pd-weekly': 8,
  'pm-sd2-install-coord': 5,
  'tech-pd-kickoff': 1,    'tech-pd-rack-build': 3, 'tech-pd-system-mockup': 4,
  'tech-pd-cable-label': 1, 'tech-pd-kit-prep': 1,  'tech-pd-field-plan': 1,
  'tech-sd-cable-pulls': 5, 'tech-sd-endpoint': 3,  'tech-sd-rack-install': 2,
  'tech-sd-cable-term': 2,  'tech-sd-cable-label-onsite': 1,
}

export const TRAVEL_CATEGORIES = [
  { id: 'per-diem',   label: 'Per Diem' },
  { id: 'rental-car', label: 'Rental Car' },
  { id: 'airfare',    label: 'Airfare' },
]

export const TABS = [
  { id: 'engineering', label: 'Labor', icon: 'ti-tools' },
  { id: 'travel',      label: 'Travel',                   icon: 'ti-plane' },
  { id: 'material',    label: 'Material & Shipping',      icon: 'ti-package' },
  { id: 'overhead',    label: 'Overhead',                 icon: 'ti-percentage' },
  { id: 'summary',     label: 'Summary',                  icon: 'ti-chart-bar' },
  { id: 'admin',       label: 'Administration',           icon: 'ti-shield-lock' },
]

// ─── Default WBS ────────────────────────────────────────────────────

const DEFAULT_WBS = {
  engineering: {
    'cost-estimate': [
      { id: 'eng-ce-site-survey',    label: 'Site Survey / Travel' },
      { id: 'eng-ce-sow-conceptual', label: 'Develop SOW with Conceptual Design / Sketch' },
      { id: 'eng-ce-rom-equip',      label: 'Develop ROM Level Equipment, Hours, and Travel' },
      { id: 'eng-ce-meetings',       label: 'Meetings / Telecons' },
    ],
    'system-design': [
      { id: 'eng-sd-pdr',            label: 'Preliminary Design Review (PDR)' },
      { id: 'eng-sd-pdr-brief',      label: 'PDR - Develop Brief',    subphase: 'Preliminary Design Review (PDR)' },
      { id: 'eng-sd-pdr-attend',     label: 'PDR - Attend / Present', subphase: 'Preliminary Design Review (PDR)' },
      { id: 'eng-sd-cdr',            label: 'Critical Design Review (CDR)' },
      { id: 'eng-sd-cdr-brief',      label: 'CDR - Develop Brief',    subphase: 'Critical Design Review (CDR)' },
      { id: 'eng-sd-cdr-attend',     label: 'CDR - Attend',           subphase: 'Critical Design Review (CDR)' },
      { id: 'eng-sd-cdr-present',    label: 'CDR - Present',          subphase: 'Critical Design Review (CDR)' },
      { id: 'eng-sd-sdr',            label: 'Singular Design Review (SDR)' },
      { id: 'eng-sd-sdr-brief',      label: 'SDR - Develop Brief',    subphase: 'Singular Design Review (SDR)' },
      { id: 'eng-sd-sdr-attend',     label: 'SDR - Attend / Present', subphase: 'Singular Design Review (SDR)' },
      { id: 'eng-sd-tdp',           label: 'Technical Drawing Package' },
      { id: 'eng-sd-tdp-room',      label: 'TDP - Room Layout / Reflected Ceiling Plan', subphase: 'Technical Drawing Package' },
      { id: 'eng-sd-tdp-schem',     label: 'TDP - Schematic Wiring Diagram',             subphase: 'Technical Drawing Package' },
      { id: 'eng-sd-tdp-rack',      label: 'TDP - Rack Elevations',                      subphase: 'Technical Drawing Package' },
      { id: 'eng-sd-tdp-mel',       label: 'TDP - MEL Development',                      subphase: 'Technical Drawing Package' },
      { id: 'eng-sd-tdp-mpl',       label: 'TDP - MPL Development',                      subphase: 'Technical Drawing Package' },
      { id: 'eng-sd-tdp-plate',     label: 'TDP - Custom Plate Design',                  subphase: 'Technical Drawing Package' },
      { id: 'eng-sd-tdp-research',  label: 'TDP - Equipment Research',                   subphase: 'Technical Drawing Package' },
    ],
    'equip-procure': [],
    'pre-delivery': [
      { id: 'eng-pd-kickoff',       label: 'Project Kickoff Brief (Develop and Present)' },
      { id: 'eng-pd-testdoc',       label: 'Test Documentation Development' },
      { id: 'eng-pd-test-stage5',   label: 'Stage V Test Procedures',              subphase: 'Test Documentation Development' },
      { id: 'eng-pd-test-stage7',   label: 'Stage VII Test Procedures',            subphase: 'Test Documentation Development' },
      { id: 'eng-pd-user-guide',    label: 'Create User Guide',                    subphase: 'Test Documentation Development' },
      { id: 'eng-pd-control',       label: 'Control Code and DSP Programs' },
      { id: 'eng-pd-config-test',   label: 'Equipment Configuration and Testing in Lab' },
    ],
    'system-delivery': [
      { id: 'eng-sd2-commission',   label: 'System Commissioning' },
      { id: 'eng-sd2-test-onsite',  label: 'System Testing on Site',                   subphase: 'System Commissioning' },
      { id: 'eng-sd2-train-onsite', label: 'System Training / Acceptance Test on Site', subphase: 'System Commissioning' },
    ],
    'project-closeout': [
      { id: 'eng-pc-asbuilt',   label: 'Complete As-Built Drawings' },
      { id: 'eng-pc-training',  label: 'Finalize Training Manuals' },
      { id: 'eng-pc-artifacts', label: 'Deliverable Artifacts' },
    ],
  },
  pm: {
    'cost-estimate':    [{ id: 'pm-ce-meetings',       label: 'Meetings / Telecons' }],
    'system-design':    [
      { id: 'pm-sd-pdr',            label: 'Preliminary Design Review (PDR)' },
      { id: 'pm-sd-pdr-attend',     label: 'PDR - Attend / Present', subphase: 'Preliminary Design Review (PDR)' },
      { id: 'pm-sd-cdr',            label: 'Critical Design Review (CDR)' },
      { id: 'pm-sd-cdr-attend',     label: 'CDR - Attend',           subphase: 'Critical Design Review (CDR)' },
      { id: 'pm-sd-cdr-present',    label: 'CDR - Present',          subphase: 'Critical Design Review (CDR)' },
      { id: 'pm-sd-sdr',            label: 'Singular Design Review (SDR)' },
      { id: 'pm-sd-sdr-attend',     label: 'SDR - Attend / Present', subphase: 'Singular Design Review (SDR)' },
    ],
    'equip-procure':    [
      { id: 'pm-ep-purchase',  label: 'Purchase and Tracking' },
      { id: 'pm-ep-warehouse', label: 'Warehouse Receive / Inventory' },
    ],
    'pre-delivery': [
      { id: 'pm-pd-kickoff',  label: 'Project Kickoff Brief' },
      { id: 'pm-pd-schedule', label: 'Schedule Creation and Resource Management' },
      { id: 'pm-pd-weekly',   label: 'Weekly Coordination Meetings' },
      { id: 'pm-pd-pms',      label: 'Project Management Support' },
    ],
    'system-delivery':  [{ id: 'pm-sd2-install-coord', label: 'Installation Coordination and Management' }],
    'project-closeout': [
      { id: 'pm-pc-artifacts', label: 'Deliver Final Artifacts' },
    ],
  },
  technician: {
    'cost-estimate': [], 'system-design': [], 'equip-procure': [],
    'pre-delivery': [
      { id: 'tech-pd-kickoff',       label: 'Project Kickoff Brief' },
      { id: 'tech-pd-inha',          label: 'In-House Equipment Assembly' },
      { id: 'tech-pd-rack-build',    label: 'Rack Building',                               subphase: 'In-House Equipment Assembly' },
      { id: 'tech-pd-system-mockup', label: 'System Assembly and Mockup',                  subphase: 'In-House Equipment Assembly' },
      { id: 'tech-pd-cable-label',   label: 'Cable Labeling',                              subphase: 'In-House Equipment Assembly' },
      { id: 'tech-pd-kit-prep',      label: 'System Kitting and Prep for Delivery',        subphase: 'In-House Equipment Assembly' },
      { id: 'tech-pd-field-plan',    label: 'Plan for Field Install (Tools, Consumables)', subphase: 'In-House Equipment Assembly' },
    ],
    'system-delivery': [
      { id: 'tech-sd-install',            label: 'Installation' },
      { id: 'tech-sd-cable-pulls',        label: 'Cable Pulls',                   subphase: 'Installation' },
      { id: 'tech-sd-endpoint',           label: 'Endpoint Installation',         subphase: 'Installation' },
      { id: 'tech-sd-rack-install',       label: 'Rack Installation',             subphase: 'Installation' },
      { id: 'tech-sd-cable-term',         label: 'Cable Termination and Testing', subphase: 'Installation' },
      { id: 'tech-sd-cable-label-onsite', label: 'Cable Labeling',                subphase: 'Installation' },
    ],
    'project-closeout': [
      { id: 'tech-pc-closeout', label: 'Close Out Documents' },
    ],
  },
}

// ─── Templates ───────────────────────────────────────────────────────

export const TEMPLATES = [
  {
    id: 'baseline-a',
    name: 'Baseline A — Huddle Room',
    description: 'Small single-display huddle room. Shortest build.',
    seed: [
      // Engineering — Cost Estimate
      ['engineering', 'eng-ce-site-survey',    2,    8, 'eng2'],
      ['engineering', 'eng-ce-sow-conceptual', 0.75, 8, 'eng2'],
      ['engineering', 'eng-ce-rom-equip',      0.75, 8, 'eng2'],
      ['engineering', 'eng-ce-meetings',       0.5,  8, 'eng2'],
      // Engineering — System Design
      ['engineering', 'eng-sd-pdr-brief',      2,    8, 'eng3'],
      ['engineering', 'eng-sd-pdr-attend',     1,    8, 'eng3'],
      ['engineering', 'eng-sd-tdp-room',       0.75, 8, 'eng3'],
      ['engineering', 'eng-sd-tdp-schem',      1.25, 8, 'eng3'],
      ['engineering', 'eng-sd-tdp-rack',       0.5,  8, 'eng3'],
      ['engineering', 'eng-sd-tdp-mel',        1,    8, 'eng3'],
      ['engineering', 'eng-sd-tdp-mpl',        1,    8, 'eng3'],
      ['engineering', 'eng-sd-tdp-research',   0.5,  8, 'eng3'],
      // Engineering — Pre-Delivery
      ['engineering', 'eng-pd-kickoff',        1,    8, 'eng3'],
      ['engineering', 'eng-pd-test-stage5',    0.5,  8, 'eng3'],
      ['engineering', 'eng-pd-test-stage7',    0.5,  8, 'eng3'],
      ['engineering', 'eng-pd-user-guide',     1,    8, 'prog3'],
      ['engineering', 'eng-pd-control',        2,    8, 'prog3'],
      ['engineering', 'eng-pd-config-test',    2,    8, 'prog3'],
      // Engineering — Project Close Out
      ['engineering', 'eng-pc-asbuilt',        1,    8, 'eng3'],
      // PM — Cost Estimate
      ['pm', 'pm-ce-meetings', 2,    8, 'pm1'],
      ['pm', 'pm-ce-meetings', 2,    8, 'pm2'],
      // PM — System Design
      ['pm', 'pm-sd-pdr-attend', 0.5,  8, 'pm1'],
      ['pm', 'pm-sd-pdr-attend', 0.5,  8, 'pm2'],
      // PM — Equipment Procurement
      ['pm', 'pm-ep-purchase',  3,    8, 'pm1'],
      ['pm', 'pm-ep-purchase',  1.5,  8, 'pm2'],
      ['pm', 'pm-ep-purchase',  2.5,  8, 'proc'],
      ['pm', 'pm-ep-warehouse', 2.5,  8, 'proc'],
      ['pm', 'pm-ep-warehouse', 1.5,  8, 'wh'],
      // PM — Pre-Delivery
      ['pm', 'pm-pd-kickoff',  0.5,  8, 'pm1'],
      ['pm', 'pm-pd-kickoff',  0.25, 8, 'pm2'],
      ['pm', 'pm-pd-schedule', 1,    8, 'pm1'],
      ['pm', 'pm-pd-schedule', 0.25, 8, 'pm2'],
      ['pm', 'pm-pd-weekly',   1,    8, 'pm1'],
      ['pm', 'pm-pd-weekly',   0.25, 8, 'pm2'],
      // PM — System Delivery
      ['pm', 'pm-sd2-install-coord', 1,    8, 'pm1'],
      ['pm', 'pm-sd2-install-coord', 0.25, 8, 'pm2'],
      ['pm', 'pm-sd2-install-coord', 1,    8, 'wh'],
      // Technician — Pre-Delivery
      ['technician', 'tech-pd-kickoff',       1,   8, 'tech3'],
      ['technician', 'tech-pd-rack-build',    2,   8, 'tech3'],
      ['technician', 'tech-pd-system-mockup', 1,   8, 'tech3'],
      ['technician', 'tech-pd-cable-label',   0.5, 8, 'tech3'],
      ['technician', 'tech-pd-kit-prep',      2,   8, 'tech3'],
      ['technician', 'tech-pd-field-plan',    1,   8, 'tech3'],
    ],
    // travelSeed: [travelerName, days, persons, travelHours, hotel, rentalCar, airfare]
    travelSeed: [
      ['Systems Engineer — Site Survey', 2, 1, 4, true,  true,  false],
      ['Install Team (Tech ×2)',         3, 2, 4, true,  true,  false],
    ],
  },
  {
    id: 'baseline-b',
    name: 'Baseline B — Classroom',
    description: 'Dual-display classroom with soft VTC.',
    seed: [
      // Engineering — Cost Estimate
      ['engineering', 'eng-ce-site-survey',    2,    8, 'eng2'],
      ['engineering', 'eng-ce-sow-conceptual', 1,    8, 'eng2'],
      ['engineering', 'eng-ce-rom-equip',      1,    8, 'eng2'],
      ['engineering', 'eng-ce-meetings',       0.5,  8, 'eng2'],
      // Engineering — System Design
      ['engineering', 'eng-sd-pdr-brief',      2,    8, 'eng3'],
      ['engineering', 'eng-sd-pdr-attend',     1,    8, 'eng3'],
      ['engineering', 'eng-sd-tdp-room',       1.5,  8, 'eng3'],
      ['engineering', 'eng-sd-tdp-schem',      4,    8, 'eng3'],
      ['engineering', 'eng-sd-tdp-rack',       1,    8, 'eng3'],
      ['engineering', 'eng-sd-tdp-mel',        1.5,  8, 'eng3'],
      ['engineering', 'eng-sd-tdp-mpl',        1.5,  8, 'eng3'],
      ['engineering', 'eng-sd-tdp-plate',      0.25, 8, 'eng3'],
      ['engineering', 'eng-sd-tdp-research',   1,    8, 'eng3'],
      // Engineering — Pre-Delivery
      ['engineering', 'eng-pd-kickoff',        1,    8, 'eng3'],
      ['engineering', 'eng-pd-test-stage5',    0.5,  8, 'eng3'],
      ['engineering', 'eng-pd-test-stage7',    0.5,  8, 'eng3'],
      ['engineering', 'eng-pd-user-guide',     1,    8, 'prog3'],
      ['engineering', 'eng-pd-control',        3,    8, 'prog3'],
      ['engineering', 'eng-pd-config-test',    3,    8, 'prog3'],
      // Engineering — Project Close Out
      ['engineering', 'eng-pc-asbuilt',        1,    8, 'eng3'],
      // PM — Cost Estimate
      ['pm', 'pm-ce-meetings', 2,    8, 'pm1'],
      ['pm', 'pm-ce-meetings', 2,    8, 'pm2'],
      // PM — System Design
      ['pm', 'pm-sd-pdr-attend', 0.5,  8, 'pm1'],
      ['pm', 'pm-sd-pdr-attend', 0.5,  8, 'pm2'],
      // PM — Equipment Procurement
      ['pm', 'pm-ep-purchase',  4,    8, 'pm1'],
      ['pm', 'pm-ep-purchase',  1.5,  8, 'pm2'],
      ['pm', 'pm-ep-purchase',  2.5,  8, 'proc'],
      ['pm', 'pm-ep-warehouse', 2.5,  8, 'proc'],
      ['pm', 'pm-ep-warehouse', 3,    8, 'wh'],
      // PM — Pre-Delivery
      ['pm', 'pm-pd-kickoff',  1,    8, 'pm1'],
      ['pm', 'pm-pd-kickoff',  0.25, 8, 'pm2'],
      ['pm', 'pm-pd-schedule', 1,    8, 'pm1'],
      ['pm', 'pm-pd-schedule', 0.25, 8, 'pm2'],
      ['pm', 'pm-pd-weekly',   2,    8, 'pm1'],
      ['pm', 'pm-pd-weekly',   0.25, 8, 'pm2'],
      // PM — System Delivery
      ['pm', 'pm-sd2-install-coord', 2,    8, 'pm1'],
      ['pm', 'pm-sd2-install-coord', 0.25, 8, 'pm2'],
      ['pm', 'pm-sd2-install-coord', 3,    8, 'wh'],
      // Technician — Pre-Delivery
      ['technician', 'tech-pd-kickoff',       1,   8, 'tech3'],
      ['technician', 'tech-pd-rack-build',    3,   8, 'tech3'],
      ['technician', 'tech-pd-system-mockup', 2,   8, 'tech3'],
      ['technician', 'tech-pd-cable-label',   1,   8, 'tech3'],
      ['technician', 'tech-pd-kit-prep',      3,   8, 'tech3'],
      ['technician', 'tech-pd-field-plan',    2,   8, 'tech3'],
    ],
    travelSeed: [
      ['Systems Engineer — Site Survey',  2, 1, 4, true,  true,  false],
      ['Install Team (Tech ×2, PM)',      5, 3, 4, true,  true,  false],
    ],
  },
  {
    id: 'baseline-c',
    name: 'Baseline C — Conference Room',
    description: 'Full conference room with dual displays and hard/soft VTC.',
    seed: [
      // Engineering — Cost Estimate
      ['engineering', 'eng-ce-site-survey',    2,    8, 'eng2'],
      ['engineering', 'eng-ce-sow-conceptual', 1,    8, 'eng2'],
      ['engineering', 'eng-ce-rom-equip',      1,    8, 'eng2'],
      ['engineering', 'eng-ce-meetings',       0.5,  8, 'eng2'],
      // Engineering — System Design
      ['engineering', 'eng-sd-pdr-brief',      2,    8, 'eng3'],
      ['engineering', 'eng-sd-pdr-attend',     1,    8, 'eng3'],
      ['engineering', 'eng-sd-tdp-room',       1.5,  8, 'eng3'],
      ['engineering', 'eng-sd-tdp-schem',      2,    8, 'eng3'],
      ['engineering', 'eng-sd-tdp-rack',       1,    8, 'eng3'],
      ['engineering', 'eng-sd-tdp-mel',        1,    8, 'eng3'],
      ['engineering', 'eng-sd-tdp-mpl',        1,    8, 'eng3'],
      ['engineering', 'eng-sd-tdp-plate',      0.25, 8, 'eng3'],
      ['engineering', 'eng-sd-tdp-research',   1,    8, 'eng3'],
      // Engineering — Pre-Delivery
      ['engineering', 'eng-pd-kickoff',        1,    8, 'eng3'],
      ['engineering', 'eng-pd-test-stage5',    0.5,  8, 'eng3'],
      ['engineering', 'eng-pd-test-stage7',    0.5,  8, 'eng3'],
      ['engineering', 'eng-pd-user-guide',     1,    8, 'prog3'],
      ['engineering', 'eng-pd-control',        3,    8, 'prog3'],
      ['engineering', 'eng-pd-config-test',    3,    8, 'prog3'],
      // Engineering — Project Close Out
      ['engineering', 'eng-pc-asbuilt',        1,    8, 'eng3'],
      // PM — Cost Estimate
      ['pm', 'pm-ce-meetings', 2,    8, 'pm1'],
      ['pm', 'pm-ce-meetings', 2,    8, 'pm2'],
      // PM — System Design
      ['pm', 'pm-sd-pdr-attend', 0.5,  8, 'pm1'],
      ['pm', 'pm-sd-pdr-attend', 0.5,  8, 'pm2'],
      // PM — Equipment Procurement
      ['pm', 'pm-ep-purchase',  4,    8, 'pm1'],
      ['pm', 'pm-ep-purchase',  1.5,  8, 'pm2'],
      ['pm', 'pm-ep-purchase',  2.5,  8, 'proc'],
      ['pm', 'pm-ep-warehouse', 2.5,  8, 'proc'],
      ['pm', 'pm-ep-warehouse', 3,    8, 'wh'],
      // PM — Pre-Delivery
      ['pm', 'pm-pd-kickoff',  1,    8, 'pm1'],
      ['pm', 'pm-pd-kickoff',  0.25, 8, 'pm2'],
      ['pm', 'pm-pd-schedule', 1,    8, 'pm1'],
      ['pm', 'pm-pd-schedule', 0.25, 8, 'pm2'],
      ['pm', 'pm-pd-weekly',   2,    8, 'pm1'],
      ['pm', 'pm-pd-weekly',   0.25, 8, 'pm2'],
      // PM — System Delivery
      ['pm', 'pm-sd2-install-coord', 2,    8, 'pm1'],
      ['pm', 'pm-sd2-install-coord', 0.25, 8, 'pm2'],
      ['pm', 'pm-sd2-install-coord', 3,    8, 'wh'],
      // Technician — Pre-Delivery
      ['technician', 'tech-pd-kickoff',       1,   8, 'tech3'],
      ['technician', 'tech-pd-rack-build',    3,   8, 'tech3'],
      ['technician', 'tech-pd-system-mockup', 2,   8, 'tech3'],
      ['technician', 'tech-pd-cable-label',   1,   8, 'tech3'],
      ['technician', 'tech-pd-kit-prep',      3,   8, 'tech3'],
      ['technician', 'tech-pd-field-plan',    2,   8, 'tech3'],
    ],
    travelSeed: [
      ['Systems Engineer — Site Survey',  2, 1, 4, true,  true,  false],
      ['Install Team (Tech ×2, PM)',      5, 3, 5, true,  true,  true ],
    ],
  },
  {
    id: 'baseline-d',
    name: 'Baseline D — Operations Center',
    description: 'Largest standard buildout — ops center with full A/V.',
    seed: [
      // Engineering — Cost Estimate
      ['engineering', 'eng-ce-site-survey',    2,     8, 'eng2'],
      ['engineering', 'eng-ce-sow-conceptual', 1.5,   8, 'eng2'],
      ['engineering', 'eng-ce-rom-equip',      1.5,   8, 'eng2'],
      ['engineering', 'eng-ce-meetings',       0.5,   8, 'eng2'],
      // Engineering — System Design
      ['engineering', 'eng-sd-pdr-brief',      3,     8, 'eng3'],
      ['engineering', 'eng-sd-pdr-attend',     1,     8, 'eng3'],
      ['engineering', 'eng-sd-tdp-room',       2.5,   8, 'eng3'],
      ['engineering', 'eng-sd-tdp-schem',      5,     8, 'eng3'],
      ['engineering', 'eng-sd-tdp-rack',       1.25,  8, 'eng3'],
      ['engineering', 'eng-sd-tdp-mel',        2,     8, 'eng3'],
      ['engineering', 'eng-sd-tdp-mpl',        2,     8, 'eng3'],
      ['engineering', 'eng-sd-tdp-plate',      0.375, 8, 'eng3'],
      ['engineering', 'eng-sd-tdp-research',   1,     8, 'eng3'],
      // Engineering — Pre-Delivery
      ['engineering', 'eng-pd-kickoff',        1,     8, 'eng3'],
      ['engineering', 'eng-pd-test-stage5',    1,     8, 'eng3'],
      ['engineering', 'eng-pd-test-stage7',    1,     8, 'eng3'],
      ['engineering', 'eng-pd-user-guide',     1.5,   8, 'prog3'],
      ['engineering', 'eng-pd-control',        5,     8, 'prog3'],
      ['engineering', 'eng-pd-config-test',    4,     8, 'prog3'],
      // Engineering — Project Close Out
      ['engineering', 'eng-pc-asbuilt',        1,     8, 'eng3'],
      // PM — Cost Estimate
      ['pm', 'pm-ce-meetings', 2,    8, 'pm1'],
      ['pm', 'pm-ce-meetings', 2,    8, 'pm2'],
      // PM — System Design
      ['pm', 'pm-sd-pdr-attend', 0.5,  8, 'pm1'],
      ['pm', 'pm-sd-pdr-attend', 0.5,  8, 'pm2'],
      // PM — Equipment Procurement
      ['pm', 'pm-ep-purchase',  5,    8, 'pm1'],
      ['pm', 'pm-ep-purchase',  1.5,  8, 'pm2'],
      ['pm', 'pm-ep-purchase',  2.5,  8, 'proc'],
      ['pm', 'pm-ep-warehouse', 2.5,  8, 'proc'],
      ['pm', 'pm-ep-warehouse', 5,    8, 'wh'],
      // PM — Pre-Delivery
      ['pm', 'pm-pd-kickoff',  1,    8, 'pm1'],
      ['pm', 'pm-pd-kickoff',  0.25, 8, 'pm2'],
      ['pm', 'pm-pd-schedule', 1,    8, 'pm1'],
      ['pm', 'pm-pd-schedule', 0.25, 8, 'pm2'],
      ['pm', 'pm-pd-weekly',   3,    8, 'pm1'],
      ['pm', 'pm-pd-weekly',   0.25, 8, 'pm2'],
      // PM — System Delivery
      ['pm', 'pm-sd2-install-coord', 3,    8, 'pm1'],
      ['pm', 'pm-sd2-install-coord', 0.25, 8, 'pm2'],
      ['pm', 'pm-sd2-install-coord', 5,    8, 'wh'],
      // Technician — Pre-Delivery
      ['technician', 'tech-pd-kickoff',       1,   8, 'tech3'],
      ['technician', 'tech-pd-rack-build',    5,   8, 'tech3'],
      ['technician', 'tech-pd-system-mockup', 4,   8, 'tech3'],
      ['technician', 'tech-pd-cable-label',   1,   8, 'tech3'],
      ['technician', 'tech-pd-kit-prep',      4,   8, 'tech3'],
      ['technician', 'tech-pd-field-plan',    2,   8, 'tech3'],
    ],
    travelSeed: [
      ['Systems Engineer — Site Survey',   2, 1, 5, true,  true,  true ],
      ['Install Team (Tech ×3, PM)',       7, 4, 5, true,  true,  true ],
      ['Engineer — Training / Follow-Up',  2, 1, 5, true,  false, true ],
    ],
  },
  { id: 'baseline-x', name: 'Custom (X)', description: 'Empty WBS — start from scratch and add tasks manually.' },
]

// ─── Internal helpers ────────────────────────────────────────────────

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)) }
function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'id-' + Math.random().toString(36).slice(2, 11)
}
function emptyTravelData() {
  // Keyed by entityId — each is an array of trip objects
  const d = {}
  ENTITIES.forEach(e => { d[e.id] = [] })
  return d
}

const STORAGE_KEY   = 'rom-tool-state-v14'
const SNAPSHOT_KEY  = 'rom-tool-snapshots'

function loadState() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r) } catch {}
  return null
}
function loadSnapshots() {
  try { const r = localStorage.getItem(SNAPSHOT_KEY); if (r) return JSON.parse(r) } catch {}
  return []
}

// ─── Store ───────────────────────────────────────────────────────────

export const useRomStore = defineStore('rom', () => {
  const saved = loadState()

  const project = reactive(saved?.project ?? {
    sponsor: '', roomName: '',
    date: new Date().toISOString().split('T')[0],
    projectEngineer: '',
    // Fields used by the 1-page Cost Summary PDF
    govLead: '', building: '', cityBase: '',
    pmSupportLead: '',
    anticipatedFYFunds: 5_000_000,
    templateId: null, templateName: null,
  })
  // Backfill any missing newer fields when loading older saved state
  if (!('govLead'  in project))      project.govLead       = ''
  if (!('building' in project))      project.building      = ''
  if (!('cityBase' in project))      project.cityBase      = ''
  if (!('pmSupportLead' in project)) project.pmSupportLead = ''

  // ── Courses of Action ──────────────────────────────────────────────
  // Each COA is a self-contained scenario the user can flip between.
  // The user works on ONE COA at a time (activeCoaId) and ticks which
  // COAs to roll into the final printed quote (includeInQuote).
  const coas = reactive(saved?.coas ?? [
    { id: 'coa-primary', name: 'Scope 1 — Primary', description: '', includeInQuote: true }
  ])
  // Guarantee at least one scope exists so the rest of the store always has a current one
  if (coas.length === 0) coas.push({ id: 'coa-primary', name: 'Scope 1 — Primary', description: '', includeInQuote: true })
  const activeCoaId = ref(saved?.activeCoaId ?? coas[0].id)
  // Sanity: if the saved active id no longer matches a COA, snap to the first one
  if (!coas.some(c => c.id === activeCoaId.value)) activeCoaId.value = coas[0].id

  // line item shape: { id, role, phaseId, taskId, entity, laborCat, days, hoursPerDay, rate, coaId }
  const wbs       = reactive(saved?.wbs      ?? deepClone(DEFAULT_WBS))
  // Backfill: ensure every default WBS task exists. Users keep their custom
  // tasks, but any new tasks added in a later build show up automatically.
  Object.entries(DEFAULT_WBS).forEach(([roleKey, phases]) => {
    if (!wbs[roleKey]) wbs[roleKey] = {}
    Object.entries(phases).forEach(([phaseId, defaultTasks]) => {
      if (!Array.isArray(wbs[roleKey][phaseId])) wbs[roleKey][phaseId] = []
      defaultTasks.forEach(defaultTask => {
        if (!wbs[roleKey][phaseId].some(t => t.id === defaultTask.id)) {
          wbs[roleKey][phaseId].push({ ...defaultTask })
        }
      })
    })
  })
  const lineItems = reactive(saved?.lineItems ?? [])
  // Editable labor categories (rates, labels). Defaults seeded from LABOR_CATS, persisted across sessions.
  const laborCats = reactive(saved?.laborCats ?? deepClone(LABOR_CATS))
  // Backfill: ensure every default labor cat exists, so newly-added cats appear
  // for users who already have saved labor data from a previous build.
  LABOR_CATS.forEach(defaultCat => {
    if (!laborCats.some(c => c.id === defaultCat.id)) laborCats.push({ ...defaultCat })
  })
  // ── Migration: sync each line's role to its labor category's role.
  // Fixes stale lines saved before PROG I/II/III moved from 'engineering' to 'programming'.
  // Idempotent — no-op when data is already correct.
  lineItems.forEach(l => {
    if (!l.laborCat) return
    const cat = laborCats.find(c => c.id === l.laborCat)
    if (cat && l.role !== cat.role) l.role = cat.role
  })
  // ── Migration: tag every existing line with a COA if it doesn't have one.
  // Any pre-COA data gets attached to the first/default COA so it stays visible.
  lineItems.forEach(l => { if (!l.coaId) l.coaId = coas[0].id })

  // ── COA-derived accessors (declared early so later computeds can reference them) ──
  const activeLineItems = computed(() => lineItems.filter(l => l.coaId === activeCoaId.value))
  const activeCoa       = computed(() => coas.find(c => c.id === activeCoaId.value) ?? coas[0])
  const quoteCoaIds     = computed(() => coas.filter(c => c.includeInQuote).map(c => c.id))
  const travel    = reactive(saved?.travel    ?? emptyTravelData())
  const gsaRateMap  = reactive(saved?.gsaRateMap ?? {})   // "city|ST" → { lodging, mie, months }

  // OCONUS rates — loaded from /rates/oconus.xlsx at startup (not persisted to localStorage)
  const oconusMap       = reactive({})   // "Country|Location" → { lodging, mie }
  const oconusCountries = ref([])        // sorted country names
  const oconusByCountry = reactive({})   // { "Japan": [{ location, lodging, mie }] }
  const material  = reactive(saved?.material  ?? { items: [], shippingPct: 0.03 })
  // ── Migration: tag every existing material item with the default COA
  if (Array.isArray(material.items)) {
    material.items.forEach(it => { if (!it.coaId) it.coaId = coas[0].id })
  }
  // Each COA carries its own overhead — flexible list of items. Each item has
  // { id, label, pct, enabled, base }. base is either 'unloaded' (pct of the
  // unloaded project total) or 'withOverhead' (pct of unloaded + all enabled
  // 'unloaded' items — typically SCR).
  function defaultOverhead() {
    return {
      overheadEnabled: true,
      showLineItems:   true,    // export setting — show each line OR collapse to single Contract Fee
      items: [
        { id: 'oh-' + uuid(), label: 'PM/Financial Support',    pct: 0.02,  enabled: true, base: 'unloaded'     },
        { id: 'oh-' + uuid(), label: 'Material Tracking',       pct: 0,     enabled: true, base: 'unloaded'     },
        { id: 'oh-' + uuid(), label: 'Government PM Labor',     pct: 0.015, enabled: true, base: 'unloaded'     },
        { id: 'oh-' + uuid(), label: 'Management Reserve',      pct: 0.01,  enabled: true, base: 'unloaded'     },
        { id: 'oh-' + uuid(), label: 'Support Cost Rate (SCR)', pct: 0.12,  enabled: true, base: 'withOverhead' },
      ],
    }
  }
  // Migration: convert legacy fixed-field overhead state into the flexible items shape.
  function backfillOverhead(oh) {
    if (!oh) return
    if (typeof oh.overheadEnabled !== 'boolean') oh.overheadEnabled = true
    if (typeof oh.showLineItems   !== 'boolean') oh.showLineItems   = true
    if (!Array.isArray(oh.items)) {
      oh.items = [
        { id: 'oh-' + uuid(), label: oh.scpLabel      || 'PM/Financial Support',    pct: oh.scpPct        ?? 0.02,  enabled: oh.scpEnabled      ?? true, base: 'unloaded' },
        { id: 'oh-' + uuid(), label: oh.globalLabel   || 'Material Tracking',       pct: oh.globalPct     ?? 0,     enabled: oh.globalEnabled   ?? true, base: 'unloaded' },
        { id: 'oh-' + uuid(), label: oh.govLaborLabel || 'Government PM Labor',     pct: oh.govLaborPct   ?? 0.015, enabled: oh.govLaborEnabled ?? true, base: 'unloaded' },
        { id: 'oh-' + uuid(), label: 'Management Reserve',                          pct: oh.managementReservePct ?? 0.01, enabled: oh.mgmtRsvEnabled ?? true, base: 'unloaded' },
        { id: 'oh-' + uuid(), label: 'Support Cost Rate (SCR)',                     pct: oh.scrPct        ?? 0.12,  enabled: oh.scrEnabled      ?? true, base: 'withOverhead' },
      ]
    }
  }
  const overheadByCoa = reactive(saved?.overheadByCoa ?? {})
  // Migration: if a single saved.overhead exists from before COA support, move it onto the default COA
  if (Object.keys(overheadByCoa).length === 0) {
    overheadByCoa[coas[0].id] = saved?.overhead ?? defaultOverhead()
  }
  // Make sure every COA has an overhead slot, and backfill enable flags on legacy data
  coas.forEach(c => { if (!overheadByCoa[c.id]) overheadByCoa[c.id] = defaultOverhead() })
  Object.values(overheadByCoa).forEach(backfillOverhead)
  // Active-COA-scoped overhead — used everywhere existing code referenced `overhead.scpPct` etc.
  const overhead = computed(() => overheadByCoa[activeCoaId.value] ?? overheadByCoa[coas[0].id])

  // Cronos is always on; gov and sub are opt-in
  const enabledEntities = ref(saved?.enabledEntities ?? ['cronos'])

  // Global UI pref — whether the Rate column shows on the deliverables page
  const showRates = ref(saved?.showRates ?? true)
  // Global UI pref — whether to show per-row tracking indicators (check / alert / empty)
  const showRowStatus = ref(saved?.showRowStatus ?? true)

  // ── Undo / redo stacks for lineItems ─────────────────────────────────
  const undoStack = ref([])
  const redoStack = ref([])
  const MAX_HISTORY = 50

  function snapshotLines() {
    undoStack.value.push(JSON.stringify(lineItems))
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
    redoStack.value = []
  }
  function undo() {
    if (!undoStack.value.length) return
    redoStack.value.push(JSON.stringify(lineItems))
    const prev = JSON.parse(undoStack.value.pop())
    lineItems.splice(0, lineItems.length, ...prev)
  }
  function redo() {
    if (!redoStack.value.length) return
    undoStack.value.push(JSON.stringify(lineItems))
    const next = JSON.parse(redoStack.value.pop())
    lineItems.splice(0, lineItems.length, ...next)
  }
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const visibleEntities = computed(() => ENTITIES.filter(e => enabledEntities.value.includes(e.id)))

  const selectedTabId = ref(saved?.selectedTabId ?? 'engineering')

  // ── Computation helpers ──────────────────────────────────────────

  function laborCatRate(catId)        { return laborCats.find(c => c.id === catId)?.defaultRate ?? 0 }
  function catsForRole(role)          { return laborCats.filter(c => c.role === role) }
  function updateLaborCatRate(catId, rate) {
    const c = laborCats.find(c => c.id === catId)
    if (c) c.defaultRate = +rate || 0
  }
  function updateLaborCatLabel(catId, label) {
    const c = laborCats.find(c => c.id === catId)
    if (c) c.label = label
  }
  function resetLaborCats() {
    laborCats.splice(0, laborCats.length, ...deepClone(LABOR_CATS))
  }
  function addLaborCat({ label, role, defaultRate }) {
    const id = `cat-${uuid().slice(0, 8)}`
    laborCats.push({
      id,
      label: label || 'New Category',
      role: role || 'engineering',
      defaultRate: +defaultRate || 0,
    })
    return id
  }
  function removeLaborCat(catId) {
    const i = laborCats.findIndex(c => c.id === catId)
    if (i >= 0) laborCats.splice(i, 1)
  }
  function updateLaborCatRole(catId, role) {
    const c = laborCats.find(c => c.id === catId)
    if (c) c.role = role
  }
  function moveLaborCat(catId, direction) {
    const i = laborCats.findIndex(c => c.id === catId)
    if (i < 0) return
    const j = direction === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= laborCats.length) return
    ;[laborCats[i], laborCats[j]] = [laborCats[j], laborCats[i]]
  }
  function reorderLaborCat(dragId, dropId, after = false) {
    if (!dragId || !dropId || dragId === dropId) return
    const dragIdx = laborCats.findIndex(c => c.id === dragId)
    if (dragIdx < 0) return
    const [dragged] = laborCats.splice(dragIdx, 1)
    const dropIdx = laborCats.findIndex(c => c.id === dropId)
    if (dropIdx < 0) { laborCats.push(dragged); return }
    laborCats.splice(after ? dropIdx + 1 : dropIdx, 0, dragged)
  }

  // ── WBS task CRUD (for the Admin tab) ────────────────────────────
  function addTask(role, phaseId, task) {
    if (!wbs[role]) wbs[role] = {}
    if (!wbs[role][phaseId]) wbs[role][phaseId] = []
    const id = task.id || `${role}-${phaseId}-${uuid().slice(0, 8)}`
    wbs[role][phaseId].push({ id, label: task.label || 'New task', subphase: task.subphase || undefined })
    return id
  }
  function removeTask(role, phaseId, taskId) {
    const arr = wbs[role]?.[phaseId]
    if (!arr) return
    const i = arr.findIndex(t => t.id === taskId)
    if (i >= 0) arr.splice(i, 1)
  }
  function updateTask(role, phaseId, taskId, patch) {
    const t = wbs[role]?.[phaseId]?.find(t => t.id === taskId)
    if (t) Object.assign(t, patch)
  }
  function moveTask(role, phaseId, taskId, direction) {
    const arr = wbs[role]?.[phaseId]
    if (!arr) return
    const i = arr.findIndex(t => t.id === taskId)
    if (i < 0) return
    const j = direction === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  function reorderTask(role, phaseId, dragId, dropId, after = false) {
    if (!dragId || !dropId || dragId === dropId) return
    const arr = wbs[role]?.[phaseId]
    if (!arr) return
    const dragIdx = arr.findIndex(t => t.id === dragId)
    if (dragIdx < 0) return
    const [dragged] = arr.splice(dragIdx, 1)
    const dropIdx = arr.findIndex(t => t.id === dropId)
    if (dropIdx < 0) { arr.push(dragged); return }
    arr.splice(after ? dropIdx + 1 : dropIdx, 0, dragged)
  }
  function resetWbs() {
    Object.keys(wbs).forEach(k => delete wbs[k])
    Object.assign(wbs, deepClone(DEFAULT_WBS))
  }
  function defaultCatForRole(/* role */) { return '' }   // No auto-pick — user must choose a labor category

  function lineHours(line) { return (line.days || 0) * (line.hoursPerDay || 0) }
  function lineCost(line)  { return lineHours(line) * (line.rate || 0) }

  function tasksFor(role, phaseId)           { return wbs[role]?.[phaseId] ?? [] }
  function linesForPhase(role, phaseId, eid) { return lineItems.filter(l => l.role === role && l.phaseId === phaseId && (eid == null || l.entity === eid)) }
  function linesForRole(role, eid)           { return lineItems.filter(l => l.role === role && (eid == null || l.entity === eid)) }

  function phaseHours(role, p, eid) { return linesForPhase(role, p, eid).reduce((s, l) => s + lineHours(l), 0) }
  function phaseCost(role, p, eid)  { return linesForPhase(role, p, eid).reduce((s, l) => s + lineCost(l),  0) }
  function roleHours(role, eid)     { return LIFECYCLE_PHASES.reduce((s, p) => s + phaseHours(role, p.id, eid), 0) }
  function roleCost(role, eid)      { return LIFECYCLE_PHASES.reduce((s, p) => s + phaseCost(role,  p.id, eid), 0) }
  function entityHours(eid) { return ROLES.reduce((s, r) => s + roleHours(r.id, eid), 0) }
  function entityCost(eid)  { return ROLES.reduce((s, r) => s + roleCost(r.id,  eid), 0) }

  // Scope-aware variants (filtered to one scope) — used by exports for per-scope rollups
  function roleCostForCoa(role, eid, coaId) {
    return lineItems
      .filter(l => l.role === role && (eid == null || l.entity === eid) && l.coaId === coaId)
      .reduce((s, l) => s + lineCost(l), 0)
  }
  function phaseCostForCoa(role, phaseId, eid, coaId) {
    return lineItems
      .filter(l => l.role === role && l.phaseId === phaseId && (eid == null || l.entity === eid) && l.coaId === coaId)
      .reduce((s, l) => s + lineCost(l), 0)
  }
  function entityCostForCoa(eid, coaId) {
    return ROLES.reduce((s, r) => s + roleCostForCoa(r.id, eid, coaId), 0)
  }

  // Scoped to the active COA — what the user is currently working on
  const engineeringTotal = computed(() =>
    lineItems.filter(l => l.coaId === activeCoaId.value).reduce((s, l) => s + lineCost(l),  0))
  const engineeringHours = computed(() =>
    lineItems.filter(l => l.coaId === activeCoaId.value).reduce((s, l) => s + lineHours(l), 0))
  // Summed across all COAs flagged to print in the final quote
  const engineeringTotalForQuote = computed(() =>
    lineItems.filter(l => quoteCoaIds.value.includes(l.coaId)).reduce((s, l) => s + lineCost(l), 0))
  const engineeringHoursForQuote = computed(() =>
    lineItems.filter(l => quoteCoaIds.value.includes(l.coaId)).reduce((s, l) => s + lineHours(l), 0))

  // ── Travel data migration ─────────────────────────────────────────
  // Move pre-existing single-row trips into the new trip-with-travelers shape.
  // Also tag each trip with a COA id and a default trip name.
  function migrateTrip(t) {
    if (!t) return t
    if (Array.isArray(t.travelers)) {
      // Already new shape — only make sure coaId exists
      if (!t.coaId) t.coaId = coas[0].id
      return t
    }
    // Convert old shape → new
    const traveler = {
      id: uuid(),
      name: t.travelerName || '',
      qty: Math.max(1, t.persons || 1),
      days: t.days ?? 0,
      travelHours: t.travelHours ?? 4,
      hotel:   t.hotel   ?? true,
      car:     t.rentalCar ?? false,
      airfare: t.airfare ?? false,
      misc:    false,
      // Carry the old single-trip rates into the per-row rate fields so cost math is preserved
      lodgingRate: t.lodgingRate ?? 0,
      mieRate:     t.mieRate     ?? 0,
      carRate:     t.rentalCarRate ?? 75,
      airfareRate: t.airfareRate ?? 600,
      miscRate:    50,
    }
    Object.assign(t, {
      tripName:           t.travelerName || '',
      defaultTravelHours: t.travelHours ?? 4,
      defaultCarRate:     t.rentalCarRate ?? 75,
      defaultAirfareRate: t.airfareRate ?? 600,
      defaultMiscRate:    50,
      travelers:          [traveler],
      coaId:              t.coaId || coas[0].id,
    })
    return t
  }
  // Migrate every existing trip on load
  Object.values(travel).forEach(arr => {
    if (Array.isArray(arr)) arr.forEach(migrateTrip)
  })

  // ── Cost calculations ─────────────────────────────────────────────
  // Per-traveler cost — uses per-row rates (falling back to trip defaults).
  function travelerRate(trip, tr, field, tripDefaultField) {
    // Use the row's value if it's been set (even to 0), else trip default
    const r = tr?.[field]
    return r != null ? r : (trip?.[tripDefaultField] ?? 0)
  }
  function travelerCost(trip, tr) {
    const qty  = Math.max(1, tr.qty || 1)
    const days = Math.max(0, tr.days || 0)
    let c = 0
    if (tr.hotel) {
      // Lodging + M&IE per day. Lodging multiplied by nights (days-1) so a 1-day trip is M&IE only.
      const nights = Math.max(0, days - 1)
      c += travelerRate(trip, tr, 'lodgingRate', 'lodgingRate') * nights
      c += travelerRate(trip, tr, 'mieRate',     'mieRate')     * days
    }
    if (tr.car)     c += travelerRate(trip, tr, 'carRate',     'defaultCarRate')     * days
    if (tr.airfare) c += travelerRate(trip, tr, 'airfareRate', 'defaultAirfareRate')
    if (tr.misc)    c += travelerRate(trip, tr, 'miscRate',    'defaultMiscRate')
    return c * qty
  }
  // Travel-labor: pay-category rate × travel hours × qty. Tracked separately so the
  // caller can decide whether to roll it into the trip total or report it on its own.
  function travelLaborCost(tr) {
    if (!tr?.laborCat) return 0
    const rate = laborCatRate(tr.laborCat) || 0
    return rate * (tr.travelHours || 0) * Math.max(1, tr.qty || 1)
  }

  function tripCost(trip) {
    if (!trip) return 0
    migrateTrip(trip)
    if (Array.isArray(trip.travelers)) {
      return trip.travelers.reduce((s, tr) => s + travelerCost(trip, tr) + travelLaborCost(tr), 0)
    }
    // Legacy fallthrough — should be unreachable after migration
    const persons = Math.max(1, trip.persons || 1)
    const days    = Math.max(1, trip.days    || 1)
    const nights  = Math.max(0, days - 1)
    const hotelRate = trip.lodgingRate || 0
    let cost = 0
    if (trip.hotel)     cost += nights * hotelRate * persons
    cost += days * (trip.mieRate || 0) * persons               // M&IE always included
    if (trip.rentalCar) cost += days * (trip.rentalCarRate || 75)
    if (trip.airfare)   cost += persons * (trip.airfareRate || 600)
    cost += persons * (trip.baggageFees || 0)
    cost += trip.otherFees || 0
    return cost
  }

  // keep travelLineCost as alias for legacy references
  function travelLineCost(line, catId) { return tripCost(line) }

  // Travel total scoped to the active COA (matches Labor behavior)
  const travelTotal = computed(() => {
    const coaId = activeCoaId.value
    let t = 0
    ENTITIES.forEach(e => (travel[e.id] ?? []).forEach(trip => {
      if ((trip.coaId ?? coas[0].id) === coaId) t += tripCost(trip)
    }))
    return t
  })
  // Travel total summed across all COAs flagged for the final quote
  const travelTotalForQuote = computed(() => {
    const ids = quoteCoaIds.value
    let t = 0
    ENTITIES.forEach(e => (travel[e.id] ?? []).forEach(trip => {
      if (ids.includes(trip.coaId ?? coas[0].id)) t += tripCost(trip)
    }))
    return t
  })

  // ── Trip + traveler mutations ─────────────────────────────────────
  function addTrip(entityId) {
    if (!travel[entityId]) travel[entityId] = []
    const curMonth = new Date().toLocaleString('en-US', { month: 'short' })
    travel[entityId].push({
      id: uuid(),
      entity: entityId,
      coaId: activeCoaId.value,
      tripName: '',
      region: 'conus', country: '', destination: '', state: '',
      travelMonth: curMonth,
      lodgingRate: 0, mieRate: 0,
      defaultTravelHours: 4,
      defaultCarRate:     75,
      defaultAirfareRate: 600,
      defaultMiscRate:    50,
      travelers: [],
      gsaMonthlyRates: null,
    })
  }
  function updateTrip(entityId, tripId, patch) {
    const trip = (travel[entityId] ?? []).find(t => t.id === tripId)
    if (trip) Object.assign(trip, patch)
  }

  function addTraveler(entityId, tripId) {
    const trip = (travel[entityId] ?? []).find(t => t.id === tripId)
    if (!trip) return
    migrateTrip(trip)
    trip.travelers.push({
      id: uuid(),
      name: '',
      laborCat: '',       // pay category — drives travel-labor cost (hours × rate)
      qty: 1,
      days: 0,
      travelHours: trip.defaultTravelHours ?? 4,
      hotel: false, car: false, airfare: false, misc: false,
      // Per-row rate overrides — initialized from trip defaults at create time.
      // Editing these per row sticks for that row; changes to trip defaults
      // only affect new travelers added after the change (matches Labor pattern).
      lodgingRate: trip.lodgingRate ?? 0,
      mieRate:     trip.mieRate     ?? 0,
      carRate:     trip.defaultCarRate     ?? 75,
      airfareRate: trip.defaultAirfareRate ?? 600,
      miscRate:    trip.defaultMiscRate    ?? 50,
    })
  }
  function updateTraveler(entityId, tripId, travelerId, patch) {
    const trip = (travel[entityId] ?? []).find(t => t.id === tripId)
    if (!trip || !Array.isArray(trip.travelers)) return
    const tr = trip.travelers.find(t => t.id === travelerId)
    if (tr) Object.assign(tr, patch)
  }
  function removeTraveler(entityId, tripId, travelerId) {
    const trip = (travel[entityId] ?? []).find(t => t.id === tripId)
    if (!trip || !Array.isArray(trip.travelers)) return
    const i = trip.travelers.findIndex(t => t.id === travelerId)
    if (i >= 0) trip.travelers.splice(i, 1)
  }
  // Common city aliases — maps what people type → what GSA calls it
  const CITY_ALIASES = {
    'washington|DC':      'district of columbia',
    'dc|DC':              'district of columbia',
    'new york|NY':        'new york city',
    'nyc|NY':             'new york city',
    'la|CA':              'los angeles',
    'sf|CA':              'san francisco',
    'philly|PA':          'philadelphia',
    'vegas|NV':           'las vegas',
    'nola|LA':            'new orleans',
    'honolulu|HI':        'honolulu',
  }

  function lookupGSARate(city, state) {
    const needle = city.trim().toLowerCase()
    const st     = state.trim().toUpperCase()
    // Apply alias before searching
    const aliasedNeedle = CITY_ALIASES[`${needle}|${st}`] ?? needle

    // 1. Exact match (try alias first, then original)
    const exact = gsaRateMap[`${aliasedNeedle}|${st}`] ?? gsaRateMap[`${needle}|${st}`]
    if (exact) return { ...exact, matchedCity: city }

    // 2. Fuzzy: find all entries for this state, score them
    const candidates = Object.entries(gsaRateMap)
      .filter(([k]) => k.endsWith(`|${st}`))
      .map(([k, v]) => {
        const cityPart = k.slice(0, k.lastIndexOf('|'))
        let score = 0
        if (cityPart.includes(aliasedNeedle))       score = 3
        else if (aliasedNeedle.includes(cityPart))  score = 2
        else {
          const words = aliasedNeedle.split(/\s+/)
          const matched = words.filter(w => w.length > 2 && cityPart.includes(w))
          if (matched.length) score = matched.length
        }
        return { key: k, cityPart, score, rate: v }
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)

    if (candidates.length) {
      const best = candidates[0]
      // Capitalize for display
      const matchedCity = best.cityPart.replace(/\b\w/g, c => c.toUpperCase())
      return { ...best.rate, matchedCity }
    }

    return null
  }
  function importGSARates(rows) {
    // rows: array of { city, state, lodging, mie }
    rows.forEach(r => {
      const key = `${r.city.trim().toLowerCase()}|${r.state.trim().toUpperCase()}`
      gsaRateMap[key] = { lodging: r.lodging, mie: r.mie, months: r.months ?? null }
    })
  }
  function clearGSARates() {
    Object.keys(gsaRateMap).forEach(k => delete gsaRateMap[k])
  }

  // ── OCONUS rate loading (called by App.vue on startup) ───────────────
  function loadOCONUSRates({ map, countries, byCountry }) {
    Object.keys(oconusMap).forEach(k => delete oconusMap[k])
    Object.assign(oconusMap, map)
    oconusCountries.value = countries
    Object.keys(oconusByCountry).forEach(k => delete oconusByCountry[k])
    Object.assign(oconusByCountry, byCountry)
  }
  function lookupOCONUSRate(country, location) {
    return oconusMap[`${country}|${location}`] ?? null
  }

  // ── CONUS rate loading from file (replaces/supplements gsaRateMap) ───
  function loadCONUSRates(map) {
    // map is { "City|ST": { lodging, mie, months } }
    Object.keys(gsaRateMap).forEach(k => delete gsaRateMap[k])
    Object.assign(gsaRateMap, map)
  }

  function removeTrip(entityId, tripId) {
    const arr = travel[entityId]
    if (!arr) return
    const i = arr.findIndex(t => t.id === tripId)
    if (i >= 0) arr.splice(i, 1)
  }

  // keep old line-based mutations as no-ops so old refs don't crash
  function addTravelLine()    {}
  function updateTravelLine() {}
  function removeTravelLine() {}

  function addMaterialItem() {
    material.items.push({ id: uuid(), description: '', qty: 1, unitCost: 0, coaId: activeCoaId.value })
  }
  function updateMaterialItem(id, patch) {
    const item = material.items.find(i => i.id === id)
    if (item) Object.assign(item, patch)
  }
  function removeMaterialItem(id) {
    const idx = material.items.findIndex(i => i.id === id)
    if (idx >= 0) material.items.splice(idx, 1)
  }

  // Material totals scoped to the active COA
  const activeMaterialItems = computed(() => material.items.filter(i => (i.coaId ?? coas[0].id) === activeCoaId.value))
  const materialUnloaded    = computed(() => activeMaterialItems.value.reduce((s, i) => s + (i.qty || 0) * (i.unitCost || 0), 0))
  const shippingCost        = computed(() => materialUnloaded.value * material.shippingPct)
  const materialTotal       = computed(() => materialUnloaded.value + shippingCost.value)
  // Helpers that compute material totals for any specific COA — used by Summary + exports
  function materialUnloadedFor(coaId) {
    return material.items.filter(i => (i.coaId ?? coas[0].id) === coaId).reduce((s, i) => s + (i.qty || 0) * (i.unitCost || 0), 0)
  }
  function materialTotalFor(coaId) {
    const u = materialUnloadedFor(coaId)
    return u + u * (material.shippingPct || 0)
  }
  const materialTotalForQuote = computed(() =>
    quoteCoaIds.value.reduce((s, id) => s + materialTotalFor(id), 0))
  // Overhead helpers — compute from the items[] array on the active scope.
  // 'unloaded' base items multiply by the unloaded project total. 'withOverhead'
  // items (typically SCR) multiply by unloaded + sum of enabled unloaded items.
  const unloadedProjectTotal = computed(() => engineeringTotal.value + travelTotal.value + materialTotal.value)
  const projectOverheadTotal = computed(() => {
    const oh = overhead.value
    if (!oh?.overheadEnabled) return 0
    const items = oh.items ?? []
    return items.reduce((s, it) => {
      if (!it.enabled || it.base !== 'unloaded') return s
      return s + unloadedProjectTotal.value * (it.pct || 0)
    }, 0)
  })
  const projectWithOverhead = computed(() => unloadedProjectTotal.value + projectOverheadTotal.value)
  const scrCost = computed(() => {
    const oh = overhead.value
    if (!oh?.overheadEnabled) return 0
    const items = oh.items ?? []
    return items.reduce((s, it) => {
      if (!it.enabled || it.base !== 'withOverhead') return s
      return s + projectWithOverhead.value * (it.pct || 0)
    }, 0)
  })
  // "Contract Fee" — total of every enabled overhead item (both bases)
  const totalOverhead = computed(() => projectOverheadTotal.value + scrCost.value)
  const contractFee   = totalOverhead
  const totalLoadedCost = computed(() => projectWithOverhead.value + scrCost.value)

  // Backward-compat shims so existing exports that look up by these names
  // still work (they read items by index from the default seed order).
  function itemByIndex(oh, idx) { return oh?.items?.[idx] }
  const scpCost      = computed(() => costForItem(overhead.value, 0))
  const globalCost   = computed(() => costForItem(overhead.value, 1))
  const govLaborCost = computed(() => costForItem(overhead.value, 2))
  const managementReserveCost = computed(() => costForItem(overhead.value, 3))
  function costForItem(oh, idx) {
    if (!oh?.overheadEnabled) return 0
    const it = itemByIndex(oh, idx)
    if (!it?.enabled) return 0
    if (it.base === 'unloaded')     return unloadedProjectTotal.value * (it.pct || 0)
    if (it.base === 'withOverhead') return projectWithOverhead.value  * (it.pct || 0)
    return 0
  }

  // ── Mutations ─────────────────────────────────────────────────────

  function nextSortOrder(entity, phaseId) {
    const existing = lineItems.filter(l => l.entity === entity && l.phaseId === phaseId)
    return existing.length ? Math.max(...existing.map(l => l.sortOrder ?? 0)) + 1 : 0
  }

  function addLine(role, phaseId, taskId, opts = {}) {
    snapshotLines()
    const entity   = opts.entity   ?? 'cronos'
    const laborCat = opts.laborCat ?? ''
    // Everything starts at zero unless explicitly passed (e.g. by a baseline template).
    // No TASK_DEFAULTS auto-fill, no rate guess until the user picks a labor category.
    lineItems.push({
      id: uuid(), role, phaseId, taskId: taskId ?? '', entity, laborCat,
      days:        opts.days        ?? 0,
      hoursPerDay: opts.hoursPerDay ?? 0,
      rate:        opts.rate        ?? (laborCat ? laborCatRate(laborCat) : 0),
      sortOrder:   opts.sortOrder   ?? nextSortOrder(entity, phaseId),
      coaId:       opts.coaId       ?? activeCoaId.value,
    })
  }

  function duplicateLine(lineId) {
    const src = lineItems.find(l => l.id === lineId)
    if (!src) return
    snapshotLines()
    const clone = { ...src, id: uuid(), sortOrder: (src.sortOrder ?? 0) + 0.5 }
    const idx = lineItems.findIndex(l => l.id === lineId)
    lineItems.splice(idx + 1, 0, clone)
    // Re-normalize sortOrder so the inserted 0.5 doesn't accumulate forever
    const samePhase = lineItems
      .filter(l => l.entity === src.entity && l.phaseId === src.phaseId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    samePhase.forEach((l, i) => { l.sortOrder = i })
  }

  function swapLineOrder(idA, idB) {
    const a = lineItems.find(l => l.id === idA)
    const b = lineItems.find(l => l.id === idB)
    if (!a || !b) return
    const tmp = a.sortOrder ?? 0
    a.sortOrder = b.sortOrder ?? 0
    b.sortOrder = tmp
  }

  function reorderLine(dragId, dropId, after = false) {
    const drag = lineItems.find(l => l.id === dragId)
    const drop = lineItems.find(l => l.id === dropId)
    if (!drag || !drop || dragId === dropId) return
    snapshotLines()
    const phaseLines = lineItems
      .filter(l => l.entity === drag.entity && l.phaseId === drag.phaseId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const without = phaseLines.filter(l => l.id !== dragId)
    const dropIdx = without.findIndex(l => l.id === dropId)
    without.splice(after ? dropIdx + 1 : dropIdx, 0, drag)
    without.forEach((l, i) => { l.sortOrder = i })
  }

  function removeLine(lineId) {
    const i = lineItems.findIndex(l => l.id === lineId)
    if (i < 0) return
    snapshotLines()
    lineItems.splice(i, 1)
  }

  function updateLine(lineId, patch) {
    const line = lineItems.find(l => l.id === lineId)
    if (!line) return
    if (patch.laborCat !== undefined && patch.rate === undefined && patch.laborCat !== line.laborCat)
      patch = { ...patch, rate: laborCatRate(patch.laborCat) }
    // Hard cap: no single line may exceed 365 days.
    if (patch.days !== undefined) {
      const d = +patch.days || 0
      patch = { ...patch, days: d < 0 ? 0 : (d > 365 ? 365 : d) }
    }
    // Days no longer auto-fill on taskId change — user fills manually,
    // or loads via one of the baseline templates.
    Object.assign(line, patch)
  }

  function enableEntity(entityId) {
    if (!enabledEntities.value.includes(entityId)) enabledEntities.value.push(entityId)
  }
  function disableEntity(entityId) {
    if (entityId === 'cronos') return
    enabledEntities.value = enabledEntities.value.filter(e => e !== entityId)
    lineItems.filter(l => l.entity === entityId).map(l => l.id).forEach(removeLine)
  }

  function applyTemplate(templateId) {
    const tmpl = TEMPLATES.find(t => t.id === templateId)
    if (!tmpl) return

    const targetCoa = activeCoaId.value   // template populates the currently-active scope

    // Clear labor lines for THIS scope only (leave other scopes untouched)
    for (let i = lineItems.length - 1; i >= 0; i--) {
      if (lineItems[i].coaId === targetCoa) lineItems.splice(i, 1)
    }
    // Reset WBS to defaults (shared across scopes — same task catalog)
    Object.keys(wbs).forEach(k => delete wbs[k])
    Object.assign(wbs, deepClone(DEFAULT_WBS));
    (tmpl.seed ?? []).forEach(([role, taskId, days, hpd, laborCat]) => {
      let phaseId = null
      for (const p of LIFECYCLE_PHASES)
        if ((wbs[role]?.[p.id] ?? []).some(t => t.id === taskId)) { phaseId = p.id; break }
      if (phaseId) addLine(role, phaseId, taskId, { entity: 'cronos', days, hoursPerDay: hpd, laborCat, coaId: targetCoa })
    })

    // Clear travel for THIS scope only, then build new-shape trips from the legacy travelSeed
    ENTITIES.forEach(e => {
      const arr = travel[e.id]
      if (!Array.isArray(arr)) return
      for (let i = arr.length - 1; i >= 0; i--) {
        if ((arr[i].coaId ?? coas[0].id) === targetCoa) arr.splice(i, 1)
      }
    })
    if (!Array.isArray(travel['cronos'])) travel['cronos'] = []
    const seedMonth = new Date().toLocaleString('en-US', { month: 'short' })

    // Baselines A/B/C/D all run out of Fort Walton Beach, FL. Pre-fill the
    // City/Base on the project info and the destination + state on every seeded
    // trip so the GSA per-diem can resolve. Skip for Custom (X).
    const isBaseline = (tmpl.id || '').startsWith('baseline-') && tmpl.id !== 'baseline-x'
    const seedCity   = isBaseline ? 'Fort Walton Beach' : ''
    const seedState  = isBaseline ? 'FL'                : ''
    if (isBaseline && !project.cityBase) project.cityBase = 'Fort Walton Beach, FL'

    // Try a local rates lookup so the trip lands with per-diem already populated
    let seedLodging = 0, seedMie = 0, seedMonthly = null
    if (isBaseline) {
      const rate = lookupGSARate(seedCity, seedState)
      if (rate) {
        seedLodging = rate.lodging || 0
        seedMie     = rate.mie     || 0
        seedMonthly = rate.months  || null
      }
    }

    ;(tmpl.travelSeed ?? []).forEach(([travelerName, days, persons, travelHours, hotel, rentalCar, airfare]) => {
      // Each template travel seed becomes a trip with one traveler in the new shape.
      const tripId = uuid()
      travel['cronos'].push({
        id: tripId,
        entity: 'cronos',
        coaId: targetCoa,
        tripName: travelerName || '',
        region: 'conus', country: '', destination: seedCity, state: seedState,
        travelMonth: seedMonth,
        lodgingRate: seedLodging, mieRate: seedMie,
        defaultTravelHours: travelHours ?? 4,
        defaultCarRate:     75,
        defaultAirfareRate: 600,
        defaultMiscRate:    50,
        gsaMonthlyRates: seedMonthly,
        travelers: [{
          id: uuid(),
          name: travelerName || '',
          laborCat: '',
          qty: Math.max(1, persons || 1),
          days: days ?? 0,
          travelHours: travelHours ?? 4,
          hotel:   !!hotel,
          car:     !!rentalCar,
          airfare: !!airfare,
          misc:    false,
          lodgingRate: seedLodging,
          mieRate:     seedMie,
          carRate:     75,
          airfareRate: 600,
          miscRate:    50,
        }],
      })
    })

    // Make sure overhead has a slot for this scope
    if (!overheadByCoa[targetCoa]) overheadByCoa[targetCoa] = defaultOverhead()

    project.templateId   = tmpl.id
    project.templateName = tmpl.name

    // Rename the active scope to match the template the user picked,
    // so the Scopes dropdown shows e.g. "Baseline A — Huddle Room"
    // instead of the generic "Scope 1 — Primary".
    const activeScope = coas.find(c => c.id === targetCoa)
    if (activeScope) activeScope.name = tmpl.name
  }

  // ── Snapshots ─────────────────────────────────────────────────────

  const snapshots = ref(loadSnapshots())

  function saveSnapshot(name) {
    const snap = {
      id: uuid(),
      name: name || 'Untitled',
      date: new Date().toISOString(),
      state: exportStateForBackup(),
    }
    snapshots.value.unshift(snap)
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots.value)) } catch {}
  }

  function restoreSnapshot(id) {
    const snap = snapshots.value.find(s => s.id === id)
    if (!snap) return
    importStateFromBackup(snap.state)
  }

  function deleteSnapshot(id) {
    snapshots.value = snapshots.value.filter(s => s.id !== id)
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots.value)) } catch {}
  }

  // ── COA mutations ─────────────────────────────────────────────────
  function addCoa(name, description) {
    const id = 'coa-' + uuid()
    const nextNum = coas.length + 1
    coas.push({
      id,
      name: name && name.trim() ? name.trim() : `Scope ${nextNum}`,
      description: description ?? '',
      includeInQuote: true,
    })
    overheadByCoa[id] = defaultOverhead()   // every new scope gets its own overhead settings
    activeCoaId.value = id   // switch to it immediately so the user can start filling it in
    return id
  }
  function removeCoa(id) {
    if (coas.length <= 1) return       // never delete the last scope
    const idx = coas.findIndex(c => c.id === id)
    if (idx < 0) return
    // Drop every line / trip / material item tagged to this scope, plus its overhead
    for (let i = lineItems.length - 1; i >= 0; i--) {
      if (lineItems[i].coaId === id) lineItems.splice(i, 1)
    }
    ENTITIES.forEach(e => {
      const arr = travel[e.id]
      if (Array.isArray(arr)) {
        for (let i = arr.length - 1; i >= 0; i--) if (arr[i].coaId === id) arr.splice(i, 1)
      }
    })
    for (let i = material.items.length - 1; i >= 0; i--) {
      if (material.items[i].coaId === id) material.items.splice(i, 1)
    }
    delete overheadByCoa[id]
    coas.splice(idx, 1)
    if (activeCoaId.value === id) activeCoaId.value = coas[0].id
  }
  function renameCoa(id, name, description) {
    const c = coas.find(c => c.id === id)
    if (!c) return
    if (name        !== undefined) c.name = name
    if (description !== undefined) c.description = description
  }
  function toggleCoaIncluded(id) {
    const c = coas.find(c => c.id === id)
    if (c) c.includeInQuote = !c.includeInQuote
  }
  function setActiveCoa(id) {
    if (coas.some(c => c.id === id)) activeCoaId.value = id
  }
  function duplicateCoa(id) {
    const src = coas.find(c => c.id === id)
    if (!src) return
    const newId = 'coa-' + uuid()
    coas.push({
      id: newId,
      name: src.name + ' (copy)',
      description: src.description,
      includeInQuote: true,
    })
    // Clone every line, trip, material item, and overhead settings from src to the new scope
    lineItems.filter(l => l.coaId === id).forEach(l => {
      lineItems.push({ ...l, id: uuid(), coaId: newId })
    })
    ENTITIES.forEach(e => {
      const arr = travel[e.id]
      if (Array.isArray(arr)) {
        arr.filter(t => t.coaId === id).forEach(t => {
          const cloned = JSON.parse(JSON.stringify(t))
          cloned.id = uuid()
          cloned.coaId = newId
          if (Array.isArray(cloned.travelers)) cloned.travelers.forEach(tr => { tr.id = uuid() })
          arr.push(cloned)
        })
      }
    })
    material.items.filter(it => it.coaId === id).forEach(it => {
      material.items.push({ ...it, id: uuid(), coaId: newId })
    })
    overheadByCoa[newId] = { ...(overheadByCoa[id] ?? defaultOverhead()) }
    activeCoaId.value = newId
  }

  // ── Per-COA aggregate totals (used by the upcoming Summary tab + exports) ──
  function laborTotalFor(coaId) {
    return lineItems.filter(l => l.coaId === coaId).reduce((s, l) => s + lineCost(l), 0)
  }
  function laborHoursFor(coaId) {
    return lineItems.filter(l => l.coaId === coaId).reduce((s, l) => s + lineHours(l), 0)
  }
  function travelTotalFor(coaId) {
    let t = 0
    ENTITIES.forEach(e => (travel[e.id] ?? []).forEach(trip => {
      if ((trip.coaId ?? coas[0].id) === coaId) t += tripCost(trip)
    }))
    return t
  }
  function coaTotals(coaId) {
    const oh = overheadByCoa[coaId] ?? defaultOverhead()
    const labor    = laborTotalFor(coaId)
    const trips    = travelTotalFor(coaId)
    const mat      = materialTotalFor(coaId)
    const unloaded = labor + trips + mat
    const items    = Array.isArray(oh.items) ? oh.items : []
    const masterOn = !!oh.overheadEnabled

    // Sum all enabled 'unloaded'-base items
    const ohTotal = items.reduce((s, it) => {
      if (!masterOn || !it.enabled || it.base !== 'unloaded') return s
      return s + unloaded * (it.pct || 0)
    }, 0)
    const withOh = unloaded + ohTotal
    // Sum all enabled 'withOverhead'-base items (typically just SCR)
    const scr = items.reduce((s, it) => {
      if (!masterOn || !it.enabled || it.base !== 'withOverhead') return s
      return s + withOh * (it.pct || 0)
    }, 0)

    // Back-compat fields for existing export code that reads by item index (default seed order)
    const cost = (idx) => {
      const it = items[idx]
      if (!masterOn || !it?.enabled) return 0
      if (it.base === 'unloaded')     return unloaded * (it.pct || 0)
      if (it.base === 'withOverhead') return withOh   * (it.pct || 0)
      return 0
    }

    return {
      labor, trips, mat, unloaded,
      scp:     cost(0),
      glob:    cost(1),
      govLab:  cost(2),
      mgmtRsv: cost(3),
      ohTotal, withOh, scr,
      totalLoaded: withOh + scr,
      contractFee: ohTotal + scr,
      items,                         // raw items, used by exports when showLineItems is true
      showLineItems: oh.showLineItems !== false,
    }
  }

  // ── Overhead item mutations ───────────────────────────────────────
  function addOverheadItem(coaId, opts = {}) {
    const oh = overheadByCoa[coaId]
    if (!oh) return
    if (!Array.isArray(oh.items)) oh.items = []
    oh.items.push({
      id: 'oh-' + uuid(),
      label: opts.label ?? 'New overhead item',
      pct:   opts.pct   ?? 0,
      enabled: true,
      base:  opts.base ?? 'unloaded',
    })
  }
  function removeOverheadItem(coaId, itemId) {
    const oh = overheadByCoa[coaId]
    if (!oh || !Array.isArray(oh.items)) return
    const idx = oh.items.findIndex(i => i.id === itemId)
    if (idx >= 0) oh.items.splice(idx, 1)
  }
  function updateOverheadItem(coaId, itemId, patch) {
    const oh = overheadByCoa[coaId]
    if (!oh || !Array.isArray(oh.items)) return
    const it = oh.items.find(i => i.id === itemId)
    if (it) Object.assign(it, patch)
  }
  function reorderOverheadItem(coaId, dragId, dropId) {
    const oh = overheadByCoa[coaId]
    if (!oh || !Array.isArray(oh.items)) return
    if (!dragId || dragId === dropId) return
    const dragIdx = oh.items.findIndex(i => i.id === dragId)
    if (dragIdx < 0) return
    const [moved] = oh.items.splice(dragIdx, 1)
    const dropIdx = oh.items.findIndex(i => i.id === dropId)
    if (dropIdx < 0) {
      // Couldn't find the drop target — put the moved item back where it was
      oh.items.splice(dragIdx, 0, moved)
      return
    }
    oh.items.splice(dropIdx, 0, moved)
  }
  // Grand total across every included scope (used by the topbar + summary)
  const totalLoadedForQuote = computed(() =>
    quoteCoaIds.value.reduce((s, id) => s + coaTotals(id).totalLoaded, 0))

  // ── Backup file: export / import the entire project state ────────────
  // Used by the "Save → Download backup" / "Load from backup" menu in the topbar.
  function exportStateForBackup() {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      project:         { ...project },
      wbs:             deepClone(wbs),
      lineItems:       deepClone(lineItems),
      travel:          deepClone(travel),
      material:        { ...material, items: deepClone(material.items) },
      overheadByCoa:   deepClone(overheadByCoa),
      enabledEntities: enabledEntities.value.slice(),
      laborCats:       deepClone(laborCats),
      coas:            deepClone(coas),
      activeCoaId:     activeCoaId.value,
      selectedTabId:   selectedTabId.value,
      showRates:       showRates.value,
      showRowStatus:   showRowStatus.value,
    }
  }
  function importStateFromBackup(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('Empty or invalid file.')
    // Reset every reactive container, then replace the contents.
    if (payload.project)         Object.assign(project, payload.project)
    if (payload.wbs) {
      Object.keys(wbs).forEach(k => delete wbs[k])
      Object.assign(wbs, deepClone(payload.wbs))
    }
    if (Array.isArray(payload.lineItems)) {
      lineItems.splice(0, lineItems.length, ...deepClone(payload.lineItems))
    }
    if (payload.travel) {
      Object.keys(travel).forEach(k => delete travel[k])
      Object.assign(travel, deepClone(payload.travel))
      Object.values(travel).forEach(arr => Array.isArray(arr) && arr.forEach(migrateTrip))
    }
    if (payload.material) {
      Object.assign(material, { ...payload.material, items: deepClone(payload.material.items ?? []) })
    }
    if (payload.overheadByCoa) {
      Object.keys(overheadByCoa).forEach(k => delete overheadByCoa[k])
      Object.assign(overheadByCoa, deepClone(payload.overheadByCoa))
    } else if (payload.overhead) {
      // Older single-overhead backups — drop onto the first scope
      Object.keys(overheadByCoa).forEach(k => delete overheadByCoa[k])
      overheadByCoa[(payload.coas?.[0]?.id) || coas[0]?.id || 'coa-primary'] = deepClone(payload.overhead)
    }
    if (Array.isArray(payload.enabledEntities)) enabledEntities.value = payload.enabledEntities.slice()
    if (Array.isArray(payload.laborCats)) {
      laborCats.splice(0, laborCats.length, ...deepClone(payload.laborCats))
    }
    if (Array.isArray(payload.coas)) {
      coas.splice(0, coas.length, ...deepClone(payload.coas))
    }
    if (payload.activeCoaId && coas.some(c => c.id === payload.activeCoaId)) {
      activeCoaId.value = payload.activeCoaId
    } else if (coas.length) {
      activeCoaId.value = coas[0].id
    }
    if (payload.selectedTabId) selectedTabId.value = payload.selectedTabId
    if (typeof payload.showRates    === 'boolean') showRates.value     = payload.showRates
    if (typeof payload.showRowStatus === 'boolean') showRowStatus.value = payload.showRowStatus
  }

  function resetAll() {
    Object.assign(project, { sponsor: '', roomName: '', date: new Date().toISOString().split('T')[0], projectEngineer: '', anticipatedFYFunds: 5_000_000, templateId: null, templateName: null })
    lineItems.splice(0, lineItems.length)
    Object.keys(wbs).forEach(k => delete wbs[k]); Object.assign(wbs, deepClone(DEFAULT_WBS))
    Object.keys(travel).forEach(k => delete travel[k]); Object.assign(travel, emptyTravelData())
    Object.assign(material, { items: [], shippingPct: 0.03 })
    // Reset overhead for every scope
    Object.keys(overheadByCoa).forEach(k => delete overheadByCoa[k])
    coas.forEach(c => { overheadByCoa[c.id] = defaultOverhead() })
    enabledEntities.value = ['cronos']
    selectedTabId.value   = 'engineering'
    localStorage.removeItem(STORAGE_KEY)
  }

  watch([project, wbs, lineItems, travel, material, overheadByCoa, enabledEntities, selectedTabId, gsaRateMap, laborCats, showRates, showRowStatus, coas, activeCoaId], () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        project: { ...project }, wbs: deepClone(wbs), lineItems: deepClone(lineItems),
        travel: deepClone(travel), material: { ...material, items: deepClone(material.items) },
        overheadByCoa: deepClone(overheadByCoa),
        enabledEntities: enabledEntities.value, selectedTabId: selectedTabId.value,
        gsaRateMap: { ...gsaRateMap },
        laborCats: deepClone(laborCats),
        showRates: showRates.value,
        showRowStatus: showRowStatus.value,
        coas: deepClone(coas),
        activeCoaId: activeCoaId.value,
      }))
    } catch {}
  }, { deep: true })

  return {
    ENTITIES, ROLES, LIFECYCLE_PHASES, TRAVEL_CATEGORIES, TABS, TEMPLATES, TASK_DEFAULTS,
    // LABOR_CATS now refers to the reactive editable list (was a const)
    LABOR_CATS: laborCats,
    project, wbs, lineItems, travel, material, overhead, laborCats,
    enabledEntities, selectedTabId, visibleEntities,
    engineeringTotal, engineeringHours, travelTotal,
    materialUnloaded, shippingCost, materialTotal, unloadedProjectTotal,
    scpCost, globalCost, govLaborCost, managementReserveCost,
    projectOverheadTotal, projectWithOverhead, scrCost, totalOverhead, contractFee, totalLoadedCost,
    laborCatRate, catsForRole, updateLaborCatRate, updateLaborCatLabel, updateLaborCatRole, moveLaborCat, reorderLaborCat, addLaborCat, removeLaborCat, resetLaborCats,
    addTask, removeTask, updateTask, moveTask, reorderTask, resetWbs,
    lineHours, lineCost, tasksFor, linesForPhase, linesForRole,
    phaseHours, phaseCost, roleHours, roleCost, entityHours, entityCost, travelLineCost,
    addLine, duplicateLine, removeLine, updateLine, swapLineOrder, reorderLine, enableEntity, disableEntity, applyTemplate, resetAll,
    coas, activeCoaId, activeCoa, activeLineItems, quoteCoaIds,
    engineeringTotalForQuote, engineeringHoursForQuote,
    activeMaterialItems, materialUnloadedFor, materialTotalFor, materialTotalForQuote,
    overheadByCoa, laborTotalFor, laborHoursFor, travelTotalFor, coaTotals, totalLoadedForQuote,
    roleCostForCoa, phaseCostForCoa, entityCostForCoa,
    addOverheadItem, removeOverheadItem, updateOverheadItem, reorderOverheadItem,
    addCoa, removeCoa, renameCoa, toggleCoaIncluded, setActiveCoa, duplicateCoa,
    exportStateForBackup, importStateFromBackup,
    showRates, showRowStatus, undo, redo, canUndo, canRedo,
    addMaterialItem, updateMaterialItem, removeMaterialItem,
    addTrip, updateTrip, removeTrip, tripCost, travelerCost, travelerRate, travelLaborCost,
    addTraveler, updateTraveler, removeTraveler,
    travelTotalForQuote,
    gsaRateMap, importGSARates, lookupGSARate, clearGSARates,
    loadCONUSRates,
    oconusMap, oconusCountries, oconusByCountry, loadOCONUSRates, lookupOCONUSRate,
    addTravelLine, updateTravelLine, removeTravelLine,
    snapshots, saveSnapshot, restoreSnapshot, deleteSnapshot,
  }
})
