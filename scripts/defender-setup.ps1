<#
.SYNOPSIS
  Configura o Windows Defender para não deletar/bloquear o ERP Norte Tecnologia.
  Execute como Administrador uma única vez após instalar o programa.

.DESCRIPTION
  O Windows Defender/SmartScreen pode bloquear executáveis sem assinatura digital.
  Este script adiciona exclusões APENAS para o nosso aplicativo, sem comprometer
  a segurança geral do sistema.
#>

param(
  [string]$InstallPath = "$env:LOCALAPPDATA\Programs\Norte Tecnologia ERP"
)

# Verificar se está rodando como Admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "⚠ Este script precisa ser executado como Administrador." -ForegroundColor Yellow
  Write-Host "  Clique com botão direito em PowerShell → Executar como Administrador" -ForegroundColor Yellow
  Read-Host "Pressione Enter para fechar"
  exit 1
}

Write-Host ""
Write-Host "=== Configuração Windows Defender - Norte Tecnologia ERP ===" -ForegroundColor Cyan
Write-Host ""

# 1. Adicionar exclusão de pasta de instalação
if (Test-Path $InstallPath) {
  Write-Host "✓ Adicionando exclusão para: $InstallPath" -ForegroundColor Green
  Add-MpPreference -ExclusionPath $InstallPath -ErrorAction SilentlyContinue
} else {
  Write-Host "  Pasta de instalação não encontrada: $InstallPath" -ForegroundColor Yellow
  Write-Host "  Será adicionada assim que o programa for instalado." -ForegroundColor Yellow
  Add-MpPreference -ExclusionPath $InstallPath -ErrorAction SilentlyContinue
}

# 2. Adicionar exclusão para pasta AppData do ERP (banco de dados local)
$appData = "$env:APPDATA\Norte Tecnologia ERP"
Write-Host "✓ Adicionando exclusão para dados do app: $appData" -ForegroundColor Green
Add-MpPreference -ExclusionPath $appData -ErrorAction SilentlyContinue

# 3. Adicionar exclusão do processo
$exePath = Join-Path $InstallPath "Norte Tecnologia ERP.exe"
Write-Host "✓ Adicionando exclusão de processo: Norte Tecnologia ERP.exe" -ForegroundColor Green
Add-MpPreference -ExclusionProcess "Norte Tecnologia ERP.exe" -ErrorAction SilentlyContinue

# 4. Verificar se exclusões foram adicionadas
Write-Host ""
Write-Host "Exclusões configuradas:" -ForegroundColor Cyan
$prefs = Get-MpPreference
$prefs.ExclusionPath | Where-Object { $_ -like "*Norte Tecnologia*" } | ForEach-Object {
  Write-Host "  📁 $_" -ForegroundColor White
}
$prefs.ExclusionProcess | Where-Object { $_ -like "*Norte Tecnologia*" } | ForEach-Object {
  Write-Host "  ⚙ $_" -ForegroundColor White
}

Write-Host ""
Write-Host "✅ Configuração concluída! O Windows Defender não irá interferir com o ERP." -ForegroundColor Green
Write-Host ""
Write-Host "Nota: Para proteção máxima do sistema, considere assinar digitalmente" -ForegroundColor Gray
Write-Host "o executável com um certificado de code signing (DigiCert, Sectigo etc.)" -ForegroundColor Gray
Write-Host ""
Read-Host "Pressione Enter para fechar"
