import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    // 1. Fetch Main Board
    const { data: boards, error: boardError } = await supabase
      .from('kanban_boards')
      .select('*')
      .eq('name', 'Main Board')
      .limit(1);

    if (boardError || !boards || boards.length === 0) {
      return NextResponse.json({ error: 'Main Board not found. Please ensure migration has run.' }, { status: 404 });
    }
    const boardId = boards[0].id;

    // 2. Fetch Stages for this board
    const { data: stages, error: stagesError } = await supabase
      .from('kanban_stages')
      .select('*')
      .eq('board_id', boardId)
      .order('order_index', { ascending: true });

    if (stagesError) {
      return NextResponse.json({ error: stagesError.message }, { status: 500 });
    }

    // 3. Fetch Cards with their associated Contact and Assignee (if any)
    // We will do a manual join by fetching cards and contacts separately if relational query fails,
    // but Supabase allows relational queries. Let's assume foreign keys are set up.
    const { data: cards, error: cardsError } = await supabase
      .from('kanban_cards')
      .select(`
        id,
        stage_id,
        contact_id,
        contacts (
          id,
          name,
          phone_number,
          intent,
          ai_summary,
          channel
        )
      `);

    if (cardsError) {
      console.error("Cards Error:", cardsError);
      return NextResponse.json({ error: cardsError.message }, { status: 500 });
    }

    // 4. Assemble payload
    const columns = (stages || []).map(stage => {
      const columnCards = (cards || []).filter(c => c.stage_id === stage.id);
      
      const deals = columnCards.map(card => {
        // Safe access because it's a left/inner join in Supabase
        const rawContact = card.contacts;
        const contact = (Array.isArray(rawContact) ? rawContact[0] : rawContact) || {} as any;
        
        // Use a fallback for names
        const rawPhone = contact.phone_number || "Unknown";
        const displayName = contact.name || rawPhone;
        
        return {
          id: card.id, // We'll use the card ID for drag and drop
          contactId: contact.id, // Store contact_id for reference
          phone: rawPhone, // Needed for inbox deep linking and profile viewing
          name: displayName,
          time: "Just now", // In a real app we might use interaction_logs for latest message time
          intent: contact.intent || "General",
          preview: contact.ai_summary || "No recent messages.",
          ambassador: { name: "Unassigned", initials: "UN" } // Fallback since we don't always have assignee populated
        };
      });

      return {
        id: stage.id, // Using real UUID for column IDs
        title: stage.name,
        accent: stage.accent_color,
        isCustom: false, // Could compute this if needed
        deals
      };
    });

    return NextResponse.json({ columns });
  } catch (error: any) {
    console.error("API route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
