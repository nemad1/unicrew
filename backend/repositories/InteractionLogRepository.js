class InteractionLogRepository {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async create(logData) {
        const { data, error } = await this.supabase
            .from('interaction_logs')
            .insert(logData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async findRecentByContactId(contactId, limit = 20) {
        const { data, error } = await this.supabase
            .from('interaction_logs')
            .select('id, sender_type, content, created_at')
            .eq('contact_id', contactId)
            .neq('sender_type', 'system')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    async countByContactId(contactId) {
        const { count, error } = await this.supabase
            .from('interaction_logs')
            .select('*', { count: 'exact', head: true })
            .eq('contact_id', contactId);

        if (error) throw error;
        return count;
    }

    // Delta messages for AI analysis: everything after `timestamp`, oldest first.
    async getMessagesAfter(contactId, timestamp) {
        const { data, error } = await this.supabase
            .from('interaction_logs')
            .select('id, sender_type, content, created_at')
            .eq('contact_id', contactId)
            .neq('sender_type', 'system')
            .gt('created_at', timestamp)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    }
}

module.exports = InteractionLogRepository;
