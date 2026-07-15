/**
 * Seed Admin Script
 * 
 * Run with: node scripts/seed-admin.js
 * 
 * Creates the first admin user in Supabase Auth + internal_users.
 * Only needs to be run once during initial setup.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ADMIN_EMAIL = 'admin@unicrew.io';
const ADMIN_PASSWORD = 'UniCrew@Admin2026';
const ADMIN_NAME = 'System Administrator';

async function seedAdmin() {
  console.log('🔧 Seeding admin user...\n');

  // 1. Create teams
  console.log('📁 Creating teams...');
  const teams = [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Administration' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Admissions - Asia Pacific' },
    { id: '00000000-0000-0000-0000-000000000003', name: 'Admissions - EMEA' },
    { id: '00000000-0000-0000-0000-000000000004', name: 'Admissions - Americas' },
  ];

  for (const team of teams) {
    const { error } = await supabase
      .from('teams')
      .upsert(team, { onConflict: 'id' });
    if (error) {
      console.error(`  ❌ Team "${team.name}": ${error.message}`);
    } else {
      console.log(`  ✅ Team "${team.name}" created`);
    }
  }

  // 2. Check if admin already exists
  const { data: existingUsers } = await supabase
    .from('internal_users')
    .select('id, email')
    .eq('email', ADMIN_EMAIL)
    .limit(1);

  if (existingUsers && existingUsers.length > 0) {
    console.log(`\n⚠️  Admin user "${ADMIN_EMAIL}" already exists (ID: ${existingUsers[0].id})`);
    console.log('Skipping creation.\n');
    process.exit(0);
  }

  // 3. Create auth user
  console.log(`\n👤 Creating auth user: ${ADMIN_EMAIL}`);
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: ADMIN_NAME, role: 'admin' },
  });

  if (authError) {
    console.error(`  ❌ Auth error: ${authError.message}`);
    process.exit(1);
  }

  const adminId = authData.user.id;
  console.log(`  ✅ Auth user created (ID: ${adminId})`);

  // 4. Insert into internal_users
  console.log('📋 Creating internal_users record...');
  const { error: profileError } = await supabase
    .from('internal_users')
    .insert({
      id: adminId,
      email: ADMIN_EMAIL,
      full_name: ADMIN_NAME,
      role: 'admin',
      team_id: '00000000-0000-0000-0000-000000000001',
      is_team_leader: true,
    });

  if (profileError) {
    console.error(`  ❌ Profile error: ${profileError.message}`);
    // Rollback auth user
    await supabase.auth.admin.deleteUser(adminId);
    console.error('  🔄 Auth user rolled back.');
    process.exit(1);
  }

  console.log('  ✅ internal_users record created');

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Admin user seeded successfully!');
  console.log('='.repeat(50));
  console.log(`Email:    ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log(`Role:     admin`);
  console.log(`Team:     Administration`);
  console.log('='.repeat(50));
  console.log('\n⚠️  Change the password after first login!\n');
}

seedAdmin().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
