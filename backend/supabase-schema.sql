-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'ambassador');
CREATE TYPE sender_type AS ENUM ('student', 'counselor', 'ambassador', 'ai', 'system');
CREATE TYPE contact_intent AS ENUM ('Fees', 'Campus Life', 'Visa & Immigration', 'Courses', 'Housing', 'Booking', 'Escalated', 'General');
CREATE TYPE lead_status AS ENUM ('new', 'active', 'submitted', 'enrolled');
CREATE TYPE contact_channel AS ENUM ('WhatsApp', 'Instagram', 'Web');

-- 2. TEAMS (Hierarchy Management)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INTERNAL USERS
CREATE TABLE internal_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'ambassador',
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    is_team_leader BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CONTACTS
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT UNIQUE NOT NULL, 
    name TEXT, 
    email TEXT,
    channel contact_channel DEFAULT 'WhatsApp',
    intent contact_intent DEFAULT 'General',
    lead_status lead_status DEFAULT 'new',
    enrollment_probability INT DEFAULT 0,
    unread_count INT DEFAULT 0,
    ai_summary TEXT,      
    ai_tags JSONB DEFAULT '[]'::jsonb,
    fields JSONB DEFAULT '[]'::jsonb,    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    crm_label TEXT
);

-- 5. INTERACTION LOGS
CREATE TABLE interaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    sender_type sender_type NOT NULL,
    content TEXT NOT NULL,
    is_automated BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    replied_to_id UUID REFERENCES interaction_logs(id) ON DELETE SET NULL,
    response_time_seconds INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interaction_logs_contact_id_created_at 
ON interaction_logs(contact_id, created_at DESC);

-- AUTO-PRUNING TRIGGER (Keep last 100 messages)
CREATE OR REPLACE FUNCTION prune_interaction_logs()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM interaction_logs
  WHERE id IN (
    SELECT id FROM interaction_logs
    WHERE contact_id = NEW.contact_id
    ORDER BY created_at DESC
    OFFSET 100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prune_interaction_logs
AFTER INSERT ON interaction_logs
FOR EACH ROW EXECUTE FUNCTION prune_interaction_logs();

-- 6. KANBAN PIPELINE
CREATE TABLE kanban_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kanban_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES kanban_boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INT NOT NULL,
    accent_color TEXT DEFAULT '#1d4ed8',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_id, order_index)
);

CREATE TABLE kanban_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID REFERENCES kanban_stages(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES internal_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CONTACT NOTES
CREATE TABLE contact_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES internal_users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES internal_users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AMBASSADOR PROFILES
CREATE TABLE ambassador_profiles (
    user_id UUID PRIMARY KEY REFERENCES internal_users(id) ON DELETE CASCADE,
    
    -- UI styling
    avatar_colour TEXT DEFAULT 'bg-blue-100 text-blue-700',
    
    -- Academic Details
    programme TEXT,
    programme_type TEXT, 
    academic_year TEXT,
    majors TEXT,
    previous_qualification TEXT,
    favourite_courses TEXT[],
    
    -- Personal Details
    languages TEXT[],
    origin_country TEXT,
    origin_flag TEXT,
    bio_short TEXT,
    bio_full TEXT,
    hobbies TEXT[],
    clubs_societies TEXT,
    
    -- Status & Booking
    is_online BOOLEAN DEFAULT FALSE,
    availability_schedule JSONB DEFAULT '[]'::jsonb,
    rating NUMERIC(3,1) DEFAULT 5.0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. AMBASSADOR SHIFTS
CREATE TABLE ambassador_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES internal_users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. VIEWS
CREATE OR REPLACE VIEW vw_inbox_conversations AS
SELECT 
  c.id,
  c.name AS student_name,
  c.channel,
  c.intent,
  c.unread_count,
  c.lead_status,
  l.content AS last_message_preview,
  l.created_at AS last_message_at
FROM contacts c
LEFT JOIN LATERAL (
  SELECT content, created_at 
  FROM interaction_logs 
  WHERE contact_id = c.id 
  ORDER BY created_at DESC 
  LIMIT 1
) l ON true;

-- 12. PERMISSIONS
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON vw_inbox_conversations TO anon, authenticated;
