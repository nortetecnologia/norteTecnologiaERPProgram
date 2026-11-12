# Script de limpeza forçada do Norte Tecnologia ERP
# Execute como Administrador

Write-Host "=== Limpeza do Norte Tecnologia ERP ===" -ForegroundColor Yellow

# 1. Matar todos os processos do app
Write-Host "`n[1/5] Encerrando processos..." -ForegroundColor Cyan
$processes = @("Norte Tecnologia ERP", "norte-tecnologia-erp", "NorteTecnologiaERP", "electron")
foreach ($proc in $processes) {
    $found = Get-Process -Name $proc -ErrorAction SilentlyContinue
    if ($found) {
        $found | Stop-Process -Force
        Write-Host "  Encerrado: $proc"
    }
}
Start-Sleep -Seconds 2

# 2. Adicionar exclusão no Windows Defender
Write-Host "`n[2/5] Adicionando exclusão no Windows Defender..." -ForegroundColor Cyan
$paths = @(
    "$env:LOCALAPPDATA\Programs\Norte Tecnologia ERP",
    "$env:APPDATA\Norte Tecnologia ERP",
    "$env:APPDATA\norte-tecnologia-erp-updater"
)
foreach ($path in $paths) {
    try {
        Add-MpPreference -ExclusionPath $path -ErrorAction SilentlyContinue
        Write-Host "  Exclusão adicionada: $path"
    } catch {
        Write-Host "  (ignorado): $path"
    }
}

# 3. Remover arquivos da instalação atual
Write-Host "`n[3/5] Removendo arquivos da instalação..." -ForegroundColor Cyan
$installPaths = @(
    "$env:LOCALAPPDATA\Programs\Norte Tecnologia ERP",
    "$env:APPDATA\norte-tecnologia-erp-updater"
)
foreach ($path in $installPaths) {
    if (Test-Path $path) {
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Removido: $path"
    }
}

# 4. Limpar atalhos antigos
Write-Host "`n[4/5] Removendo atalhos antigos..." -ForegroundColor Cyan
$shortcuts = @(
    "$env:USERPROFILE\Desktop\Norte Tecnologia ERP.lnk",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Norte Tecnologia ERP.lnk",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Norte Tecnologia ERP\Norte Tecnologia ERP.lnk"
)
foreach ($s in $shortcuts) {
    if (Test-Path $s) {
        Remove-Item $s -Force -ErrorAction SilentlyContinue
        Write-Host "  Removido: $s"
    }
}

# 5. Limpar registro
Write-Host "`n[5/5] Limpando registro..." -ForegroundColor Cyan
$regPaths = @(
    "HKCU:\Software\Norte Tecnologia ERP",
    "HKCU:\Software\norte-tecnologia-erp"
)
foreach ($reg in $regPaths) {
    if (Test-Path $reg) {
        Remove-Item $reg -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Removido: $reg"
    }
}

Write-Host "`n✅ Limpeza concluída!" -ForegroundColor Green
Write-Host "Agora baixe o novo instalador em:"
Write-Host "https://github.com/nortetecnologia/norteTecnologiaERPProgram/releases/latest" -ForegroundColor Yellow
Write-Host "`nPressione Enter para fechar..."
Read-Host
