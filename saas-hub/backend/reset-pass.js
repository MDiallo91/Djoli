const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./hub.sqlite');

async function reset() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('1234', salt);
  
  db.run("UPDATE Users SET password = ? WHERE email = ?", [hash, 'admin2@gmail.com']);
  db.run("UPDATE Users SET password = ? WHERE email = ?", [hash, 'admin@gmail.com'], (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log("Passwords for admin and admin2 reset to '1234'");
    }
    db.close();
  });
}

reset();
