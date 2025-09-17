#!/usr/bin/env node

/**
 * Script de Verificação de Pré-requisitos
 * Chat AI Central - Migração Supabase para PostgreSQL
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

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

class PrerequisiteChecker {
    constructor() {
        this.checks = [];
        this.warnings = [];
        this.errors = [];
        this.info = [];
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    success(message) {
        this.log(`✅ ${message}`, 'green');
        this.checks.push({ type: 'success', message });
    }

    warning(message) {
        this.log(`⚠️  ${message}`, 'yellow');
        this.warnings.push(message);
    }

    error(message) {
        this.log(`❌ ${message}`, 'red');
        this.errors.push(message);
    }

    info(message) {
        this.log(`ℹ️  ${message}`, 'blue');
        this.info.push(message);
    }

    async checkNodeVersion() {
        try {
            const { stdout } = await execAsync('node --version');
            const version = stdout.trim();
            const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
            
            if (majorVersion >= 16) {
                this.success(`Node.js ${version} (compatível)`);
            } else {
                this.error(`Node.js ${version} (requer versão 16+)`);
            }
        } catch (error) {
            this.error('Node.js não encontrado');
        }
    }

    async checkNpmVersion() {
        try {
            const { stdout } = await execAsync('npm --version');
            const version = stdout.trim();
            this.success(`npm ${version}`);
        } catch (error) {
            this.error('npm não encontrado');
        }
    }

    async checkPostgreSQL() {
        try {
            const { stdout } = await execAsync('psql --version');
            const version = stdout.trim();
            this.success(`PostgreSQL cliente: ${version}`);
            
            // Verificar se o servidor está rodando
            try {
                await execAsync('systemctl is-active postgresql');
                this.success('Serviço PostgreSQL ativo');
            } catch {
                this.warning('Serviço PostgreSQL não está ativo');
            }
        } catch (error) {
            this.error('PostgreSQL não encontrado - execute setup-postgresql.sh');
        }
    }

    checkProjectStructure() {
        const requiredFiles = [
            'package.json',
            'server.js',
            '.env',
            'database/postgresql.js',
            'database/supabase.js'
        ];

        const requiredDirs = [
            'client',
            'database',
            'scripts'
        ];

        requiredFiles.forEach(file => {
            if (fs.existsSync(file)) {
                this.success(`Arquivo encontrado: ${file}`);
            } else {
                this.error(`Arquivo não encontrado: ${file}`);
            }
        });

        requiredDirs.forEach(dir => {
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                this.success(`Diretório encontrado: ${dir}`);
            } else {
                this.error(`Diretório não encontrado: ${dir}`);
            }
        });
    }

    checkEnvironmentVariables() {
        if (!fs.existsSync('.env')) {
            this.error('Arquivo .env não encontrado');
            return;
        }

        const envContent = fs.readFileSync('.env', 'utf8');
        const envVars = {};
        
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                envVars[key.trim()] = value.trim();
            }
        });

        // Variáveis do Supabase
        const supabaseVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
        supabaseVars.forEach(varName => {
            if (envVars[varName]) {
                this.success(`Variável Supabase: ${varName}`);
            } else {
                this.warning(`Variável Supabase não encontrada: ${varName}`);
            }
        });

        // Variáveis do PostgreSQL
        const pgVars = ['PG_HOST', 'PG_PORT', 'PG_DATABASE', 'PG_USER', 'PG_PASSWORD'];
        let pgConfigured = 0;
        
        pgVars.forEach(varName => {
            if (envVars[varName]) {
                this.success(`Variável PostgreSQL: ${varName}`);
                pgConfigured++;
            } else {
                this.warning(`Variável PostgreSQL não encontrada: ${varName}`);
            }
        });

        if (pgConfigured === 0) {
            this.error('Nenhuma configuração PostgreSQL encontrada no .env');
        } else if (pgConfigured < pgVars.length) {
            this.warning('Configuração PostgreSQL incompleta no .env');
        }
    }

    async checkDiskSpace() {
        try {
            const { stdout } = await execAsync('df -h .');
            const lines = stdout.trim().split('\n');
            const diskInfo = lines[1].split(/\s+/);
            const available = diskInfo[3];
            const usage = diskInfo[4];
            
            this.info(`Espaço disponível: ${available} (uso: ${usage})`);
            
            // Verificar se há pelo menos 1GB disponível
            const availableGB = parseFloat(available.replace('G', ''));
            if (availableGB < 1) {
                this.warning('Pouco espaço em disco disponível (< 1GB)');
            }
        } catch (error) {
            this.warning('Não foi possível verificar espaço em disco');
        }
    }

    async checkMemory() {
        try {
            const { stdout } = await execAsync('free -h');
            const lines = stdout.trim().split('\n');
            const memInfo = lines[1].split(/\s+/);
            const total = memInfo[1];
            const available = memInfo[6] || memInfo[3];
            
            this.info(`Memória total: ${total}, disponível: ${available}`);
            
            // Verificar se há pelo menos 512MB disponível
            const availableMB = parseFloat(available.replace('G', '')) * 1024 || parseFloat(available.replace('M', ''));
            if (availableMB < 512) {
                this.warning('Pouca memória disponível (< 512MB)');
            }
        } catch (error) {
            this.warning('Não foi possível verificar memória');
        }
    }

    checkPackageJson() {
        if (!fs.existsSync('package.json')) {
            this.error('package.json não encontrado');
            return;
        }

        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            
            // Verificar dependências importantes
            const requiredDeps = {
                'express': 'Servidor web',
                'socket.io': 'WebSocket',
                'whatsapp-web.js': 'WhatsApp API',
                'pg': 'PostgreSQL driver'
            };

            Object.entries(requiredDeps).forEach(([dep, description]) => {
                if (packageJson.dependencies && packageJson.dependencies[dep]) {
                    this.success(`Dependência: ${dep} (${description})`);
                } else {
                    this.warning(`Dependência não encontrada: ${dep} (${description})`);
                }
            });

        } catch (error) {
            this.error('Erro ao ler package.json');
        }
    }

    async checkDatabaseConnection() {
        // Verificar conexão com Supabase
        try {
            const supabaseModule = require('../database/supabase.js');
            this.success('Módulo Supabase carregado');
        } catch (error) {
            this.error('Erro ao carregar módulo Supabase');
        }

        // Verificar conexão com PostgreSQL
        try {
            const postgresModule = require('../database/postgresql.js');
            this.success('Módulo PostgreSQL carregado');
        } catch (error) {
            this.error('Erro ao carregar módulo PostgreSQL');
        }
    }

    async checkPorts() {
        const ports = [3000, 5432]; // Express e PostgreSQL
        
        for (const port of ports) {
            try {
                const { stdout } = await execAsync(`netstat -tlnp | grep :${port}`);
                if (stdout.trim()) {
                    this.info(`Porta ${port} em uso`);
                } else {
                    this.success(`Porta ${port} disponível`);
                }
            } catch (error) {
                this.success(`Porta ${port} disponível`);
            }
        }
    }

    generateReport() {
        this.log('\n' + '='.repeat(60), 'cyan');
        this.log('📋 RELATÓRIO DE PRÉ-REQUISITOS', 'cyan');
        this.log('='.repeat(60), 'cyan');

        this.log(`\n✅ Verificações bem-sucedidas: ${this.checks.length}`, 'green');
        this.log(`⚠️  Avisos: ${this.warnings.length}`, 'yellow');
        this.log(`❌ Erros: ${this.errors.length}`, 'red');

        if (this.warnings.length > 0) {
            this.log('\n⚠️  AVISOS:', 'yellow');
            this.warnings.forEach(warning => {
                this.log(`   • ${warning}`, 'yellow');
            });
        }

        if (this.errors.length > 0) {
            this.log('\n❌ ERROS:', 'red');
            this.errors.forEach(error => {
                this.log(`   • ${error}`, 'red');
            });
        }

        this.log('\n📊 RECOMENDAÇÕES:', 'blue');
        
        if (this.errors.length === 0) {
            this.log('   ✅ Sistema pronto para migração!', 'green');
            this.log('   📝 Próximos passos:', 'blue');
            this.log('      1. Execute: sudo ./scripts/setup-postgresql.sh', 'blue');
            this.log('      2. Configure variáveis PostgreSQL no .env', 'blue');
            this.log('      3. Execute: node scripts/migrate-supabase-to-postgres.js', 'blue');
        } else {
            this.log('   ❌ Corrija os erros antes de prosseguir', 'red');
            this.log('   📖 Consulte a documentação para mais detalhes', 'blue');
        }

        this.log('\n' + '='.repeat(60), 'cyan');
        
        return this.errors.length === 0;
    }

    async runAllChecks() {
        this.log('🔍 Verificando pré-requisitos para migração...\n', 'cyan');

        this.log('📦 Verificando ambiente Node.js...', 'blue');
        await this.checkNodeVersion();
        await this.checkNpmVersion();

        this.log('\n🐘 Verificando PostgreSQL...', 'blue');
        await this.checkPostgreSQL();

        this.log('\n📁 Verificando estrutura do projeto...', 'blue');
        this.checkProjectStructure();

        this.log('\n🔧 Verificando configurações...', 'blue');
        this.checkEnvironmentVariables();
        this.checkPackageJson();

        this.log('\n💾 Verificando recursos do sistema...', 'blue');
        await this.checkDiskSpace();
        await this.checkMemory();

        this.log('\n🌐 Verificando conectividade...', 'blue');
        await this.checkDatabaseConnection();
        await this.checkPorts();

        return this.generateReport();
    }
}

// Executar verificações
async function main() {
    const checker = new PrerequisiteChecker();
    
    try {
        const success = await checker.runAllChecks();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('❌ Erro durante verificação:', error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = PrerequisiteChecker;