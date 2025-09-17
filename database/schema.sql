-- Estrutura de tabelas otimizada para PostgreSQL local
-- Foco em mensagens e dados operacionais

-- Tabela de usuários (dados básicos)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de conversas/chats
CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
    chat_id VARCHAR(100) UNIQUE NOT NULL,
    chat_name VARCHAR(255),
    chat_type VARCHAR(20) DEFAULT 'private', -- private, group
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de contatos
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    chat_id VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    name VARCHAR(255),
    pushname VARCHAR(255),
    profile_pic_url TEXT,
    is_group BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_chat_id ON contacts (chat_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts (phone_number);

-- Tabela de mensagens otimizada com índices
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    chat_id VARCHAR(100) NOT NULL,
    message_id VARCHAR(100) NOT NULL,
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'text', -- text, image, audio, video, document
    from_user VARCHAR(100),
    to_user VARCHAR(100),
    timestamp TIMESTAMP DEFAULT NOW(),
    is_from_me BOOLEAN DEFAULT FALSE,
    is_forwarded BOOLEAN DEFAULT FALSE,
    reply_to_message_id VARCHAR(100),
    media_url TEXT,
    media_mimetype VARCHAR(100),
    processed BOOLEAN DEFAULT FALSE,
    ai_response TEXT,
    
    -- Índices para performance
    CONSTRAINT fk_chat FOREIGN KEY (chat_id) REFERENCES chats(chat_id) ON DELETE CASCADE
);

-- Índices otimizados para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_messages_chat_timestamp ON messages (chat_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages (message_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages (timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages (from_user);
CREATE INDEX IF NOT EXISTS idx_messages_processed ON messages (processed);

-- Tabela de sessões de usuário
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_phone VARCHAR(20) NOT NULL,
    api_key VARCHAR(255),
    agent_enabled BOOLEAN DEFAULT TRUE,
    auto_reply BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_sessions_phone ON user_sessions (user_phone);
CREATE INDEX IF NOT EXISTS idx_sessions_activity ON user_sessions (last_activity);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions (expires_at);

-- Tabela de configurações do agente
CREATE TABLE IF NOT EXISTS agent_configs (
    id SERIAL PRIMARY KEY,
    user_phone VARCHAR(20) NOT NULL,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_phone, config_key)
);

CREATE INDEX IF NOT EXISTS idx_agent_configs_phone ON agent_configs (user_phone);

-- Tabela de contatos pausados
CREATE TABLE IF NOT EXISTS paused_contacts (
    id SERIAL PRIMARY KEY,
    user_phone VARCHAR(20) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    paused_until TIMESTAMP NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_phone, contact_phone)
);

CREATE INDEX IF NOT EXISTS idx_paused_contacts_phone ON paused_contacts (user_phone);
CREATE INDEX IF NOT EXISTS idx_paused_contacts_until ON paused_contacts (paused_until);

-- Tabela de logs do sistema (para monitoramento)
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGSERIAL PRIMARY KEY,
    log_level VARCHAR(20) DEFAULT 'INFO', -- DEBUG, INFO, WARN, ERROR
    message TEXT NOT NULL,
    user_phone VARCHAR(20),
    chat_id VARCHAR(100),
    error_details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs (log_level);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_logs_user ON system_logs (user_phone);

-- Tabela de estatísticas (para monitoramento de performance)
CREATE TABLE IF NOT EXISTS statistics (
    id SERIAL PRIMARY KEY,
    stat_date DATE DEFAULT CURRENT_DATE,
    user_phone VARCHAR(20),
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    ai_responses INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(stat_date, user_phone)
);

CREATE INDEX IF NOT EXISTS idx_stats_date ON statistics (stat_date);
CREATE INDEX IF NOT EXISTS idx_stats_user ON statistics (user_phone);

-- Configurações de otimização
-- Ativar compressão para campos grandes
ALTER TABLE messages ALTER COLUMN content SET STORAGE EXTENDED;
ALTER TABLE messages ALTER COLUMN ai_response SET STORAGE EXTENDED;
ALTER TABLE system_logs ALTER COLUMN message SET STORAGE EXTENDED;
ALTER TABLE system_logs ALTER COLUMN error_details SET STORAGE EXTENDED;

-- Função para limpeza automática de dados antigos
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Deletar mensagens antigas (mais de 30 dias)
    DELETE FROM messages WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- Deletar sessões expiradas
    DELETE FROM user_sessions WHERE expires_at < NOW();
    
    -- Deletar logs antigos (mais de 15 dias)
    DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '15 days';
    
    -- Deletar contatos pausados expirados
    DELETE FROM paused_contacts WHERE paused_until < NOW();
    
    -- Deletar estatísticas antigas (mais de 90 dias)
    DELETE FROM statistics WHERE stat_date < CURRENT_DATE - INTERVAL '90 days';
    
    -- Vacuum para recuperar espaço
    VACUUM ANALYZE;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar estatísticas
CREATE OR REPLACE FUNCTION update_daily_stats(p_user_phone VARCHAR, p_type VARCHAR)
RETURNS void AS $$
BEGIN
    INSERT INTO statistics (stat_date, user_phone, messages_sent, messages_received, ai_responses, errors_count)
    VALUES (CURRENT_DATE, p_user_phone, 
            CASE WHEN p_type = 'sent' THEN 1 ELSE 0 END,
            CASE WHEN p_type = 'received' THEN 1 ELSE 0 END,
            CASE WHEN p_type = 'ai_response' THEN 1 ELSE 0 END,
            CASE WHEN p_type = 'error' THEN 1 ELSE 0 END)
    ON CONFLICT (stat_date, user_phone) 
    DO UPDATE SET 
        messages_sent = statistics.messages_sent + CASE WHEN p_type = 'sent' THEN 1 ELSE 0 END,
        messages_received = statistics.messages_received + CASE WHEN p_type = 'received' THEN 1 ELSE 0 END,
        ai_responses = statistics.ai_responses + CASE WHEN p_type = 'ai_response' THEN 1 ELSE 0 END,
        errors_count = statistics.errors_count + CASE WHEN p_type = 'error' THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE messages IS 'Tabela principal para armazenar mensagens do WhatsApp com otimizações de performance';
COMMENT ON TABLE user_sessions IS 'Sessões ativas dos usuários com configurações temporárias';
COMMENT ON TABLE agent_configs IS 'Configurações personalizadas do agente por usuário';
COMMENT ON TABLE system_logs IS 'Logs do sistema para monitoramento e debugging';
COMMENT ON TABLE statistics IS 'Estatísticas diárias de uso por usuário';
COMMENT ON FUNCTION cleanup_old_data() IS 'Função para limpeza automática de dados antigos';
COMMENT ON FUNCTION update_daily_stats(VARCHAR, VARCHAR) IS 'Função para atualizar estatísticas diárias de uso';