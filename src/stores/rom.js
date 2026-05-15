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
  { id: 'prog1', label: 'PROG I',   role: 'engineering', defaultRate: 75  },
  { id: 'prog2', label: 'PROG II',  role: 'engineering', defaultRate: 100 },
  { id: 'prog3', label: 'PROG III', role: 'engineering', defaultRate: 125 },
  { id: 'pm1',   label: 'PM',       role: 'pm',         defaultRate: 95  },
  { id: 'pm2',   label: 'PM SPT',   role: 'pm',         defaultRate: 125 },
  { id: 'proc',  label: 'PROC',     role: 'pm',         defaultRate: 80  },
  { id: 'wh',    label: 'WH I',     role: 'pm',         defaultRate: 55  },
  { id: 'tech1', label: 'TECH I',   role: 'technician', defaultRate: 65  },
  { id: 'tech2', label: 'TECH II',  role: 'technician', defaultRate: 75  },
  { id: 'tech3', label: 'TECH III', role: 'technician', defaultRate: 90  },
]

// ─── Task default day counts ────────────────────────────────────────
// Selecting a task from the dropdown auto-fills days from this table.

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
  { id: 'engineering', label: 'Engineering Deliverables', icon: 'ti-tools' },
  { id: 'travel',      label: 'Travel',                   icon: 'ti-plane' },
  { id: 'material',    label: 'Material & Shipping',      icon: 'ti-package' },
  { id: 'overhead',    label: 'Overhead',                 icon: 'ti-percentage' },
  { id: 'summary',     label: 'Summary',                  icon: 'ti-chart-bar' },
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
    anticipatedFYFunds: 5_000_000,
    templateId: null, templateName: null,
  })

  // line item shape: { id, role, phaseId, taskId, entity, laborCat, days, hoursPerDay, rate }
  const wbs       = reactive(saved?.wbs      ?? deepClone(DEFAULT_WBS))
  const lineItems = reactive(saved?.lineItems ?? [])
  const travel    = reactive(saved?.travel    ?? emptyTravelData())
  const gsaRateMap  = reactive(saved?.gsaRateMap ?? {})   // "city|ST" → { lodging, mie, months }

  // OCONUS rates — loaded from /rates/oconus.xlsx at startup (not persisted to localStorage)
  const oconusMap       = reactive({})   // "Country|Location" → { lodging, mie }
  const oconusCountries = ref([])        // sorted country names
  const oconusByCountry = reactive({})   // { "Japan": [{ location, lodging, mie }] }
  const material  = reactive(saved?.material  ?? { items: [], shippingPct: 0.03 })
  const overhead  = reactive(saved?.overhead  ?? {
    scpLabel: 'PM/Financial Support',     scpPct: 0.02,
    globalLabel: 'Material Tracking',     globalPct: 0,
    govLaborLabel: 'Government PM Labor', govLaborPct: 0.015,
    managementReservePct: 0.01,
    scrPct: 0.12,
  })

  // Cronos is always on; gov and sub are opt-in
  const enabledEntities = ref(saved?.enabledEntities ?? ['cronos'])
  const visibleEntities = computed(() => ENTITIES.filter(e => enabledEntities.value.includes(e.id)))

  const selectedTabId = ref(saved?.selectedTabId ?? 'engineering')

  // ── Computation helpers ──────────────────────────────────────────

  function laborCatRate(catId)        { return LABOR_CATS.find(c => c.id === catId)?.defaultRate ?? 0 }
  function catsForRole(role)          { return LABOR_CATS.filter(c => c.role === role) }
  function defaultCatForRole(role)    { return ({ engineering: 'eng3', pm: 'pm1', technician: 'tech3' })[role] ?? '' }

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

  const engineeringTotal = computed(() => lineItems.reduce((s, l) => s + lineCost(l),  0))
  const engineeringHours = computed(() => lineItems.reduce((s, l) => s + lineHours(l), 0))

  // ── Trip cost calculation ────────────────────────────────────────
  function tripCost(trip) {
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

  const travelTotal = computed(() => {
    let t = 0
    ENTITIES.forEach(e => (travel[e.id] ?? []).forEach(trip => { t += tripCost(trip) }))
    return t
  })

  // ── Trip mutations ────────────────────────────────────────────────
  function addTrip(entityId) {
    if (!travel[entityId]) travel[entityId] = []
    const curMonth = new Date().toLocaleString('en-US', { month: 'short' })
    travel[entityId].push({
      id: uuid(), entity: entityId,
      travelerName: '', region: 'conus', country: '', destination: '', state: '',
      travelMonth: curMonth,
      days: 3, persons: 1, travelHours: 4,
      lodgingRate: 0, mieRate: 0,
      hotel: true, rentalCar: false, airfare: false,
      airfareRate: 600, baggageFees: 0,
      rentalCarRate: 75, otherFees: 0,
      gsaMonthlyRates: null,
    })
  }
  function updateTrip(entityId, tripId, patch) {
    const trip = (travel[entityId] ?? []).find(t => t.id === tripId)
    if (trip) Object.assign(trip, patch)
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
    material.items.push({ id: uuid(), description: '', qty: 1, unitCost: 0 })
  }
  function updateMaterialItem(id, patch) {
    const item = material.items.find(i => i.id === id)
    if (item) Object.assign(item, patch)
  }
  function removeMaterialItem(id) {
    const idx = material.items.findIndex(i => i.id === id)
    if (idx >= 0) material.items.splice(idx, 1)
  }

  const materialUnloaded      = computed(() => material.items.reduce((s, i) => s + (i.qty || 0) * (i.unitCost || 0), 0))
  const shippingCost          = computed(() => materialUnloaded.value * material.shippingPct)
  const materialTotal         = computed(() => materialUnloaded.value + shippingCost.value)
  const unloadedProjectTotal  = computed(() => engineeringTotal.value + travelTotal.value + materialTotal.value)
  const scpCost               = computed(() => project.anticipatedFYFunds * overhead.scpPct)
  const globalCost            = computed(() => project.anticipatedFYFunds * overhead.globalPct)
  const govLaborCost          = computed(() => project.anticipatedFYFunds * overhead.govLaborPct)
  const managementReserveCost = computed(() => unloadedProjectTotal.value * overhead.managementReservePct)
  const projectOverheadTotal  = computed(() => scpCost.value + globalCost.value + govLaborCost.value + managementReserveCost.value)
  const projectWithOverhead   = computed(() => unloadedProjectTotal.value + projectOverheadTotal.value)
  const scrCost               = computed(() => projectWithOverhead.value * overhead.scrPct)
  const totalOverhead         = computed(() => projectOverheadTotal.value + scrCost.value)
  const totalLoadedCost       = computed(() => projectWithOverhead.value + scrCost.value)

  // ── Mutations ─────────────────────────────────────────────────────

  function nextSortOrder(entity, phaseId) {
    const existing = lineItems.filter(l => l.entity === entity && l.phaseId === phaseId)
    return existing.length ? Math.max(...existing.map(l => l.sortOrder ?? 0)) + 1 : 0
  }

  function addLine(role, phaseId, taskId, opts = {}) {
    const entity   = opts.entity   ?? 'cronos'
    const laborCat = opts.laborCat ?? defaultCatForRole(role)
    lineItems.push({
      id: uuid(), role, phaseId, taskId: taskId ?? '', entity, laborCat,
      days:        opts.days        ?? (taskId ? (TASK_DEFAULTS[taskId] ?? 0) : 0),
      hoursPerDay: opts.hoursPerDay ?? 9,
      rate:        opts.rate        ?? laborCatRate(laborCat),
      sortOrder:   opts.sortOrder   ?? nextSortOrder(entity, phaseId),
    })
  }

  function swapLineOrder(idA, idB) {
    const a = lineItems.find(l => l.id === idA)
    const b = lineItems.find(l => l.id === idB)
    if (!a || !b) return
    const tmp = a.sortOrder ?? 0
    a.sortOrder = b.sortOrder ?? 0
    b.sortOrder = tmp
  }

  function removeLine(lineId) {
    const i = lineItems.findIndex(l => l.id === lineId)
    if (i >= 0) lineItems.splice(i, 1)
  }

  function updateLine(lineId, patch) {
    const line = lineItems.find(l => l.id === lineId)
    if (!line) return
    if (patch.laborCat !== undefined && patch.rate === undefined && patch.laborCat !== line.laborCat)
      patch = { ...patch, rate: laborCatRate(patch.laborCat) }
    if (patch.taskId !== undefined && patch.days === undefined && patch.taskId !== line.taskId) {
      const d = TASK_DEFAULTS[patch.taskId]
      if (d !== undefined) patch = { ...patch, days: d }
    }
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

    // Clear labor
    lineItems.splice(0, lineItems.length)
    Object.keys(wbs).forEach(k => delete wbs[k])
    Object.assign(wbs, deepClone(DEFAULT_WBS));
    (tmpl.seed ?? []).forEach(([role, taskId, days, hpd, laborCat]) => {
      let phaseId = null
      for (const p of LIFECYCLE_PHASES)
        if ((wbs[role]?.[p.id] ?? []).some(t => t.id === taskId)) { phaseId = p.id; break }
      if (phaseId) addLine(role, phaseId, taskId, { entity: 'cronos', days, hoursPerDay: hpd, laborCat })
    })

    // Clear travel and populate from travelSeed
    ENTITIES.forEach(e => { travel[e.id] = [] })
    const seedMonth = new Date().toLocaleString('en-US', { month: 'short' })
    ;(tmpl.travelSeed ?? []).forEach(([travelerName, days, persons, travelHours, hotel, rentalCar, airfare]) => {
      travel['cronos'].push({
        id: uuid(), entity: 'cronos',
        travelerName,
        region: 'conus', country: '', destination: '', state: '',
        travelMonth: seedMonth,
        days, persons, travelHours,
        lodgingRate: 0, mieRate: 0,
        hotel, rentalCar, airfare,
        airfareRate: 600, baggageFees: 0,
        rentalCarRate: 75, otherFees: 0,
        gsaMonthlyRates: null,
      })
    })

    project.templateId   = tmpl.id
    project.templateName = tmpl.name
  }

  // ── Snapshots ─────────────────────────────────────────────────────

  const snapshots = ref(loadSnapshots())

  function saveSnapshot(name) {
    const snap = {
      id: uuid(),
      name: name || 'Untitled',
      date: new Date().toISOString(),
      state: {
        project:       { ...project },
        wbs:           deepClone(wbs),
        lineItems:     deepClone(lineItems),
        travel:        deepClone(travel),
        material:      { ...material, items: deepClone(material.items) },
        overhead:      { ...overhead },
        enabledEntities: [...enabledEntities.value],
      },
    }
    snapshots.value.unshift(snap)
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots.value)) } catch {}
  }

  function restoreSnapshot(id) {
    const snap = snapshots.value.find(s => s.id === id)
    if (!snap) return
    const s = snap.state
    Object.assign(project, s.project)
    lineItems.splice(0, lineItems.length, ...deepClone(s.lineItems))
    Object.keys(wbs).forEach(k => delete wbs[k])
    Object.assign(wbs, deepClone(s.wbs))
    Object.keys(travel).forEach(k => delete travel[k])
    Object.assign(travel, deepClone(s.travel))
    Object.assign(material, { ...s.material, items: deepClone(s.material.items) })
    Object.assign(overhead, s.overhead)
    enabledEntities.value = [...s.enabledEntities]
  }

  function deleteSnapshot(id) {
    snapshots.value = snapshots.value.filter(s => s.id !== id)
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots.value)) } catch {}
  }

  function resetAll() {
    Object.assign(project, { sponsor: '', roomName: '', date: new Date().toISOString().split('T')[0], projectEngineer: '', anticipatedFYFunds: 5_000_000, templateId: null, templateName: null })
    lineItems.splice(0, lineItems.length)
    Object.keys(wbs).forEach(k => delete wbs[k]); Object.assign(wbs, deepClone(DEFAULT_WBS))
    Object.keys(travel).forEach(k => delete travel[k]); Object.assign(travel, emptyTravelData())
    Object.assign(material, { items: [], shippingPct: 0.03 })
    Object.assign(overhead, { scpLabel: 'PM/Financial Support', scpPct: 0.02, globalLabel: 'Material Tracking', globalPct: 0, govLaborLabel: 'Government PM Labor', govLaborPct: 0.015, managementReservePct: 0.01, scrPct: 0.12 })
    enabledEntities.value = ['cronos']
    selectedTabId.value   = 'engineering'
    localStorage.removeItem(STORAGE_KEY)
  }

  watch([project, wbs, lineItems, travel, material, overhead, enabledEntities, selectedTabId, gsaRateMap], () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        project: { ...project }, wbs: deepClone(wbs), lineItems: deepClone(lineItems),
        travel: deepClone(travel), material: { ...material, items: deepClone(material.items) },
        overhead: { ...overhead }, enabledEntities: enabledEntities.value, selectedTabId: selectedTabId.value,
        gsaRateMap: { ...gsaRateMap },
      }))
    } catch {}
  }, { deep: true })

  return {
    ENTITIES, ROLES, LIFECYCLE_PHASES, TRAVEL_CATEGORIES, TABS, TEMPLATES, LABOR_CATS, TASK_DEFAULTS,
    project, wbs, lineItems, travel, material, overhead,
    enabledEntities, selectedTabId, visibleEntities,
    engineeringTotal, engineeringHours, travelTotal,
    materialUnloaded, shippingCost, materialTotal, unloadedProjectTotal,
    scpCost, globalCost, govLaborCost, managementReserveCost,
    projectOverheadTotal, projectWithOverhead, scrCost, totalOverhead, totalLoadedCost,
    laborCatRate, catsForRole,
    lineHours, lineCost, tasksFor, linesForPhase, linesForRole,
    phaseHours, phaseCost, roleHours, roleCost, entityHours, entityCost, travelLineCost,
    addLine, removeLine, updateLine, swapLineOrder, enableEntity, disableEntity, applyTemplate, resetAll,
    addMaterialItem, updateMaterialItem, removeMaterialItem,
    addTrip, updateTrip, removeTrip, tripCost,
    gsaRateMap, importGSARates, lookupGSARate, clearGSARates,
    loadCONUSRates,
    oconusMap, oconusCountries, oconusByCountry, loadOCONUSRates, lookupOCONUSRate,
    addTravelLine, updateTravelLine, removeTravelLine,
    snapshots, saveSnapshot, restoreSnapshot, deleteSnapshot,
  }
})
