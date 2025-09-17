# 🔧 Instruções para Correção da Aplicação

## ✅ Correções Aplicadas

As seguintes correções foram aplicadas na sua aplicação:

### 1. **Arquivo .env Corrigido**
- ✅ Porta alterada de 3000 para 3001 (consistente com production.json)
- ✅ NODE_ENV alterado para 'production'
- ✅ Adicionado HOST=0.0.0.0 para aceitar conexões externas
- ✅ Adicionadas todas as configurações faltantes do .env.example
- ✅ Organizadas seções com comentários explicativos

### 2. **Código do Servidor Atualizado**
- ✅ AI_CENTRAL_API agora usa variável de ambiente AI_CENTRAL_URL
- ✅ Timeout da API agora usa AI_REQUEST_TIMEOUT do .env
- ✅ HOST do servidor agora usa variável de ambiente HOST

## 🚨 AÇÃO NECESSÁRIA: Configurar Chave da API AICentral

**IMPORTANTE**: Você precisa configurar uma chave válida da API AICentral para que a integração funcione.

### Como obter e configurar:

1. **Obtenha sua chave da API AICentral**:
   - Acesse: https://aicentral.store
   - Faça login ou crie uma conta
   - Gere uma chave de API válida

2. **Configure no arquivo .env**:
   ```bash
   # Substitua 'SUA_CHAVE_AQUI' pela chave real
   AICENTRAL_API_KEY=SUA_CHAVE_AQUI
   ```

## 🧪 Como Testar a Aplicação

### 1. **Verificar Configurações**
```bash
# Verificar se o .env está correto
cat .env

# Verificar se as dependências estão instaladas
npm install
```

### 2. **Iniciar a Aplicação**
```bash
# Modo desenvolvimento
npm run dev

# OU modo produção
npm start
```

### 3. **Verificar se está funcionando**
- Acesse: http://localhost:3001
- Verifique os logs no terminal
- Teste o endpoint de saúde: http://localhost:3001/health

### 4. **Testar Conexão WhatsApp**
- Abra a aplicação no navegador
- Escaneie o QR Code com seu WhatsApp
- Verifique se a conexão é estabelecida

### 5. **Testar Integração AICentral**
- Envie uma mensagem para o WhatsApp conectado
- Verifique se o bot responde automaticamente
- Monitore os logs para erros de API

## 🔍 Monitoramento e Logs

### Verificar Logs
```bash
# Logs em tempo real
tail -f logs/app.log

# Logs de erro
tail -f logs/error.log
```

### Endpoints de Monitoramento
- **Health Check**: http://localhost:3001/health
- **Métricas**: http://localhost:3001/metrics
- **Status da API**: http://localhost:3001/api/status

## 🚨 Possíveis Problemas e Soluções

### Problema: "Chave API inválida"
**Solução**: Verifique se a AICENTRAL_API_KEY está correta no .env

### Problema: "Erro de conexão WhatsApp"
**Soluções**:
- Verifique se o Chrome/Chromium está instalado
- Limpe a pasta .wwebjs_auth e tente novamente
- Verifique se não há outro WhatsApp Web aberto

### Problema: "Porta já em uso"
**Solução**: 
```bash
# Verificar processos na porta 3001
sudo lsof -i :3001

# Matar processo se necessário
sudo kill -9 PID_DO_PROCESSO
```

### Problema: "Erro de permissões"
**Solução**:
```bash
# Dar permissões corretas
sudo chown -R $USER:$USER .
chmod +x deploy.sh
```

## 📝 Próximos Passos Recomendados

1. **Configure a chave da API AICentral** (OBRIGATÓRIO)
2. **Teste a aplicação localmente**
3. **Configure um domínio e SSL para produção**
4. **Configure backup automático do Supabase**
5. **Monitore logs regularmente**

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs em `logs/error.log`
2. Teste os endpoints de saúde
3. Verifique se todas as variáveis de ambiente estão configuradas
4. Reinicie a aplicação após mudanças no .env

---

**Lembre-se**: Após configurar a AICENTRAL_API_KEY, reinicie a aplicação para que as mudanças tenham efeito.