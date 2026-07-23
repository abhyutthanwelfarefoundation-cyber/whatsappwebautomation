const { Pool } = require('pg');

const p = new Pool({
  connectionString: 'postgresql://pop_db_qx2g_user:oL1xfuUQkBTfTrp7aPSlqycalywmqAGE@dpg-d9g9bujbc2fs73ado59g-a.virginia-postgres.render.com/pop_db_qx2g',
  ssl: { rejectUnauthorized: false },
});

p.query(
  'UPDATE "Users" SET "PasswordHash" = $1 WHERE "Email" = $2',
  ['$2b$12$JTGL9jG8EkxSh6LdmspTvez4srb6jre0jauzXxuQiWuu4MHa2uhf6', 'admin@example.com']
)
  .then(() => {
    console.log('password updated');
    p.end();
  })
  .catch((e) => {
    console.error(e);
    p.end();
  });