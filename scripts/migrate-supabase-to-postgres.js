#!/usr/bin/env node

/**
 * Script de Migração: Supabase → PostgreSQL
 * 
 * Este script migra dados existentes do Supabase para o PostgreSQL local,
 * mantendo a integridade dos dados e criando backups de segurança.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const postgresManager = require('../database/postgresql');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Estatísticas da migração
const stats = {
    messages: { total: 0, migrated: 0, errors: 0 },
    contacts: { total: 0, migrated: 0, errors: 0 },
    startTime: new Date(),
    endTime: null
};

/**
 * Função principal de migração
 */
async function migrate() {
    console.log('🚀 Iniciando migração Supabase → PostgreSQL');
    console.log('=' .repeat(50));
    
    try {
        // Verificar conexões
        await checkConnections();
        
        // Criar backup antes da migração
        await createBackup();
        
        // Migrar dados
        await migrateContacts();
        await migrateMessages();
        
        // Relatório final
        await generateReport();
        
    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
        process.exit(1);
    }
}

/**
 * Verificar conexões com ambos os bancos
 */
async function checkConnections() {
    console.log('🔍 Verificando conexões...');
    
    // Testar Supabase
    try {
        const { data, error } = await supabase.from('contacts').select('count').limit(1);
        if (error) throw error;
        console.log('✅ Supabase: Conectado');
    } catch (error) {
        console.error('❌ Supabase: Falha na conexão:', error.message);
        throw error;
    }
    
    // Testar PostgreSQL
    try {
        const success = await postgresManager.initialize();
        if (!success) throw new Error('Falha na inicialização');
        await postgresManager.healthCheck();
        console.log('✅ PostgreSQL: Conectado');
    } catch (error) {
        console.error('❌ PostgreSQL: Falha na conexão:', error.message);
        throw error;
    }
    
    console.log('');
}

/**
 * Criar backup dos dados atuais
 */
async function createBackup() {
    console.log('💾 Criando backup dos dados...');
    
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `supabase-backup-${timestamp}.json`);
    
    try {
        // Buscar todos os dados do Supabase
        const [contactsResult, messagesResult] = await Promise.all([
            supabase.from('contacts').select('*'),
            supabase.from('messages').select('*')
        ]);
        
        const backup = {
            timestamp: new Date().toISOString(),
            contacts: contactsResult.data || [],
            messages: messagesResult.data || []
        };
        
        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
        console.log(`✅ Backup criado: ${backupFile}`);
        console.log(`📊 Contatos: ${backup.contacts.length}, Mensagens: ${backup.messages.length}`);
        console.log('');
        
    } catch (error) {
        console.error('❌ Erro ao criar backup:', error);
        throw error;
    }
}

/**
 * Migrar contatos do Supabase para PostgreSQL
 */
async function migrateContacts() {
    console.log('👥 Migrando contatos...');
    
    try {
        // Buscar todos os contatos do Supabase
        const { data: contacts, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        stats.contacts.total = contacts.length;
        console.log(`📋 Total de contatos encontrados: ${contacts.length}`);
        
        // Migrar cada contato
        for (const contact of contacts) {
            try {
                await postgresManager.saveContact({
                    chatId: contact.whatsapp_id,
                    number: contact.number,
                    name: contact.name,
                    pushname: contact.pushname,
                    profilePicUrl: contact.profile_pic_url,
                    isGroup: contact.is_group || false
                });
                
                stats.contacts.migrated++;
                process.stdout.write(`\r✅ Contatos migrados: ${stats.contacts.migrated}/${stats.contacts.total}`);
                
            } catch (error) {
                stats.contacts.errors++;
                console.error(`\n❌ Erro ao migrar contato ${contact.whatsapp_id}:`, error.message);
            }
        }
        
        console.log(`\n✅ Migração de contatos concluída: ${stats.contacts.migrated}/${stats.contacts.total}`);
        console.log('');
        
    } catch (error) {
        console.error('❌ Erro na migração de contatos:', error);
        throw error;
    }
}

/**
 * Migrar mensagens do Supabase para PostgreSQL
 */
async function migrateMessages() {
    console.log('💬 Migrando mensagens...');
    
    try {
        // Buscar todas as mensagens do Supabase em lotes
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
            const { data: messages, error } = await supabase
                .from('messages')
                .select('*')
                .order('timestamp', { ascending: true })
                .range(offset, offset + batchSize - 1);
                
            if (error) throw error;
            
            if (messages.length === 0) {
                hasMore = false;
                break;
            }
            
            stats.messages.total += messages.length;
            
            // Migrar cada mensagem do lote
            for (const message of messages) {
                try {
                    await postgresManager.saveMessage({
                        chatId: message.chat_id,
                        messageId: message.whatsapp_id,
                        content: message.body,
                        messageType: message.message_type || 'text',
                        fromUser: message.contact_number,
                        toUser: message.chat_id,
                        isFromMe: message.from_me || false
                    });
                    
                    stats.messages.migrated++;
                    
                } catch (error) {
                    stats.messages.errors++;
                    console.error(`\n❌ Erro ao migrar mensagem ${message.whatsapp_id}:`, error.message);
                }
            }
            
            process.stdout.write(`\r✅ Mensagens migradas: ${stats.messages.migrated}/${stats.messages.total}`);
            offset += batchSize;
            
            // Pequena pausa para não sobrecarregar o banco
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`\n✅ Migração de mensagens concluída: ${stats.messages.migrated}/${stats.messages.total}`);
        console.log('');
        
    } catch (error) {
        console.error('❌ Erro na migração de mensagens:', error);
        throw error;
    }
}

/**
 * Gerar relatório final da migração
 */
async function generateReport() {
    stats.endTime = new Date();
    const duration = Math.round((stats.endTime - stats.startTime) / 1000);
    
    console.log('📊 RELATÓRIO FINAL DA MIGRAÇÃO');
    console.log('=' .repeat(50));
    console.log(`⏱️  Duração: ${duration} segundos`);
    console.log(`👥 Contatos: ${stats.contacts.migrated}/${stats.contacts.total} (${stats.contacts.errors} erros)`);
    console.log(`💬 Mensagens: ${stats.messages.migrated}/${stats.messages.total} (${stats.messages.errors} erros)`);
    
    const totalMigrated = stats.contacts.migrated + stats.messages.migrated;
    const totalRecords = stats.contacts.total + stats.messages.total;
    const successRate = totalRecords > 0 ? ((totalMigrated / totalRecords) * 100).toFixed(2) : 0;
    
    console.log(`✅ Taxa de sucesso: ${successRate}%`);
    
    // Salvar relatório em arquivo
    const reportDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportFile = path.join(reportDir, `migration-report-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(stats, null, 2));
    
    console.log(`📄 Relatório salvo: ${reportFile}`);
    console.log('');
    console.log('🎉 Migração concluída com sucesso!');
    
    // Verificar integridade dos dados
    await verifyDataIntegrity();
}

/**
 * Verificar integridade dos dados migrados
 */
async function verifyDataIntegrity() {
    console.log('🔍 Verificando integridade dos dados...');
    
    try {
        const pgContacts = await postgresManager.getContacts();
        const pgStats = await postgresManager.getStats();
        
        console.log(`✅ PostgreSQL - Contatos: ${pgContacts.length}`);
        console.log(`✅ PostgreSQL - Estatísticas disponíveis`);
        
        if (pgContacts.length !== stats.contacts.migrated) {
            console.warn(`⚠️  Divergência nos contatos: esperado ${stats.contacts.migrated}, encontrado ${pgContacts.length}`);
        }
        
    } catch (error) {
        console.error('❌ Erro na verificação de integridade:', error);
    }
}

// Executar migração se chamado diretamente
if (require.main === module) {
    migrate().catch(error => {
        console.error('💥 Falha crítica na migração:', error);
        process.exit(1);
    });
}

module.exports = { migrate, stats };