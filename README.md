# WhatsApp - AI Central

Uma aplicação web completa similar ao WhatsApp com integração de IA para atendimento automatizado usando a API do AI Central.

## 🚀 Funcionalidades

- **Interface WhatsApp**: Interface idêntica ao WhatsApp oficial
- **Conexão via QR Code**: Conecte seu WhatsApp escaneando o QR code
- **IA Integrada**: Respostas automáticas usando AI Central
- **Tempo Real**: Mensagens em tempo real via WebSocket
- **Gerenciamento de Chats**: Visualize e gerencie todas as conversas
- **API Key Gratuita**: Use a API do AI Central gratuitamente
- **Banco PostgreSQL**: Armazenamento robusto de mensagens e contatos
- **Histórico Completo**: Todas as conversas são salvas automaticamente

## 🛠️ Tecnologias Utilizadas

### Backend
- Node.js
- Express.js
- Socket.io
- WhatsApp.js
- PostgreSQL
- Axios

### Frontend
- React 18
- Vite
- Tailwind CSS
- Lucide React (ícones)
- Socket.io Client
- React Hot Toast

## 📋 Pré-requisitos

- Node.js 16+ instalado
- NPM ou Yarn
- PostgreSQL 12+ instalado e configurado
- Conta no AI Central (gratuita)
- WhatsApp instalado no celular

## 🔧 Instalação Local

### 1. Clone o repositório
```bash
git clone https://github.com/Jeanqs42/Chat_AICentral.git
cd Chat_AICentral
```

### 2. Configure o PostgreSQL
```bash
# Instale o PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Inicie o serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Crie o banco de dados
sudo -u postgres psql
CREATE DATABASE whatsapp_ai;
CREATE USER whatsapp_user WITH PASSWORD 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_ai TO whatsapp_user;
\q
```

### 3. Instale as dependências do servidor
```bash
npm install
```

### 4. Instale as dependências do cliente
```bash
cd client
npm install
cd ..
```

### 5. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Servidor
NODE_ENV=production
PORT=3002
HOST=0.0.0.0

# AI Central
AICENTRAL_API_KEY=sua_api_key_aqui

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_ai
DB_USER=whatsapp_user
DB_PASSWORD=sua_senha_aqui
```

### 6. Configure o banco de dados
```bash
# Execute o script de configuração do schema
psql -h localhost -U whatsapp_user -d whatsapp_ai -f database/schema.sql
```

### 7. Build do frontend
```bash
cd client
npm run build
cd ..
```

## 🚀 Como usar

### 1. Inicie o servidor
```bash
npm start
```

Ou para desenvolvimento:
```bash
npm run dev
```

### 2. Acesse a aplicação
Abra seu navegador e acesse: `http://localhost:3002`

### 3. Configure sua API Key
1. Na primeira vez, será solicitada sua API Key do AI Central
2. Obtenha gratuitamente em: [aicentral.store](https://aicentral.store)
3. Insira a chave na aplicação

### 4. Conecte seu WhatsApp
1. Clique em "Conectar WhatsApp"
2. Escaneie o QR Code com seu WhatsApp
3. Aguarde a confirmação de conexão

### 5. Comece a usar
- Suas conversas aparecerão automaticamente na barra lateral
- As mensagens recebidas serão processadas pela IA
- Respostas automáticas serão enviadas
- Você pode enviar mensagens manualmente também

## 🔑 Obtendo API Key do AI Central

1. Acesse [aicentral.store](https://aicentral.store)
2. Crie uma conta gratuita
3. Acesse o painel de controle
4. Copie sua API Key
5. Cole na aplicação WhatsApp Web

### Endpoints da API AI Central

A aplicação utiliza os seguintes endpoints:

- `POST /v1/ask` - Enviar pergunta para a IA
- `GET /v1/validate-key` - Validar API Key
- `POST /v1/chat/sessions/{session_id}/reset` - Resetar sessão

## 📱 Como funciona

1. **Conexão WhatsApp**: Usa whatsapp-web.js para conectar com WhatsApp
2. **Processamento IA**: Mensagens recebidas são enviadas para AI Central
3. **Respostas Automáticas**: IA gera respostas que são enviadas automaticamente
4. **Interface Web**: Frontend React exibe conversas em tempo real
5. **WebSocket**: Comunicação em tempo real entre frontend e backend

## 🔧 Scripts Disponíveis

### Servidor
- `npm start` - Inicia o servidor em produção
- `npm run dev` - Inicia o servidor em desenvolvimento com nodemon

### Cliente
- `npm run dev` - Inicia o servidor de desenvolvimento Vite
- `npm run build` - Build de produção
- `npm run preview` - Preview do build de produção

## 📁 Estrutura do Projeto

```
Chat_AICentral/
├── server.js              # Servidor principal
├── package.json           # Dependências do servidor
├── .env.example          # Exemplo de variáveis de ambiente
├── config/               # Configurações do ambiente
│   └── production.json   # Configurações de produção
├── database/             # Banco de dados PostgreSQL
│   ├── postgresql.js     # Conexão com PostgreSQL
│   └── schema.sql        # Schema do banco de dados
├── scripts/              # Scripts utilitários
│   ├── setup-postgresql.sh
│   ├── backup-db.sh
│   └── monitor-db.sh
├── client/               # Frontend React
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── App.jsx      # Componente principal
│   │   ├── main.jsx     # Entrada da aplicação
│   │   └── index.css    # Estilos globais
│   ├── package.json     # Dependências do frontend
│   ├── vite.config.js   # Configuração Vite
│   └── tailwind.config.js # Configuração Tailwind
├── static/               # Arquivos estáticos
├── backups/              # Backups do banco
└── README.md            # Este arquivo
```

## 🎨 Componentes

- **App.jsx** - Componente principal da aplicação
- **Sidebar.jsx** - Lista de conversas
- **ChatArea.jsx** - Área de mensagens
- **QRCodeModal.jsx** - Modal para conexão WhatsApp
- **ApiKeyModal.jsx** - Modal para configuração da API Key

## 🔒 Segurança

- API Key armazenada localmente no navegador
- Conexão segura com AI Central via HTTPS
- WhatsApp.js usa autenticação oficial
- Dados armazenados com segurança no PostgreSQL
- Senhas do banco criptografadas
- Backup automático dos dados

## 🐛 Solução de Problemas

### QR Code não aparece
- Verifique se o servidor está rodando
- Confirme se a porta 3001 está livre
- Reinicie a aplicação

### API Key inválida
- Verifique se copiou a chave corretamente
- Confirme se a conta no AI Central está ativa
- Tente gerar uma nova chave

### WhatsApp não conecta
- Certifique-se que o WhatsApp está instalado
- Verifique a conexão com a internet
- Tente gerar um novo QR Code

### Banco de dados não conecta
- Verifique se o PostgreSQL está rodando: `sudo systemctl status postgresql`
- Confirme as credenciais no arquivo .env
- Teste a conexão: `psql -h localhost -U whatsapp_user -d whatsapp_ai`
- Verifique se o schema foi criado corretamente

### Mensagens não são salvas
- Verifique a conexão com PostgreSQL
- Confirme se as tabelas foram criadas
- Verifique os logs do servidor para erros de banco

## 🌐 Deploy em VPS Ubuntu

### Pré-requisitos do Servidor

- Ubuntu 20.04+ 
- 2GB+ RAM
- 20GB+ armazenamento
- Acesso root/sudo

### 1. Preparação do Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar dependências do sistema
sudo apt install -y git nginx certbot python3-certbot-nginx

# Instalar Google Chrome (necessário para WhatsApp Web)
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update
sudo apt install -y google-chrome-stable

# Instalar PM2 para gerenciamento de processos
sudo npm install -g pm2
```

### 2. Deploy da Aplicação

```bash
# Criar usuário para a aplicação
sudo useradd -m -s /bin/bash whatsapp
sudo usermod -aG sudo whatsapp

# Configurar PostgreSQL
sudo -u postgres psql
CREATE DATABASE whatsapp_ai;
CREATE USER whatsapp_user WITH PASSWORD 'senha_segura_aqui';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_ai TO whatsapp_user;
\q

# Mudar para o usuário da aplicação
sudo su - whatsapp

# Clonar o repositório
git clone https://github.com/Jeanqs42/Chat_AICentral.git /home/whatsapp/whatsapp-app
cd /home/whatsapp/whatsapp-app

# Instalar dependências
npm install
cd client
npm install
npm run build
cd ..

# Configurar banco de dados
psql -h localhost -U whatsapp_user -d whatsapp_ai -f database/schema.sql

# Configurar variáveis de ambiente
cp .env.example .env
nano .env  # Edite com suas configurações
```

### 3. Configuração do PM2

```bash
# Criar arquivo de configuração do PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'whatsapp-multi-user',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=2048'
  }]
};
EOF

# Criar diretório de logs
mkdir -p logs

# Iniciar aplicação com PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Configuração do Nginx

```bash
# Criar configuração do Nginx
sudo tee /etc/nginx/sites-available/whatsapp-app << 'EOF'
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

# Ativar site
sudo ln -s /etc/nginx/sites-available/whatsapp-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Configuração SSL (HTTPS)

```bash
# Obter certificado SSL gratuito
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Configurar renovação automática
sudo crontab -e
# Adicionar linha:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. Configuração de Firewall

```bash
# Configurar UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 📊 Monitoramento e Manutenção

### Comandos PM2 Úteis

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs

# Reiniciar aplicação
pm2 restart whatsapp-multi-user

# Parar aplicação
pm2 stop whatsapp-multi-user

# Monitoramento em tempo real
pm2 monit
```

### Atualizações

```bash
# Fazer backup
cp .env .env.backup

# Atualizar código
git pull origin main

# Instalar novas dependências
npm install
cd client && npm install && npm run build && cd ..

# Reiniciar aplicação
pm2 restart whatsapp-multi-user
```

## 📞 Suporte

Para suporte técnico:
- Documentação AI Central: [aicentral.store/docs](https://aicentral.store/docs)
- Issues do projeto: Abra uma issue no repositório

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

**Desenvolvido com ❤️ para integração WhatsApp + IA**