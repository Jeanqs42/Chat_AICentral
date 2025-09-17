#!/bin/bash

# Script de Instalação e Configuração PostgreSQL
# Para Chat AI Central - Migração do Supabase

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
DB_NAME="whatsapp_central"
DB_USER="whatsapp_user"
DB_PASSWORD="whatsapp123"
PG_VERSION="15"

echo -e "${BLUE}🐘 Configuração PostgreSQL para Chat AI Central${NC}"
echo "=================================================="
echo -e "${YELLOW}⚠️  Este script irá:${NC}"
echo "   • Instalar PostgreSQL $PG_VERSION"
echo "   • Criar banco de dados: $DB_NAME"
echo "   • Criar usuário: $DB_USER"
echo "   • Configurar tabelas e índices"
echo "   • Configurar backup automático"
echo ""

# Verificar se é root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ Este script deve ser executado como root${NC}"
   echo "Use: sudo $0"
   exit 1
fi

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"
}

# Verificar sistema operacional
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    error "Não foi possível detectar o sistema operacional"
    exit 1
fi

log "Sistema detectado: $OS $VER"

# Instalar PostgreSQL baseado no OS
install_postgresql() {
    log "Instalando PostgreSQL $PG_VERSION..."
    
    if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
        # Ubuntu/Debian
        apt update
        apt install -y wget ca-certificates
        
        # Adicionar repositório oficial PostgreSQL
        wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
        echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
        
        apt update
        apt install -y postgresql-$PG_VERSION postgresql-client-$PG_VERSION postgresql-contrib-$PG_VERSION
        
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"Rocky"* ]]; then
        # CentOS/RHEL/Rocky
        yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm
        yum install -y postgresql$PG_VERSION-server postgresql$PG_VERSION postgresql$PG_VERSION-contrib
        
        # Inicializar banco
        /usr/pgsql-$PG_VERSION/bin/postgresql-$PG_VERSION-setup initdb
        
    else
        error "Sistema operacional não suportado: $OS"
        exit 1
    fi
    
    log "PostgreSQL instalado com sucesso"
}

# Configurar PostgreSQL
configure_postgresql() {
    log "Configurando PostgreSQL..."
    
    # Iniciar e habilitar serviço
    systemctl start postgresql
    systemctl enable postgresql
    
    # Encontrar diretório de configuração
    PG_CONFIG_DIR=$(sudo -u postgres psql -t -P format=unaligned -c 'show config_file;' | xargs dirname)
    PG_DATA_DIR=$(sudo -u postgres psql -t -P format=unaligned -c 'show data_directory;')
    
    log "Diretório de configuração: $PG_CONFIG_DIR"
    log "Diretório de dados: $PG_DATA_DIR"
    
    # Backup das configurações originais
    cp "$PG_CONFIG_DIR/postgresql.conf" "$PG_CONFIG_DIR/postgresql.conf.backup"
    cp "$PG_CONFIG_DIR/pg_hba.conf" "$PG_CONFIG_DIR/pg_hba.conf.backup"
    
    # Configurar postgresql.conf
    cat >> "$PG_CONFIG_DIR/postgresql.conf" << EOF

# Configurações Chat AI Central
listen_addresses = 'localhost'
port = 5432
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
wal_buffers = 16MB
checkpoint_completion_target = 0.9
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on

# Backup e arquivamento
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
max_wal_senders = 3
wal_level = replica
EOF
    
    # Configurar pg_hba.conf para permitir conexões locais
    sed -i "s/#local   all             all                                     peer/local   all             all                                     md5/g" "$PG_CONFIG_DIR/pg_hba.conf"
    echo "host    $DB_NAME    $DB_USER    127.0.0.1/32    md5" >> "$PG_CONFIG_DIR/pg_hba.conf"
    echo "host    $DB_NAME    $DB_USER    ::1/128         md5" >> "$PG_CONFIG_DIR/pg_hba.conf"
    
    # Criar diretório de archive
    mkdir -p /var/lib/postgresql/archive
    chown postgres:postgres /var/lib/postgresql/archive
    chmod 750 /var/lib/postgresql/archive
    
    # Reiniciar PostgreSQL
    systemctl restart postgresql
    
    log "PostgreSQL configurado com sucesso"
}

# Criar banco de dados e usuário
setup_database() {
    log "Criando banco de dados e usuário..."
    
    # Criar usuário
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    
    # Criar banco de dados
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    
    # Conceder privilégios
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"
    
    log "Banco de dados criado: $DB_NAME"
    log "Usuário criado: $DB_USER"
}

# Criar estrutura de tabelas
create_tables() {
    log "Criando estrutura de tabelas..."
    
    # Executar schema SQL
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    SCHEMA_FILE="$SCRIPT_DIR/../database/schema.sql"
    
    if [[ -f "$SCHEMA_FILE" ]]; then
        sudo -u postgres psql -d $DB_NAME -f "$SCHEMA_FILE"
        log "Tabelas criadas com sucesso"
    else
        warn "Arquivo schema.sql não encontrado em $SCHEMA_FILE"
        warn "Execute manualmente: psql -d $DB_NAME -f database/schema.sql"
    fi
}

# Configurar backup automático
setup_backup() {
    log "Configurando backup automático..."
    
    # Criar diretório de backup
    mkdir -p /var/backups/postgresql
    chown postgres:postgres /var/backups/postgresql
    chmod 750 /var/backups/postgresql
    
    # Criar script de backup
    cat > /usr/local/bin/backup-whatsapp-db.sh << 'EOF'
#!/bin/bash

# Script de Backup PostgreSQL - Chat AI Central

DB_NAME="whatsapp_central"
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/whatsapp_backup_$DATE.sql"
LOG_FILE="$BACKUP_DIR/backup.log"

# Função de log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "Iniciando backup do banco $DB_NAME"

# Criar backup
if sudo -u postgres pg_dump $DB_NAME > "$BACKUP_FILE"; then
    # Comprimir backup
    gzip "$BACKUP_FILE"
    log "Backup criado: ${BACKUP_FILE}.gz"
    
    # Remover backups antigos (manter últimos 7 dias)
    find "$BACKUP_DIR" -name "whatsapp_backup_*.sql.gz" -mtime +7 -delete
    log "Backups antigos removidos"
    
    # Estatísticas do backup
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    log "Tamanho do backup: $BACKUP_SIZE"
    
else
    log "ERRO: Falha ao criar backup"
    exit 1
fi

log "Backup concluído com sucesso"
EOF
    
    chmod +x /usr/local/bin/backup-whatsapp-db.sh
    
    # Configurar cron para backup diário às 2:00
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-whatsapp-db.sh") | crontab -
    
    log "Backup automático configurado (diário às 2:00)"
}

# Configurar monitoramento
setup_monitoring() {
    log "Configurando monitoramento..."
    
    # Instalar ferramentas de monitoramento
    if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
        apt install -y htop iotop nethogs
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"Rocky"* ]]; then
        yum install -y htop iotop nethogs
    fi
    
    # Criar script de monitoramento
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    MONITOR_SCRIPT="$SCRIPT_DIR/monitor-db.sh"
    
    if [[ -f "$MONITOR_SCRIPT" ]]; then
        chmod +x "$MONITOR_SCRIPT"
        log "Script de monitoramento disponível: $MONITOR_SCRIPT"
    fi
}

# Teste de conectividade
test_connection() {
    log "Testando conectividade..."
    
    if sudo -u postgres psql -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
        log "✅ Conexão com PostgreSQL funcionando"
        
        # Testar com usuário da aplicação
        if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
            log "✅ Conexão com usuário da aplicação funcionando"
        else
            error "❌ Falha na conexão com usuário da aplicação"
            return 1
        fi
    else
        error "❌ Falha na conexão com PostgreSQL"
        return 1
    fi
}

# Exibir informações finais
show_summary() {
    echo ""
    echo -e "${GREEN}🎉 Instalação PostgreSQL Concluída!${NC}"
    echo "=========================================="
    echo -e "${BLUE}📊 Informações da Instalação:${NC}"
    echo "   • Banco de dados: $DB_NAME"
    echo "   • Usuário: $DB_USER"
    echo "   • Senha: $DB_PASSWORD"
    echo "   • Host: localhost"
    echo "   • Porta: 5432"
    echo ""
    echo -e "${BLUE}🔧 Comandos Úteis:${NC}"
    echo "   • Conectar: psql -h localhost -U $DB_USER -d $DB_NAME"
    echo "   • Status: systemctl status postgresql"
    echo "   • Logs: tail -f /var/log/postgresql/postgresql-*.log"
    echo "   • Backup manual: /usr/local/bin/backup-whatsapp-db.sh"
    echo ""
    echo -e "${BLUE}📁 Arquivos Importantes:${NC}"
    echo "   • Configuração: $PG_CONFIG_DIR/postgresql.conf"
    echo "   • Autenticação: $PG_CONFIG_DIR/pg_hba.conf"
    echo "   • Backups: /var/backups/postgresql/"
    echo "   • Logs: /var/log/postgresql/"
    echo ""
    echo -e "${YELLOW}⚠️  Próximos Passos:${NC}"
    echo "   1. Verificar arquivo .env da aplicação"
    echo "   2. Executar migração: node scripts/migrate-supabase-to-postgres.js"
    echo "   3. Testar aplicação"
    echo "   4. Monitorar: node scripts/monitor-migration.js"
    echo ""
}

# Função principal
main() {
    log "Iniciando instalação PostgreSQL"
    
    # Verificar se PostgreSQL já está instalado
    if command -v psql &> /dev/null; then
        warn "PostgreSQL já está instalado"
        read -p "Deseja continuar com a configuração? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    else
        install_postgresql
    fi
    
    configure_postgresql
    setup_database
    create_tables
    setup_backup
    setup_monitoring
    
    if test_connection; then
        show_summary
        log "Instalação concluída com sucesso"
    else
        error "Instalação concluída com problemas de conectividade"
        exit 1
    fi
}

# Executar instalação
main "$@"