#!/bin/bash
# Script de backup inteligente do PostgreSQL
# Realiza backup completo com compressão e rotação automática

# Configurações do banco
DB_NAME="whatsapp_db"
DB_USER="whatsapp_user"
DB_HOST="localhost"
DB_PASSWORD="whatsapp123"

# Configurações de backup
BACKUP_DIR="/home/whatsapp/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_$DATE.sql.gz"
LOG_FILE="$BACKUP_DIR/backup.log"

# Configurações de retenção
DAILY_RETENTION=7    # Manter backups diários por 7 dias
WEEKLY_RETENTION=4   # Manter backups semanais por 4 semanas
MONTHLY_RETENTION=6  # Manter backups mensais por 6 meses

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR/{daily,weekly,monthly}

# Função de log
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log_message "=== Iniciando backup do banco de dados ==="

# Verificar se o PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
    log_message "ERRO: PostgreSQL não está rodando!"
    exit 1
fi

# Verificar espaço em disco disponível
AVAILABLE_SPACE=$(df $BACKUP_DIR | tail -1 | awk '{print $4}')
REQUIRED_SPACE=1048576  # 1GB em KB

if [ $AVAILABLE_SPACE -lt $REQUIRED_SPACE ]; then
    log_message "AVISO: Pouco espaço em disco disponível ($AVAILABLE_SPACE KB)"
fi

# Determinar tipo de backup baseado no dia
DAY_OF_WEEK=$(date +%u)  # 1=Segunda, 7=Domingo
DAY_OF_MONTH=$(date +%d)

if [ $DAY_OF_MONTH -eq 1 ]; then
    BACKUP_TYPE="monthly"
    BACKUP_SUBDIR="monthly"
elif [ $DAY_OF_WEEK -eq 7 ]; then
    BACKUP_TYPE="weekly"
    BACKUP_SUBDIR="weekly"
else
    BACKUP_TYPE="daily"
    BACKUP_SUBDIR="daily"
fi

BACKUP_FILE="$BACKUP_DIR/$BACKUP_SUBDIR/backup_${DB_NAME}_${BACKUP_TYPE}_$DATE.sql.gz"

log_message "Tipo de backup: $BACKUP_TYPE"
log_message "Arquivo de backup: $BACKUP_FILE"

# Realizar backup com compressão
log_message "Iniciando dump do banco de dados..."

PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -h $DB_HOST $DB_NAME | gzip > $BACKUP_FILE

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h $BACKUP_FILE | cut -f1)
    log_message "Backup concluído com sucesso! Tamanho: $BACKUP_SIZE"
else
    log_message "ERRO: Falha no backup do banco de dados!"
    exit 1
fi

# Verificar integridade do backup
log_message "Verificando integridade do backup..."
gunzip -t $BACKUP_FILE

if [ $? -eq 0 ]; then
    log_message "Integridade do backup verificada com sucesso!"
else
    log_message "ERRO: Backup corrompido!"
    rm -f $BACKUP_FILE
    exit 1
fi

# Rotação de backups - Limpar backups antigos
log_message "Executando rotação de backups..."

# Limpar backups diários antigos
find $BACKUP_DIR/daily -name "backup_${DB_NAME}_daily_*.sql.gz" -mtime +$DAILY_RETENTION -delete
DAILY_REMOVED=$(find $BACKUP_DIR/daily -name "backup_${DB_NAME}_daily_*.sql.gz" -mtime +$DAILY_RETENTION | wc -l)
if [ $DAILY_REMOVED -gt 0 ]; then
    log_message "Removidos $DAILY_REMOVED backups diários antigos"
fi

# Limpar backups semanais antigos
find $BACKUP_DIR/weekly -name "backup_${DB_NAME}_weekly_*.sql.gz" -mtime +$((WEEKLY_RETENTION * 7)) -delete
WEEKLY_REMOVED=$(find $BACKUP_DIR/weekly -name "backup_${DB_NAME}_weekly_*.sql.gz" -mtime +$((WEEKLY_RETENTION * 7)) | wc -l)
if [ $WEEKLY_REMOVED -gt 0 ]; then
    log_message "Removidos $WEEKLY_REMOVED backups semanais antigos"
fi

# Limpar backups mensais antigos
find $BACKUP_DIR/monthly -name "backup_${DB_NAME}_monthly_*.sql.gz" -mtime +$((MONTHLY_RETENTION * 30)) -delete
MONTHLY_REMOVED=$(find $BACKUP_DIR/monthly -name "backup_${DB_NAME}_monthly_*.sql.gz" -mtime +$((MONTHLY_RETENTION * 30)) | wc -l)
if [ $MONTHLY_REMOVED -gt 0 ]; then
    log_message "Removidos $MONTHLY_REMOVED backups mensais antigos"
fi

# Estatísticas de backup
log_message "=== Estatísticas de Backup ==="
log_message "Backups diários: $(find $BACKUP_DIR/daily -name "*.sql.gz" | wc -l)"
log_message "Backups semanais: $(find $BACKUP_DIR/weekly -name "*.sql.gz" | wc -l)"
log_message "Backups mensais: $(find $BACKUP_DIR/monthly -name "*.sql.gz" | wc -l)"

# Tamanho total dos backups
TOTAL_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
log_message "Espaço total usado por backups: $TOTAL_SIZE"

# Backup de configurações críticas (opcional)
if [ -f "/root/Chat_AICentral/.env" ]; then
    cp /root/Chat_AICentral/.env $BACKUP_DIR/config_backup_$DATE.env
    log_message "Backup de configurações salvo"
fi

# Limpar logs de backup antigos (manter 30 dias)
find $BACKUP_DIR -name "backup.log.*" -mtime +30 -delete

# Rotacionar log atual se muito grande (>10MB)
LOG_SIZE=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
if [ $LOG_SIZE -gt 10485760 ]; then
    mv $LOG_FILE $LOG_FILE.$(date +%Y%m%d)
    log_message "Log rotacionado devido ao tamanho"
fi

log_message "=== Backup concluído com sucesso ==="

# Notificação de sucesso (opcional)
# Aqui você pode adicionar integração com sistemas de monitoramento

exit 0