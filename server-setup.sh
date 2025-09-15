#!/bin/bash

# Script de Preparação do Servidor VPS Ubuntu
# WhatsApp AI Central Application

set -e

echo "🔧 Preparando servidor VPS Ubuntu para WhatsApp AI Central..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
   log_error "Este script deve ser executado como root (use sudo)"
   exit 1
fi

log_info "Atualizando sistema..."
apt update && apt upgrade -y

log_info "Instalando dependências básicas..."
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates

log_info "Instalando Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

log_info "Instalando dependências do sistema..."
apt install -y git nginx certbot python3-certbot-nginx ufw

log_info "Instalando Google Chrome (necessário para WhatsApp Web)..."
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | tee /etc/apt/sources.list.d/google-chrome.list
apt update
apt install -y google-chrome-stable

log_info "Instalando PM2 globalmente..."
npm install -g pm2

log_info "Criando usuário para a aplicação..."
if ! id "whatsapp" &>/dev/null; then
    useradd -m -s /bin/bash whatsapp
    usermod -aG sudo whatsapp
    log_success "Usuário 'whatsapp' criado com sucesso"
else
    log_warning "Usuário 'whatsapp' já existe"
fi

log_info "Configurando firewall básico..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

log_info "Configurando Nginx..."
systemctl enable nginx
systemctl start nginx

# Criar configuração básica do Nginx
cat > /etc/nginx/sites-available/whatsapp-app << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3001;
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
ln -sf /etc/nginx/sites-available/whatsapp-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

log_info "Configurando limites do sistema..."
cat >> /etc/security/limits.conf << 'EOF'
# Limites para aplicação WhatsApp
whatsapp soft nofile 65536
whatsapp hard nofile 65536
whatsapp soft nproc 32768
whatsapp hard nproc 32768
EOF

log_info "Configurando swap (se necessário)..."
if [ $(free | grep Swap | awk '{print $2}') -eq 0 ]; then
    log_info "Criando arquivo de swap de 2GB..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log_success "Swap configurado"
else
    log_info "Swap já está configurado"
fi

log_info "Criando diretório da aplicação..."
sudo -u whatsapp mkdir -p /home/whatsapp/whatsapp-app
chown whatsapp:whatsapp /home/whatsapp/whatsapp-app

log_success "Preparação do servidor concluída!"
log_info "Próximos passos:"
echo "1. Faça login como usuário whatsapp: sudo su - whatsapp"
echo "2. Clone o repositório: git clone <seu-repo> /home/whatsapp/whatsapp-app"
echo "3. Entre no diretório: cd /home/whatsapp/whatsapp-app"
echo "4. Execute o deploy: chmod +x deploy.sh && ./deploy.sh"
echo "5. Configure seu domínio no Nginx se necessário"
echo "6. Configure SSL com certbot se tiver domínio"

log_info "Informações do sistema:"
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "PM2: $(pm2 --version)"
echo "Nginx: $(nginx -v 2>&1)"
echo "Chrome: $(google-chrome --version)"

log_success "Servidor pronto para deploy da aplicação WhatsApp AI Central!"