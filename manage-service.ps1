# WhatsApp Multi-Usuario - Gerenciador de Servico
# Uso: .\manage-service.ps1 [start|stop|restart|status]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "restart", "status", "install")]
    [string]$Action = "start"
)

$ProjectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServiceName = "WhatsAppMultiUsuario"
$ProcessName = "node"
$ServerScript = "server.js"
$LogFile = Join-Path $ProjectPath "logs\service.log"

# Funcao para criar diretorio de logs
function Ensure-LogDirectory {
    $LogDir = Join-Path $ProjectPath "logs"
    if (!(Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
        Write-Host "Diretorio de logs criado: $LogDir" -ForegroundColor Green
    }
}

# Funcao para escrever logs
function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] $Message"
    Add-Content -Path $LogFile -Value $LogEntry
    Write-Host $LogEntry
}

# Funcao para verificar se o servico esta rodando
function Get-ServiceStatus {
    $Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Where-Object {
        $_.MainModule.FileName -like "*$ProjectPath*"
    }
    return $Process
}

# Funcao para iniciar o servico
function Start-Service {
    Write-Host "Iniciando WhatsApp Multi-Usuario..." -ForegroundColor Yellow
    
    # Verificar se ja esta rodando
    $ExistingProcess = Get-ServiceStatus
    if ($ExistingProcess) {
        Write-Host "Servico ja esta rodando (PID: $($ExistingProcess.Id))" -ForegroundColor Green
        return
    }
    
    # Navegar para o diretorio do projeto
    Set-Location $ProjectPath
    
    # Verificar dependencias
    if (!(Test-Path "node_modules")) {
        Write-Host "Instalando dependencias do servidor..." -ForegroundColor Yellow
        npm install
    }
    
    # Build do cliente
    Set-Location "client"
    if (!(Test-Path "node_modules")) {
        Write-Host "Instalando dependencias do cliente..." -ForegroundColor Yellow
        npm install
    }
    
    Write-Host "Fazendo build do cliente..." -ForegroundColor Yellow
    npm run build
    
    # Voltar para o diretorio raiz
    Set-Location $ProjectPath
    
    # Definir variaveis de ambiente
    $env:NODE_ENV = "production"
    $env:PORT = "3001"
    
    # Iniciar o servidor em background
    Write-Host "Iniciando servidor em background..." -ForegroundColor Yellow
    $Process = Start-Process -FilePath "node" -ArgumentList $ServerScript -WindowStyle Hidden -PassThru
    
    Start-Sleep -Seconds 3
    
    # Verificar se iniciou corretamente
    $RunningProcess = Get-ServiceStatus
    if ($RunningProcess) {
        Write-Log "Servico iniciado com sucesso (PID: $($RunningProcess.Id))"
        Write-Host "✅ Servico iniciado com sucesso!" -ForegroundColor Green
        Write-Host "   PID: $($RunningProcess.Id)" -ForegroundColor Cyan
        Write-Host "   Servidor: http://localhost:3001" -ForegroundColor Cyan
        Write-Host "   Cliente: http://localhost:5173" -ForegroundColor Cyan
    } else {
        Write-Log "Falha ao iniciar o servico"
        Write-Host "❌ Falha ao iniciar o servico" -ForegroundColor Red
    }
}

# Funcao para parar o servico
function Stop-Service {
    Write-Host "Parando WhatsApp Multi-Usuario..." -ForegroundColor Yellow
    
    $Process = Get-ServiceStatus
    if ($Process) {
        $Process | Stop-Process -Force
        Write-Log "Servico parado (PID: $($Process.Id))"
        Write-Host "✅ Servico parado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Servico nao esta rodando" -ForegroundColor Yellow
    }
}

# Funcao para mostrar status
function Show-Status {
    $Process = Get-ServiceStatus
    if ($Process) {
        Write-Host "✅ Servico RODANDO" -ForegroundColor Green
        Write-Host "   PID: $($Process.Id)" -ForegroundColor Cyan
        Write-Host "   Memoria: $([math]::Round($Process.WorkingSet64/1MB, 2)) MB" -ForegroundColor Cyan
        Write-Host "   Iniciado: $($Process.StartTime)" -ForegroundColor Cyan
        Write-Host "   Servidor: http://localhost:3001" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Servico PARADO" -ForegroundColor Red
    }
}

# Funcao para instalar como servico do Windows
function Install-WindowsService {
    Write-Host "Instalando como servico do Windows..." -ForegroundColor Yellow
    
    # Verificar se esta rodando como administrador
    if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
        Write-Host "❌ Execute como Administrador para instalar o servico" -ForegroundColor Red
        return
    }
    
    # Criar script de servico
    $ServiceScript = @"
@echo off
cd /d "$ProjectPath"
set NODE_ENV=production
set PORT=3001
node server.js
"@
    
    $ServiceScriptPath = Join-Path $ProjectPath "service.bat"
    $ServiceScript | Out-File -FilePath $ServiceScriptPath -Encoding ASCII
    
    # Instalar servico usando sc.exe
    $ServiceCommand = "sc.exe create `"$ServiceName`" binPath= `"$ServiceScriptPath`" start= auto DisplayName= `"WhatsApp Multi-Usuario`""
    Invoke-Expression $ServiceCommand
    
    Write-Host "✅ Servico instalado! Use 'net start $ServiceName' para iniciar" -ForegroundColor Green
}

# Executar acao
Ensure-LogDirectory

switch ($Action) {
    "start" { Start-Service }
    "stop" { Stop-Service }
    "restart" { 
        Stop-Service
        Start-Sleep -Seconds 2
        Start-Service
    }
    "status" { Show-Status }
    "install" { Install-WindowsService }
}

Write-Host ""
Write-Host "Comandos disponiveis:" -ForegroundColor Cyan
Write-Host "  .\manage-service.ps1 start    - Iniciar servico" -ForegroundColor Gray
Write-Host "  .\manage-service.ps1 stop     - Parar servico" -ForegroundColor Gray
Write-Host "  .\manage-service.ps1 restart  - Reiniciar servico" -ForegroundColor Gray
Write-Host "  .\manage-service.ps1 status   - Ver status" -ForegroundColor Gray
Write-Host "  .\manage-service.ps1 install  - Instalar como servico do Windows" -ForegroundColor Gray