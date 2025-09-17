#!/usr/bin/env node

/**
 * Monitor de Migração e Performance PostgreSQL
 * 
 * Este script monitora o status da migração e performance do PostgreSQL,
 * fornecendo métricas em tempo real e alertas de problemas.
 */

require('dotenv').config();
const postgresManager = require('../database/postgresql');
const fs = require('fs');
const path = require('path');

// Configurações do monitor
const MONITOR_INTERVAL = 30000; // 30 segundos
const ALERT_THRESHOLDS = {
    connectionTime: 5000, // 5 segundos
    queryTime: 2000, // 2 segundos
    memoryUsage: 80, // 80%
    diskUsage: 90 // 90%
};

class MigrationMonitor {
    constructor() {
        this.isRunning = false;
        this.stats = {
            startTime: new Date(),
            checks: 0,
            alerts: [],
            performance: []
        };
    }

    /**
     * Iniciar monitoramento
     */
    async start() {
        console.log('🔍 Iniciando Monitor de Migração PostgreSQL');
        console.log('=' .repeat(50));
        
        this.isRunning = true;
        
        // Verificação inicial
        await this.performCheck();
        
        // Configurar intervalo de monitoramento
        this.interval = setInterval(async () => {
            if (this.isRunning) {
                await this.performCheck();
            }
        }, MONITOR_INTERVAL);
        
        // Configurar handlers de saída
        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());
        
        console.log(`⏱️  Monitor ativo - Verificações a cada ${MONITOR_INTERVAL/1000}s`);
        console.log('Pressione Ctrl+C para parar\n');
    }

    /**
     * Parar monitoramento
     */
    async stop() {
        console.log('\n🛑 Parando monitor...');
        this.isRunning = false;
        
        if (this.interval) {
            clearInterval(this.interval);
        }
        
        await this.generateFinalReport();
        process.exit(0);
    }

    /**
     * Realizar verificação completa
     */
    async performCheck() {
        const checkTime = new Date();
        this.stats.checks++;
        
        try {
            const metrics = await this.collectMetrics();
            this.stats.performance.push({
                timestamp: checkTime,
                ...metrics
            });
            
            // Verificar alertas
            await this.checkAlerts(metrics);
            
            // Exibir status
            this.displayStatus(metrics);
            
            // Manter apenas os últimos 100 registros
            if (this.stats.performance.length > 100) {
                this.stats.performance = this.stats.performance.slice(-100);
            }
            
        } catch (error) {
            console.error(`❌ Erro na verificação: ${error.message}`);
            this.addAlert('error', `Falha na verificação: ${error.message}`);
        }
    }

    /**
     * Coletar métricas do PostgreSQL
     */
    async collectMetrics() {
        const startTime = Date.now();
        
        // Teste de conectividade
        const healthCheck = await postgresManager.healthCheck();
        const connectionTime = Date.now() - startTime;
        
        // Estatísticas do banco
        const queryStart = Date.now();
        const stats = await postgresManager.getStats();
        const queryTime = Date.now() - queryStart;
        
        // Contagem de registros
        const [contacts, messages] = await Promise.all([
            this.getTableCount('contacts'),
            this.getTableCount('messages')
        ]);
        
        // Métricas do sistema
        const systemMetrics = this.getSystemMetrics();
        
        return {
            isHealthy: healthCheck.status === 'healthy',
            connectionTime,
            queryTime,
            contacts,
            messages,
            ...systemMetrics,
            stats
        };
    }

    /**
     * Obter contagem de registros de uma tabela
     */
    async getTableCount(tableName) {
        try {
            const result = await postgresManager.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error(`Erro ao contar ${tableName}:`, error.message);
            return 0;
        }
    }

    /**
     * Obter métricas do sistema
     */
    getSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
            memoryUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            memoryTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            cpuUser: cpuUsage.user,
            cpuSystem: cpuUsage.system,
            uptime: Math.round(process.uptime())
        };
    }

    /**
     * Verificar condições de alerta
     */
    async checkAlerts(metrics) {
        // Alerta de conectividade
        if (!metrics.isHealthy) {
            this.addAlert('critical', 'PostgreSQL não está saudável');
        }
        
        // Alerta de tempo de conexão
        if (metrics.connectionTime > ALERT_THRESHOLDS.connectionTime) {
            this.addAlert('warning', `Tempo de conexão alto: ${metrics.connectionTime}ms`);
        }
        
        // Alerta de tempo de query
        if (metrics.queryTime > ALERT_THRESHOLDS.queryTime) {
            this.addAlert('warning', `Tempo de query alto: ${metrics.queryTime}ms`);
        }
        
        // Alerta de memória
        const memoryPercent = (metrics.memoryUsed / metrics.memoryTotal) * 100;
        if (memoryPercent > ALERT_THRESHOLDS.memoryUsage) {
            this.addAlert('warning', `Uso de memória alto: ${memoryPercent.toFixed(1)}%`);
        }
    }

    /**
     * Adicionar alerta
     */
    addAlert(level, message) {
        const alert = {
            timestamp: new Date(),
            level,
            message
        };
        
        this.stats.alerts.push(alert);
        
        // Exibir alerta
        const icon = level === 'critical' ? '🚨' : '⚠️';
        console.log(`${icon} [${level.toUpperCase()}] ${message}`);
        
        // Manter apenas os últimos 50 alertas
        if (this.stats.alerts.length > 50) {
            this.stats.alerts = this.stats.alerts.slice(-50);
        }
    }

    /**
     * Exibir status atual
     */
    displayStatus(metrics) {
        const timestamp = new Date().toLocaleTimeString();
        const status = metrics.isHealthy ? '✅ SAUDÁVEL' : '❌ PROBLEMA';
        
        console.log(`[${timestamp}] ${status} | ` +
                   `Conexão: ${metrics.connectionTime}ms | ` +
                   `Query: ${metrics.queryTime}ms | ` +
                   `Contatos: ${metrics.contacts} | ` +
                   `Mensagens: ${metrics.messages} | ` +
                   `Mem: ${metrics.memoryUsed}MB`);
    }

    /**
     * Gerar relatório final
     */
    async generateFinalReport() {
        const duration = Math.round((new Date() - this.stats.startTime) / 1000);
        
        console.log('\n📊 RELATÓRIO FINAL DO MONITOR');
        console.log('=' .repeat(50));
        console.log(`⏱️  Duração: ${duration} segundos`);
        console.log(`🔍 Verificações: ${this.stats.checks}`);
        console.log(`🚨 Alertas: ${this.stats.alerts.length}`);
        
        if (this.stats.performance.length > 0) {
            const avgConnectionTime = this.stats.performance.reduce((sum, p) => sum + p.connectionTime, 0) / this.stats.performance.length;
            const avgQueryTime = this.stats.performance.reduce((sum, p) => sum + p.queryTime, 0) / this.stats.performance.length;
            
            console.log(`📈 Tempo médio de conexão: ${avgConnectionTime.toFixed(2)}ms`);
            console.log(`📈 Tempo médio de query: ${avgQueryTime.toFixed(2)}ms`);
        }
        
        // Salvar relatório
        const reportDir = path.join(__dirname, '../reports');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        const reportFile = path.join(reportDir, `monitor-report-${new Date().toISOString().split('T')[0]}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(this.stats, null, 2));
        
        console.log(`📄 Relatório salvo: ${reportFile}`);
    }

    /**
     * Executar verificação única (modo não-interativo)
     */
    async runOnce() {
        console.log('🔍 Verificação única do PostgreSQL');
        console.log('=' .repeat(40));
        
        try {
            const metrics = await this.collectMetrics();
            
            console.log(`Status: ${metrics.isHealthy ? '✅ Saudável' : '❌ Problema'}`);
            console.log(`Tempo de conexão: ${metrics.connectionTime}ms`);
            console.log(`Tempo de query: ${metrics.queryTime}ms`);
            console.log(`Contatos: ${metrics.contacts}`);
            console.log(`Mensagens: ${metrics.messages}`);
            console.log(`Memória: ${metrics.memoryUsed}MB / ${metrics.memoryTotal}MB`);
            console.log(`Uptime: ${metrics.uptime}s`);
            
            if (metrics.stats) {
                console.log('\n📊 Estatísticas do banco:');
                console.log(JSON.stringify(metrics.stats, null, 2));
            }
            
        } catch (error) {
            console.error('❌ Erro na verificação:', error);
            process.exit(1);
        }
    }
}

// Executar monitor se chamado diretamente
if (require.main === module) {
    const monitor = new MigrationMonitor();
    
    // Verificar argumentos da linha de comando
    const args = process.argv.slice(2);
    
    if (args.includes('--once') || args.includes('-o')) {
        // Modo verificação única
        monitor.runOnce().catch(error => {
            console.error('💥 Falha na verificação:', error);
            process.exit(1);
        });
    } else {
        // Modo monitoramento contínuo
        monitor.start().catch(error => {
            console.error('💥 Falha no monitor:', error);
            process.exit(1);
        });
    }
}

module.exports = MigrationMonitor;