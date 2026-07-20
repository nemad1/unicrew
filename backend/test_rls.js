require('dotenv').config({ path: 'c:/Users/user/OneDrive/المستندات/AD/APU3F2511SE/Sem-1/FYP/UniCrew/backend/.env' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await client.connect();
  await client.query(`SELECT set_config('request.jwt.claims', '{"sub":"c222a4eb-a879-4a4c-9f05-4738d2178378"}', true)`);
  await client.query(`SET role = authenticated`);
  try {
    const res = await client.query(`SELECT * FROM internal_users`);
    console.log('Result length:', res.rows.length);
    console.log(res.rows);
  } catch (e) {
    console.error('Error:', e.message);
  }
  await client.end();
})();
