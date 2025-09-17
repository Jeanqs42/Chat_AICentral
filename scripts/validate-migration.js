#!/usr/bin/env node

/**
 * Script de Validação da Migração
 * Chat AI Central - Verificação pós-migração
 */

const postgresManager = require('../database/postgresql.js');
const { supabase, isSupabaseAvailable } = require('../database/supabase.js');

// Cores para output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class MigrationValidator {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    success(message) {
        this.log(`✅ ${message}`, 'green');
        this.passed++;
    }

    error(message) {
        this.log(`❌ ${message}`, 'red');
        this.failed++;
    }

    info(message) {
        this.log(`ℹ️  ${message}`, 'blue');
    }

    warning(message) {
        this.log(`⚠️  ${message}`, 'yellow');
    }

    async testPostgreSQLConnection() {
        try {
            const connected = await postgresManager.initialize();
            if (connected) {
                this.success('Conexão PostgreSQL estabelecida');
                return true;
            } else {
                this.error('Falha na conexão PostgreSQL');
                return false;
            }
        } catch (error) {
            this.error(`Erro na conexão PostgreSQL: ${error.message}`);
            return false;
        }
    }

    async testPostgreSQLTables() {
        try {
            const result = await postgresManager.query(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
            );
            
            const tables = result.rows.map(row => row.table_name);
            const requiredTables = ['messages', 'chats', 'users', 'user_sessions', 'agent_configs'];
            
            let allTablesExist = true;
            requiredTables.forEach(table => {
                if (tables.includes(table)) {
                    this.success(`Tabela encontrada: ${table}`);
                } else {
                    this.error(`Tabela não encontrada: ${table}`);
                    allTablesExist = false;
                }
            });
            
            return allTablesExist;
        } catch (error) {
            this.error(`Erro ao verificar tabelas: ${error.message}`);
            return false;
        }
    }

    async testPostgreSQLOperations() {
        try {
            // Teste de inserção
            const testMessage = {
                chatId: 'validation-test',
                messageId: `test-${Date.now()}`,
                content: 'Teste de validação da migração',
                messageType: 'text',
                fromUser: 'system',
                toUser: 'validator'
            };

            // Primeiro, criar o chat se não existir
            await postgresManager.query(
                'INSERT INTO chats (chat_id, chat_name, chat_type) VALUES ($1, $2, $3) ON CONFLICT (chat_id) DO NOTHING',
                [testMessage.chatId, 'Chat de Validação', 'individual']
            );

            // Salvar mensagem
            const savedMessage = await postgresManager.saveMessage(testMessage);
            if (savedMessage && savedMessage.id) {
                this.success('Operação de inserção PostgreSQL funcionando');
            } else {
                this.error('Falha na operação de inserção PostgreSQL');
                return false;
            }

            // Teste de consulta
            const messages = await postgresManager.getMessages(testMessage.chatId, 1);
            if (messages && messages.length > 0) {
                this.success('Operação de consulta PostgreSQL funcionando');
            } else {
                this.error('Falha na operação de consulta PostgreSQL');
                return false;
            }

            // Limpeza
            await postgresManager.query('DELETE FROM messages WHERE chat_id = $1', [testMessage.chatId]);
            await postgresManager.query('DELETE FROM chats WHERE chat_id = $1', [testMessage.chatId]);
            
            return true;
        } catch (error) {
            this.error(`Erro nas operações PostgreSQL: ${error.message}`);
            return false;
        }
    }

    async testSupabaseCompatibility() {
        try {
            if (isSupabaseAvailable()) {
                this.warning('Supabase ainda disponível (modo compatibilidade)');
            } else {
                this.info('Supabase não configurado (esperado após migração)');
            }
            return true;
        } catch (error) {
            this.error(`Erro ao verificar Supabase: ${error.message}`);
            return false;
        }
    }

    async testDataIntegrity() {
        try {
            // Verificar se há dados nas tabelas principais
            const messageCount = await postgresManager.query('SELECT COUNT(*) as count FROM messages');
            const chatCount = await postgresManager.query('SELECT COUNT(*) as count FROM chats');
            const userCount = await postgresManager.query('SELECT COUNT(*) as count FROM users');

            this.info(`Mensagens no PostgreSQL: ${messageCount.rows[0].count}`);
            this.info(`Chats no PostgreSQL: ${chatCount.rows[0].count}`);
            this.info(`Usuários no PostgreSQL: ${userCount.rows[0].count}`);

            // Verificar integridade referencial
            const orphanMessages = await postgresManager.query(
                'SELECT COUNT(*) as count FROM messages m LEFT JOIN chats c ON m.chat_id = c.chat_id WHERE c.chat_id IS NULL'
            );

            if (orphanMessages.rows[0].count === '0') {
                this.success('Integridade referencial mantida');
            } else {
                this.warning(`${orphanMessages.rows[0].count} mensagens órfãs encontradas`);
            }

            return true;
        } catch (error) {
            this.error(`Erro ao verificar integridade: ${error.message}`);
            return false;
        }
    }

    async testPerformance() {
        try {
            const startTime = Date.now();
            
            // Teste de consulta com índices
            await postgresManager.query(
                'SELECT * FROM messages ORDER BY timestamp DESC LIMIT 10'
            );
            
            const endTime = Date.now();
            const queryTime = endTime - startTime;
            
            if (queryTime < 100) {
                this.success(`Performance de consulta boa: ${queryTime}ms`);
            } else if (queryTime < 500) {
                this.warning(`Performance de consulta aceitável: ${queryTime}ms`);
            } else {
                this.error(`Performance de consulta lenta: ${queryTime}ms`);
            }
            
            return queryTime < 1000;
        } catch (error) {
            this.error(`Erro no teste de performance: ${error.message}`);
            return false;
        }
    }

    async generateReport() {
        this.log('\n' + '='.repeat(60), 'cyan');
        this.log('📋 RELATÓRIO DE VALIDAÇÃO DA MIGRAÇÃO', 'cyan');
        this.log('='.repeat(60), 'cyan');

        this.log(`\n✅ Testes aprovados: ${this.passed}`, 'green');
        this.log(`❌ Testes falharam: ${this.failed}`, 'red');
        this.log(`📊 Taxa de sucesso: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`, 'blue');

        if (this.failed === 0) {
            this.log('\n🎉 MIGRAÇÃO VALIDADA COM SUCESSO!', 'green');
            this.log('✅ Sistema pronto para produção', 'green');
            this.log('\n📝 Próximos passos:', 'blue');
            this.log('   • Monitorar performance em produção', 'blue');
            this.log('   • Configurar backups automáticos', 'blue');
            this.log('   • Remover dependências do Supabase (opcional)', 'blue');
        } else {
            this.log('\n⚠️  MIGRAÇÃO COM PROBLEMAS', 'yellow');
            this.log('❌ Corrija os erros antes de usar em produção', 'red');
        }

        this.log('\n' + '='.repeat(60), 'cyan');
        
        return this.failed === 0;
    }

    async runAllTests() {
        this.log('🔍 Iniciando validação da migração...\n', 'cyan');

        this.log('🐘 Testando PostgreSQL...', 'blue');
        const pgConnected = await this.testPostgreSQLConnection();
        
        if (pgConnected) {
            await this.testPostgreSQLTables();
            await this.testPostgreSQLOperations();
        }

        this.log('\n🔄 Testando compatibilidade...', 'blue');
        await this.testSupabaseCompatibility();

        this.log('\n🔍 Verificando integridade dos dados...', 'blue');
        await this.testDataIntegrity();

        this.log('\n⚡ Testando performance...', 'blue');
        await this.testPerformance();

        const success = await this.generateReport();
        
        // Fechar conexões
        if (postgresManager.isConnected) {
            await postgresManager.close();
        }
        
        return success;
    }
}

// Executar validação
async function main() {
    const validator = new MigrationValidator();
    
    try {
        const success = await validator.runAllTests();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('❌ Erro durante validação:', error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = MigrationValidator;