const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do pool de conexões PostgreSQL
class PostgreSQLManager {
    constructor() {
        this.pool = null;
        this.isConnected = false;
        this.config = {
            user: process.env.PG_USER || 'whatsapp_user',
            host: process.env.PG_HOST || 'localhost',
            database: process.env.PG_DATABASE || 'whatsapp_central',
            password: process.env.PG_PASSWORD || 'whatsapp123',
            port: process.env.PG_PORT || 5432,
            max: 20, // máximo de conexões no pool
            idleTimeoutMillis: 30000, // tempo limite para conexões inativas
            connectionTimeoutMillis: 2000, // tempo limite para conectar
        };
    }

    // Inicializar conexão com PostgreSQL
    async initialize() {
        try {
            this.pool = new Pool(this.config);
            
            // Testar conexão
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            
            this.isConnected = true;
            console.log('✅ PostgreSQL conectado com sucesso!');
            console.log(`📊 Banco: ${this.config.database} | Host: ${this.config.host}:${this.config.port}`);
            
            // Configurar listeners para eventos do pool
            this.setupPoolListeners();
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao conectar com PostgreSQL:', error.message);
            this.isConnected = false;
            return false;
        }
    }

    // Configurar listeners para monitoramento do pool
    setupPoolListeners() {
        this.pool.on('connect', (client) => {
            console.log('🔗 Nova conexão PostgreSQL estabelecida');
        });

        this.pool.on('error', (err, client) => {
            console.error('❌ Erro inesperado no pool PostgreSQL:', err.message);
        });

        this.pool.on('remove', (client) => {
            console.log('🔌 Conexão PostgreSQL removida do pool');
        });
    }

    // Executar query com tratamento de erro
    async query(text, params = []) {
        if (!this.isConnected) {
            throw new Error('PostgreSQL não está conectado');
        }

        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            // Log apenas para queries que demoram mais de 100ms
            if (duration > 100) {
                console.log(`⚠️ Query lenta executada em ${duration}ms`);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Erro na query PostgreSQL:', error.message);
            console.error('📝 Query:', text);
            console.error('📋 Params:', params);
            throw error;
        }
    }

    // Executar transação
    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Salvar mensagem no PostgreSQL
    async saveMessage(messageData) {
        const {
            chatId,
            messageId,
            content,
            messageType = 'text',
            fromUser,
            toUser,
            isFromMe = false,
            isForwarded = false,
            replyToMessageId = null,
            mediaUrl = null,
            mediaMimetype = null,
            aiResponse = null
        } = messageData;

        const query = `
            INSERT INTO messages (
                chat_id, message_id, content, message_type, from_user, to_user,
                is_from_me, is_forwarded, reply_to_message_id, media_url, 
                media_mimetype, ai_response, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            ON CONFLICT (message_id) DO UPDATE SET
                content = EXCLUDED.content,
                ai_response = EXCLUDED.ai_response,
                processed = EXCLUDED.processed
            RETURNING id;
        `;

        const params = [
            chatId, messageId, content, messageType, fromUser, toUser,
            isFromMe, isForwarded, replyToMessageId, mediaUrl,
            mediaMimetype, aiResponse
        ];

        try {
            const result = await this.query(query, params);
            
            // Atualizar estatísticas
            await this.updateStats(fromUser, isFromMe ? 'sent' : 'received');
            
            return result.rows[0];
        } catch (error) {
            console.error('❌ Erro ao salvar mensagem:', error.message);
            throw error;
        }
    }

    // Buscar mensagens de um chat
    async getMessages(chatId, limit = 50, offset = 0) {
        const query = `
            SELECT * FROM messages 
            WHERE chat_id = $1 
            ORDER BY timestamp DESC 
            LIMIT $2 OFFSET $3
        `;
        
        try {
            const result = await this.query(query, [chatId, limit, offset]);
            return result.rows;
        } catch (error) {
            console.error('❌ Erro ao buscar mensagens:', error.message);
            return [];
        }
    }

    // Salvar/atualizar sessão de usuário
    async saveUserSession(sessionData) {
        const {
            sessionId,
            userPhone,
            apiKey,
            agentEnabled = true,
            autoReply = true
        } = sessionData;

        const query = `
            INSERT INTO user_sessions (session_id, user_phone, api_key, agent_enabled, auto_reply, last_activity)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (session_id) DO UPDATE SET
                api_key = EXCLUDED.api_key,
                agent_enabled = EXCLUDED.agent_enabled,
                auto_reply = EXCLUDED.auto_reply,
                last_activity = NOW()
            RETURNING id;
        `;

        try {
            const result = await this.query(query, [sessionId, userPhone, apiKey, agentEnabled, autoReply]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Erro ao salvar sessão:', error.message);
            throw error;
        }
    }

    // Salvar/atualizar contato
    async saveContact(contactData) {
        const {
            chatId,
            number,
            name,
            pushname,
            profilePicUrl,
            isGroup = false
        } = contactData;

        const query = `
            INSERT INTO contacts (chat_id, phone_number, name, pushname, profile_pic_url, is_group, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (chat_id) DO UPDATE SET
                phone_number = EXCLUDED.phone_number,
                name = EXCLUDED.name,
                pushname = EXCLUDED.pushname,
                profile_pic_url = EXCLUDED.profile_pic_url,
                is_group = EXCLUDED.is_group,
                updated_at = NOW()
            RETURNING id;
        `;

        try {
            const result = await this.query(query, [chatId, number, name, pushname, profilePicUrl, isGroup]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Erro ao salvar contato:', error.message);
            throw error;
        }
    }

    // Buscar todos os contatos
    async getContacts() {
        const query = `
            SELECT chat_id as whatsapp_id, phone_number as number, name, pushname, 
                   profile_pic_url, is_group, updated_at
            FROM contacts 
            ORDER BY updated_at DESC
        `;
        
        try {
            const result = await this.query(query);
            return result.rows;
        } catch (error) {
            console.error('❌ Erro ao buscar contatos:', error.message);
            return [];
        }
    }

    // Buscar histórico de mensagens (compatível com Supabase)
    async getMessageHistory(chatId, limit = 50) {
        const query = `
            SELECT message_id as whatsapp_id, chat_id, from_user as contact_number,
                   from_user as contact_name, content as body, timestamp,
                   is_from_me as from_me, message_type, created_at
            FROM messages 
            WHERE chat_id = $1 
            ORDER BY timestamp ASC 
            LIMIT $2
        `;
        
        try {
            const result = await this.query(query, [chatId, limit]);
            return result.rows;
        } catch (error) {
            console.error('❌ Erro ao buscar histórico:', error.message);
            return [];
        }
    }

    // Buscar configuração do agente
    async getAgentConfig(userPhone, configKey) {
        const query = `
            SELECT config_value FROM agent_configs 
            WHERE user_phone = $1 AND config_key = $2
        `;
        
        try {
            const result = await this.query(query, [userPhone, configKey]);
            return result.rows[0]?.config_value || null;
        } catch (error) {
            console.error('❌ Erro ao buscar configuração:', error.message);
            return null;
        }
    }

    // Salvar configuração do agente
    async saveAgentConfig(userPhone, configKey, configValue) {
        const query = `
            INSERT INTO agent_configs (user_phone, config_key, config_value, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (user_phone, config_key) DO UPDATE SET
                config_value = EXCLUDED.config_value,
                updated_at = NOW()
        `;

        try {
            await this.query(query, [userPhone, configKey, configValue]);
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar configuração:', error.message);
            return false;
        }
    }

    // Atualizar estatísticas
    async updateStats(userPhone, type) {
        try {
            await this.query('SELECT update_daily_stats($1, $2)', [userPhone, type]);
        } catch (error) {
            console.error('❌ Erro ao atualizar estatísticas:', error.message);
        }
    }

    // Log do sistema
    async logSystem(level, message, userPhone = null, chatId = null, errorDetails = null) {
        const query = `
            INSERT INTO system_logs (log_level, message, user_phone, chat_id, error_details)
            VALUES ($1, $2, $3, $4, $5)
        `;

        try {
            await this.query(query, [level, message, userPhone, chatId, errorDetails]);
        } catch (error) {
            console.error('❌ Erro ao salvar log:', error.message);
        }
    }

    // Executar limpeza automática
    async runCleanup() {
        try {
            await this.query('SELECT cleanup_old_data()');
            console.log('🧹 Limpeza automática executada com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro na limpeza automática:', error.message);
            return false;
        }
    }

    // Obter estatísticas do banco
    async getStats() {
        try {
            const queries = {
                totalMessages: 'SELECT COUNT(*) as count FROM messages',
                todayMessages: 'SELECT COUNT(*) as count FROM messages WHERE timestamp >= CURRENT_DATE',
                activeChats: 'SELECT COUNT(DISTINCT chat_id) as count FROM messages WHERE timestamp >= CURRENT_DATE - INTERVAL \'7 days\'',
                dbSize: 'SELECT pg_size_pretty(pg_database_size(current_database())) as size'
            };

            const results = {};
            for (const [key, query] of Object.entries(queries)) {
                const result = await this.query(query);
                results[key] = result.rows[0];
            }

            return results;
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error.message);
            return null;
        }
    }

    // Fechar conexões
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            console.log('🔌 Conexões PostgreSQL fechadas');
        }
    }

    // Verificar saúde da conexão
    async healthCheck() {
        try {
            const result = await this.query('SELECT 1 as health');
            return {
                status: 'healthy',
                connected: this.isConnected,
                poolSize: this.pool?.totalCount || 0,
                idleConnections: this.pool?.idleCount || 0,
                waitingClients: this.pool?.waitingCount || 0
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                connected: false
            };
        }
    }
}

// Instância singleton
const postgresManager = new PostgreSQLManager();

module.exports = postgresManager;