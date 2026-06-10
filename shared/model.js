// Domain model: the session is the atomic unit of general-practice work.
// A rota is Staff × (date, AM/PM) × SessionType.

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const PERIODS = ['am', 'pm'];

export const SESSION_TYPES = [
  { id: 'surgery',  name: 'Surgery',                short: 'SUR',  colour: '#3b82f6', clinical: true,  buildsClinic: true },
  { id: 'triage',   name: 'Telephone triage',       short: 'TRI',  colour: '#06b6d4', clinical: true,  buildsClinic: true },
  { id: 'duty',     name: 'Duty doctor',            short: 'DUTY', colour: '#ef4444', clinical: true,  buildsClinic: true },
  { id: 'visits',   name: 'Home visits',            short: 'VIS',  colour: '#f97316', clinical: true,  buildsClinic: false },
  { id: 'enhanced', name: 'Enhanced access',        short: 'EA',   colour: '#8b5cf6', clinical: true,  buildsClinic: true },
  { id: 'admin',    name: 'Admin',                  short: 'ADM',  colour: '#94a3b8', clinical: false, buildsClinic: false },
  { id: 'cpd',      name: 'CPD',                    short: 'CPD',  colour: '#a78bfa', clinical: false, buildsClinic: false },
  { id: 'tutorial', name: 'Tutorial / supervision', short: 'TUT',  colour: '#10b981', clinical: false, buildsClinic: false },
  { id: 'meeting',  name: 'Meeting',                short: 'MTG',  colour: '#64748b', clinical: false, buildsClinic: false }
];

const TYPE_INDEX = Object.fromEntries(SESSION_TYPES.map((t) => [t.id, t]));
export function typeById(id) {
  return TYPE_INDEX[id] || null;
}

// group drives leave clash caps and capacity maths.
// registered = a registered professional for HCA delegation cover.
export const ROLES = [
  { id: 'gp',           name: 'GP',                       group: 'gp',          registered: true },
  { id: 'anp',          name: 'ANP',                      group: 'nursing',     registered: true },
  { id: 'nurse',        name: 'Practice nurse',           group: 'nursing',     registered: true },
  { id: 'hca',          name: 'HCA',                      group: 'nursing',     registered: false },
  { id: 'pharmacist',   name: 'Clinical pharmacist',      group: 'arrs',        registered: true },
  { id: 'paramedic',    name: 'Paramedic',                group: 'arrs',        registered: true },
  { id: 'physio',       name: 'First-contact physio',     group: 'arrs',        registered: true },
  { id: 'pa',           name: 'Physician associate',      group: 'arrs',        registered: false },
  { id: 'social',       name: 'Social prescriber',        group: 'arrs',        registered: false },
  { id: 'phlebotomist', name: 'Phlebotomist',             group: 'nursing',     registered: false },
  { id: 'reception',    name: 'Reception / care nav',     group: 'nonclinical', registered: false },
  { id: 'admin',        name: 'Admin / secretarial',      group: 'nonclinical', registered: false }
];

const ROLE_INDEX = Object.fromEntries(ROLES.map((r) => [r.id, r]));
export function roleById(id) {
  return ROLE_INDEX[id] || null;
}

export const EMPLOYMENT_TYPES = [
  { id: 'partner',   name: 'Partner' },
  { id: 'salaried',  name: 'Salaried' },
  { id: 'registrar', name: 'Registrar (GPST)' },
  { id: 'locum',     name: 'Locum' },
  { id: 'employed',  name: 'Employed' },
  { id: 'arrs',      name: 'ARRS (PCN-shared)' }
];

const PALETTE = ['#2563eb', '#0d9488', '#d97706', '#7c3aed', '#db2777', '#059669', '#dc2626', '#4f46e5', '#b45309', '#0891b2'];

export function blankPattern(weeks) {
  return Array.from({ length: weeks }, () =>
    Object.fromEntries(DAY_KEYS.map((d) => [d, { am: null, pm: null }]))
  );
}

export function newStaff(seed = {}) {
  return {
    id: seed.id || null, // assigned by store on save
    name: '',
    role: 'gp',
    employmentType: 'salaried',
    registrarStage: null, // 'ST1' | 'ST2' | 'ST3'
    contractedSessions: 8,
    dutyEligible: true,
    supervisor: false, // eligible named clinical supervisor for registrars
    prescriber: true,
    entitlement: { annual: 36, study: 6 }, // sessions per leave year (6w × 6 sessions ≈ BMA model, pro-rata in UI)
    pattern: blankPattern(1),
    medicusName: '', // exact name as it appears in the Medicus appointment book
    site: '', // optional, one of settings.sites
    vtsDay: '', // registrars: immovable VTS half-day, e.g. 'tue-pm'
    colour: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    ...seed
  };
}

// A registrar's clinical session needs a co-rostered eligible supervisor:
// a GP, partner or salaried (never a locum), flagged as supervisor.
export function canSupervise(staffMember) {
  return Boolean(
    staffMember &&
    staffMember.role === 'gp' &&
    staffMember.supervisor &&
    (staffMember.employmentType === 'partner' || staffMember.employmentType === 'salaried')
  );
}

export const LEAVE_TYPES = [
  { id: 'annual',   name: 'Annual leave',  short: 'AL',   counted: true },
  { id: 'study',    name: 'Study leave',   short: 'SL',   counted: true },
  { id: 'cpd',      name: 'CPD',           short: 'CPD',  counted: false },
  { id: 'sick',     name: 'Sickness',      short: 'SICK', counted: false },
  { id: 'parental', name: 'Parental',      short: 'PAR',  counted: false },
  { id: 'other',    name: 'Other',         short: 'OTH',  counted: false }
];

const LEAVE_INDEX = Object.fromEntries(LEAVE_TYPES.map((t) => [t.id, t]));
export function leaveTypeById(id) {
  return LEAVE_INDEX[id] || null;
}

export const DEFAULT_SETTINGS = {
  schemaVersion: 1,
  practiceCode: '',
  listSize: 10000,
  openDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
  dutyRequired: { am: 1, pm: 1 },
  // Local policy, not regulation — configurable per practice.
  maxSimultaneousLeave: { gp: 2, nursing: 1, arrs: 1, nonclinical: 2 },
  apptsPerSurgerySession: 15, // ~3h patient-facing per 4h10m session (BMA safe working)
  accessBenchmarkPer1000: 72, // appointments per 1,000 patients per week
  bradfordThresholds: { monitor: 50, high: 200, severe: 500 },
  // Registrars count as reduced capacity: longer appointments, 70/30 split.
  registrarWeights: { early: 0.5, st3: 0.75 },
  sites: [], // optional: multi-site practices get per-site duty checks
  // England & Wales bank holidays (editable in Settings).
  bankHolidays: [
    '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-04', '2026-05-25', '2026-08-31', '2026-12-25', '2026-12-28',
    '2027-01-01', '2027-03-26', '2027-03-29', '2027-05-03', '2027-05-31', '2027-08-30', '2027-12-27', '2027-12-28'
  ],
  // Seasonal leave caps (local policy): max counted-leave sessions per
  // person within each named period.
  peakPeriods: [], // [{ name, start, end, maxSessions }]
  userName: '',
  userStaffId: null,
  userRole: 'manager', // 'manager' | 'staff'
  templateAnchorMonday: null
};
