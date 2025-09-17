/**
 * Módulo Supabase - Compatibilidade durante migração
 * Este arquivo mantém compatibilidade durante a transição para PostgreSQL
 */

const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase conectado (modo compatibilidade)');
    } catch (error) {
        console.warn('⚠️  Erro ao conectar Supabase:', error.message);
    }
} else {
    console.warn('⚠️  Configurações Supabase não encontradas');
}

/**
 * Salvar mensagem no Supabase
 * @deprecated Use PostgreSQL em vez disso
 */
async function saveMessage(messageData) {
    console.warn('⚠️  saveMessage: Função Supabase depreciada, use PostgreSQL');
    
    if (!supabase) {
        throw new Error('Supabase não configurado');
    }

    try {
        const { data, error } = await supabase
            .from('messages')
            .insert(messageData)
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('❌ Erro ao salvar mensagem no Supabase:', error);
        throw error;
    }
}

/**
 * Salvar contato no Supabase
 * @deprecated Use PostgreSQL em vez disso
 */
async function saveContact(contactData) {
    console.warn('⚠️  saveContact: Função Supabase depreciada, use PostgreSQL');
    
    if (!supabase) {
        throw new Error('Supabase não configurado');
    }

    try {
        const { data, error } = await supabase
            .from('contacts')
            .upsert(contactData, { onConflict: 'id' })
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('❌ Erro ao salvar contato no Supabase:', error);
        throw error;
    }
}

/**
 * Obter histórico de mensagens do Supabase
 * @deprecated Use PostgreSQL em vez disso
 */
async function getMessageHistory(chatId, limit = 50) {
    console.warn('⚠️  getMessageHistory: Função Supabase depreciada, use PostgreSQL');
    
    if (!supabase) {
        throw new Error('Supabase não configurado');
    }

    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Erro ao obter histórico do Supabase:', error);
        throw error;
    }
}

/**
 * Obter contatos do Supabase
 * @deprecated Use PostgreSQL em vez disso
 */
async function getContacts() {
    console.warn('⚠️  getContacts: Função Supabase depreciada, use PostgreSQL');
    
    if (!supabase) {
        throw new Error('Supabase não configurado');
    }

    try {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Erro ao obter contatos do Supabase:', error);
        throw error;
    }
}

/**
 * Verificar se Supabase está disponível
 */
function isSupabaseAvailable() {
    return supabase !== null;
}

module.exports = {
    supabase,
    saveMessage,
    saveContact,
    getMessageHistory,
    getContacts,
    isSupabaseAvailable
};