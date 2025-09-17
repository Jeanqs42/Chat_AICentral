#!/bin/bash

# Script de Deploy Automatizado para VPS Ubuntu
# WhatsApp AI Central Application

set -e

echo "🚀 Iniciando deploy da aplicação WhatsApp AI Central..."

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
if [[ $EUID -eq 0 ]]; then
   log_error "Este script não deve ser executado como root"
   exit 1
fi

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    log_error "Node.js não está instalado. Execute primeiro o script de preparação do servidor."
    exit 1
fi

# Verificar se o PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    log_error "PM2 não está instalado. Execute: sudo npm install -g pm2"
    exit 1
fi

# Verificar se o PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
    log_error "PostgreSQL não está rodando. Execute: sudo systemctl start postgresql"
    exit 1
fi

log_info "Instalando dependências do servidor..."
npm install

log_info "Instalando dependências do cliente..."
cd client
npm install

log_info "Fazendo build do cliente..."
npm run build
cd ..

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    log_warning "Arquivo .env não encontrado. Copiando .env.example..."
    cp .env.example .env
    log_warning "IMPORTANTE: Edite o arquivo .env com suas configurações antes de continuar!"
    log_warning "Execute: nano .env"
    read -p "Pressione Enter após configurar o arquivo .env..."
fi

# Criar diretório de logs se não existir
mkdir -p logs

# Parar aplicação se estiver rodando
if pm2 list | grep -q "whatsapp-multi-user"; then
    log_info "Parando aplicação existente..."
    pm2 stop whatsapp-multi-user
    pm2 delete whatsapp-multi-user
fi

log_info "Iniciando aplicação com PM2..."
pm2 start ecosystem.config.js

log_info "Salvando configuração do PM2..."
pm2 save

# Configurar PM2 para iniciar no boot (apenas se não estiver configurado)
if ! pm2 startup | grep -q "already"; then
    log_info "Configurando PM2 para iniciar no boot..."
    pm2 startup
fi

log_success "Deploy concluído com sucesso!"
log_info "Comandos úteis:"
echo "  - Ver status: pm2 status"
echo "  - Ver logs: pm2 logs whatsapp-multi-user"
echo "  - Reiniciar: pm2 restart whatsapp-multi-user"
echo "  - Parar: pm2 stop whatsapp-multi-user"
echo "  - Monitorar: pm2 monit"

log_info "Verificando status da aplicação..."
pm2 status

log_success "Aplicação rodando! Acesse via navegador na porta 3002"