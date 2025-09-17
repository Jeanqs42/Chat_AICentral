# WhatsApp AI Central - Guia de Produção

## 🚀 Como Colocar em Produção

### 1. Preparação do Ambiente

```bash
# Instalar dependências (se ainda não instalou)
npm install

# Instalar dependências do cliente
cd client
npm install
cd ..

# Configurar PostgreSQL
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Criar banco de dados
sudo -u postgres psql
CREATE DATABASE whatsapp_ai;
CREATE USER whatsapp_user WITH PASSWORD 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_ai TO whatsapp_user;
\q

# Executar schema do banco
psql -h localhost -U whatsapp_user -d whatsapp_ai -f database/schema.sql
```

### 2. Configuração de Produção

O sistema já está configurado com:
- ✅ Arquivo de configuração de produção (`config/production.json`)
- ✅ Sistema de logging avançado
- ✅ Compressão gzip
- ✅ Rate limiting
- ✅ Monitoramento de saúde
- ✅ Graceful shutdown
- ✅ Banco PostgreSQL integrado
- ✅ Backup automático de dados

### 3. Iniciar em Produção

#### Opção 1: NPM Start (Recomendado)
```bash
# Iniciar servidor
npm start
```

#### Opção 2: PM2 (Para VPS/Servidor)
```bash
# Instalar PM2
npm install -g pm2

# Iniciar com PM2
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save
pm2 startup
```

#### Opção 3: Script de Deploy
```bash
# Executar script de deploy
chmod +x deploy.sh
./deploy.sh
```

### 4. Acessar a Aplicação

- **Interface Principal**: http://localhost:3002
- **Monitoramento**: http://localhost:3002/health
- **Métricas**: http://localhost:3002/metrics

### 5. Monitoramento

#### Logs
- **Aplicação**: `logs/app.log`
- **Erros**: `logs/error.log`
- **Banco de Dados**: `logs/database.log`
- **Sistema**: Logs do sistema via journalctl

#### Endpoints de Monitoramento

**Health Check** (`/health`):
```json
{
  "uptime": 3600,
  "message": "OK",
  "timestamp": 1640995200000,
  "environment": "production",
  "memory": {...},
  "sessions": 5,
  "sockets": 3
}
```

**Métricas** (`/metrics`):
```json
{
  "sessions_total": 5,
  "sockets_connected": 3,
  "agent_configs": 2,
  "uptime_seconds": 3600,
  "memory_usage": {...},
  "node_version": "v18.17.0",
  "platform": "win32"
}
```

### 6. Configurações Avançadas

#### Arquivo `config/production.json`

Personalize as configurações editando este arquivo:

```json
{
  "server": {
    "port": 3002,
    "host": "0.0.0.0",
    "maxConnections": 1000
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "whatsapp_ai",
    "user": "whatsapp_user",
    "maxConnections": 20
  },
  "security": {
    "rateLimit": {
      "windowMs": 900000,
      "max": 100
    }
  },
  "logging": {
    "level": "info",
    "file": {
      "enabled": true
    }
  }
}
```

### 7. Inicialização Automática

#### Systemd Service (Linux)
1. Criar arquivo de serviço:
```bash
sudo nano /etc/systemd/system/whatsapp-ai.service
```

2. Adicionar conteúdo:
```ini
[Unit]
Description=WhatsApp AI Central
After=network.target postgresql.service

[Service]
Type=simple
User=whatsapp
WorkingDirectory=/home/whatsapp/whatsapp-app
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

3. Ativar serviço:
```bash
sudo systemctl daemon-reload
sudo systemctl enable whatsapp-ai
sudo systemctl start whatsapp-ai
```

### 8. Backup e Manutenção

#### Backup Importante
- Pasta `sessions/` - Sessões do WhatsApp
- Arquivo `config/production.json` - Configurações
- Pasta `logs/` - Logs do sistema
- **Banco PostgreSQL** - Dados das mensagens e contatos

#### Backup do Banco de Dados
```bash
# Backup manual
pg_dump -h localhost -U whatsapp_user whatsapp_ai > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup automático (crontab)
0 2 * * * pg_dump -h localhost -U whatsapp_user whatsapp_ai > /home/whatsapp/backups/backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

#### Limpeza de Logs
```bash
# Limpar logs antigos (opcional)
find logs/ -name "*.log" -mtime +30 -delete

# Rotacionar logs do PostgreSQL
sudo logrotate /etc/logrotate.d/postgresql-common
```

### 9. Solução de Problemas

#### Verificar se está rodando
```bash
# Via systemd
sudo systemctl status whatsapp-ai

# Via PM2
pm2 status

# Via processo
ps aux | grep node
```

#### Ver logs em tempo real
```bash
# Logs da aplicação
tail -f logs/app.log

# Logs do sistema
sudo journalctl -u whatsapp-ai -f

# Logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### Reiniciar se necessário
```bash
# Via systemd
sudo systemctl restart whatsapp-ai

# Via PM2
pm2 restart whatsapp-ai

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### 10. Segurança

- ✅ Rate limiting ativado
- ✅ CORS configurado
- ✅ Logs de segurança
- ✅ Graceful shutdown
- ✅ Tratamento de erros
- ✅ Banco PostgreSQL com autenticação
- ✅ Conexões criptografadas
- ✅ Backup automático dos dados

### 11. Performance

- ✅ Compressão gzip
- ✅ Cache de arquivos estáticos
- ✅ Otimizações de timeout
- ✅ Monitoramento de memória
- ✅ Pool de conexões PostgreSQL
- ✅ Índices otimizados no banco
- ✅ Limpeza automática de logs

---

## 🎯 Resumo Rápido

1. **Configurar**: Configure PostgreSQL e variáveis de ambiente
2. **Iniciar**: Execute `npm start` ou use PM2
3. **Acessar**: http://localhost:3002
4. **Monitorar**: http://localhost:3002/health
5. **Gerenciar**: Use systemctl ou PM2

**Pronto! Seu WhatsApp AI Central está rodando em produção! 🚀**