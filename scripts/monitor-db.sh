#!/bin/bash
# Script de monitoramento de performance do PostgreSQL
# Gera relatórios detalhados sobre uso, performance e saúde do banco

# Configurações do banco
DB_NAME="whatsapp_db"
DB_USER="whatsapp_user"
DB_HOST="localhost"
DB_PASSWORD="whatsapp123"

# Configurações de monitoramento
MONITOR_DIR="/root/Chat_AICentral/monitoring"
REPORT_FILE="$MONITOR_DIR/db_report_$(date +%Y%m%d_%H%M%S).txt"
ALERT_FILE="$MONITOR_DIR/alerts.log"

# Thresholds para alertas
MAX_DB_SIZE_GB=5
MAX_CONNECTIONS=80
MAX_SLOW_QUERIES=10
MAX_DISK_USAGE=85

# Criar diretório de monitoramento se não existir
mkdir -p $MONITOR_DIR

# Função de log
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $ALERT_FILE
}

# Função para alertas
send_alert() {
    local alert_type=$1
    local message=$2
    log_message "ALERTA [$alert_type]: $message"
    # Aqui você pode adicionar integração com sistemas de notificação
    # Exemplo: enviar para Slack, email, etc.
}

# Iniciar relatório
echo "=== RELATÓRIO DE PERFORMANCE DO BANCO DE DADOS ===" > $REPORT_FILE
echo "Data/Hora: $(date)" >> $REPORT_FILE
echo "Banco: $DB_NAME" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Verificar se o PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
    send_alert "CRÍTICO" "PostgreSQL não está rodando!"
    exit 1
fi

# 1. Informações gerais do banco
echo "=== INFORMAÇÕES GERAIS ===" >> $REPORT_FILE
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "
SELECT 
    'Versão PostgreSQL' as info, 
    version() as valor
UNION ALL
SELECT 
    'Tamanho do Banco', 
    pg_size_pretty(pg_database_size('$DB_NAME'))
UNION ALL
SELECT 
    'Uptime', 
    (now() - pg_postmaster_start_time())::text;
" >> $REPORT_FILE 2>/dev/null

echo "" >> $REPORT_FILE

# 2. Tamanho das tabelas
echo "=== TOP 10 MAIORES TABELAS ===" >> $REPORT_FILE
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "
SELECT 
    schemaname as schema,
    tablename as tabela,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as dados,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indices
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
LIMIT 10;
" >> $REPORT_FILE 2>/dev/null

echo "" >> $REPORT_FILE

# 3. Estatísticas de conexões
echo "=== CONEXÕES ATIVAS ===" >> $REPORT_FILE
CONNECTIONS=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" | xargs)
TOTAL_CONNECTIONS=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)

echo "Conexões ativas: $CONNECTIONS" >> $REPORT_FILE
echo "Total de conexões: $TOTAL_CONNECTIONS" >> $REPORT_FILE

# Verificar threshold de conexões
if [ $TOTAL_CONNECTIONS -gt $MAX_CONNECTIONS ]; then
    send_alert "WARNING" "Muitas conexões ativas: $TOTAL_CONNECTIONS (limite: $MAX_CONNECTIONS)"
fi

PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "
SELECT 
    state,
    count(*) as quantidade
FROM pg_stat_activity 
GROUP BY state
ORDER BY count(*) DESC;
" >> $REPORT_FILE 2>/dev/null

echo "" >> $REPORT_FILE

# 4. Estatísticas de atividade das tabelas
echo "=== ATIVIDADE DAS TABELAS ===" >> $REPORT_FILE
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "
SELECT 
    schemaname,
    relname as tabela,
    seq_scan as scans_sequenciais,
    seq_tup_read as linhas_lidas_seq,
    idx_scan as scans_indices,
    idx_tup_fetch as linhas_lidas_idx,
    n_tup_ins as inserções,
    n_tup_upd as atualizações,
    n_tup_del as exclusões
FROM pg_stat_user_tables 
ORDER BY (seq_tup_read + idx_tup_fetch) DESC
LIMIT 10;
" >> $REPORT_FILE 2>/dev/null

echo "" >> $REPORT_FILE

# 5. Índices mais utilizados
echo "=== ÍNDICES MAIS UTILIZADOS ===" >> $REPORT_FILE
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "
SELECT 
    schemaname,
    relname as tabela,
    indexrelname as indice,
    idx_scan as usos,
    idx_tup_read as linhas_lidas,
    idx_tup_fetch as linhas_retornadas
FROM pg_stat_user_indexes 
WHERE idx_scan > 0
ORDER BY idx_scan DESC
LIMIT 10;
" >> $REPORT_FILE 2>/dev/null

echo "" >> $REPORT_FILE

# 6. Queries mais lentas (se pg_stat_statements estiver habilitado)
echo "=== ANÁLISE DE PERFORMANCE ===" >> $REPORT_FILE

# Verificar cache hit ratio
CACHE_HIT_RATIO=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "
SELECT 
    CASE 
        WHEN (sum(heap_blks_hit) + sum(heap_blks_read)) = 0 THEN 0
        ELSE round((sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 2)
    END as cache_hit_ratio
FROM pg_statio_user_tables;
" | xargs)

# Verificar se o valor é válido
if [ -z "$CACHE_HIT_RATIO" ] || [ "$CACHE_HIT_RATIO" = "" ]; then
    CACHE_HIT_RATIO="N/A"
    echo "Cache Hit Ratio: $CACHE_HIT_RATIO (sem dados suficientes)" >> $REPORT_FILE
else
    echo "Cache Hit Ratio: ${CACHE_HIT_RATIO}%" >> $REPORT_FILE
    # Alertar se cache hit ratio for baixo (apenas se for um número válido)
    if [[ "$CACHE_HIT_RATIO" =~ ^[0-9]+\.?[0-9]*$ ]] && (( $(echo "$CACHE_HIT_RATIO < 95" | bc -l 2>/dev/null || echo 0) )); then
        send_alert "WARNING" "Cache Hit Ratio baixo: ${CACHE_HIT_RATIO}% (recomendado: >95%)"
    fi
fi

echo "" >> $REPORT_FILE

# 7. Uso de disco
echo "=== USO DE DISCO ===" >> $REPORT_FILE
DISK_USAGE=$(df -h /var/lib/postgresql | tail -1 | awk '{print $5}' | sed 's/%//')
echo "Uso do disco PostgreSQL: ${DISK_USAGE}%" >> $REPORT_FILE

# Alertar se uso de disco for alto
if [ $DISK_USAGE -gt $MAX_DISK_USAGE ]; then
    send_alert "WARNING" "Uso de disco alto: ${DISK_USAGE}% (limite: ${MAX_DISK_USAGE}%)"
fi

# 8. Estatísticas de mensagens (específico para WhatsApp)
echo "" >> $REPORT_FILE
echo "=== ESTATÍSTICAS WHATSAPP ===" >> $REPORT_FILE
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "
SELECT 
    'Total de Mensagens' as metrica,
    count(*)::text as valor
FROM messages
UNION ALL
SELECT 
    'Mensagens Hoje',
    count(*)::text
FROM messages 
WHERE timestamp >= CURRENT_DATE
UNION ALL
SELECT 
    'Mensagens Última Hora',
    count(*)::text
FROM messages 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 
    'Chats Ativos',
    count(DISTINCT chat_id)::text
FROM messages 
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'Usuários Ativos',
    count(DISTINCT from_user)::text
FROM messages 
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days';
" >> $REPORT_FILE 2>/dev/null

echo "" >> $REPORT_FILE

# 9. Verificar tamanho do banco e alertar
DB_SIZE_BYTES=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "SELECT pg_database_size('$DB_NAME');" | xargs)
DB_SIZE_GB=$(echo "scale=2; $DB_SIZE_BYTES / 1024 / 1024 / 1024" | bc)

if (( $(echo "$DB_SIZE_GB > $MAX_DB_SIZE_GB" | bc -l) )); then
    send_alert "WARNING" "Banco de dados muito grande: ${DB_SIZE_GB}GB (limite: ${MAX_DB_SIZE_GB}GB)"
fi

# 10. Recomendações de otimização
echo "=== RECOMENDAÇÕES ===" >> $REPORT_FILE

# Verificar tabelas sem índices em colunas frequentemente consultadas
UNUSED_INDEXES=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "
SELECT count(*) FROM pg_stat_user_indexes WHERE idx_scan = 0;
" | xargs)

if [ $UNUSED_INDEXES -gt 0 ]; then
    echo "- Encontrados $UNUSED_INDEXES índices não utilizados. Considere removê-los." >> $REPORT_FILE
fi

# Verificar se há necessidade de VACUUM
VACUUM_NEEDED=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "
SELECT count(*) FROM pg_stat_user_tables WHERE n_dead_tup > n_live_tup * 0.1;
" | xargs)

if [ $VACUUM_NEEDED -gt 0 ]; then
    echo "- $VACUUM_NEEDED tabelas precisam de VACUUM. Execute a limpeza automática." >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE
echo "=== FIM DO RELATÓRIO ===" >> $REPORT_FILE

# Limpar relatórios antigos (manter últimos 30 dias)
find $MONITOR_DIR -name "db_report_*.txt" -mtime +30 -delete

echo "Relatório salvo em: $REPORT_FILE"
echo "Monitoramento concluído em $(date)"

exit 0