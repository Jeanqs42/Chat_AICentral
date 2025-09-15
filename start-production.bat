@echo off
echo Iniciando WhatsApp Multi-Usuario em modo producao...
echo.

REM Navegar para o diretorio do projeto
cd /d "%~dp0"

REM Verificar se o Node.js esta instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado. Por favor, instale o Node.js primeiro.
    pause
    exit /b 1
)

REM Instalar dependencias se necessario
if not exist "node_modules" (
    echo Instalando dependencias do servidor...
    npm install
)

REM Navegar para o cliente e instalar dependencias
cd client
if not exist "node_modules" (
    echo Instalando dependencias do cliente...
    npm install
)

REM Fazer build do cliente para producao
echo Fazendo build do cliente para producao...
npm run build

REM Voltar para o diretorio raiz
cd ..

REM Definir variaveis de ambiente para producao
set NODE_ENV=production
set PORT=3001

echo.
echo ========================================
echo  WhatsApp Multi-Usuario - PRODUCAO
echo ========================================
echo  Servidor: http://localhost:3001
echo  Cliente: http://localhost:5173
echo ========================================
echo.

REM Iniciar o servidor em modo producao
echo Iniciando servidor...
node server.js

pause