class InternalUserRepository {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async findById(id) {
        const { data, error } = await this.supabase
            .from('internal_users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }

    async updateWhatsappSessionId(id, sessionId) {
        const { error } = await this.supabase
            .from('internal_users')
            .update({ whatsapp_session_id: sessionId })
            .eq('id', id);

        if (error) throw error;
    }
}

module.exports = InternalUserRepository;
