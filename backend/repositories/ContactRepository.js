class ContactRepository {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async findByPhoneNumber(phoneNumber) {
        const { data, error } = await this.supabase
            .from('contacts')
            .select('*')
            .eq('phone_number', phoneNumber)
            .single();

        if (error) return null;
        return data;
    }

    async findById(id) {
        const { data, error } = await this.supabase
            .from('contacts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }

    async create(contactData) {
        const { data, error } = await this.supabase
            .from('contacts')
            .insert(contactData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async update(id, updateData) {
        const { data, error } = await this.supabase
            .from('contacts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async upsertByPhoneNumber(phoneNumber, name) {
        const { data, error } = await this.supabase
            .from('contacts')
            .upsert({ phone_number: phoneNumber, name }, { onConflict: 'phone_number' })
            .select('phone_number, name')
            .single();

        if (error) throw error;
        return data;
    }

    // Used by the daily analysis cron to find contacts with recent activity.
    async findUpdatedSince(timestamp) {
        const { data, error } = await this.supabase
            .from('contacts')
            .select('*')
            .gte('updated_at', timestamp);

        if (error) throw error;
        return data || [];
    }
}

module.exports = ContactRepository;
