/**
 * seed-test-data.js — Peuple le compte test (test@ecole.com) avec un jeu de
 * données complet : infos école, 2 années scolaires, classes, matières,
 * personnel, élèves + inscriptions, notes, paiements et mouvements de caisse.
 *
 * Écrit via `writeEntity` (comme l'API web) : school_records + tables typées,
 * donc les données redescendent aussi vers le desktop au prochain pull.
 * Les dates (created_at) sont étalées dans le temps pour alimenter les graphes.
 *
 * Respecte la config DB courante (.env) via src/config/db.ts.
 * Usage : node seed-test-data.js [email] [--reset]   (défaut : test@ecole.com)
 * Refuse de tourner si l'école a déjà des classes (pas de doublons), sauf avec
 * --reset qui supprime DÉFINITIVEMENT les données école du compte avant de
 * re-seeder (les comptes utilisateurs desktop `school_user` sont conservés).
 * À n'utiliser que sur un compte de test.
 */
require('dotenv').config({ quiet: true });
require('ts-node').register({ transpileOnly: true });

const { randomUUID } = require('crypto');
const sequelize = require('./src/config/db.ts').default;
const UserModel = require('./src/models/userModel.ts').default;
const Classe = require('./src/models/classeModel.ts').default;
const SchoolRecord = require('./src/models/schoolRecordModel.ts').default;
const { writeEntity, entityRegistry } = require('./src/sync/entityRegistry.ts');

const args  = process.argv.slice(2);
const RESET = args.includes('--reset');
const EMAIL = args.find(a => !a.startsWith('--')) || 'test@ecole.com';
const KEEP_ON_RESET = ['school_user'];

// ── Aléatoire reproductible ─────────────────────────────────────────────────
let seed = 224;
const rnd  = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const between = (min, max) => min + rnd() * (max - min);
const score = (base) => Math.max(2, Math.min(20, Math.round((base + between(-3, 3)) * 4) / 4));

const iso = (y, m, d, h = 10) => new Date(Date.UTC(y, m - 1, d, h, Math.floor(rnd() * 60))).toISOString();
const NOW = new Date();

// ── Données de référence ────────────────────────────────────────────────────
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
// Mois de scolarité (septembre → juin) avec leur [année relative, n° de mois]
const SCHOOL_MONTHS = [[0, 9], [0, 10], [0, 11], [0, 12], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6]];
const TERMS = ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'];

const CLASSES = [
    { name: 'CP1',     level: 'Primaire', tuition_fee: 2500000 },
    { name: 'CE1',     level: 'Primaire', tuition_fee: 2500000 },
    { name: 'CM2',     level: 'Primaire', tuition_fee: 3000000 },
    { name: '7ème A',  level: 'Collège',  tuition_fee: 3500000 },
    { name: '8ème A',  level: 'Collège',  tuition_fee: 3500000 },
    { name: '10ème A', level: 'Collège',  tuition_fee: 4000000 },
];

const SUBJECTS = [
    { name: 'Calcul',               coefficient: 3, level: 'Primaire' },
    { name: 'Lecture',              coefficient: 3, level: 'Primaire' },
    { name: 'Dictée',               coefficient: 2, level: 'Primaire' },
    { name: 'Éveil',                coefficient: 1, level: 'Primaire' },
    { name: 'Mathématiques',        coefficient: 4, level: 'Collège' },
    { name: 'Français',             coefficient: 3, level: 'Collège' },
    { name: 'Anglais',              coefficient: 2, level: 'Collège' },
    { name: 'Physique-Chimie',      coefficient: 3, level: 'Collège' },
    { name: 'SVT',                  coefficient: 2, level: 'Collège' },
    { name: 'Histoire-Géographie',  coefficient: 2, level: 'Collège' },
    { name: 'Éducation Civique',    coefficient: 1, level: null },
    { name: 'Éducation Physique',   coefficient: 1, level: null },
];

const STAFF = [
    { first_name: 'Mamadou',   last_name: 'Barry',   role: 'Directeur',         salary_base: 2500000 },
    { first_name: 'Aïssatou',  last_name: 'Diallo',  role: 'Secrétaire',        salary_base: 1000000 },
    { first_name: 'Oumar',     last_name: 'Sylla',   role: 'Comptable',         salary_base: 1200000 },
    { first_name: 'Fatoumata', last_name: 'Camara',  role: 'Enseignant',        salary_base: 1300000 },
    { first_name: 'Ibrahima',  last_name: 'Soumah',  role: 'Enseignant',        salary_base: 1300000 },
    { first_name: 'Mariama',   last_name: 'Bangoura',role: 'Enseignant',        salary_base: 1300000 },
    { first_name: 'Sékou',     last_name: 'Kaba',    role: 'Enseignant',        salary_base: 1500000 },
    { first_name: 'Hadja',     last_name: 'Touré',   role: 'Enseignant',        salary_base: 1500000 },
    { first_name: 'Lansana',   last_name: 'Condé',   role: 'Surveillant',       salary_base: 800000 },
    { first_name: 'Djénabou',  last_name: 'Baldé',   role: 'Agent de service',  salary_base: 600000 },
];

const PRENOMS_M = ['Mamadou','Ibrahima','Alpha','Moussa','Abdoulaye','Oumar','Sékou','Amadou','Mohamed','Boubacar','Thierno','Fodé','Lansana','Karamba'];
const PRENOMS_F = ['Fatoumata','Mariama','Kadiatou','Aissatou','Hawa','Oumou','Binta','Aminata','Nènè','Djénabou','Mariam','Safiatou','Kadija'];
const NOMS = ['Diallo','Bah','Barry','Camara','Kouyaté','Sylla','Cissé','Sow','Keïta','Condé','Touré','Baldé','Soumah','Bangoura','Kaba','Doumbouya'];
const QUARTIERS = ['Kaloum','Dixinn','Matam','Ratoma','Matoto','Kipé','Lambanyi','Nongo','Cosa','Hamdallaye'];
const METHODS = ['Espèces','Espèces','Espèces','Mobile Money','Mobile Money','Virement','Chèque'];
const STUDENTS_PER_CLASS = 8;

// ── Écriture ────────────────────────────────────────────────────────────────
const counts = {};
let schoolId;
async function put(entityType, data, createdAt) {
    const id = data.id || randomUUID();
    const created_at = createdAt || new Date().toISOString();
    await writeEntity(schoolId, entityType, id, { ...data, id, created_at, updated_at: created_at });
    counts[entityType] = (counts[entityType] || 0) + 1;
    return id;
}
const phone = () => `+2246${Math.floor(between(20, 69))}${String(Math.floor(between(0, 999999))).padStart(6, '0')}`;

async function main() {
    await sequelize.authenticate();
    await sequelize.sync();

    const school = await UserModel.findOne({ where: { email: EMAIL } });
    if (!school) throw new Error(`Aucun compte école pour ${EMAIL}`);
    schoolId = school.id;

    if (RESET) {
        const types = entityRegistry.map(e => e.entityType).filter(t => !KEEP_ON_RESET.includes(t));
        const removed = await SchoolRecord.destroy({ where: { school_id: schoolId, entity_type: types } });
        for (const e of entityRegistry) {
            if (!KEEP_ON_RESET.includes(e.entityType)) await e.model.destroy({ where: { school_id: schoolId } });
        }
        console.log(`--reset : ${removed} enregistrement(s) supprimé(s) pour ${EMAIL}.`);
    }

    const existing = await Classe.count({ where: { school_id: schoolId, deleted_at: null } });
    if (existing > 0) throw new Error(`${EMAIL} a déjà ${existing} classe(s) — seed annulé pour éviter les doublons.`);

    console.log(`Seed de « ${school.schoolName} » (${schoolId})…`);

    // Profil cloud : niveaux/ville si non renseignés
    await school.update({
        city: school.city || 'Conakry', country: school.country || 'Guinée',
        prefecture: school.prefecture || 'RATOMA', sousPrefecture: school.sousPrefecture || 'KIPÉ',
        level: school.level || 'Mixte',
        levels: school.levels && school.levels !== '[]' ? school.levels : JSON.stringify(['Primaire', 'Collège']),
    });

    await put('school_info', {
        id: schoolId, name: school.schoolName, address: 'Kipé, Ratoma', phone: school.phone || '+224600000001',
        email: EMAIL, motto: 'Travail – Discipline – Réussite', city: 'Conakry', region: 'Conakry',
        commune: 'Ratoma', sous_prefecture: 'Kipé', logo_url: null,
    });

    // ── Années : 2025-2026 (clôturée) et 2026-2027 (active) ──
    const y0 = NOW.getMonth() >= 8 ? NOW.getFullYear() : NOW.getFullYear() - 1; // début de l'année en cours
    const years = [
        { start: y0 - 1, active: 0 },
        { start: y0,     active: 1 },
    ];
    for (const y of years) {
        y.id = await put('school_year', {
            name: `${y.start}-${y.start + 1}`, start_date: `${y.start}-09-01`, end_date: `${y.start + 1}-06-30`, is_active: y.active,
        }, iso(y.start, 8, 20));
    }

    // ── Classes, matières, associations ──
    const classes = [];
    for (const c of CLASSES) classes.push({ ...c, id: await put('class', { ...c, description: `${c.level} — ${c.name}` }, iso(y0 - 1, 8, 21)) });

    const subjects = [];
    for (const s of SUBJECTS) subjects.push({ ...s, id: await put('subject', s, iso(y0 - 1, 8, 21)) });

    for (const c of classes) {
        c.subjects = subjects.filter(s => !s.level || s.level === c.level);
        for (const s of c.subjects) await put('class_subject', { class_id: c.id, subject_id: s.id, coefficient: s.coefficient }, iso(y0 - 1, 8, 21));
    }

    // ── Personnel ──
    for (const [i, p] of STAFF.entries()) {
        await put('staff', {
            ...p, phone: phone(), email: `${p.first_name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${p.last_name.toLowerCase()}@ecole-test.gn`,
            hire_date: `${y0 - 1 - (i % 4)}-09-01`, address: pick(QUARTIERS),
        }, iso(y0 - 1, 8, 22));
    }

    // ── Élèves : promotion d'une classe à la suivante entre les deux années ──
    const students = [];
    let mat = 1;
    for (const [ci, c] of classes.entries()) {
        for (let i = 0; i < STUDENTS_PER_CLASS; i++) {
            const male = rnd() > 0.48;
            const age = 6 + ci * 1.5 + (c.level === 'Collège' ? 2 : 0);
            const s = {
                first_name: male ? pick(PRENOMS_M) : pick(PRENOMS_F), last_name: pick(NOMS), gender: male ? 'M' : 'F',
                birth_date: `${y0 - 1 - Math.round(age)}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`,
                phone: phone(), address: pick(QUARTIERS), matricule: `TST-${String(mat++).padStart(4, '0')}`,
            };
            s.id = await put('student', s, iso(y0 - 1, 9, 1 + Math.floor(rnd() * 25)));
            s.level = between(8, 16); // niveau scolaire moyen de l'élève (pour des notes cohérentes)
            s.payer = rnd();          // régularité de paiement
            s.classByYear = { [years[0].id]: c, [years[1].id]: classes[Math.min(ci + 1, classes.length - 1)] };
            students.push(s);
        }
    }

    for (const y of years) {
        for (const s of students) {
            await put('enrollment', { student_id: s.id, class_id: s.classByYear[y.id].id, school_year_id: y.id, registration_date: iso(y.start, 9, 5) }, iso(y.start, 9, 5));
        }
    }

    // ── Paiements (+ entrée de caisse liée) ──
    async function pay(s, y, amount, months, date, description) {
        const method = pick(METHODS);
        const pid = await put('payment', {
            student_id: s.id, amount, payment_date: date, payment_method: method, description,
            months: JSON.stringify(months), school_year_id: y.id,
        }, date);
        await put('cash_transaction', {
            type: 'IN', amount, reason: `Paiement scolarité - ${description}`, reference_id: pid, school_year_id: y.id,
        }, date);
    }

    for (const y of years) {
        const monthsElapsed = SCHOOL_MONTHS.filter(([dy, m]) => new Date(Date.UTC(y.start + dy, m - 1, 1)) <= NOW);
        for (const s of students) {
            const c = s.classByYear[y.id];
            const monthly = Math.round(c.tuition_fee / 10 / 1000) * 1000;
            await pay(s, y, 150000, [], iso(y.start, 9, 2 + Math.floor(rnd() * 20)), `Frais d'inscription ${y.start}-${y.start + 1}`);
            const due = y.active ? monthsElapsed : SCHOOL_MONTHS;
            for (const [i, [dy, m]] of due.entries()) {
                // les mauvais payeurs sautent des mois, surtout en fin d'année / sur le mois courant
                if (s.payer < 0.15 && i >= due.length - 2) continue;
                if (s.payer < 0.3 && rnd() < 0.25) continue;
                let payDate = new Date(Date.UTC(y.start + dy, m - 1, 1 + Math.floor(rnd() * 12), 9));
                if (payDate > NOW) payDate = new Date(NOW.getTime() - between(1, 5) * 86400000);
                const date = payDate.toISOString();
                await pay(s, y, monthly, [MOIS[m - 1]], date, `Scolarité ${MOIS[m - 1]}`);
            }
        }
    }

    // ── Dépenses : salaires + frais de fonctionnement ──
    const masse = STAFF.reduce((a, p) => a + p.salary_base, 0);
    const EXPENSES = [
        ['Facture électricité (EDG)', 450000, 900000],
        ['Facture eau (SEG)', 120000, 250000],
        ['Fournitures de bureau', 150000, 600000],
        ['Entretien et réparations', 200000, 1500000],
        ['Carburant groupe électrogène', 300000, 800000],
    ];
    for (const y of years) {
        for (const [dy, m] of SCHOOL_MONTHS) {
            const monthStart = new Date(Date.UTC(y.start + dy, m - 1, 1));
            if (monthStart > NOW) break;
            const salaryDate = new Date(Date.UTC(y.start + dy, m - 1, 28, 15));
            if (salaryDate <= NOW) {
                await put('cash_transaction', { type: 'OUT', amount: masse, reason: `Salaires ${MOIS[m - 1]} ${y.start + dy}`, school_year_id: y.id }, salaryDate.toISOString());
            }
            for (const [reason, min, max] of EXPENSES) {
                if (rnd() < 0.3) continue;
                const d = new Date(Date.UTC(y.start + dy, m - 1, 3 + Math.floor(rnd() * 20), 11));
                if (d > NOW) continue;
                await put('cash_transaction', { type: 'OUT', amount: Math.round(between(min, max) / 5000) * 5000, reason, school_year_id: y.id }, d.toISOString());
            }
        }
        await put('cash_transaction', {
            type: 'OUT', amount: 2500000, reason: `Achat manuels et matériel pédagogique ${y.start}-${y.start + 1}`, school_year_id: y.id,
        }, iso(y.start, 9, 8));
    }

    // ── Notes ──
    // Année clôturée : 3 trimestres complets (Devoir, Composition, Moyenne).
    // Année active : un premier devoir du 1er trimestre si la rentrée est passée.
    async function grade(s, subj, y, term, exam_type, value, date) {
        await put('grade', { student_id: s.id, subject_id: subj.id, score: value, exam_type, term, school_year_id: y.id, updated_at_ms: Date.parse(date) }, date);
    }
    const TERM_DATES = [[0, 12, 15], [1, 3, 20], [1, 6, 10]];
    for (const s of students) {
        const y = years[0];
        for (const subj of s.classByYear[y.id].subjects) {
            for (const [ti, term] of TERMS.entries()) {
                const [dy, m, d] = TERM_DATES[ti];
                const date = iso(y.start + dy, m, d);
                const base = s.level + ti * 0.4;
                const dev = score(base), comp = score(base);
                await grade(s, subj, y, term, 'Devoir', dev, date);
                await grade(s, subj, y, term, 'Composition', comp, date);
                await grade(s, subj, y, term, 'Moyenne', Math.round(((dev + comp * 2) / 3) * 100) / 100, date);
            }
        }
    }
    const firstDevoir = new Date(Date.UTC(years[1].start, 8, 22, 10));
    if (firstDevoir <= NOW) {
        for (const s of students) {
            for (const subj of s.classByYear[years[1].id].subjects.slice(0, 3)) {
                await grade(s, subj, years[1], TERMS[0], 'Devoir', score(s.level + 0.5), firstDevoir.toISOString());
            }
        }
    }

    console.log('\nTerminé :');
    console.table(counts);
}

main()
    .then(() => process.exit(0))
    .catch(err => { console.error('Erreur :', err.message); process.exit(1); });
