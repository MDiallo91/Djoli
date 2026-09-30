const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const initSqlJs = require('sql.js');

const APP_DATA = 'C:\\Users\\Mamadou Diallo\\AppData\\Roaming\\school-management-system';

// ── Helpers ────────────────────────────────────────────────────────────────────
const uid  = () => crypto.randomUUID();
const rand = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ── Data ───────────────────────────────────────────────────────────────────────

const SCHOOL_YEAR = { id: uid(), name: '2025-2026', start: '2025-09-01', end: '2026-06-30' };

const CLASSES = [
    { id: uid(), name: '6ème A',   level: 'Collège', fee: 120000 },
    { id: uid(), name: '6ème B',   level: 'Collège', fee: 120000 },
    { id: uid(), name: '5ème A',   level: 'Collège', fee: 130000 },
    { id: uid(), name: '4ème A',   level: 'Collège', fee: 140000 },
    { id: uid(), name: '3ème A',   level: 'Collège', fee: 150000 },
];

const SUBJECTS = [
    { id: uid(), name: 'Mathématiques',          coeff: 4 },
    { id: uid(), name: 'Français',               coeff: 3 },
    { id: uid(), name: 'Anglais',                coeff: 2 },
    { id: uid(), name: 'Sciences de la Vie',     coeff: 2 },
    { id: uid(), name: 'Histoire-Géographie',    coeff: 2 },
    { id: uid(), name: 'Physique-Chimie',        coeff: 3 },
    { id: uid(), name: 'Éducation Civique',      coeff: 1 },
    { id: uid(), name: 'Éducation Physique',     coeff: 1 },
    { id: uid(), name: 'Informatique',           coeff: 1 },
];

const PRENOMS_M = ['Mamadou','Ibrahima','Alpha','Moussa','Abdoulaye','Oumar','Sékou','Amadou','Mohamed','Boubacar','Thierno','Fodé'];
const PRENOMS_F = ['Fatoumata','Mariama','Kadiatou','Aissatou','Hawa','Oumou','Binta','Aminata','Nènè','Djenab','Mariam'];
const NOMS = ['Diallo','Bah','Barry','Camara','Kouyaté','Sylla','Cissé','Sow','Keïta','Condé','Touré','Baldé'];
const PROFESSIONS = ['Commerçant','Enseignant','Fonctionnaire','Médecin','Ingénieur','Agriculteur','Chauffeur','Pharmacien'];
const VILLES = ['Conakry','Kindia','Labé','Kankan','N\'Zérékoré','Mamou','Faranah','Boké'];

// Generate students for each class
function makeStudents(cls, count) {
    const students = [];
    for (let i = 0; i < count; i++) {
        const isMale = Math.random() > 0.45;
        const firstName = isMale ? pick(PRENOMS_M) : pick(PRENOMS_F);
        const lastName  = pick(NOMS);
        const year      = 2006 + Math.floor(Math.random() * 4);
        const month     = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
        const day       = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
        students.push({
            id:        uid(),
            classId:   cls.id,
            matricule: `${cls.name.replace(/\s/g,'')}-${String(i+1).padStart(3,'0')}`,
            firstName,
            lastName,
            gender:    isMale ? 'M' : 'F',
            birthDate: `${year}-${month}-${day}`,
            address:   pick(VILLES),
            pere:      `${pick(PRENOMS_M)} ${lastName}`,
            mere:      `${pick(PRENOMS_F)} ${pick(NOMS)}`,
        });
    }
    return students;
}

// Generate one grade (moyenne trimestre) for a student+subject pair
function makeGrade(studentId, subjectId, term) {
    return {
        id:        uid(),
        studentId,
        subjectId,
        score:     rand(6, 19),
        examType:  'Moyenne',
        term,
    };
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function seed() {
    const SQL = await initSqlJs();

    // 1. Find admin user ID in global.db
    const globalPath = path.join(APP_DATA, 'global.db');
    if (!fs.existsSync(globalPath)) {
        console.error('global.db introuvable à', globalPath);
        process.exit(1);
    }
    const globalDb = new SQL.Database(fs.readFileSync(globalPath));
    const rows = globalDb.exec("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
    if (!rows.length || !rows[0].values.length) {
        console.error("Utilisateur 'admin' non trouvé dans global.db");
        process.exit(1);
    }
    const adminId = rows[0].values[0][0];
    console.log(`Admin ID : ${adminId}`);

    // 2. Open (or create) school DB
    const schoolPath = path.join(APP_DATA, `school_${adminId}.db`);
    let db;
    if (fs.existsSync(schoolPath)) {
        db = new SQL.Database(fs.readFileSync(schoolPath));
        console.log('Base école existante ouverte.');
    } else {
        db = new SQL.Database();
        console.log('Base école créée (première fois).');
    }

    // Ensure schema exists
    const schema = [
        "CREATE TABLE IF NOT EXISTS school_years (id TEXT PRIMARY KEY, name TEXT NOT NULL, start_date TEXT, end_date TEXT, is_active BOOLEAN DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT);",
        "CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, name TEXT NOT NULL, level TEXT, description TEXT, tuition_fee REAL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT);",
        "CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY, name TEXT NOT NULL, coefficient INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT);",
        "CREATE TABLE IF NOT EXISTS class_subjects (id TEXT PRIMARY KEY, class_id TEXT NOT NULL, subject_id TEXT NOT NULL, coefficient REAL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT);",
        "CREATE TABLE IF NOT EXISTS parents (id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, profession TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT);",
        "CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, matricule TEXT, first_name TEXT NOT NULL, last_name TEXT NOT NULL, gender TEXT, birth_date TEXT, address TEXT, photo_url TEXT, pere TEXT, mere TEXT, phone TEXT, parent_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, device_id TEXT, updated_at_ms TEXT);",
        "CREATE TABLE IF NOT EXISTS enrollments (id TEXT PRIMARY KEY, student_id TEXT, class_id TEXT, school_year_id TEXT, registration_date TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, device_id TEXT, updated_at_ms TEXT);",
        "CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, student_id TEXT, amount REAL NOT NULL, payment_date TEXT DEFAULT CURRENT_TIMESTAMP, payment_method TEXT, description TEXT, school_year_id TEXT, months TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, device_id TEXT, updated_at_ms TEXT);",
        "CREATE TABLE IF NOT EXISTS cash_transactions (id TEXT PRIMARY KEY, type TEXT, amount REAL NOT NULL, reason TEXT, date TEXT DEFAULT CURRENT_TIMESTAMP, reference_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, device_id TEXT, updated_at_ms TEXT);",
        "CREATE TABLE IF NOT EXISTS grades (id TEXT PRIMARY KEY, student_id TEXT, subject_id TEXT, score REAL, exam_type TEXT, term TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, device_id TEXT, updated_at_ms TEXT);",
        "CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, role TEXT, phone TEXT, email TEXT, address TEXT, salary_base REAL, photo_url TEXT, hire_date TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, device_id TEXT, updated_at_ms TEXT);",
        "CREATE TABLE IF NOT EXISTS school_info (id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT, phone TEXT, email TEXT, logo_url TEXT, motto TEXT, city TEXT, region TEXT, commune TEXT, sous_prefecture TEXT, director_name TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);",
        "CREATE TABLE IF NOT EXISTS grading_configs (level TEXT PRIMARY KEY, scale INTEGER NOT NULL DEFAULT 20, config TEXT NOT NULL);",
        "INSERT OR IGNORE INTO school_info (id, name, motto) VALUES ('1', 'Mon Ecole', 'Excellence');",
    ];
    schema.forEach(sql => { try { db.exec(sql); } catch(e) { /* already exists */ } });
    const run = (sql, params = []) => db.run(sql, params);

    // ── 3. Vider les données existantes (sauf school_info) ──────────────────
    ['grades','enrollments','payments','cash_transactions','students','parents',
     'class_subjects','classes','subjects','school_years'].forEach(t => {
        try { db.exec(`DELETE FROM ${t}`); } catch {}
    });
    console.log('Données précédentes effacées.');

    // ── 4. Année scolaire ────────────────────────────────────────────────────
    run('INSERT INTO school_years (id, name, start_date, end_date, is_active) VALUES (?,?,?,?,1)',
        [SCHOOL_YEAR.id, SCHOOL_YEAR.name, SCHOOL_YEAR.start, SCHOOL_YEAR.end]);
    console.log(`✓ Année scolaire : ${SCHOOL_YEAR.name}`);

    // ── 5. Classes ───────────────────────────────────────────────────────────
    CLASSES.forEach(c => {
        run('INSERT INTO classes (id, name, level, tuition_fee) VALUES (?,?,?,?)',
            [c.id, c.name, c.level, c.fee]);
    });
    console.log(`✓ ${CLASSES.length} classes créées`);

    // ── 6. Matières ──────────────────────────────────────────────────────────
    SUBJECTS.forEach(s => {
        run('INSERT INTO subjects (id, name, coefficient) VALUES (?,?,?)',
            [s.id, s.name, s.coeff]);
    });
    console.log(`✓ ${SUBJECTS.length} matières créées`);

    // ── 7. Liaison classes ↔ matières ─────────────────────────────────────
    CLASSES.forEach(c => {
        SUBJECTS.forEach(s => {
            run('INSERT INTO class_subjects (id, class_id, subject_id, coefficient) VALUES (?,?,?,?)',
                [uid(), c.id, s.id, s.coeff]);
        });
    });
    console.log('✓ Matières liées aux classes');

    // ── 8. Élèves + inscriptions + notes ──────────────────────────────────
    const CLASS_SIZES = [12, 10, 11, 9, 8]; // nb élèves par classe
    const TERMS = ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'];

    let totalStudents = 0;
    let totalGrades   = 0;
    let totalPayments = 0;

    CLASSES.forEach((cls, ci) => {
        const students = makeStudents(cls, CLASS_SIZES[ci]);
        totalStudents += students.length;

        students.forEach((s, si) => {
            // Parent
            const parentId = uid();
            try {
                run('INSERT INTO parents (id, first_name, last_name, phone, profession) VALUES (?,?,?,?,?)',
                    [parentId, s.pere.split(' ')[0], s.pere.split(' ')[1] || s.lastName,
                     `+224 6${String(Math.floor(Math.random()*99999999)).padStart(8,'0')}`,
                     pick(PROFESSIONS)]);
            } catch {}

            // Student
            run(`INSERT INTO students (id, matricule, first_name, last_name, gender,
                 birth_date, address, pere, mere, parent_id)
                 VALUES (?,?,?,?,?,?,?,?,?,?)`,
                [s.id, s.matricule, s.firstName, s.lastName, s.gender,
                 s.birthDate, s.address, s.pere, s.mere, parentId]);

            // Enrollment
            run('INSERT INTO enrollments (id, student_id, class_id, school_year_id, registration_date) VALUES (?,?,?,?,?)',
                [uid(), s.id, cls.id, SCHOOL_YEAR.id, '2025-09-05']);

            // Payment (80% of students have paid)
            if (Math.random() > 0.2) {
                const amount = cls.fee * (Math.random() > 0.5 ? 1 : 0.5);
                run('INSERT INTO payments (id, student_id, amount, payment_method, description, school_year_id) VALUES (?,?,?,?,?,?)',
                    [uid(), s.id, Math.round(amount), 'CASH', 'Frais de scolarité', SCHOOL_YEAR.id]);
                totalPayments++;
            }

            // Grades (all 3 trimestres, all subjects)
            TERMS.forEach(term => {
                SUBJECTS.forEach(subj => {
                    const g = makeGrade(s.id, subj.id, term);
                    run('INSERT INTO grades (id, student_id, subject_id, score, exam_type, term) VALUES (?,?,?,?,?,?)',
                        [g.id, g.studentId, g.subjectId, g.score, g.examType, g.term]);
                    totalGrades++;
                });
            });
        });
    });

    // ── 9. Transactions de caisse ─────────────────────────────────────────
    run("INSERT INTO cash_transactions (id, type, amount, reason, date) VALUES (?,?,?,?,?)",
        [uid(), 'IN', 2500000, 'Paiements scolarité T1', '2025-10-15']);
    run("INSERT INTO cash_transactions (id, type, amount, reason, date) VALUES (?,?,?,?,?)",
        [uid(), 'OUT', 450000, 'Achat fournitures scolaires', '2025-10-20']);
    run("INSERT INTO cash_transactions (id, type, amount, reason, date) VALUES (?,?,?,?,?)",
        [uid(), 'IN', 1800000, 'Paiements scolarité T2', '2026-01-10']);
    run("INSERT INTO cash_transactions (id, type, amount, reason, date) VALUES (?,?,?,?,?)",
        [uid(), 'OUT', 300000, 'Matériel informatique', '2026-01-25']);

    // ── 10. Mettre à jour school_info ──────────────────────────────────────
    db.exec(`UPDATE school_info SET
        name = 'Collège Excellence Guinée',
        address = 'Quartier Madina, Conakry',
        phone = '+224 622 00 00 00',
        email = 'excellence@ecole.gn',
        city = 'Conakry',
        region = 'Conakry',
        commune = 'Matam',
        motto = 'L''excellence au service de la nation'
        WHERE id = '1'`);

    // ── 11. Sauvegarder ────────────────────────────────────────────────────
    const data = db.export();
    fs.writeFileSync(schoolPath, Buffer.from(data));

    console.log('\n✅ Seed terminé :');
    console.log(`   - 1 année scolaire (${SCHOOL_YEAR.name})`);
    console.log(`   - ${CLASSES.length} classes`);
    console.log(`   - ${SUBJECTS.length} matières`);
    console.log(`   - ${totalStudents} élèves`);
    console.log(`   - ${totalGrades} notes (3 trimestres × ${SUBJECTS.length} matières)`);
    console.log(`   - ${totalPayments} paiements`);
    console.log(`   - 4 transactions de caisse`);
    console.log('\nRelance l\'app pour voir les données.');
}

seed().catch(e => { console.error(e); process.exit(1); });
