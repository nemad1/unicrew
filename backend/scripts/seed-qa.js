/**
 * QA Screenshot Seed Script
 *
 * Run with: node scripts/seed-qa.js
 *
 * Creates exactly one test account per role (admin, counselor, ambassador)
 * plus enough demo data (contacts, messages, kanban cards, appointments,
 * etc.) that every dashboard screen has something to show. Safe to re-run:
 * every insert is either a fixed-UUID upsert or a check-then-insert, so
 * nothing is duplicated and no existing non-test data is touched.
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

const SHARED_PASSWORD = 'TestPass123!';

// Fixed, deterministic IDs so re-runs upsert instead of duplicating.
const QA_TEAM_ID = '00000000-0000-0000-0000-0000000000aa';
const QA_BOARD_ID = '00000000-0000-0000-0000-0000000000ab';
const STAGE_IDS = {
  New: '00000000-0000-0000-0000-0000000000b0',
  Active: '00000000-0000-0000-0000-0000000000b1',
  Submitted: '00000000-0000-0000-0000-0000000000b2',
  Enrolled: '00000000-0000-0000-0000-0000000000b3',
};

const ACCOUNTS = [
  {
    role: 'admin',
    email: 'test.admin@test.local',
    full_name: 'Test Admin',
    team_id: '00000000-0000-0000-0000-000000000001', // "Administration" team from seed-admin.js
    is_team_leader: true,
  },
  {
    role: 'counselor',
    email: 'test.counselor@test.local',
    full_name: 'Test Counselor',
    team_id: QA_TEAM_ID,
    is_team_leader: true,
  },
  {
    role: 'ambassador',
    email: 'test.ambassador@test.local',
    full_name: 'Test Ambassador',
    team_id: QA_TEAM_ID,
    is_team_leader: false,
  },
];

const CONTACTS = [
  { id: '00000000-0000-0000-0000-0000000000c0', phone: '+15550100001', name: 'Amara Osei', intent: 'Fees', lead_status: 'new', channel: 'WhatsApp' },
  { id: '00000000-0000-0000-0000-0000000000c1', phone: '+15550100002', name: 'Liam Chen', intent: 'Courses', lead_status: 'active', channel: 'WhatsApp' },
  { id: '00000000-0000-0000-0000-0000000000c2', phone: '+15550100003', name: 'Priya Nair', intent: 'Visa & Immigration', lead_status: 'active', channel: 'Instagram' },
  { id: '00000000-0000-0000-0000-0000000000c3', phone: '+15550100004', name: 'Diego Alvarez', intent: 'Housing', lead_status: 'submitted', channel: 'WhatsApp' },
  { id: '00000000-0000-0000-0000-0000000000c4', phone: '+15550100005', name: 'Sofia Rossi', intent: 'Campus Life', lead_status: 'enrolled', channel: 'Web' },
  { id: '00000000-0000-0000-0000-0000000000c5', phone: '+15550100006', name: 'Kwame Mensah', intent: 'Booking', lead_status: 'new', channel: 'WhatsApp' },
];

function daysAgo(n, hoursOffset = 0) {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000 - hoursOffset * 60 * 60 * 1000);
  return d.toISOString();
}

async function upsertTeams() {
  console.log('\nTeams');
  const { error } = await supabase
    .from('teams')
    .upsert({ id: QA_TEAM_ID, name: 'QA Test Team' }, { onConflict: 'id' });
  if (error) console.error(`  x QA Test Team: ${error.message}`);
  else console.log('  - QA Test Team ready');
}

async function ensureAuthUser(email, fullName, role) {
  const { data: existing } = await supabase
    .from('internal_users')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    console.log(`  - ${email} already exists (${existing.id})`);
    return existing.id;
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: SHARED_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (authError) {
    // Auth user may exist without an internal_users row (partial prior run) - look it up.
    if (authError.message?.toLowerCase().includes('already been registered')) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const found = list?.users?.find((u) => u.email === email);
      if (found) {
        console.log(`  - ${email} auth user already existed (${found.id}), reusing`);
        return found.id;
      }
    }
    console.error(`  x ${email} auth error: ${authError.message}`);
    return null;
  }

  console.log(`  + ${email} auth user created (${authData.user.id})`);
  return authData.user.id;
}

async function seedAccounts() {
  console.log('\nAccounts');
  const ids = {};

  for (const acct of ACCOUNTS) {
    const userId = await ensureAuthUser(acct.email, acct.full_name, acct.role);
    if (!userId) continue;
    ids[acct.role] = userId;

    const { error: profileError } = await supabase
      .from('internal_users')
      .upsert(
        {
          id: userId,
          email: acct.email,
          full_name: acct.full_name,
          role: acct.role,
          team_id: acct.team_id,
          is_team_leader: acct.is_team_leader,
          is_active: true,
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.error(`  x internal_users for ${acct.email}: ${profileError.message}`);
      continue;
    }

    if (acct.role === 'ambassador') {
      const { error: ambError } = await supabase.from('ambassador_profiles').upsert(
        {
          user_id: userId,
          programme: 'BSc Computer Science',
          programme_type: 'Undergraduate',
          academic_year: 'Year 3',
          majors: 'Software Engineering',
          previous_qualification: 'A-Levels',
          favourite_courses: ['Distributed Systems', 'Human-Computer Interaction'],
          languages: ['English', 'Mandarin'],
          origin_country: 'Malaysia',
          origin_flag: '\u{1F1F2}\u{1F1FE}',
          bio_short: 'Helping new students settle in fast.',
          bio_full: 'Third-year CS student who loves showing new students around campus and answering questions about student life.',
          hobbies: ['Badminton', 'Photography'],
          clubs_societies: JSON.stringify([{ name: 'Robotics Club', role: 'Vice President' }]),
          is_online: true,
          availability_schedule: JSON.stringify([
            { day: 'mon', start: '09:00', end: '17:00' },
            { day: 'tue', start: '09:00', end: '17:00' },
            { day: 'wed', start: null, end: null },
            { day: 'thu', start: '09:00', end: '17:00' },
            { day: 'fri', start: '09:00', end: '13:00' },
            { day: 'sat', start: null, end: null },
            { day: 'sun', start: null, end: null },
          ]),
        },
        { onConflict: 'user_id' }
      );
      if (ambError) console.error(`  x ambassador_profiles for ${acct.email}: ${ambError.message}`);
    }

    console.log(`  - ${acct.role} -> ${acct.email}`);
  }

  return ids;
}

async function seedKanbanBoard() {
  console.log('\nKanban board');
  const { error: boardError } = await supabase
    .from('kanban_boards')
    .upsert({ id: QA_BOARD_ID, name: 'QA Test Team Board', team_id: QA_TEAM_ID }, { onConflict: 'id' });
  if (boardError) console.error(`  x board: ${boardError.message}`);

  const stages = [
    { id: STAGE_IDS.New, name: 'New', order_index: 0, accent_color: '#1d4ed8', is_completed: false },
    { id: STAGE_IDS.Active, name: 'Active', order_index: 1, accent_color: '#d97706', is_completed: false },
    { id: STAGE_IDS.Submitted, name: 'Submitted', order_index: 2, accent_color: '#7c3aed', is_completed: false },
    { id: STAGE_IDS.Enrolled, name: 'Enrolled', order_index: 3, accent_color: '#059669', is_completed: true },
  ];

  for (const stage of stages) {
    const { error } = await supabase
      .from('kanban_stages')
      .upsert({ ...stage, board_id: QA_BOARD_ID }, { onConflict: 'id' });
    if (error) console.error(`  x stage ${stage.name}: ${error.message}`);
  }
  console.log('  - QA Test Team Board + 4 stages ready');
}

async function seedContacts(ambassadorId) {
  console.log('\nContacts');
  const stageForIndex = [STAGE_IDS.New, STAGE_IDS.Active, STAGE_IDS.Active, STAGE_IDS.Submitted, STAGE_IDS.Enrolled, STAGE_IDS.New];

  for (let i = 0; i < CONTACTS.length; i++) {
    const c = CONTACTS[i];
    const assignToAmbassador = i % 2 === 0; // half assigned to the ambassador, half team-only

    const { error } = await supabase.from('contacts').upsert(
      {
        id: c.id,
        phone_number: c.phone,
        name: c.name,
        channel: c.channel,
        intent: c.intent,
        lead_status: c.lead_status,
        enrollment_probability: [20, 45, 60, 75, 95, 15][i],
        unread_count: i % 3 === 0 ? 1 : 0,
        team_id: QA_TEAM_ID,
        assigned_to: assignToAmbassador ? ambassadorId : null,
        created_at: daysAgo(10 - i),
      },
      { onConflict: 'phone_number' }
    );
    if (error) {
      console.error(`  x contact ${c.name}: ${error.message}`);
      continue;
    }

    // Interaction logs: student -> ambassador ping-pong, spread over the last few days.
    const messages = [
      { sender_type: 'student', content: `Hi, I had a question about ${c.intent.toLowerCase()}.`, offsetDays: 3, offsetHours: 4 },
      { sender_type: 'ambassador', content: 'Hi! Happy to help - give me a moment to check.', offsetDays: 3, offsetHours: 3.9 },
      { sender_type: 'student', content: 'Thank you, no rush!', offsetDays: 2, offsetHours: 5 },
      { sender_type: 'ambassador', content: 'Here is what I found for you.', offsetDays: 2, offsetHours: 4.8 },
    ];

    const { data: existingLogs } = await supabase
      .from('interaction_logs')
      .select('id')
      .eq('contact_id', c.id)
      .limit(1);

    if (!existingLogs || existingLogs.length === 0) {
      for (const m of messages) {
        const { error: logError } = await supabase.from('interaction_logs').insert({
          contact_id: c.id,
          sender_type: m.sender_type,
          content: m.content,
          is_automated: false,
          is_read: true,
          created_at: daysAgo(m.offsetDays, m.offsetHours),
        });
        if (logError) console.error(`  x log for ${c.name}: ${logError.message}`);
      }
    }

    // Kanban card placing the contact on the QA board.
    const { data: existingCard } = await supabase
      .from('kanban_cards')
      .select('id')
      .eq('contact_id', c.id)
      .limit(1);

    if (!existingCard || existingCard.length === 0) {
      const { error: cardError } = await supabase.from('kanban_cards').insert({
        stage_id: stageForIndex[i],
        contact_id: c.id,
        assignee_id: assignToAmbassador ? ambassadorId : null,
        updated_at: daysAgo(Math.max(0, 5 - i)),
      });
      if (cardError) console.error(`  x kanban card for ${c.name}: ${cardError.message}`);
    }

    console.log(`  - ${c.name} (${c.lead_status}, ${assignToAmbassador ? 'assigned to ambassador' : 'team pool'})`);
  }
}

async function seedContactSignals() {
  console.log('\nContact signals (for Top Concerns widget)');
  const signals = [
    { contact_id: CONTACTS[0].id, signal_type: 'concern', label: 'Tuition cost', confidence: 0.82 },
    { contact_id: CONTACTS[1].id, signal_type: 'concern', label: 'Tuition cost', confidence: 0.7 },
    { contact_id: CONTACTS[2].id, signal_type: 'concern', label: 'Visa processing time', confidence: 0.65 },
    { contact_id: CONTACTS[3].id, signal_type: 'interest', label: 'On-campus housing', confidence: 0.9 },
  ];

  for (const s of signals) {
    const { data: existing } = await supabase
      .from('contact_signals')
      .select('id')
      .eq('contact_id', s.contact_id)
      .eq('label', s.label)
      .limit(1);
    if (existing && existing.length > 0) continue;

    const { error } = await supabase.from('contact_signals').insert({
      ...s,
      created_at: daysAgo(1),
    });
    if (error) console.error(`  x signal ${s.label}: ${error.message}`);
  }
  console.log('  - Signals ready');
}

async function seedAppointments(counselorId, ambassadorId) {
  console.log('\nAppointments');
  const appts = [
    {
      title: 'Consultation: Fees & Scholarships',
      context: 'Follow-up call about tuition payment plans.',
      tone: 'blue',
      start_time: daysAgo(-1, -2), // tomorrow-ish
      end_time: daysAgo(-1, -1),
      contact_id: CONTACTS[0].id,
      created_by: counselorId,
    },
    {
      title: 'Campus Tour Walkthrough',
      context: 'Video call walkthrough of student housing.',
      tone: 'green',
      start_time: daysAgo(-2, -4),
      end_time: daysAgo(-2, -3),
      contact_id: CONTACTS[3].id,
      created_by: ambassadorId,
    },
  ];

  for (const a of appts) {
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('title', a.title)
      .eq('created_by', a.created_by)
      .limit(1);
    if (existing && existing.length > 0) continue;

    const { error } = await supabase.from('appointments').insert(a);
    if (error) console.error(`  x appointment "${a.title}": ${error.message}`);
  }
  console.log('  - Appointments ready');
}

async function seedContactNote(counselorId) {
  console.log('\nContact note');
  const { data: existing } = await supabase
    .from('contact_notes')
    .select('id')
    .eq('contact_id', CONTACTS[1].id)
    .limit(1);
  if (existing && existing.length > 0) {
    console.log('  - already present');
    return;
  }

  const { error } = await supabase.from('contact_notes').insert({
    contact_id: CONTACTS[1].id,
    author_id: counselorId,
    content: 'Prefers WhatsApp over email; follow up after exam period ends.',
  });
  if (error) console.error(`  x note: ${error.message}`);
  else console.log('  - Note created');
}

async function seedPolicySuggestion(counselorId) {
  console.log('\nPolicy suggestion');
  const rule = 'Escalate housing questions to a counselor after 2 AI replies';
  const { data: existing } = await supabase
    .from('policy_suggestions')
    .select('id')
    .eq('rule', rule)
    .limit(1);
  if (existing && existing.length > 0) {
    console.log('  - already present');
    return;
  }

  const { error } = await supabase.from('policy_suggestions').insert({
    submitted_by: counselorId,
    rule,
    proposed_change: 'Route to Human Ambassador after 2 unresolved AI replies instead of 4.',
    reason: 'Housing questions are time-sensitive and students get frustrated waiting on bot replies.',
    status: 'pending',
  });
  if (error) console.error(`  x suggestion: ${error.message}`);
  else console.log('  - Suggestion created');
}

async function main() {
  console.log('Seeding QA data (idempotent, safe to re-run)...');

  await upsertTeams();
  const ids = await seedAccounts();

  if (!ids.ambassador || !ids.counselor || !ids.admin) {
    console.error('\nOne or more accounts failed to seed - aborting downstream data seeding.');
    process.exit(1);
  }

  await seedKanbanBoard();
  await seedContacts(ids.ambassador);
  await seedContactSignals();
  await seedAppointments(ids.counselor, ids.ambassador);
  await seedContactNote(ids.counselor);
  await seedPolicySuggestion(ids.counselor);

  console.log('\n' + '='.repeat(60));
  console.log('QA seed complete');
  console.log('='.repeat(60));
  for (const acct of ACCOUNTS) {
    console.log(`${acct.role.padEnd(11)} ${acct.email}`);
  }
  console.log(`password (all accounts): ${SHARED_PASSWORD}`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
