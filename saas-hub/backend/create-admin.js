const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./hub.sqlite');

async function createAdmin() {
  const email = 'superadmin@gmail.com';
  const password = 'admin';
  const schoolName = 'Hub Administration';
  
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const now = new Date().toISOString();
  
  db.run(`INSERT OR REPLACE INTO users (id, schoolName, email, password, role, subscriptionStatus, subscriptionExpiry, createdAt, updatedAt) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          ['admin-id-1', schoolName, email, hash, 'super_admin', 'active', '2099-12-31', now, now], (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log(`Super Admin created!`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
    }
    db.close();
  });
}

createAdmin();
