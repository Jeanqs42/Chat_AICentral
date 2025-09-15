# WhatsApp Multi-Usuário - Guia de Produção

## 🚀 Como Colocar em Produção

### 1. Preparação do Ambiente

```bash
# Instalar dependências (se ainda não instalou)
npm install

# Instalar dependências do cliente
cd client
npm install
cd ..
```

### 2. Configuração de Produção

O sistema já está configurado com:
- ✅ Arquivo de configuração de produção (`config/production.json`)
- ✅ Sistema de logging avançado
- ✅ Compressão gzip
- ✅ Rate limiting
- ✅ Monitoramento de saúde
- ✅ Graceful shutdown

### 3. Iniciar em Produção

#### Opção 1: Script Batch (Mais Simples)
```cmd
# Executar o arquivo start-production.bat
start-production.bat
```

#### Opção 2: PowerShell (Mais Controle)
```powershell
# Iniciar serviço
.\manage-service.ps1 start

# Ver status
.\manage-service.ps1 status

# Parar serviço
.\manage-service.ps1 stop

# Reiniciar serviço
.\manage-service.ps1 restart
```

#### Opção 3: Instalar como Serviço do Windows
```powershell
# Execute como Administrador
.\manage-service.ps1 install

# Depois use:
net start WhatsAppMultiUsuario
net stop WhatsAppMultiUsuario
```

### 4. Acessar a Aplicação

- **Interface Principal**: http://localhost:3001
- **Monitoramento**: http://localhost:3001/health
- **Métricas**: http://localhost:3001/metrics

### 5. Monitoramento

#### Logs
- **Aplicação**: `logs/app.log`
- **Erros**: `logs/error.log`
- **Serviço**: `logs/service.log`

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
    "port": 3001,
    "host": "0.0.0.0",
    "maxConnections": 1000
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

#### Windows Startup (Método 1)
1. Pressione `Win + R`
2. Digite `shell:startup`
3. Copie o arquivo `start-production.bat` para esta pasta

#### Serviço do Windows (Método 2)
1. Execute PowerShell como Administrador
2. Execute: `.\manage-service.ps1 install`
3. Configure para iniciar automaticamente:
   ```cmd
   sc config WhatsAppMultiUsuario start= auto
   ```

### 8. Backup e Manutenção

#### Backup Importante
- Pasta `sessions/` - Sessões do WhatsApp
- Arquivo `config/production.json` - Configurações
- Pasta `logs/` - Logs do sistema

#### Limpeza de Logs
```powershell
# Limpar logs antigos (opcional)
Get-ChildItem logs\*.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item
```

### 9. Solução de Problemas

#### Verificar se está rodando
```powershell
.\manage-service.ps1 status
```

#### Ver logs em tempo real
```cmd
tail -f logs/app.log
# ou
Get-Content logs\app.log -Wait
```

#### Reiniciar se necessário
```powershell
.\manage-service.ps1 restart
```

### 10. Segurança

- ✅ Rate limiting ativado
- ✅ CORS configurado
- ✅ Logs de segurança
- ✅ Graceful shutdown
- ✅ Tratamento de erros

### 11. Performance

- ✅ Compressão gzip
- ✅ Cache de arquivos estáticos
- ✅ Otimizações de timeout
- ✅ Monitoramento de memória

---

## 🎯 Resumo Rápido

1. **Iniciar**: Execute `start-production.bat`
2. **Acessar**: http://localhost:3001
3. **Monitorar**: http://localhost:3001/health
4. **Gerenciar**: Use `manage-service.ps1`

**Pronto! Seu WhatsApp Multi-Usuário está rodando em produção! 🚀**