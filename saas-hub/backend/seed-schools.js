/**
 * seed-schools.js — Insère quelques comptes école de démo (upsert par email).
 * Respecte la config DB courante (.env) via src/config/db.ts.
 * Usage : node seed-schools.js
 */
require('dotenv').config();
require('ts-node').register({ transpileOnly: true });

const sequelize = require('./src/config/db.ts').default;
const UserModel = require('./src/models/userModel.ts').default;

const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); };

const SCHOOLS = [
  {
    schoolName: 'École Excellence 224', email: 'contact@excellence224.gn', password: 'changeme123',
    directorName: 'M. Ibrahima Diallo', country: 'Guinée', city: 'Conakry', prefecture: 'RATOMA', sousPrefecture: 'YATTAYA',
    level: 'Primaire', levels: JSON.stringify(['Maternelle', 'Primaire']),
    approvalStatus: 'approved', subscriptionStatus: 'active', subscriptionExpiry: inDays(180),
  },
  {
    schoolName: 'Groupe Scolaire Étoile', email: 'direction@groupe-etoile.gn', password: 'changeme123',
    directorName: 'Mme Fatou Cissé', country: 'Guinée', city: 'Kindia', prefecture: 'Kindia', sousPrefecture: 'Damakania',
    level: 'Collège', levels: JSON.stringify(['Primaire', 'Collège']),
    approvalStatus: 'approved', subscriptionStatus: 'trial', subscriptionExpiry: inDays(9),
  },
  {
    schoolName: 'Institut Les Cèdres', email: 'admin@lescedres.gn', password: 'changeme123',
    directorName: 'M. Moussa Traoré', country: 'Guinée', city: 'Labé', prefecture: 'Labé', sousPrefecture: 'Daralabé',
    level: 'Lycée', levels: JSON.stringify(['Collège', 'Lycée']),
    approvalStatus: 'approved', subscriptionStatus: 'expired', subscriptionExpiry: inDays(-14),
  },
  {
    schoolName: 'Lycée Nouvel Horizon', email: 'secretariat@nouvelhorizon.gn', password: 'changeme123',
    directorName: 'Mme Aïcha Koné', country: 'Guinée', city: 'Kankan', prefecture: 'Kankan', sousPrefecture: 'Karifamoriah',
    level: 'Lycée', levels: JSON.stringify(['Lycée']),
    approvalStatus: 'pending', subscriptionStatus: 'trial', subscriptionExpiry: inDays(14),
  },
  {
    schoolName: 'École Primaire Lumière', email: 'contact@ecole-lumiere.gn', password: 'changeme123',
    directorName: 'M. Sékou Camara', country: 'Guinée', city: 'Mamou', prefecture: 'Mamou', sousPrefecture: 'Soyah',
    level: 'Primaire', levels: JSON.stringify(['Maternelle', 'Primaire']),
    approvalStatus: 'approved', subscriptionStatus: 'active', subscriptionExpiry: inDays(320),
  },
  {
    schoolName: 'Complexe Scolaire Avenir', email: 'info@avenir-nzerekore.gn', password: 'changeme123',
    directorName: 'Mme Kadiatou Bah', country: 'Guinée', city: "N'Zérékoré", prefecture: "N'Zérékoré", sousPrefecture: 'Yalenzou',
    level: 'Mixte', levels: JSON.stringify(['Maternelle', 'Primaire', 'Collège']),
    approvalStatus: 'rejected', subscriptionStatus: 'suspended', subscriptionExpiry: inDays(-30),
  },
];

async function main() {
  await sequelize.authenticate();
  await sequelize.sync();

  for (const s of SCHOOLS) {
    const [user, created] = await UserModel.findOrCreate({
      where: { email: s.email },
      defaults: { ...s, role: 'user' },
    });
    if (!created) {
      await user.update({ ...s, role: 'user' });
      console.log(`Mis à jour : ${s.schoolName} (${s.email})`);
    } else {
      console.log(`Créé      : ${s.schoolName} (${s.email})`);
    }
  }

  console.log(`\n${SCHOOLS.length} écoles de démo prêtes. Mot de passe pour toutes : changeme123`);
  process.exit(0);
}

main().catch(err => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
