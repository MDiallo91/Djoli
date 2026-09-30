/**
 * create-admin.js — Crée (ou met à jour) le compte super admin.
 *
 * Se connecte à la même base que le serveur (respecte le .env : DATABASE_URL,
 * ou DB_CONNECTION=mysql + DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME/DB_PASSWORD,
 * ou SQLite local si aucun n'est renseigné) — voir src/config/db.ts.
 *
 * Identifiants configurables, PAS codés en dur :
 *   1) arguments en ligne de commande : email, password, nom (optionnel)
 *   2) sinon variables d'env ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
 *   3) sinon valeurs par défaut (superadmin@gmail.com / admin)
 *
 * Usage :
 *   node create-admin.js
 *   node create-admin.js admin@ecole.com MonMotDePasse "Mon École"
 *   ADMIN_EMAIL=admin@ecole.com ADMIN_PASSWORD=secret node create-admin.js
 *
 * Relancer ce script à tout moment avec un nouvel email/mot de passe met à
 * jour le compte existant (upsert) — pas besoin de modifier ce fichier.
 */
require('dotenv').config();
require('ts-node').register({ transpileOnly: true });

const [, , argEmail, argPassword, argName] = process.argv;
const email      = argEmail    || process.env.ADMIN_EMAIL    || 'superadmin@gmail.com';
const password   = argPassword || process.env.ADMIN_PASSWORD || 'admin';
const schoolName = argName     || process.env.ADMIN_NAME     || 'Hub Administration';

const sequelize = require('./src/config/db.ts').default;
const UserModel  = require('./src/models/userModel.ts').default;

async function main() {
    await sequelize.authenticate();
    await sequelize.sync();

    const existing = await UserModel.findOne({ where: { email } });

    if (existing) {
        existing.password           = password; // rehashé automatiquement par le hook beforeUpdate
        existing.schoolName         = schoolName;
        existing.role               = 'super_admin';
        existing.approvalStatus     = 'approved';
        existing.subscriptionStatus = 'active';
        existing.subscriptionExpiry = '4099-12-31T00:00:00.000Z';
        await existing.save();
        console.log(`Super admin mis à jour : ${email}`);
    } else {
        await UserModel.create({
            schoolName,
            email,
            password,
            role: 'super_admin',
            approvalStatus: 'approved',
            subscriptionStatus: 'active',
            subscriptionExpiry: '2099-12-31T00:00:00.000Z',
        });
        console.log(`Super admin créé : ${email}`);
    }

    console.log(`Mot de passe : ${password}`);
    process.exit(0);
}

main().catch(err => {
    console.error('Erreur :', err.message);
    process.exit(1);
});
