const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hub.sqlite');

db.all("SELECT email, schoolName FROM Users", [], (err, rows) => {
  if (err) {
    console.error(err.message);
    return;
  }
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
