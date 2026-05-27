import initSqlJs, { Database } from 'sql.js';
import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const userDataPath = app.getPath('userData');
const globalDbPath = path.join(userDataPath, 'global.db');
let globalSqlDb: Database | null = null;
let schoolSqlDb: Database | null = null;
let currentSchoolId: string | null = null;

class StatementWrapper {
  private sql: string;
  private isGlobal: boolean;
  
  constructor(sql: string, isGlobal: boolean = false) {
    this.sql = sql;
    this.isGlobal = isGlobal;
  }

  private getDb() {
    const db = this.isGlobal ? globalSqlDb : schoolSqlDb;
    if (!db) throw new Error(`Database ${this.isGlobal ? 'Global' : 'School'} not initialized`);
    return db;
  }

  get(...params: any[]) {
    const db = this.getDb();
    const stmt = db.prepare(this.sql);
    try {
      stmt.bind(params);
      if (stmt.step()) {
        return stmt.getAsObject();
      }
      return undefined;
    } finally {
      stmt.free();
    }
  }

  all(...params: any[]) {
    const db = this.getDb();
    const stmt = db.prepare(this.sql);
    const results = [];
    try {
      stmt.bind(params);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      return results;
    } finally {
      stmt.free();
    }
  }

  run(...params: any[]) {
    const db = this.getDb();
    const stmt = db.prepare(this.sql);
    try {
      if (params.length > 0) {
        stmt.bind(params);
      }
      stmt.step();
    } finally {
      stmt.free();
    }
    saveDatabase(this.isGlobal);
    return { changes: 1 };
  }
}

class DBWrapper {
  prepare(sql: string) {
    // Detect if the table is global
    const globalTables = ['users', 'subscription', 'sync_queue', 'sync_meta', 'global_config', 'local_license', 'local_accounts', 'school_users', 'audit_log'];
    const isGlobal = globalTables.some(table => sql.toLowerCase().includes(table));
    return new StatementWrapper(sql, isGlobal);
  }

  exec(sql: string, isGlobal: boolean = false) {
    const db = isGlobal ? globalSqlDb : schoolSqlDb;
    if (!db) return;
    db.exec(sql);
    saveDatabase(isGlobal);
  }

  transaction(fn: (...args: any[]) => void) {
    return (...args: any[]) => {
        // Transactions are complex with two DBs, for now we simplify
        fn(...args);
    };
  }
}

function saveDatabase(isGlobal: boolean) {
  const db = isGlobal ? globalSqlDb : schoolSqlDb;
  if (!db) return;
  const path_to_save = isGlobal ? globalDbPath : path.join(userDataPath, `school_${currentSchoolId}.db`);
  const data = db.export();
  fs.writeFileSync(path_to_save, Buffer.from(data));
}

const db = new DBWrapper();

let SQL: any = null;

export async function initDatabase() {
  const currentPath = path.dirname(fileURLToPath(import.meta.url));
  SQL = await initSqlJs({
    locateFile: file => path.join(currentPath, '..', 'node_modules', 'sql.js', 'dist', file)
  });

  // 1. Initialize Global DB
  if (fs.existsSync(globalDbPath)) {
    const filebuffer = fs.readFileSync(globalDbPath);
    try {
      globalSqlDb = new SQL.Database(filebuffer);
      // Verify it's a real SQLite database
      globalSqlDb!.exec('SELECT 1');
    } catch (_) {
      console.error('[DB] global.db is corrupted — recreating from scratch');
      const backupPath = globalDbPath + '.corrupted.' + Date.now();
      fs.renameSync(globalDbPath, backupPath);
      globalSqlDb = new SQL.Database();
    }
  } else {
    globalSqlDb = new SQL.Database();
  }

  // Schema for Global DB
  globalSqlDb!.exec("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT);");
  globalSqlDb!.exec("CREATE TABLE IF NOT EXISTS subscription (id TEXT PRIMARY KEY, status TEXT, expires_at TEXT, last_checked TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);");

  // Licence cloud par école (source de vérité locale pour l'abonnement)
  globalSqlDb!.exec(`CREATE TABLE IF NOT EXISTS local_license (
    school_id             TEXT PRIMARY KEY,
    email                 TEXT NOT NULL,
    school_name           TEXT,
    country               TEXT,
    level                 TEXT,
    subscription_status   TEXT DEFAULT 'trial',
    trial_end_date        TEXT,
    subscription_end_date TEXT,
    license_key           TEXT,
    last_verified_at      TEXT,
    cached_until          TEXT
  );`);

  // Comptes école connus sur ce PC (pour l'écran de sélection multi-compte)
  globalSqlDb!.exec(`CREATE TABLE IF NOT EXISTS local_accounts (
    school_id           TEXT PRIMARY KEY,
    school_name         TEXT,
    email               TEXT,
    country             TEXT,
    level               TEXT,
    logo_url            TEXT,
    last_login_at       TEXT,
    subscription_status TEXT
  );`);

  // Journal d'audit — toutes les actions critiques
  globalSqlDb!.exec(`CREATE TABLE IF NOT EXISTS audit_log (
    id           TEXT PRIMARY KEY,
    school_id    TEXT,
    user_id      TEXT,
    user_name    TEXT,
    action       TEXT NOT NULL,
    entity_type  TEXT,
    entity_id    TEXT,
    entity_label TEXT,
    old_value    TEXT,
    new_value    TEXT,
    device_id    TEXT,
    synced       INTEGER DEFAULT 0,
    created_at   TEXT NOT NULL
  );`);

  // Utilisateurs créés par l'admin de chaque école (séparés du compte admin cloud)
  globalSqlDb!.exec(`CREATE TABLE IF NOT EXISTS school_users (
    id              TEXT PRIMARY KEY,
    school_id       TEXT NOT NULL,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL,
    username        TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT DEFAULT 'staff',
    permissions     TEXT NOT NULL DEFAULT '[]',
    photo_url       TEXT,
    must_change_pwd INTEGER DEFAULT 1,
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TEXT,
    UNIQUE(school_id, email),
    UNIQUE(school_id, username)
  );`);

  // Safe migrations — global DB
  try { globalSqlDb!.exec("ALTER TABLE users ADD COLUMN email TEXT"); } catch {}
  try { globalSqlDb!.exec("ALTER TABLE users ADD COLUMN phone TEXT"); } catch {}
  try { globalSqlDb!.exec("ALTER TABLE school_users ADD COLUMN phone TEXT"); } catch {}

  // Configuration globale du poste (device_id, etc.)
  globalSqlDb!.exec(`CREATE TABLE IF NOT EXISTS global_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`);

  // File d'attente de synchronisation
  globalSqlDb!.exec(`CREATE TABLE IF NOT EXISTS sync_queue (
    id          TEXT PRIMARY KEY,
    operation   TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id   TEXT NOT NULL,
    payload     TEXT,
    device_id   TEXT,
    created_at  TEXT NOT NULL,
    synced_at   TEXT,
    sync_status TEXT DEFAULT 'pending'
  );`);

  // Métadonnées de sync par école (derniers horodatages push/pull)
  globalSqlDb!.exec(`CREATE TABLE IF NOT EXISTS sync_meta (
    school_id    TEXT PRIMARY KEY,
    last_pull_at TEXT,
    last_push_at TEXT
  );`);
  
  // Seed default admin in global if empty
  const userCount = (new StatementWrapper('SELECT COUNT(*) as count FROM users', true).get() as any)?.count || 0;
  if (userCount === 0) {
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin';
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
    new StatementWrapper("INSERT INTO users (id, username, password_hash, role, name) VALUES (?, ?, ?, ?, ?)", true).run(crypto.randomUUID(), 'admin', hashedPassword, 'SUPER_ADMIN', 'Gérant Principal');
    console.log('[DB] Default admin created (password hashed with bcrypt)');
  }

  // Seed default subscription in global if empty (30 days trial)
  const subCount = (new StatementWrapper('SELECT COUNT(*) as count FROM subscription', true).get() as any)?.count || 0;
  if (subCount === 0) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    new StatementWrapper("INSERT INTO subscription (id, status, expires_at) VALUES (?, ?, ?)", true).run(crypto.randomUUID(), 'ACTIVE', expiresAt.toISOString());
  }

  console.log('Global database initialized');
}

export async function switchSchoolDatabase(userId: string) {
    if (!SQL) return;
    currentSchoolId = userId;
    const schoolPath = path.join(userDataPath, `school_${userId}.db`);
    
    if (fs.existsSync(schoolPath)) {
        const filebuffer = fs.readFileSync(schoolPath);
        try {
            schoolSqlDb = new SQL.Database(filebuffer);
            schoolSqlDb!.exec('SELECT 1');
        } catch (_) {
            console.error(`[DB] school_${userId}.db is corrupted — recreating from scratch`);
            const backupPath = schoolPath + '.corrupted.' + Date.now();
            fs.renameSync(schoolPath, backupPath);
            schoolSqlDb = new SQL.Database();
        }
    } else {
        schoolSqlDb = new SQL.Database();
    }

    const runExec = (sql: string) => {
        schoolSqlDb?.exec(sql);
    };

    // Schema for School DB
    runExec("CREATE TABLE IF NOT EXISTS school_years (id TEXT PRIMARY KEY, name TEXT NOT NULL, start_date TEXT, end_date TEXT, is_active BOOLEAN DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT);");
    runExec("CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, name TEXT NOT NULL, level TEXT, description TEXT, tuition_fee REAL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT);");
    runExec("CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY, name TEXT NOT NULL, coefficient INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT);");
    runExec("CREATE TABLE IF NOT EXISTS class_subjects (id TEXT PRIMARY KEY, class_id TEXT NOT NULL, subject_id TEXT NOT NULL, coefficient REAL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, FOREIGN KEY (class_id) REFERENCES classes(id), FOREIGN KEY (subject_id) REFERENCES subjects(id));");
    runExec("CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, role TEXT, phone TEXT, email TEXT, address TEXT, salary_base REAL, photo_url TEXT, hire_date TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT);");
    runExec("CREATE TABLE IF NOT EXISTS parents (id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, phone TEXT UNIQUE, email TEXT, address TEXT, profession TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT);");
    runExec("CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, matricule TEXT, first_name TEXT NOT NULL, last_name TEXT NOT NULL, gender TEXT, birth_date TEXT, address TEXT, photo_url TEXT, pere TEXT, mere TEXT, phone TEXT, parent_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, FOREIGN KEY (parent_id) REFERENCES parents(id));");
    runExec("CREATE TABLE IF NOT EXISTS enrollments (id TEXT PRIMARY KEY, student_id TEXT, class_id TEXT, school_year_id TEXT, registration_date TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, FOREIGN KEY (student_id) REFERENCES students(id), FOREIGN KEY (class_id) REFERENCES classes(id), FOREIGN KEY (school_year_id) REFERENCES school_years(id));");
    runExec("CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, student_id TEXT, amount REAL NOT NULL, payment_date TEXT DEFAULT CURRENT_TIMESTAMP, payment_method TEXT, description TEXT, school_year_id TEXT, months TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, FOREIGN KEY (student_id) REFERENCES students(id), FOREIGN KEY (school_year_id) REFERENCES school_years(id));");
    runExec("CREATE TABLE IF NOT EXISTS cash_transactions (id TEXT PRIMARY KEY, type TEXT CHECK(type IN ('IN', 'OUT')), amount REAL NOT NULL, reason TEXT, date TEXT DEFAULT CURRENT_TIMESTAMP, reference_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT);");
    runExec("CREATE TABLE IF NOT EXISTS grades (id TEXT PRIMARY KEY, student_id TEXT, subject_id TEXT, score REAL, exam_type TEXT, term TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, FOREIGN KEY (student_id) REFERENCES students(id), FOREIGN KEY (subject_id) REFERENCES subjects(id));");
    runExec("CREATE TABLE IF NOT EXISTS student_attendance (id TEXT PRIMARY KEY, student_id TEXT, date TEXT, status TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, FOREIGN KEY (student_id) REFERENCES students(id));");
    runExec("CREATE TABLE IF NOT EXISTS timetables (id TEXT PRIMARY KEY, class_id TEXT, subject_id TEXT, teacher_id TEXT, day_of_week TEXT, start_time TEXT, end_time TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, FOREIGN KEY (class_id) REFERENCES classes(id), FOREIGN KEY (subject_id) REFERENCES subjects(id), FOREIGN KEY (teacher_id) REFERENCES staff(id));");
    runExec("CREATE TABLE IF NOT EXISTS teacher_attendance (id TEXT PRIMARY KEY, staff_id TEXT, date TEXT, status TEXT, hours_worked INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, FOREIGN KEY (staff_id) REFERENCES staff(id));");
    runExec("CREATE TABLE IF NOT EXISTS salaries (id TEXT PRIMARY KEY, staff_id TEXT, amount REAL, base_salary REAL, net_salary REAL, bonus REAL DEFAULT 0, month TEXT, year TEXT, payment_date TEXT DEFAULT CURRENT_TIMESTAMP, status TEXT DEFAULT 'PAID', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, FOREIGN KEY (staff_id) REFERENCES staff(id));");
    runExec("CREATE TABLE IF NOT EXISTS school_info (id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT, phone TEXT, email TEXT, logo_url TEXT, motto TEXT, city TEXT, region TEXT, commune TEXT, sous_prefecture TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);");
    runExec("CREATE TABLE IF NOT EXISTS grading_configs (level TEXT PRIMARY KEY, scale INTEGER NOT NULL DEFAULT 20, config TEXT NOT NULL);")
    
    // Safe migrations for new columns
    try { schoolSqlDb?.exec("ALTER TABLE school_info ADD COLUMN director_name TEXT"); } catch {}
    try { schoolSqlDb?.exec("ALTER TABLE school_info ADD COLUMN color_sidebar TEXT DEFAULT '#1a2f6e'"); } catch {}
    try { schoolSqlDb?.exec("ALTER TABLE school_info ADD COLUMN color_accent  TEXT DEFAULT '#2563eb'"); } catch {}

    // Facturation : barème des frais par classe/année
    runExec(`CREATE TABLE IF NOT EXISTS fee_schedules (
        id              TEXT PRIMARY KEY,
        class_id        TEXT NOT NULL,
        school_year_id  TEXT NOT NULL,
        label           TEXT NOT NULL,
        amount          REAL NOT NULL DEFAULT 0,
        is_monthly      INTEGER NOT NULL DEFAULT 0,
        nb_months       INTEGER NOT NULL DEFAULT 9,
        created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at      TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes(id),
        FOREIGN KEY (school_year_id) REFERENCES school_years(id),
        UNIQUE(class_id, school_year_id, label)
    )`)
    try { schoolSqlDb?.exec("ALTER TABLE grades ADD COLUMN school_year_id TEXT"); } catch {}
    try { schoolSqlDb?.exec("ALTER TABLE timetables ADD COLUMN school_year_id TEXT"); } catch {}
    try { schoolSqlDb?.exec("ALTER TABLE cash_transactions ADD COLUMN school_year_id TEXT"); } catch {}

    // Seed default school info if empty
    runExec("INSERT OR IGNORE INTO school_info (id, name, motto) VALUES ('1', 'Mon Ecole', 'Excellence');");

    // Add device_id column to syncable tables (safe no-op if already exists)
    const syncableTables = ['students', 'parents', 'enrollments', 'grades', 'payments', 'cash_transactions', 'staff'];
    for (const t of syncableTables) {
        try { schoolSqlDb?.exec(`ALTER TABLE ${t} ADD COLUMN device_id TEXT`); } catch { /* already exists */ }
        try { schoolSqlDb?.exec(`ALTER TABLE ${t} ADD COLUMN updated_at_ms TEXT`); } catch { /* already exists */ }
    }

    console.log(`School database initialized for user: ${userId}`);
    saveDatabase(false);
}

export function getCurrentSchoolId(): string | null {
    return currentSchoolId;
}

export default db;
