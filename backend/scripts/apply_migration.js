const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:226004042%40UniCrew@db.uugrphjofppiwsmtzdkh.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_auth_rls_migration.sql'), 'utf8');
  console.log('Running migration...');
  await client.query(sql);
  console.log('Migration executed successfully.');
  await client.end();
}

run().catch(console.error);
