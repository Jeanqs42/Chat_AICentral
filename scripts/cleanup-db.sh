#!/bin/bash
# Script de limpeza automática do banco de dados PostgreSQL
# Executa limpeza de dados antigos para otimizar performance e espaço

# Configurações do banco
DB_NAME="whatsapp_db"
DB_USER="whatsapp_user"
DB_HOST="localhost"
DB_PASSWORD="whatsapp123"

# Configurações de log
LOG_DIR="/home/whatsapp/whatsapp-app/logs"
LOG_FILE="$LOG_DIR/cleanup-$(date +%Y%m%d).log"

# Criar diretório de logs se não existir
mkdir -p $LOG_DIR

# Função de log
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log_message "=== Iniciando limpeza automática do banco de dados ==="

# Verificar se o PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
    log_message "ERRO: PostgreSQL não está rodando!"
    exit 1
fi

# Executar função de limpeza
log_message "Executando limpeza de dados antigos..."

PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "SELECT cleanup_old_data();" >> $LOG_FILE 2>&1

if [ $? -eq 0 ]; then
    log_message "Limpeza executada com sucesso!"
else
    log_message "ERRO: Falha na execução da limpeza!"
    exit 1
fi

# Verificar tamanho do banco após limpeza
log_message "Verificando tamanho do banco após limpeza..."
DB_SIZE=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
log_message "Tamanho atual do banco: $DB_SIZE"

# Estatísticas de limpeza
log_message "Obtendo estatísticas de tabelas..."
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_stat_get_tuples_returned(c.oid) as rows_read,
    pg_stat_get_tuples_inserted(c.oid) as rows_inserted
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
" >> $LOG_FILE 2>&1

# Limpar logs antigos (manter apenas últimos 30 dias)
find $LOG_DIR -name "cleanup-*.log" -mtime +30 -delete

log_message "=== Limpeza automática concluída ==="

# Enviar notificação se houver erros (opcional)
# Pode ser integrado com sistemas de monitoramento
if grep -q "ERRO" $LOG_FILE; then
    log_message "ATENÇÃO: Foram encontrados erros durante a limpeza!"
    # Aqui você pode adicionar notificações por email, Slack, etc.
fi

exit 0