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
  { id: 'programming', label: 'Programming Tasks',        icon: 'ti-code' },
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
  { id: 'eng1',    label: 'ENG I',                 role: 'engineering', defaultRate: 116 },
  { id: 'eng2',    label: 'ENG II',                role: 'engineering', defaultRate: 125 },
  { id: 'eng3',    label: 'ENG III',               role: 'engineering', defaultRate: 134 },
  { id: 'prog1',   label: 'PROG I',                role: 'programming', defaultRate: 116 },
  { id: 'prog2',   label: 'PROG II',               role: 'programming', defaultRate: 125 },
  { id: 'prog3',   label: 'PROG III',              role: 'programming', defaultRate: 134 },
  { id: 'pm1',     label: 'PM',                    role: 'pm',          defaultRate: 102 },
  { id: 'pm2',     label: 'PM SPT',                role: 'pm',          defaultRate: 78  },
  { id: 'proc',    label: 'PROC',                  role: 'pm',          defaultRate: 62  },
  { id: 'wh',      label: 'WH I',                  role: 'pm',          defaultRate: 76  },
  { id: 'procsp3', label: 'Proc Specialist III',   role: 'pm',          defaultRate: 70  },
  { id: 'procsp2', label: 'Proc Specialist II',    role: 'pm',          defaultRate: 67  },
  { id: 'procsp1', label: 'Proc Specialist I',     role: 'pm',          defaultRate: 63  },
  { id: 'tech1',   label: 'TECH I',                role: 'technician',  defaultRate: 71  },
  { id: 'tech2',   label: 'TECH II',               role: 'technician',  defaultRate: 78  },
  { id: 'tech3',   label: 'TECH III',              role: 'technician',  defaultRate: 94  },
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
  programming: {
    'cost-estimate': [
      { id: 'prog-ce-rom',         label: 'ROM Hours Estimate' },
      { id: 'prog-ce-meetings',    label: 'Meetings / Telecons' },
    ],
    'system-design': [
      { id: 'prog-sd-control',     label: 'Control System Design' },
      { id: 'prog-sd-touch-panel', label: 'Touch Panel Layout / GUI Design' },
      { id: 'prog-sd-dsp-design',  label: 'DSP Design / Signal Flow' },
    ],
    'equip-procure': [],
    'pre-delivery': [
      { id: 'prog-pd-user-guide',   label: 'Create User Guide' },
      { id: 'prog-pd-control-code', label: 'Control Code Development' },
      { id: 'prog-pd-dsp',          label: 'DSP Programming' },
      { id: 'prog-pd-config-test',  label: 'Equipment Configuration and Testing in Lab' },
    ],
    'system-delivery': [
      { id: 'prog-sd2-onsite-prog', label: 'On-Site Programming Adjustments' },
      { id: 'prog-sd2-acceptance',  label: 'Acceptance Test Support' },
    ],
    'project-closeout': [
      { id: 'prog-pc-code-archive', label: 'Archive Final Code / Documentation' },
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
  { id: 'baseline-x', name: 'New', description: 'Blank room — start from scratch with an empty task and equipment list.' },
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
  // Backfill any missing newer fields — extracted so importStateFromBackup can call it too.
  function backfillProject() {
    if (!('govLead'  in project))      project.govLead       = ''
    if (!('building' in project))      project.building      = ''
    if (!('cityBase' in project))      project.cityBase      = ''
    if (!('pmSupportLead' in project)) project.pmSupportLead = ''
    if (!project.includeFields || typeof project.includeFields !== 'object') {
      project.includeFields = {}
    }
    ;['sponsor', 'projectEngineer', 'govLead', 'roomName', 'cityBase',
      'building', 'pmSupportLead', 'date'
    ].forEach(k => {
      if (typeof project.includeFields[k] !== 'boolean') project.includeFields[k] = true
    })
  }
  backfillProject()

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
  // One-time rates migration — when we ship a new rate schedule, bump
  // RATES_VERSION below to force existing users' saved laborCats to update.
  // After the migration runs, the version flag is stored so it won't run again.
  const RATES_VERSION_KEY = 'rom-rates-version'
  const RATES_VERSION = 2
  try {
    const ver = parseInt(localStorage.getItem(RATES_VERSION_KEY) || '0', 10)
    if (ver < RATES_VERSION) {
      LABOR_CATS.forEach(d => {
        const cat = laborCats.find(c => c.id === d.id)
        if (cat) {
          cat.defaultRate = d.defaultRate
          cat.label       = d.label
          cat.role        = d.role
        }
      })
      localStorage.setItem(RATES_VERSION_KEY, String(RATES_VERSION))
    }
  } catch {}
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
  // ── TEMP-MATERIAL-TAB ──────────────────────────────────────────────
  // Everything in this block (defaultMaterialCategories, the extended
  // material reactive shape, the migration, the per-template qty model,
  // and the addMaterialCategory / updateMaterialCategory /
  // removeMaterialCategory / reorderMaterialCategory mutations below)
  // belongs to the temporary Material & Shipping tab.
  // When the real workflow lands, search for "TEMP-MATERIAL-TAB" to find
  // every related piece across the codebase and delete them together.
  // ───────────────────────────────────────────────────────────────────

  // Templates (room-type classes). Picking one loads that class's MEL into
  // the active scope, replacing any existing items. 'X' = empty/custom.
  // Labels match the Proposal sheet "Baseline → Type" mapping in
  // temp-pro.xlsx so the UI can show a category when you pick a class.
  const MATERIAL_TEMPLATES = [
    { id: 'A', label: 'Huddle Room' },
    { id: 'B', label: 'Classroom' },
    { id: 'C', label: 'Conference Room' },
    { id: 'D', label: 'Operations Center' },
    { id: 'X', label: 'Custom (empty)' },
  ]
  const TEMPLATE_IDS = MATERIAL_TEMPLATES.map(t => t.id)
  // The seed still carries qtyByTemplate so the four built-in class MELs
  // can be derived from it. Helper to read a single class's qty out of a
  // seed entry, supporting both the new shape and any legacy single-qty seed.
  function seedQtyForClass(seed, classId) {
    if (seed?.qtyByTemplate && classId in seed.qtyByTemplate) return Number(seed.qtyByTemplate[classId]) || 0
    return Number(seed?.qty) || 0
  }

  // Default seed list for material categories — user-editable in Admin.
  function defaultMaterialCategories() {
    return [
      { id: 'cat-displays',  label: 'Displays'   },
      { id: 'cat-cabling',   label: 'Cabling'    },
      { id: 'cat-audio',     label: 'Audio'      },
      { id: 'cat-mounts',    label: 'Mounts'     },
      { id: 'cat-power',     label: 'Power'      },
      { id: 'cat-control',   label: 'Control'    },
      { id: 'cat-computing', label: 'Computing'  },
      { id: 'cat-misc',      label: 'Misc'       },
    ]
  }
  const material  = reactive(saved?.material  ?? {
    items: [], shippingPct: 0,
    categories: defaultMaterialCategories(),
    activeTemplate: 'X',
    manualAmounts: {},   // coaId → additional flat dollar amount
    shipperName: '',     // third-party shipper name
    shipperCost: 0,      // flat shipper invoice amount
  })
  if (!material.manualAmounts) material.manualAmounts = {}
  if (material.shipperName === undefined) material.shipperName = ''
  if (material.shipperCost === undefined) material.shipperCost = 0
  // ── Migration: ensure categories list, active template, and per-item shape.
  if (!Array.isArray(material.categories) || material.categories.length === 0) {
    material.categories = defaultMaterialCategories()
  }
  if (!TEMPLATE_IDS.includes(material.activeTemplate)) {
    material.activeTemplate = 'X'
  }
  if (Array.isArray(material.items)) {
    const firstCatId = material.categories[0].id
    material.items.forEach(it => {
      if (!it.coaId)        it.coaId = coas[0].id
      if (!it.categoryId)   it.categoryId = firstCatId
      if (typeof it.partNumber !== 'string') it.partNumber = ''
      if (typeof it.vendor     !== 'string') it.vendor     = ''
      if (typeof it.model      !== 'string') it.model      = ''
      if (typeof it.unit       !== 'string') it.unit       = 'ea'
      if (!Array.isArray(it.components)) it.components = []
      // Migrate legacy qtyByTemplate items to single qty using the
      // currently-active template's value, then drop the per-template map.
      if (typeof it.qty !== 'number') {
        if (it.qtyByTemplate && typeof it.qtyByTemplate === 'object') {
          it.qty = Number(it.qtyByTemplate[material.activeTemplate]) || 0
        } else {
          it.qty = 0
        }
      }
      if (it.qtyByTemplate) delete it.qtyByTemplate
    })
  }
  // Each COA carries its own overhead — flexible list of items. Each item has
  // { id, label, pct, enabled, base }. base is either 'unloaded' (pct of the
  // unloaded project total) or 'withOverhead' (pct of unloaded + all enabled
  // 'unloaded' items — typically SCR).
  function defaultOverhead() {
    return {
      overheadEnabled: true,
      showLineItems:   true,
      items: [
        { id: 'oh-' + uuid(), label: 'PM/Financial Support',    pct: 0, enabled: true, base: 'unloaded'     },
        { id: 'oh-' + uuid(), label: 'Material Tracking',       pct: 0, enabled: true, base: 'unloaded'     },
        { id: 'oh-' + uuid(), label: 'Government PM Labor',     pct: 0, enabled: true, base: 'unloaded'     },
        { id: 'oh-' + uuid(), label: 'Management Reserve',      pct: 0, enabled: true, base: 'unloaded'     },
        { id: 'oh-' + uuid(), label: 'Support Cost Rate (SCR)', pct: 0, enabled: true, base: 'withOverhead' },
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
  const resetCount = ref(0)

  // Global UI pref — whether the Rate column shows on the deliverables page
  const showRates = ref(saved?.showRates ?? true)
  // Global UI pref — whether to show per-row tracking indicators (check / alert / empty)
  const showRowStatus = ref(saved?.showRowStatus ?? true)

  // ── Undo / redo stacks (lineItems + overheadByCoa) ───────────────────
  const undoStack = ref([])
  const redoStack = ref([])
  const MAX_HISTORY = 50

  function _captureSnapshot() {
    return JSON.stringify({ l: lineItems, oh: deepClone(overheadByCoa) })
  }
  function _applySnapshot(raw) {
    const snap = JSON.parse(raw)
    // Support old format (plain array) and new format ({ l, oh })
    const lines = Array.isArray(snap) ? snap : snap.l
    const oh    = Array.isArray(snap) ? null  : snap.oh
    lineItems.splice(0, lineItems.length, ...lines)
    if (oh) {
      Object.keys(overheadByCoa).forEach(k => delete overheadByCoa[k])
      Object.assign(overheadByCoa, deepClone(oh))
    }
  }
  function snapshotLines() {
    undoStack.value.push(_captureSnapshot())
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
    redoStack.value = []
  }
  function undo() {
    if (!undoStack.value.length) return
    redoStack.value.push(_captureSnapshot())
    _applySnapshot(undoStack.value.pop())
  }
  function redo() {
    if (!redoStack.value.length) return
    undoStack.value.push(_captureSnapshot())
    _applySnapshot(redoStack.value.pop())
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
    if (!c) return
    const oldRate = c.defaultRate
    c.defaultRate = Math.max(0, Math.min(9999, +rate || 0))
    // Propagate to existing lines that still carry the old default (not manually overridden)
    lineItems.forEach(l => {
      if (l.laborCat === catId && l.rate === oldRate) l.rate = c.defaultRate
    })
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
    // Clear the taskId from any engineering lines that referenced this task
    lineItems.forEach(l => { if (l.taskId === taskId) l.taskId = '' })
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
  const engineeringTotalForQuote = computed(() => {
    const ids = quoteCoaIds.value
    const lineLabor = lineItems.filter(l => ids.includes(l.coaId)).reduce((s, l) => s + lineCost(l), 0)
    return lineLabor + ids.reduce((s, id) => s + travelLaborFor(id), 0)
  })
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
      misc:         false,
      firstLastDay: true,
      // Carry the old single-trip rates into the per-row rate fields so cost math is preserved
      lodgingRate: t.lodgingRate ?? 0,
      mieRate:     t.mieRate     ?? 0,
      carRate:     t.rentalCarRate ?? 75,
      airfareRate: t.airfareRate ?? 600,
      hotelDailyRate: null,
      miscRate:    50,
      travelHoursItems: [],
      miscItems: [],
    }
    Object.assign(t, {
      tripName:           t.travelerName || '',
      hotelDailyTotal:    null,
      defaultTravelHours: t.travelHours ?? 4,
      defaultCarRate:     t.rentalCarRate ?? 75,
      defaultAirfareRate: t.airfareRate ?? 600,
      defaultMiscRate:    50,
      travelHoursItems:   [],
      miscItems:          [],
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
      if (tr.hotelDailyRate != null) {
        c += tr.hotelDailyRate * days
      } else if (trip.hotelDailyTotal != null) {
        c += trip.hotelDailyTotal * days
      } else {
        const lodging = travelerRate(trip, tr, 'lodgingRate', 'lodgingRate')
        const mie     = travelerRate(trip, tr, 'mieRate', 'mieRate')
        c += lodging * days
        // First & last day rule (GSA): first and last day of travel = 75% M&IE.
        const useFLD = (tr.firstLastDay ?? true) && days > 0
        if (useFLD) {
          const middleDays = Math.max(0, days - 2)
          const partDays   = days === 1 ? 1 : 2
          c += mie * (middleDays + partDays * 0.75)
        } else {
          c += mie * days
        }
      }
    }
    if (tr.car)     c += travelerRate(trip, tr, 'carRate',     'defaultCarRate')     * days
    if (tr.airfare) c += travelerRate(trip, tr, 'airfareRate', 'defaultAirfareRate')
    if (tr.misc) {
      const miscAmt = trip.miscItems?.length
        ? trip.miscItems.reduce((s, x) => s + (x.amount || 0), 0)
        : travelerRate(trip, tr, 'miscRate', 'defaultMiscRate')
      c += miscAmt
    }
    return c * qty
  }
  // Travel-labor: pay-category rate × travel hours × qty. Tracked separately so the
  // caller can decide whether to roll it into the trip total or report it on its own.
  function travelLaborCost(trip, tr) {
    if (!tr?.laborCat) return 0
    const rate = laborCatRate(tr.laborCat) || 0
    const hours = trip?.travelHoursItems?.length
      ? trip.travelHoursItems.reduce((s, x) => s + (x.hours || 0), 0)
      : (tr.travelHours || 0)
    return rate * hours * Math.max(1, tr.qty || 1)
  }

  // Non-labor travel costs only (hotel, car, airfare, misc fees)
  function tripExpenses(trip) {
    if (!trip) return 0
    migrateTrip(trip)
    if (Array.isArray(trip.travelers)) {
      return trip.travelers.reduce((s, tr) => s + travelerCost(trip, tr), 0)
    }
    // Legacy fallthrough — should be unreachable after migration
    const persons = Math.max(1, trip.persons || 1)
    const days    = Math.max(1, trip.days    || 1)
    const nights  = Math.max(0, days - 1)
    const hotelRate = trip.lodgingRate || 0
    let cost = 0
    if (trip.hotel)     cost += nights * hotelRate * persons
    cost += days * (trip.mieRate || 0) * persons
    if (trip.rentalCar) cost += days * (trip.rentalCarRate || 75)
    if (trip.airfare)   cost += persons * (trip.airfareRate || 600)
    cost += persons * (trip.baggageFees || 0)
    cost += trip.otherFees || 0
    return cost
  }

  function tripCost(trip) {
    if (!trip) return 0
    migrateTrip(trip)
    if (Array.isArray(trip.travelers)) {
      return trip.travelers.reduce((s, tr) => s + travelerCost(trip, tr) + travelLaborCost(trip, tr), 0)
    }
    return tripExpenses(trip)
  }

  // keep travelLineCost as alias for legacy references
  function travelLineCost(line, catId) { return tripCost(line) }

  // Per-COA travel breakdown helpers
  function travelExpensesFor(coaId) {
    let t = 0
    ENTITIES.forEach(e => (travel[e.id] ?? []).forEach(trip => {
      if ((trip.coaId ?? coas[0].id) === coaId) t += tripExpenses(trip)
    }))
    return t
  }
  function travelLaborFor(coaId) {
    let t = 0
    ENTITIES.forEach(e => (travel[e.id] ?? []).forEach(trip => {
      if ((trip.coaId ?? coas[0].id) === coaId)
        ;(trip.travelers ?? []).forEach(tr => { t += travelLaborCost(trip, tr) })
    }))
    return t
  }
  // Travel labor broken down by labor role (engineering, pm, etc.)
  function travelLaborByRole(roleId, coaId) {
    let t = 0
    ENTITIES.forEach(e => (travel[e.id] ?? []).forEach(trip => {
      if (coaId != null && (trip.coaId ?? coas[0].id) !== coaId) return
      ;(trip.travelers ?? []).forEach(tr => {
        const cat = laborCats.find(c => c.id === tr.laborCat)
        if (cat?.role === roleId) t += travelLaborCost(trip, tr)
      })
    }))
    return t
  }
  // Travel hours broken down by labor role — for hour counts in breakdowns
  function travelLaborHoursForRole(roleId, coaId) {
    let h = 0
    ENTITIES.forEach(e => (travel[e.id] ?? []).forEach(trip => {
      if (coaId != null && (trip.coaId ?? coas[0].id) !== coaId) return
      const tripHrs = trip.travelHoursItems?.length
        ? trip.travelHoursItems.reduce((s, x) => s + (x.hours || 0), 0)
        : null
      ;(trip.travelers ?? []).forEach(tr => {
        const cat = laborCats.find(c => c.id === tr.laborCat)
        if (cat?.role !== roleId) return
        const hrs = tripHrs ?? (tr.travelHours || 0)
        h += hrs * Math.max(1, tr.qty || 1)
      })
    }))
    return h
  }

  // Travel totals scoped to the active COA
  const travelExpensesTotal = computed(() => travelExpensesFor(activeCoaId.value))
  const travelLaborTotal    = computed(() => travelLaborFor(activeCoaId.value))
  // travelTotal = expenses + labor (unchanged sum — keeps overhead math correct)
  const travelTotal = computed(() => travelExpensesTotal.value + travelLaborTotal.value)

  // Travel total summed across all COAs flagged for the final quote (expenses only — labor is in engineeringTotalForQuote)
  const travelTotalForQuote = computed(() => {
    const ids = quoteCoaIds.value
    let t = 0
    ENTITIES.forEach(e => (travel[e.id] ?? []).forEach(trip => {
      if (ids.includes(trip.coaId ?? coas[0].id)) t += tripExpenses(trip)
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
      hotelDailyTotal: null,
      defaultTravelHours: 4,
      defaultCarRate:     75,
      defaultAirfareRate: 600,
      defaultMiscRate:    50,
      travelHoursItems: [],
      miscItems: [],
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
      hotel: false, car: false, airfare: false, misc: false, firstLastDay: true,
      // Per-row rate overrides — initialized from trip defaults at create time.
      // Editing these per row sticks for that row; changes to trip defaults
      // only affect new travelers added after the change (matches Labor pattern).
      hotelDailyRate: null,
      lodgingRate: null,
      mieRate:     null,
      carRate:     null,
      airfareRate: null,
      miscRate:    null,
      travelHoursItems: [],
      miscItems: [],
    })
  }
  function updateTraveler(entityId, tripId, travelerId, patch) {
    const trip = (travel[entityId] ?? []).find(t => t.id === tripId)
    if (!trip || !Array.isArray(trip.travelers)) return
    const tr = trip.travelers.find(t => t.id === travelerId)
    if (!tr) return
    const RATE_FIELDS = ['hotelDailyRate', 'lodgingRate', 'mieRate', 'carRate', 'airfareRate', 'miscRate']
    RATE_FIELDS.forEach(f => {
      if (patch[f] !== undefined && patch[f] !== null) patch = { ...patch, [f]: Math.max(0, Math.min(99999, +patch[f] || 0)) }
    })
    if (patch.qty  !== undefined) patch = { ...patch, qty:  Math.max(1, Math.min(999, +patch.qty  || 1)) }
    if (patch.days !== undefined) patch = { ...patch, days: Math.max(0, Math.min(365, +patch.days || 0)) }
    Object.assign(tr, patch)
  }
  function removeTraveler(entityId, tripId, travelerId) {
    const trip = (travel[entityId] ?? []).find(t => t.id === tripId)
    if (!trip || !Array.isArray(trip.travelers)) return
    const i = trip.travelers.findIndex(t => t.id === travelerId)
    if (i >= 0) trip.travelers.splice(i, 1)
  }

  // ── Travel-hours segment items (trip-level, shared by all travelers) ──
  function _getTrip(entityId, tripId) {
    return (travel[entityId] ?? []).find(t => t.id === tripId) ?? null
  }
  function addTravelHoursItem(entityId, tripId, initialHours = 0) {
    const trip = _getTrip(entityId, tripId)
    if (!trip) return
    if (!trip.travelHoursItems) trip.travelHoursItems = []
    trip.travelHoursItems.push({ id: uuid(), label: '', hours: initialHours })
  }
  function updateTravelHoursItem(entityId, tripId, itemId, patch) {
    const trip = _getTrip(entityId, tripId)
    const item = trip?.travelHoursItems?.find(x => x.id === itemId)
    if (!item) return
    if (patch.hours !== undefined) patch = { ...patch, hours: Math.max(0, +patch.hours || 0) }
    Object.assign(item, patch)
  }
  function removeTravelHoursItem(entityId, tripId, itemId) {
    const trip = _getTrip(entityId, tripId)
    if (!trip?.travelHoursItems) return
    const i = trip.travelHoursItems.findIndex(x => x.id === itemId)
    if (i >= 0) trip.travelHoursItems.splice(i, 1)
  }

  // ── Misc fee items (trip-level, per-person total replaces flat rate) ──
  function addMiscItem(entityId, tripId, initialAmount = 0) {
    const trip = _getTrip(entityId, tripId)
    if (!trip) return
    if (!trip.miscItems) trip.miscItems = []
    trip.miscItems.push({ id: uuid(), label: '', amount: initialAmount })
  }
  function updateMiscItem(entityId, tripId, itemId, patch) {
    const trip = _getTrip(entityId, tripId)
    const item = trip?.miscItems?.find(x => x.id === itemId)
    if (!item) return
    if (patch.amount !== undefined) patch = { ...patch, amount: Math.max(0, +patch.amount || 0) }
    Object.assign(item, patch)
  }
  function removeMiscItem(entityId, tripId, itemId) {
    const trip = _getTrip(entityId, tripId)
    if (!trip?.miscItems) return
    const i = trip.miscItems.findIndex(x => x.id === itemId)
    if (i >= 0) trip.miscItems.splice(i, 1)
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
    'fort walton beach|FL': 'fort walton beach / de funiak springs',
    'fort walton|FL':       'fort walton beach / de funiak springs',
    'eglin|FL':             'fort walton beach / de funiak springs',
    'defuniak springs|FL':  'fort walton beach / de funiak springs',
    'de funiak springs|FL': 'fort walton beach / de funiak springs',
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
        const cityPart = k.slice(0, k.lastIndexOf('|')).toLowerCase()
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

  function addMaterialItem(categoryId = null) {
    const catId = categoryId || material.categories[0]?.id || 'cat-misc'
    material.items.push({
      id: uuid(),
      description: '',
      partNumber: '',
      vendor: '',
      model: '',
      unit: 'ea',
      qty: 1,
      unitCost: 0,
      components: [],
      coaId: activeCoaId.value,
      categoryId: catId,
    })
  }

  // ── TEMP-MATERIAL-TAB: Component (sub-item) mutations
  function addMaterialComponent(itemId, seed = {}) {
    const item = material.items.find(i => i.id === itemId)
    if (!item) return
    if (!Array.isArray(item.components)) item.components = []
    item.components.push({
      id: 'cp-' + uuid().slice(0, 8),
      partNumber:   seed.partNumber   ?? '',
      description:  seed.description  ?? '',
      manufacturer: seed.manufacturer ?? '',
      qtyPerUnit:   seed.qtyPerUnit   ?? 1,
      unitPrice:    seed.unitPrice    ?? 0,
    })
  }
  function updateMaterialComponent(itemId, componentId, patch) {
    const item = material.items.find(i => i.id === itemId)
    if (!item || !Array.isArray(item.components)) return
    const cp = item.components.find(c => c.id === componentId)
    if (cp) Object.assign(cp, patch)
  }
  function removeMaterialComponent(itemId, componentId) {
    const item = material.items.find(i => i.id === itemId)
    if (!item || !Array.isArray(item.components)) return
    const idx = item.components.findIndex(c => c.id === componentId)
    if (idx >= 0) item.components.splice(idx, 1)
  }
  // Bundle unit cost — sum of (qtyPerUnit * unitPrice) for all components.
  // Returns item.unitCost as fallback for parents with no components yet.
  function bundleUnitCost(item) {
    if (!item) return 0
    const cps = item.components || []
    if (cps.length === 0) return item.unitCost || 0
    return cps.reduce((s, c) => s + (c.qtyPerUnit || 0) * (c.unitPrice || 0), 0)
  }
  function updateMaterialItem(id, patch) {
    const item = material.items.find(i => i.id === id)
    if (item) Object.assign(item, patch)
  }
  // Plain template setter — does NOT touch items. Use loadMELForClass when
  // the user picks a class pill (that's the replace-on-pick behavior).
  function setActiveMaterialTemplate(template) {
    if (!TEMPLATE_IDS.includes(template)) return
    material.activeTemplate = template
  }
  // Load the MEL for a given class into the active scope, replacing any
  // existing items. 'X' just clears the scope. Single source of truth for
  // picking a class pill.
  function loadMELForClass(classId) {
    if (!TEMPLATE_IDS.includes(classId)) return
    for (let i = material.items.length - 1; i >= 0; i--) {
      if (material.items[i].coaId === activeCoaId.value) {
        material.items.splice(i, 1)
      }
    }
    material.activeTemplate = classId
    if (classId === 'X') return  // empty scope
    // Derive this class's MEL from MEL_SEED: keep bundles where qty[class] > 0,
    // collapse the per-template map down to a single qty for this class.
    const seeds = MEL_SEED
      .map(seed => ({
        description: seed.description,
        categoryId:  seed.categoryId,
        qty:         seedQtyForClass(seed, classId),
        components:  seed.components,
      }))
      .filter(seed => seed.qty > 0)
    appendMELSeedItems(seeds)
  }
  function removeMaterialItem(id) {
    const idx = material.items.findIndex(i => i.id === id)
    if (idx >= 0) material.items.splice(idx, 1)
  }
  // Convenience used by computeds — single-qty model
  function itemActiveQty(item) {
    return Number(item?.qty) || 0
  }

  // ── TEMP-MATERIAL-TAB: Standard MEL seed (full bundle hierarchy)
  // Each MEL line is a parent "bundle" with one or more sub-components.
  // qtyByTemplate sets the parent quantity per template (A/B/C/D); each
  // component carries qtyPerUnit and unitPrice, so the bundle's unit cost
  // and the row's extended cost both compute automatically.
  const MEL_SEED = [
    { description: "2-Bay Credenza", categoryId: 'cat-mounts', qtyByTemplate: { A: 1, B: 0, C: 0, D: 0 }, components: [
      { partNumber: 'C5-FF27-2', description: '2 Bay C5 Credenza Frame,  27 Inches Deep', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 1037.81 },
      { partNumber: 'C5-VENT2-SM', description: 'C5-VENT2-SM', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 0 },
      { partNumber: 'C5K2A1SSHE0ZP001', description: 'Wood Kit', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 2500 },
      { partNumber: 'C5-EXT-3', description: 'C5 Credenza Rear Door Bay Extender', manufacturer: 'Middle Atlantic', qtyPerUnit: 2, unitPrice: 125 },
      { partNumber: 'C5-ARB27', description: 'C5 Credenza Adjustable Rail Brackets, 27 Inches Deep', manufacturer: 'Middle Atlantic', qtyPerUnit: 2, unitPrice: 98 },
      { partNumber: 'AP7900B', description: '8 Outlet 1RU Mounted IP/RS232 PDU', manufacturer: 'APC', qtyPerUnit: 2, unitPrice: 547.5 },
      { partNumber: 'UPS-2200R-8', description: '2200VA RM 2U Individual Controlled Outlets', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 1200 },
    ] },
    { description: "3-Bay Credenza", categoryId: 'cat-mounts', qtyByTemplate: { A: 0, B: 0, C: 1, D: 0 }, components: [
      { partNumber: 'C5-FF27-3', description: '3 Bay C5 Credenza Frame,  27 Inches Deep', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 1265 },
      { partNumber: 'C5-VENT3-SM', description: 'C5-VENT3-SM', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 0 },
      { partNumber: 'C5K3A1SSHE0ZP001', description: 'Wood Kit', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 3150 },
      { partNumber: 'C5-EXT-3', description: 'C5 Credenza Rear Door Bay Extender', manufacturer: 'Middle Atlantic', qtyPerUnit: 3, unitPrice: 125 },
      { partNumber: 'C5-ARB27', description: 'C5 Credenza Adjustable Rail Brackets, 27 Inches Deep', manufacturer: 'Middle Atlantic', qtyPerUnit: 3, unitPrice: 98 },
      { partNumber: 'AP7900B', description: '8 Outlet 1RU Mounted IP/RS232 PDU', manufacturer: 'APC', qtyPerUnit: 3, unitPrice: 547.5 },
      { partNumber: 'UPS-2200R-8', description: '2200VA RM 2U Individual Controlled Outlets', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 1200 },
    ] },
    { description: "19 RU Rack", categoryId: 'cat-mounts', qtyByTemplate: { A: 0, B: 0, C: 0, D: 0 }, components: [
      { partNumber: 'BGR-1927LRD', description: '19 RU BGR Equipment rack - 27" Deep', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 540 },
      { partNumber: 'BSPN-19-27', description: '19 RU BGR Side Panels - 27" Deep', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 237 },
      { partNumber: 'PFD-19A', description: '19 RU BGR Curved Plexiglass Front Door', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 251 },
      { partNumber: 'BGR-RDC19', description: '19 RU BGR Cable Entry Rear Door', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 122 },
      { partNumber: 'CBS-BGR', description: 'BGR Caster Kit (19/25/38/45RU)', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 128.26 },
      { partNumber: 'LL-MP21', description: 'Lever Lock Cable system (7 Pieces)', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 56.63 },
      { partNumber: 'FAN2-DC-FC', description: 'DC Fan Kit for Rear Door (19/25RU)', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 143.07 },
      { partNumber: 'AP7900B', description: '8 Outlet 1RU Mounted IP/RS232 PDU', manufacturer: 'APC', qtyPerUnit: 2, unitPrice: 547.5 },
      { partNumber: 'UPS-2200R-8', description: '2200VA RM 2U Individual Controlled Outlets', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 1200 },
    ] },
    { description: "38RU Rack", categoryId: 'cat-mounts', qtyByTemplate: { A: 0, B: 0, C: 0, D: 1 }, components: [
      { partNumber: 'BGR-3832LRD', description: '38 RU BGR Equipment Rack - 32" Deep', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 723.49 },
      { partNumber: 'BSPN-38-32', description: '38 RU BGR Side Panels - 32" Deep', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 398.5 },
      { partNumber: 'PFD-38A', description: '38 RU BGR Curved Plexiglass Front Door', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 394.28 },
      { partNumber: 'BGR-RDC38', description: '38 RU BGR Cable Entry Rear Door', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 151.2 },
      { partNumber: 'CBS-BGR', description: 'BGR Caster Kit (19/25/38/45RU)', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 128.26 },
      { partNumber: 'LL-MP21', description: 'Lever Lock Cable system (7 Pieces)', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 56.63 },
      { partNumber: 'BGR-276FT-FC', description: 'BGR Fan Top w/ temp Controller (38/45RU)', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 353.29 },
      { partNumber: 'AP7900B', description: '8 Outlet 1RU Mounted IP/RS232 PDU', manufacturer: 'APC', qtyPerUnit: 3, unitPrice: 547.5 },
      { partNumber: 'UPS-2200R-8', description: '2200VA RM 2U Individual Controlled Outlets', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 1200 },
    ] },
    { description: "Podium", categoryId: 'cat-mounts', qtyByTemplate: { A: 0, B: 1, C: 0, D: 0 }, components: [
      { partNumber: 'L5-FLATFR-43LDW', description: 'L5 Series Flat Frame 43 Inches Wide, 2 Bays', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 1600 },
      { partNumber: 'L5KCB2SFHE013139', description: 'Wood Kit', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 1000 },
      { partNumber: 'LL-VC21-4', description: 'Lever Lock 17.1 (4 PK)', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 40 },
      { partNumber: 'AP7900B', description: '8 Outlet 1RU Mounted IP/RS232 PDU', manufacturer: 'APC', qtyPerUnit: 2, unitPrice: 547.5 },
      { partNumber: 'UPS-2200R-8', description: '2200VA RM 2U Individual Controlled Outlets', manufacturer: 'Middle Atlantic', qtyPerUnit: 1, unitPrice: 1200 },
    ] },
    { description: "Exterior Room Signage", categoryId: 'cat-misc', qtyByTemplate: { A: 1, B: 1, C: 1, D: 1 }, components: [
      { partNumber: 'PA28H', description: '28" Panoramic Display w/RS232', manufacturer: 'GPO Display', qtyPerUnit: 1, unitPrice: 1662.47 },
      { partNumber: 'IPOE-173S', description: 'UPOE Power Splitter', manufacturer: 'Planet Tech', qtyPerUnit: 1, unitPrice: 245.02 },
      { partNumber: 'POE-171A-95', description: 'UPOE Power Injector', manufacturer: 'Planet Tech', qtyPerUnit: 1, unitPrice: 195.21 },
      { partNumber: '6507101', description: 'DGE-100', manufacturer: 'Crestron', qtyPerUnit: 1, unitPrice: 1100 },
    ] },
    { description: "World Clock", categoryId: 'cat-misc', qtyByTemplate: { A: 1, B: 1, C: 1, D: 1 }, components: [
      { partNumber: 'PA48H', description: '48" Panoramic Display w/RS232', manufacturer: 'GPO Display', qtyPerUnit: 1, unitPrice: 3712.85 },
      { partNumber: '6507101', description: 'DGE-100', manufacturer: 'Crestron', qtyPerUnit: 1, unitPrice: 1100 },
    ] },
    { description: "Splash Screen", categoryId: 'cat-displays', qtyByTemplate: { A: 0, B: 1, C: 1, D: 1 }, components: [
      { partNumber: '6511006', description: 'DM-NVX-360 - 4K Network AV Enc/Dec', manufacturer: 'Crestron', qtyPerUnit: 1, unitPrice: 1139 },
      { partNumber: '6507101', description: 'DGE-100', manufacturer: 'Crestron', qtyPerUnit: 1, unitPrice: 1100 },
    ] },
    { description: "55\" Display", categoryId: 'cat-displays', qtyByTemplate: { A: 0, B: 0, C: 0, D: 0 }, components: [
      { partNumber: 'QB55R-N', description: '55" 4K Display Commercial Series', manufacturer: 'Samsung', qtyPerUnit: 1, unitPrice: 1089.37 },
      { partNumber: '6511006', description: 'DM-NVX-360 - 4K Network AV Enc/Dec', manufacturer: 'Crestron', qtyPerUnit: 1, unitPrice: 1139 },
      { partNumber: 'XSM1U', description: 'Fixed  Wall Mount X-Large 55" & up (250lbs)', manufacturer: 'CHIEF', qtyPerUnit: 1, unitPrice: 223.43 },
    ] },
    { description: "65\" Display", categoryId: 'cat-displays', qtyByTemplate: { A: 0, B: 0, C: 0, D: 0 }, components: [
      { partNumber: 'QB65R-N', description: '65" 4K Display Commercial Series', manufacturer: 'Samsung', qtyPerUnit: 1, unitPrice: 1406.23 },
      { partNumber: '6511006', description: 'DM-NVX-360 - 4K Network AV Enc/Dec', manufacturer: 'Crestron', qtyPerUnit: 1, unitPrice: 1139 },
      { partNumber: 'XSM1U', description: 'Fixed  Wall Mount X-Large 55" & up (250lbs)', manufacturer: 'CHIEF', qtyPerUnit: 1, unitPrice: 223.43 },
    ] },
    { description: "75\" Display", categoryId: 'cat-displays', qtyByTemplate: { A: 0, B: 0, C: 2, D: 0 }, components: [
      { partNumber: 'QB75R-N', description: '75" 4K Display Commercial Series', manufacturer: 'Samsung', qtyPerUnit: 1, unitPrice: 2009.37 },
      { partNumber: '6511006', description: 'DM-NVX-360 - 4K Network AV Enc/Dec', manufacturer: 'Crestron', qtyPerUnit: 1, unitPrice: 1139 },
      { partNumber: 'XSM1U', description: 'Fixed  Wall Mount X-Large 55" & up (250lbs)', manufacturer: 'CHIEF', qtyPerUnit: 1, unitPrice: 223.43 },
    ] },
    { description: "85\" Display", categoryId: 'cat-displays', qtyByTemplate: { A: 1, B: 2, C: 0, D: 0 }, components: [
      { partNumber: 'QB85R-N', description: '85" 4K Display Commercial Series', manufacturer: 'Samsung', qtyPerUnit: 1, unitPrice: 3821.34 },
      { partNumber: '6511006', description: 'DM-NVX-360 - 4K Network AV Enc/Dec', manufacturer: 'Crestron', qtyPerUnit: 1, unitPrice: 1139 },
      { partNumber: 'XSM1U', description: 'Fixed  Wall Mount X-Large 55" & up (250lbs)', manufacturer: 'CHIEF', qtyPerUnit: 1, unitPrice: 223.43 },
    ] },
    { description: "98\" Display", categoryId: 'cat-displays', qtyByTemplate: { A: 0, B: 0, C: 0, D: 4 }, components: [
      { partNumber: 'FHQ981-L', description: '98" 4K Display', manufacturer: 'Christie', qtyPerUnit: 1, unitPrice: 12310 },
      { partNumber: '6511006', description: 'DM-NVX-360 - 4K Network AV Enc/Dec', manufacturer: 'Crestron', qtyPerUnit: 4, unitPrice: 1139 },
      { partNumber: 'XSM1U', description: 'Fixed  Wall Mount X-Large 55" & up (250lbs)', manufacturer: 'CHIEF', qtyPerUnit: 1, unitPrice: 223.43 },
    ] },
    { description: "PC Sources", categoryId: 'cat-computing', qtyByTemplate: { A: 2, B: 4, C: 4, D: 10 }, components: [
      { partNumber: '6511006', description: 'DM-NVX-360 - 4K Network AV Enc/Dec', manufacturer: 'Crestron', qtyPerUnit: 1, unitPrice: 1139 },
    ] },
    { description: "Cameras", categoryId: 'cat-audio', qtyByTemplate: { A: 1, B: 2, C: 1, D: 2 }, components: [
      { partNumber: 'CAM570', description: '4K Dual Lens Audio Tracking Camera', manufacturer: 'AVER', qtyPerUnit: 1, unitPrice: 1977.37 },
      { partNumber: '6511006', description: 'DM-NVX-360 - 4K Network AV Enc/Dec', manufacturer: 'Crestron', qtyPerUnit: 1, unitPrice: 1139 },
    ] },
    { description: "Speakers", categoryId: 'cat-audio', qtyByTemplate: { A: 2, B: 6, C: 4, D: 8 }, components: [
      { partNumber: '42-141-23', description: 'FF 220T (Pair)', manufacturer: 'Extron', qtyPerUnit: 0.5, unitPrice: 330 },
      { partNumber: '60-1501-01', description: 'NetPA 1001-70V AT', manufacturer: 'Extron', qtyPerUnit: 0.5, unitPrice: 638 },
    ] },
    { description: "Ceiling Mics", categoryId: 'cat-audio', qtyByTemplate: { A: 1, B: 1, C: 1, D: 0 }, components: [
      { partNumber: 'MXA920W-S', description: '24" Ceiling Array Dante - White', manufacturer: 'Shure', qtyPerUnit: 1, unitPrice: 3467 },
    ] },
    { description: "Gooseneck Mics", categoryId: 'cat-audio', qtyByTemplate: { A: 0, B: 1, C: 0, D: 10 }, components: [
      { partNumber: 'MX400DP', description: 'Shure Gooseneck Desktop Base', manufacturer: 'Shure', qtyPerUnit: 1, unitPrice: 282.72 },
      { partNumber: 'MX415LP/C', description: '15" Gooseneck', manufacturer: 'Shure', qtyPerUnit: 1, unitPrice: 218 },
      { partNumber: '60-1628-11', description: 'AXI 44 AT, 4 Input, 4 Output Dante Audio Interface', manufacturer: 'Extron', qtyPerUnit: 1, unitPrice: 677 },
    ] },
    { description: "Touch Panels", categoryId: 'cat-control', qtyByTemplate: { A: 1, B: 1, C: 1, D: 1 }, components: [
      { partNumber: '6510832', description: 'TS-770-GV-B-S - 7" Touch Screen - Black - GV - Table Mount', manufacturer: 'Crestron', qtyPerUnit: 1, unitPrice: 1101 },
    ] },
    { description: "VTC Codecs", categoryId: 'cat-audio', qtyByTemplate: { A: 0, B: 1, C: 1, D: 1 }, components: [
      { partNumber: 'CS-CODEC-EQ-NRK9++', description: 'Cisco Codec EQ Standalone – Non- Radio for TAA', manufacturer: 'Cisco', qtyPerUnit: 1, unitPrice: 8500 },
      { partNumber: '6511006', description: 'DM-NVX-360 - 4K Network AV Enc/Dec', manufacturer: 'Crestron', qtyPerUnit: 4, unitPrice: 1139 },
    ] },
    { description: "24 Port Switch", categoryId: 'cat-computing', qtyByTemplate: { A: 1, B: 1, C: 1, D: 0 }, components: [
      { partNumber: 'C9300-24U-A', description: 'Catalyst 9300 24-port UPOE Network Advantage', manufacturer: 'Cisco', qtyPerUnit: 1, unitPrice: 7495 },
      { partNumber: 'PWR-C1-1100WAC-P/2', description: '1100W AC 80+ platinum Config 1 Secondary Power Supply', manufacturer: 'Cisco', qtyPerUnit: 1, unitPrice: 1105.86 },
    ] },
    { description: "48 Port Switch", categoryId: 'cat-computing', qtyByTemplate: { A: 0, B: 0, C: 0, D: 1 }, components: [
      { partNumber: 'C9300-48U-A', description: 'Catalyst 9300 48-port UPOE Network Advantage', manufacturer: 'Cisco', qtyPerUnit: 1, unitPrice: 9816 },
      { partNumber: 'PWR-C1-1100WAC-P/2', description: '1100W AC 80+ platinum Config 1 Secondary Power Supply', manufacturer: 'Cisco', qtyPerUnit: 1, unitPrice: 1105.86 },
    ] },
    { description: "Control Processor & DSP", categoryId: 'cat-control', qtyByTemplate: { A: 1, B: 1, C: 1, D: 1 }, components: [
      { partNumber: '6511816', description: 'CP4', manufacturer: 'Crestron', qtyPerUnit: 1, unitPrice: 1100 },
      { partNumber: '911.0093.900', description: 'TesiraFORTE X 1600', manufacturer: 'Biamp', qtyPerUnit: 1, unitPrice: 3576 },
    ] },
  ]

  // Generic append: takes an array of seed objects (description, categoryId,
  // qty OR qtyByTemplate, components) and pushes them into the active scope.
  // Used internally by loadMELForClass to populate a scope after picking a
  // baseline template.
  function appendMELSeedItems(seeds) {
    let added = 0
    ;(seeds || []).forEach(seed => {
      const qty = (typeof seed.qty === 'number')
        ? Number(seed.qty)
        : seedQtyForClass(seed, material.activeTemplate)
      const components = (seed.components || []).map(c => ({
        id: 'cp-' + uuid().slice(0, 8),
        partNumber:   c.partNumber   || '',
        description:  c.description  || '',
        manufacturer: c.manufacturer || '',
        qtyPerUnit:   Number(c.qtyPerUnit) || 0,
        unitPrice:    Number(c.unitPrice)  || 0,
      }))
      material.items.push({
        id: uuid(),
        description: seed.description || 'Untitled',
        partNumber: '',
        vendor: '',
        model: '',
        unit: 'ea',
        qty:       Number(qty) || 0,
        unitCost:  0,      // ignored when components.length > 0
        components,
        coaId: activeCoaId.value,
        categoryId: seed.categoryId || material.categories[0]?.id || 'cat-misc',
      })
      added++
    })
    return added
  }

  // ── TEMP-MATERIAL-TAB: Material category mutations (user-editable in Admin)
  function addMaterialCategory(label = 'New Category') {
    const id = 'cat-' + uuid().slice(0, 8)
    material.categories.push({ id, label })
    return id
  }
  function updateMaterialCategory(id, patch) {
    const cat = material.categories.find(c => c.id === id)
    if (cat) Object.assign(cat, patch)
  }
  function removeMaterialCategory(id) {
    if (material.categories.length <= 1) return  // never let the list be empty
    const idx = material.categories.findIndex(c => c.id === id)
    if (idx < 0) return
    material.categories.splice(idx, 1)
    // Reassign any items that pointed at the removed category to the first remaining one
    const fallback = material.categories[0].id
    material.items.forEach(it => {
      if (it.categoryId === id) it.categoryId = fallback
    })
  }
  function reorderMaterialCategory(fromIdx, toIdx) {
    if (fromIdx === toIdx) return
    const arr = material.categories
    if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return
    const [moved] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, moved)
  }

  // Material totals scoped to the active COA. With the single-qty model
  // each item has one qty; unit cost comes from the component bundle
  // (with a flat unitCost fallback for parents with no components yet).
  const activeMaterialItems = computed(() => material.items.filter(i => (i.coaId ?? coas[0].id) === activeCoaId.value))
  const materialUnloaded    = computed(() => {
    const bomTotal = activeMaterialItems.value.reduce((s, i) => s + itemActiveQty(i) * bundleUnitCost(i), 0)
    return bomTotal + (material.manualAmounts[activeCoaId.value] || 0)
  })
  const shippingCost        = computed(() => materialUnloaded.value * (material.shippingPct || 0) + (material.shipperCost || 0))
  const materialTotal       = computed(() => materialUnloaded.value + shippingCost.value)
  // Helpers that compute material totals for any specific COA — used by Summary + exports
  function materialUnloadedFor(coaId) {
    const bom = material.items.filter(i => (i.coaId ?? coas[0].id) === coaId).reduce((s, i) => s + itemActiveQty(i) * bundleUnitCost(i), 0)
    return bom + (material.manualAmounts[coaId] || 0)
  }
  function materialTotalFor(coaId) {
    const u = materialUnloadedFor(coaId)
    // shipperCost is a project-level flat fee — add it only for the first quoted scope
    // so it appears exactly once regardless of how many COAs are in the quote.
    const shipper = quoteCoaIds.value[0] === coaId ? (material.shipperCost || 0) : 0
    return u + u * (material.shippingPct || 0) + shipper
  }
  function setManualMaterialAmount(coaId, value) {
    material.manualAmounts[coaId] = Math.max(0, Number(value) || 0)
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
      if (!it.enabled || it.base === 'withOverhead') return s
      if (it.base === 'unloaded')  return s + unloadedProjectTotal.value  * (it.pct || 0)
      if (it.base === 'labor')     return s + engineeringTotal.value      * (it.pct || 0)
      if (it.base === 'travel')    return s + travelTotal.value           * (it.pct || 0)
      if (it.base === 'material')  return s + materialTotal.value         * (it.pct || 0)
      return s
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
      notes:       opts.notes       ?? '',
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

  function copyLineToScope(lineId, targetCoaId) {
    const src = lineItems.find(l => l.id === lineId)
    if (!src || !coas.some(c => c.id === targetCoaId)) return
    snapshotLines()
    lineItems.push({ ...src, id: uuid(), coaId: targetCoaId })
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
      patch = { ...patch, days: Math.max(0, Math.min(365, d)) }
    }
    if (patch.hoursPerDay !== undefined) {
      patch = { ...patch, hoursPerDay: Math.max(0, Math.min(24, +patch.hoursPerDay || 0)) }
    }
    if (patch.rate !== undefined) {
      patch = { ...patch, rate: Math.max(0, Math.min(9999, +patch.rate || 0)) }
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
    const seedCity   = isBaseline ? 'Fort Walton Beach / De Funiak Springs' : ''
    const seedState  = isBaseline ? 'FL'                                    : ''
    if (isBaseline && !project.cityBase) project.cityBase = 'Fort Walton Beach / De Funiak Springs, FL'

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
        travelHoursItems: [],
        miscItems: [],
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

    // Load the MEL for the selected baseline class (A–D → their preset, X → blank)
    const melClassMap = { 'baseline-a': 'A', 'baseline-b': 'B', 'baseline-c': 'C', 'baseline-d': 'D', 'baseline-x': 'X' }
    const melClass = melClassMap[tmpl.id]
    if (melClass) loadMELForClass(melClass)

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
      // Deep-clone the components array so the duplicate's edits
      // don't mutate the source scope.
      material.items.push({
        ...it,
        id: uuid(),
        coaId: newId,
        components: (it.components || []).map(c => ({ ...c, id: 'cp-' + uuid().slice(0, 8) })),
      })
    })
    overheadByCoa[newId] = JSON.parse(JSON.stringify(overheadByCoa[id] ?? defaultOverhead()))
    activeCoaId.value = newId
  }

  // ── Per-COA aggregate totals (used by the upcoming Summary tab + exports) ──
  function laborTotalFor(coaId) {
    return lineItems.filter(l => l.coaId === coaId).reduce((s, l) => s + lineCost(l), 0)
      + travelLaborFor(coaId)
  }
  function laborHoursFor(coaId) {
    const lineHrs = lineItems.filter(l => l.coaId === coaId).reduce((s, l) => s + lineHours(l), 0)
    let travelHrs = 0
    ENTITIES.forEach(e => (travel[e.id] ?? []).forEach(trip => {
      if ((trip.coaId ?? coas[0].id) !== coaId) return
      const tripHrs = trip.travelHoursItems?.length
        ? trip.travelHoursItems.reduce((s, x) => s + (x.hours || 0), 0)
        : null
      ;(trip.travelers ?? []).forEach(tr => {
        if (!tr.laborCat) return
        const hrs = tripHrs ?? (tr.travelHours || 0)
        travelHrs += hrs * Math.max(1, tr.qty || 1)
      })
    }))
    return lineHrs + travelHrs
  }
  // Travel expenses only (labor portion is now reported under Labor)
  function travelTotalFor(coaId) {
    return travelExpensesFor(coaId)
  }
  function coaTotals(coaId) {
    const oh = overheadByCoa[coaId] ?? defaultOverhead()
    const labor    = laborTotalFor(coaId)
    const trips    = travelTotalFor(coaId)
    const mat      = materialTotalFor(coaId)
    const unloaded = labor + trips + mat
    const items    = Array.isArray(oh.items) ? oh.items : []
    const masterOn = !!oh.overheadEnabled

    // Sum all enabled 'unloaded'-base items (includes labor/travel/material sub-bases)
    const ohTotal = items.reduce((s, it) => {
      if (!masterOn || !it.enabled || it.base === 'withOverhead') return s
      if (it.base === 'unloaded')  return s + unloaded * (it.pct || 0)
      if (it.base === 'labor')     return s + labor    * (it.pct || 0)
      if (it.base === 'travel')    return s + trips    * (it.pct || 0)
      if (it.base === 'material')  return s + mat      * (it.pct || 0)
      return s
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
      if (it.base === 'labor')        return labor    * (it.pct || 0)
      if (it.base === 'travel')       return trips    * (it.pct || 0)
      if (it.base === 'material')     return mat      * (it.pct || 0)
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

  // ── Overhead master toggles ───────────────────────────────────────
  function setOverheadEnabled(coaId, value) {
    const oh = overheadByCoa[coaId]
    if (oh) oh.overheadEnabled = value
  }
  function setShowLineItems(coaId, value) {
    const oh = overheadByCoa[coaId]
    if (oh) oh.showLineItems = value
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
    snapshotLines()
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
    // Apply the same backfill logic that runs at store init, so old backups
    // get missing fields filled in rather than leaving computed getters with undefined.
    backfillProject()
    if (!material.manualAmounts) material.manualAmounts = {}
    if (material.shipperCost === undefined) material.shipperCost = 0
    Object.values(overheadByCoa).forEach(backfillOverhead)
    coas.forEach(c => { if (!overheadByCoa[c.id]) overheadByCoa[c.id] = defaultOverhead() })
  }

  function resetAll() {
    resetCount.value++
    Object.assign(project, { sponsor: '', roomName: '', date: new Date().toISOString().split('T')[0], projectEngineer: '', govLead: '', building: '', cityBase: '', pmSupportLead: '', anticipatedFYFunds: 5_000_000, templateId: null, templateName: null })
    lineItems.splice(0, lineItems.length)
    Object.keys(wbs).forEach(k => delete wbs[k]); Object.assign(wbs, deepClone(DEFAULT_WBS))
    Object.keys(travel).forEach(k => delete travel[k]); Object.assign(travel, emptyTravelData())
    Object.keys(material.manualAmounts).forEach(k => delete material.manualAmounts[k])
    Object.assign(material, { items: [], shippingPct: 0, activeTemplate: 'X', shipperName: '', shipperCost: 0 })
    // Wipe scopes (coas) back to the factory default: one primary scope only.
    coas.splice(0, coas.length, { id: 'coa-primary', name: 'Scope 1 — Primary', description: '', includeInQuote: true })
    activeCoaId.value = coas[0].id
    // Reset overhead — only the new default scope keeps a fresh entry
    Object.keys(overheadByCoa).forEach(k => delete overheadByCoa[k])
    coas.forEach(c => { overheadByCoa[c.id] = defaultOverhead() })
    enabledEntities.value = ['cronos']
    selectedTabId.value   = 'engineering'
    localStorage.removeItem(STORAGE_KEY)
  }

  // Tracks whether the last auto-save failed (e.g. localStorage quota exceeded)
  const saveError = ref(false)

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
      saveError.value = false
    } catch {
      // localStorage quota exceeded or unavailable — flag it so the UI can warn
      saveError.value = true
    }
  }, { deep: true })

  return {
    ENTITIES, ROLES, LIFECYCLE_PHASES, TRAVEL_CATEGORIES, TABS, TEMPLATES,
    // LABOR_CATS now refers to the reactive editable list (was a const)
    LABOR_CATS: laborCats,
    project, wbs, lineItems, travel, material, overhead, laborCats,
    enabledEntities, selectedTabId, visibleEntities, resetCount,
    engineeringTotal, engineeringHours, travelTotal, travelExpensesTotal, travelLaborTotal,
    materialUnloaded, shippingCost, materialTotal, unloadedProjectTotal,
    scpCost, globalCost, govLaborCost, managementReserveCost,
    projectOverheadTotal, projectWithOverhead, scrCost, totalOverhead, contractFee, totalLoadedCost,
    laborCatRate, catsForRole, updateLaborCatRate, updateLaborCatLabel, updateLaborCatRole, moveLaborCat, reorderLaborCat, addLaborCat, removeLaborCat, resetLaborCats,
    addTask, removeTask, updateTask, moveTask, reorderTask, resetWbs,
    lineHours, lineCost, tasksFor, linesForPhase, linesForRole,
    phaseHours, phaseCost, roleHours, roleCost, entityHours, entityCost, travelLineCost,
    addLine, duplicateLine, removeLine, copyLineToScope, updateLine, swapLineOrder, reorderLine, enableEntity, disableEntity, applyTemplate, resetAll,
    coas, activeCoaId, activeCoa, activeLineItems, quoteCoaIds,
    engineeringTotalForQuote, engineeringHoursForQuote,
    activeMaterialItems, materialUnloadedFor, materialTotalFor, materialTotalForQuote, setManualMaterialAmount,
    overheadByCoa, laborTotalFor, laborHoursFor, travelTotalFor, travelExpensesFor, travelLaborFor,
    travelLaborByRole, travelLaborHoursForRole, coaTotals, totalLoadedForQuote,
    roleCostForCoa, phaseCostForCoa, entityCostForCoa,
    setOverheadEnabled, setShowLineItems,
    addOverheadItem, removeOverheadItem, updateOverheadItem, reorderOverheadItem,
    addCoa, removeCoa, renameCoa, toggleCoaIncluded, setActiveCoa, duplicateCoa,
    exportStateForBackup, importStateFromBackup,
    showRates, showRowStatus, undo, redo, canUndo, canRedo,
    addMaterialItem, updateMaterialItem, removeMaterialItem,
    addMaterialCategory, updateMaterialCategory, removeMaterialCategory, reorderMaterialCategory,
    setActiveMaterialTemplate, MATERIAL_TEMPLATES, itemActiveQty,
    loadMELForClass,
    addMaterialComponent, updateMaterialComponent, removeMaterialComponent, bundleUnitCost,
    addTrip, updateTrip, removeTrip, tripCost, tripExpenses, travelerCost, travelerRate, travelLaborCost,
    addTraveler, updateTraveler, removeTraveler,
    addTravelHoursItem, updateTravelHoursItem, removeTravelHoursItem,
    addMiscItem, updateMiscItem, removeMiscItem,
    travelTotalForQuote,
    gsaRateMap, importGSARates, lookupGSARate, clearGSARates,
    loadCONUSRates,
    oconusMap, oconusCountries, oconusByCountry, loadOCONUSRates, lookupOCONUSRate,
    snapshots, saveSnapshot, restoreSnapshot, deleteSnapshot,
    saveError,
  }
})
