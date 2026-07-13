const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:226004042%40UniCrew@db.uugrphjofppiwsmtzdkh.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const sql = `
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
  `;
  await client.query(sql);
  console.log('Grants executed successfully.');
  await client.end();
}
run().catch(console.error);
