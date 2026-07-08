-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'ambassador');
CREATE TYPE sender_type AS ENUM ('student', 'counselor', 'ambassador', 'ai', 'system');

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
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL, -- Connects staff & ambassadors
    is_team_leader BOOLEAN DEFAULT FALSE, -- Identifies if this staff member leads the team
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CONTACTS
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT UNIQUE NOT NULL, 
    name TEXT, -- Nullable. If contact is deleted, the whole row is dropped. Re-creation will leave this null.
    profile_context TEXT,      
    customer_interest TEXT,    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INTERACTION LOGS (The rolling message log)
CREATE TABLE interaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    sender_type sender_type NOT NULL,
    content TEXT NOT NULL,
    is_automated BOOLEAN DEFAULT FALSE,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_id, order_index)
);

CREATE TABLE kanban_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID REFERENCES kanban_stages(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES internal_users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
