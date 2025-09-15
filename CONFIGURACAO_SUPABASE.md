# 🚀 Guia de Configuração do Supabase

## ✅ Status Atual
Suas configurações do Supabase já estão no arquivo `.env`:
- **URL**: `https://blhhmogyezdbbxinzonh.supabase.co`
- **Chaves**: Configuradas corretamente

## 📋 Passo a Passo para Criar as Tabelas

### 1. Acessar o Painel do Supabase
1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login na sua conta
3. Selecione seu projeto: `blhhmogyezdbbxinzonh`

### 2. Executar o Script SQL
1. No painel lateral, clique em **"SQL Editor"**
2. Clique em **"New Query"**
3. Copie e cole o conteúdo completo do arquivo `database/schema.sql`
4. Clique em **"Run"** para executar

### 3. Verificar se as Tabelas foram Criadas
Após executar o script, você deve ter as seguintes tabelas:

#### 📱 **contacts**
- Armazena contatos do WhatsApp
- Campos: id, whatsapp_id, number, name, pushname, profile_pic_url, is_group

#### 💬 **messages** 
- Armazena todas as mensagens
- Campos: id, whatsapp_id, chat_id, contact_number, body, timestamp, from_me, message_type

#### 🤖 **ai_sessions**
- Sessões de conversa com IA
- Campos: id, session_id, contact_number, context

#### ⚙️ **agent_settings**
- Configurações do agente
- Campos: id, setting_key, setting_value

## 🔧 Configuração Manual Alternativa

Se preferir criar as tabelas manualmente:

### Tabela `contacts`
```sql
CREATE TABLE contacts (
  id BIGSERIAL PRIMARY KEY,
  whatsapp_id TEXT UNIQUE NOT NULL,
  number TEXT NOT NULL,
  name TEXT,
  pushname TEXT,
  profile_pic_url TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela `messages`
```sql
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  whatsapp_id TEXT UNIQUE NOT NULL,
  chat_id TEXT NOT NULL,
  contact_number TEXT,
  contact_name TEXT,
  body TEXT,
  timestamp TIMESTAMP WITH TIME ZONE,
  from_me BOOLEAN DEFAULT FALSE,
  message_type TEXT DEFAULT 'chat',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela `ai_sessions`
```sql
CREATE TABLE ai_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  contact_number TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela `agent_settings`
```sql
CREATE TABLE agent_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 📊 Índices para Performance
```sql
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_contacts_number ON contacts(number);
CREATE INDEX idx_ai_sessions_contact ON ai_sessions(contact_number);
```

## ✅ Verificação Final

Para verificar se tudo está funcionando:

1. **No Supabase**: Vá em "Table Editor" e confirme que as 4 tabelas existem
2. **Na aplicação**: Reinicie o servidor e verifique os logs
3. **Teste**: Envie uma mensagem no WhatsApp e veja se é salva no banco

## 🚨 Possíveis Problemas

### Erro "Could not find the table in the schema cache"
- **Causa**: Tabelas não foram criadas
- **Solução**: Execute o script SQL completo no Supabase

### Erro de conexão
- **Causa**: Chaves incorretas no `.env`
- **Solução**: Verifique as chaves em Settings > API no Supabase

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do servidor
2. Confirme que as tabelas existem no Supabase
3. Teste a conexão com as chaves da API

---

**✨ Após seguir este guia, sua aplicação WhatsApp estará totalmente integrada com o Supabase!**