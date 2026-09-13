import fs from 'fs';
import path from 'path';
import { config } from '../config.js';


const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(process.cwd(), config.sqliteDbPath);

let dbInstance: any;
try {
  const Database = require('better-sqlite3');
  dbInstance = new Database(dbPath);
} catch (e1) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    dbInstance = new DatabaseSync(dbPath);
  } catch (e2) {
    console.error('Fatal: Could not initialize SQLite driver (better-sqlite3 or node:sqlite).', e1, e2);
    throw new Error('SQLite driver initialization failed');
  }
}

export const db = dbInstance;

// Enable WAL mode for high concurrency
db.exec('PRAGMA journal_mode = WAL;');


export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS facilities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT,
      level TEXT NOT NULL,
      nin_code TEXT,
      block TEXT NOT NULL,
      district TEXT NOT NULL,
      services TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS villages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subcentre_id TEXT NOT NULL,
      asha_name TEXT NOT NULL,
      asha_phone TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      facility_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_hi TEXT,
      phone TEXT NOT NULL,
      service TEXT NOT NULL,
      village_id TEXT,
      village_name TEXT NOT NULL,
      subcentre_id TEXT,
      asha_name TEXT,
      status TEXT NOT NULL,
      age INTEGER,
      lmp TEXT,
      edd TEXT,
      dod TEXT,
      consent_whatsapp INTEGER DEFAULT 1,
      abha_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS steps (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      cat TEXT NOT NULL,
      level TEXT NOT NULL,
      due TEXT,
      sent_at TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      owner_role TEXT NOT NULL,
      created_by TEXT,
      closed_at TEXT,
      closed_by TEXT,
      closed_source TEXT,
      closed_level TEXT,
      downgraded INTEGER DEFAULT 0,
      reminder_state TEXT,
      unreach_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cce_event_outbox (
      id TEXT PRIMARY KEY,
      event_id TEXT UNIQUE NOT NULL,
      cloud_events_id TEXT,
      cce_ack_event_id TEXT,
      event_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      facility_id TEXT,
      correlation_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      attempts INTEGER DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      delivered_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deployment_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  const facilityCount = db.prepare('SELECT COUNT(*) as count FROM facilities').get() as { count: number };
  if (facilityCount.count > 0) return;

  const now = new Date().toISOString();

  // 1. Seed Facilities
  const facilities = [
    { id: 'FAC-SC-GHU', name: 'Sub-centre Ghurehta', short_name: 'SC Ghurehta', level: 'SUBCENTRE', nin_code: 'NIN-MP-001', block: 'Sirmour', district: 'Rewa', services: JSON.stringify(['ANC', 'PNC', 'NCD', 'CANCER']) },
    { id: 'FAC-SC-SIR', name: 'Sub-centre Sirmour', short_name: 'SC Sirmour', level: 'SUBCENTRE', nin_code: 'NIN-MP-002', block: 'Sirmour', district: 'Rewa', services: JSON.stringify(['ANC', 'PNC', 'NCD']) },
    { id: 'FAC-PHC-SIR', name: 'PHC Sirmour', short_name: 'PHC Sirmour', level: 'PHC', nin_code: 'NIN-MP-101', block: 'Sirmour', district: 'Rewa', services: JSON.stringify(['ANC', 'PNC', 'NCD', 'CANCER', 'PMSMA']) },
    { id: 'FAC-CHC-TEO', name: 'CHC Teonthar', short_name: 'CHC Teonthar', level: 'CHC', nin_code: 'NIN-MP-201', block: 'Teonthar', district: 'Rewa', services: JSON.stringify(['ANC', 'PNC', 'NCD', 'CANCER', 'USG', 'PMSMA']) },
    { id: 'FAC-DH-REW', name: 'District Hospital, Rewa', short_name: 'DH Rewa', level: 'DH', nin_code: 'NIN-MP-301', block: 'Rewa Urban', district: 'Rewa', services: JSON.stringify(['ANC', 'PNC', 'NCD', 'CANCER', 'ONCOLOGY', 'SPECIALIST']) },
    { id: 'FAC-TER-JAB', name: 'Medical College, Jabalpur', short_name: 'Tertiary Care', level: 'TERTIARY', nin_code: 'NIN-MP-401', block: 'Jabalpur', district: 'Jabalpur', services: JSON.stringify(['ADVANCED']) },
  ];

  const insertFacility = db.prepare(`
    INSERT INTO facilities (id, name, short_name, level, nin_code, block, district, services, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const f of facilities) {
    insertFacility.run(f.id, f.name, f.short_name, f.level, f.nin_code, f.block, f.district, f.services, now);
  }

  // 2. Seed Villages
  const villages = [
    { id: 'VIL-GHU', name: 'Ghurehta', subcentre_id: 'FAC-SC-GHU', asha_name: 'ASHA Samta', asha_phone: '+919812345001' },
    { id: 'VIL-AMI', name: 'Amiliya', subcentre_id: 'FAC-SC-GHU', asha_name: 'ASHA Shanti', asha_phone: '+919812345002' },
    { id: 'VIL-SIR', name: 'Sirmour', subcentre_id: 'FAC-SC-SIR', asha_name: 'ASHA Meena', asha_phone: '+919812345003' },
    { id: 'VIL-BAG', name: 'Baghwar', subcentre_id: 'FAC-SC-SIR', asha_name: 'ASHA Kamla', asha_phone: '+919812345004' },
    { id: 'VIL-GHA', name: 'Gharonda', subcentre_id: 'FAC-SC-GHU', asha_name: 'ASHA Rekha', asha_phone: '+919812345005' },
  ];

  const insertVillage = db.prepare(`
    INSERT INTO villages (id, name, subcentre_id, asha_name, asha_phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const v of villages) {
    insertVillage.run(v.id, v.name, v.subcentre_id, v.asha_name, v.asha_phone, now);
  }

  // 3. Seed Users
  const users = [
    { id: 'USR-ASHA-01', name: 'ASHA Samta', phone: '+919812345001', role: 'asha', facility_id: 'FAC-SC-GHU' },
    { id: 'USR-ANM-01', name: 'ANM Rekha (AAM Ghurehta)', phone: '+919812345010', role: 'anm', facility_id: 'FAC-SC-GHU' },
    { id: 'USR-PHC-SN', name: 'PHC Staff Nurse Suman', phone: '+919812345020', role: 'phc_sn', facility_id: 'FAC-PHC-SIR' },
    { id: 'USR-CHC-SN', name: 'CHC Staff Nurse Priya', phone: '+919812345030', role: 'chc_sn', facility_id: 'FAC-CHC-TEO' },
    { id: 'USR-DH-SN', name: 'DH Nurse / Oncology Coordinator Anita', phone: '+919812345040', role: 'dh_sn', facility_id: 'FAC-DH-REW' },
    { id: 'USR-TER-SN', name: 'Tertiary Staff Nurse Kavita', phone: '+919812345050', role: 'tert_sn', facility_id: 'FAC-TER-JAB' },
    { id: 'USR-PHC-MO', name: 'Dr. Sharma (PHC Medical Officer)', phone: '+919812345060', role: 'phc_mo', facility_id: 'FAC-PHC-SIR' },
    { id: 'USR-DPO', name: 'DPO Rewa District (Dr. Verma)', phone: '+919812345070', role: 'dpo', facility_id: 'FAC-DH-REW' },
    { id: 'USR-ADMIN', name: 'System Administrator (Denis)', phone: '+919812345099', role: 'admin', facility_id: null },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, phone, role, facility_id, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `);
  for (const u of users) {
    insertUser.run(u.id, u.name, u.phone, u.role, u.facility_id, now);
  }

  // 4. Seed Patients & Care Steps
  const patients = [
    { id: 'w1', name: 'Sunita Devi', name_hi: 'सुनीता देवी', phone: '+919812345011', service: 'ANC', village_id: 'VIL-GHU', village_name: 'Ghurehta', subcentre_id: 'FAC-SC-GHU', asha_name: 'ASHA Samta', status: 'HRP', age: 29, lmp: '2026-01-08', edd: '2026-10-15', consent_whatsapp: 1, abha_id: 'ABHA-9812-3450-1100' },
    { id: 'w2', name: 'Lakshmi Bai', name_hi: 'लक्ष्मी बाई', phone: '+919812345022', service: 'ANC', village_id: 'VIL-SIR', village_name: 'Sirmour', subcentre_id: 'FAC-SC-SIR', asha_name: 'ASHA Meena', status: 'NORMAL', age: 34, lmp: '2026-02-19', edd: '2026-11-26', consent_whatsapp: 1, abha_id: 'ABHA-9812-3450-2200' },
    { id: 'p1', name: 'Kamla Yadav', name_hi: 'कमला यादव', phone: '+919812345101', service: 'PNC', village_id: 'VIL-GHU', village_name: 'Ghurehta', subcentre_id: 'FAC-SC-GHU', asha_name: 'ASHA Samta', status: 'BOTH_WELL', age: 24, dod: '2026-07-30', consent_whatsapp: 1, abha_id: null },
    { id: 'n1', name: 'Ramesh Patel', name_hi: 'रमेश पटेल', phone: '+919812345201', service: 'NCD', village_id: 'VIL-AMI', village_name: 'Amiliya', subcentre_id: 'FAC-SC-GHU', asha_name: 'ASHA Shanti', status: 'UNCONTROLLED', age: 52, consent_whatsapp: 1, abha_id: 'ABHA-9812-3450-9901' },
    { id: 'c1', name: 'Radha Bai', name_hi: 'राधा बाई', phone: '+919812345301', service: 'CANCER', village_id: 'VIL-BAG', village_name: 'Baghwar', subcentre_id: 'FAC-SC-SIR', asha_name: 'ASHA Kamla', status: 'SCREEN_POSITIVE', age: 46, consent_whatsapp: 1, abha_id: 'ABHA-9812-3450-8801' }
  ];

  const insertPatient = db.prepare(`
    INSERT INTO patients (id, name, name_hi, phone, service, village_id, village_name, subcentre_id, asha_name, status, age, lmp, edd, dod, consent_whatsapp, abha_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of patients) {
    insertPatient.run(p.id, p.name, p.name_hi, p.phone, p.service, p.village_id, p.village_name, p.subcentre_id, p.asha_name, p.status, p.age, p.lmp || null, p.edd || null, p.dod || null, p.consent_whatsapp, p.abha_id || null, now);
  }

  // 5. Seed Steps
  const steps = [
    { id: 'step-1', patient_id: 'w1', cat: 'REFERRAL', level: 'CHC', sent_at: '2026-07-28', status: 'OPEN', owner_role: 'anm' },
    { id: 'step-2', patient_id: 'w1', cat: 'ANC_VISIT', level: 'SUBCENTRE', due: '2026-07-24', status: 'OPEN', owner_role: 'anm' },
    { id: 'step-3', patient_id: 'w1', cat: 'PMSMA_VISIT', level: 'PHC', due: '2026-07-09', status: 'DONE', owner_role: 'anm', closed_at: '2026-07-09', closed_by: 'PHC Staff Nurse Suman', closed_source: 'AT_FACILITY', closed_level: 'PHC' },
    { id: 'step-4', patient_id: 'w2', cat: 'LAB', level: 'DH', due: '2026-08-04', status: 'OPEN', owner_role: 'dh_sn' },
    { id: 'step-5', patient_id: 'c1', cat: 'IMAGING', level: 'DH', due: '2026-08-15', status: 'OPEN', owner_role: 'dh_sn' },
  ];

  const insertStep = db.prepare(`
    INSERT INTO steps (id, patient_id, cat, level, due, sent_at, status, owner_role, closed_at, closed_by, closed_source, closed_level, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of steps) {
    insertStep.run(s.id, s.patient_id, s.cat, s.level, s.due || null, s.sent_at || null, s.status, s.owner_role, s.closed_at || null, s.closed_by || null, s.closed_source || null, s.closed_level || null, now, now);
  }

  // 6. Seed Deployment Config
  const configs = [
    { key: 'referral_stale_days', value: '7' },
    { key: 'step_overdue_days', value: '3' },
    { key: 'pmsma_day_of_month', value: '9' },
    { key: 'quiet_hours_start', value: '09:00' },
    { key: 'quiet_hours_end', value: '19:00' },
    { key: 'pilot_district', value: 'Rewa' },
    { key: 'pilot_state', value: 'Madhya Pradesh' },
  ];
  const insertConfig = db.prepare('INSERT INTO deployment_config (key, value) VALUES (?, ?)');
  for (const c of configs) {
    insertConfig.run(c.key, c.value);
  }

  // 7. Seed Audit Log
  const insertAudit = db.prepare('INSERT INTO audit_logs (id, user_id, user_name, action, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
  insertAudit.run('aud-init-1', 'system', 'System Init', 'INITIALIZE_SYSTEM', 'Database initialized with Rewa pilot seed data', now);
}
