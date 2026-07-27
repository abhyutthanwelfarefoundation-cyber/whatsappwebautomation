const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const p = new Pool({
  connectionString: 'postgresql://pop_db_qx2g_user:oL1xfuUQkBTfTrp7aPSlqycalywmqAGE@dpg-d9g9bujbc2fs73ado59g-a.virginia-postgres.render.com/pop_db_qx2g',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'migrations', '004_scheduled_messages_postgres.sql'), 'utf8');
    await p.query(sql);
    console.log('migration 004 applied');
  } catch (e) {
    console.error('FAILED:', e.message);
  } finally {
    await p.end();
  }
}
run();