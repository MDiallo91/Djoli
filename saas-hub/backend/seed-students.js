/**
 * seed-students.js — Peuple une école de démo avec une année scolaire,
 * des classes et des élèves, via l'API HTTP (comme le ferait le frontend).
 * Le serveur backend doit tourner sur http://localhost:3001.
 * Usage : node seed-students.js
 */
const BASE = 'http://localhost:3001/api';
const EMAIL = 'contact@excellence224.gn';
const PASSWORD = 'changeme123';

let cookie = '';

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const CLASSES = [
  { name: 'CI',  level: 'Primaire' },
  { name: 'CM1', level: 'Primaire' },
  { name: 'CM2', level: 'Primaire' },
];

const STUDENTS = [
  { first_name: 'Mamadou',   last_name: 'Diallo',   gender: 'M', birth_date: '2016-03-12', matricule: 'EXC-0001', cls: 'CI' },
  { first_name: 'Fatoumata', last_name: 'Barry',    gender: 'F', birth_date: '2016-07-02', matricule: 'EXC-0002', cls: 'CI' },
  { first_name: 'Ibrahima',  last_name: 'Bah',      gender: 'M', birth_date: '2016-01-20', matricule: 'EXC-0003', cls: 'CI' },
  { first_name: 'Aissatou',  last_name: 'Sow',      gender: 'F', birth_date: '2014-09-15', matricule: 'EXC-0004', cls: 'CM1' },
  { first_name: 'Alpha',     last_name: 'Camara',   gender: 'M', birth_date: '2014-11-08', matricule: 'EXC-0005', cls: 'CM1' },
  { first_name: 'Kadiatou',  last_name: 'Cissé',    gender: 'F', birth_date: '2014-05-30', matricule: 'EXC-0006', cls: 'CM1' },
  { first_name: 'Sékou',     last_name: 'Condé',    gender: 'M', birth_date: '2014-02-17', matricule: 'EXC-0007', cls: 'CM1' },
  { first_name: 'Mariam',    last_name: 'Touré',    gender: 'F', birth_date: '2013-08-25', matricule: 'EXC-0008', cls: 'CM2' },
  { first_name: 'Ousmane',   last_name: 'Keita',    gender: 'M', birth_date: '2013-04-03', matricule: 'EXC-0009', cls: 'CM2' },
  { first_name: 'Hawa',      last_name: 'Baldé',    gender: 'F', birth_date: '2013-12-19', matricule: 'EXC-0010', cls: 'CM2' },
];

async function main() {
  console.log(`Connexion : ${EMAIL}`);
  await api('POST', '/user/login', { email: EMAIL, password: PASSWORD });

  console.log('Création année scolaire 2025-2026 (active)…');
  const year = await api('POST', '/school/school-years', {
    name: '2025-2026', start_date: '2025-10-01', end_date: '2026-07-31', is_active: true,
  });

  console.log('Création des classes…');
  const classByName = {};
  for (const c of CLASSES) {
    const created = await api('POST', '/school/classes', c);
    classByName[c.name] = created.id;
    console.log(`  - ${c.name} (${c.level})`);
  }

  console.log('Inscription des élèves…');
  for (const s of STUDENTS) {
    await api('POST', '/school/students', {
      first_name: s.first_name, last_name: s.last_name, gender: s.gender,
      birth_date: s.birth_date, matricule: s.matricule,
      class_id: classByName[s.cls], school_year_id: year.id,
    });
    console.log(`  - ${s.first_name} ${s.last_name} (${s.cls})`);
  }

  console.log(`\n${STUDENTS.length} élèves inscrits dans ${CLASSES.length} classes pour ${EMAIL}.`);
}

main().catch(err => { console.error('Erreur :', err.message); process.exit(1); });
