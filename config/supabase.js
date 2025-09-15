const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; // Usando service role para operações do servidor

if (!supabaseUrl || !supabaseKey) {
  console.warn('Configurações do Supabase não encontradas. Funcionalidades de persistência serão desabilitadas.');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Função para salvar mensagem no banco
async function saveMessage(messageData) {
  if (!supabase) {
    console.log('Supabase não configurado, pulando salvamento da mensagem');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          whatsapp_id: messageData.id,
          chat_id: messageData.from,
          contact_number: messageData.contact?.number,
          contact_name: messageData.contact?.name,
          body: messageData.body,
          timestamp: new Date(messageData.timestamp),
          from_me: messageData.fromMe,
          message_type: messageData.type,
          created_at: new Date()
        }
      ])
      .select();

    if (error) {
      console.error('Erro ao salvar mensagem:', error);
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Erro ao salvar mensagem no Supabase:', error);
    return null;
  }
}

// Função para salvar contato no banco
async function saveContact(contactData) {
  if (!supabase) {
    console.log('Supabase não configurado, pulando salvamento do contato');
    return null;
  }

  try {
    // Primeiro, tentar inserir o contato
    const { data, error } = await supabase
      .from('contacts')
      .insert([
        {
          whatsapp_id: contactData.id,
          number: contactData.number,
          name: contactData.name,
          pushname: contactData.pushname,
          profile_pic_url: contactData.profilePicUrl,
          is_group: contactData.isGroup || false,
          updated_at: new Date()
        }
      ])
      .select();

    // Se houver erro de duplicata, fazer update
    if (error && error.code === '23505') {
      const { data: updateData, error: updateError } = await supabase
        .from('contacts')
        .update({
          number: contactData.number,
          name: contactData.name,
          pushname: contactData.pushname,
          profile_pic_url: contactData.profilePicUrl,
          is_group: contactData.isGroup || false,
          updated_at: new Date()
        })
        .eq('whatsapp_id', contactData.id)
        .select();
      
      if (updateError) {
        console.error('Erro ao atualizar contato:', updateError);
        return null;
      }
      return updateData[0];
    }

    if (error) {
      console.error('Erro ao salvar contato:', error);
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Erro ao salvar contato no Supabase:', error);
    return null;
  }
}

// Função para buscar histórico de mensagens
async function getMessageHistory(chatId, limit = 50) {
  if (!supabase) {
    console.log('Supabase não configurado, retornando array vazio');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar histórico no Supabase:', error);
    return [];
  }
}

// Função para buscar contatos
async function getContacts() {
  if (!supabase) {
    console.log('Supabase não configurado, retornando array vazio');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar contatos:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar contatos no Supabase:', error);
    return [];
  }
}

module.exports = {
  supabase,
  saveMessage,
  saveContact,
  getMessageHistory,
  getContacts
};