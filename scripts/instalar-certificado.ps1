# Instala o certificado de assinatura do Norte Tecnologia ERP
# e desativa o Smart App Control (necessario para apps internos)
# EXECUTE COMO ADMINISTRADOR em cada PC da empresa.

param(
    [string]$CerPath = ""
)

# --- Verifica admin ---
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")) {
    Write-Host "ERRO: Execute como Administrador." -ForegroundColor Red
    Write-Host "Clique com botao direito no script > Executar como administrador"
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "=== Configuracao Norte Tecnologia ERP ===" -ForegroundColor Yellow

# --- Localiza o .cer ---
if (-not $CerPath) {
    $candidates = @(
        (Join-Path $PSScriptRoot "NorteTecnologia-codesign.cer"),
        "$env:USERPROFILE\Downloads\NorteTecnologia-codesign.cer",
        "$env:USERPROFILE\Desktop\NorteTecnologia-codesign.cer"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $CerPath = $c; break }
    }
}

if ($CerPath -and (Test-Path $CerPath)) {
    Write-Host ""
    Write-Host "[1/3] Instalando certificado de assinatura..." -ForegroundColor Cyan
    try {
        certutil -addstore TrustedPublisher "$CerPath" | Out-Null
        certutil -addstore Root            "$CerPath" | Out-Null
        Write-Host "  Certificado instalado em TrustedPublisher e Root." -ForegroundColor Green
    } catch {
        Write-Host "  Aviso: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "[1/3] Certificado .cer nao encontrado - pulando." -ForegroundColor Yellow
    Write-Host "      Coloque NorteTecnologia-codesign.cer na mesma pasta deste script."
}

# --- Desativa Smart App Control ---
Write-Host ""
Write-Host "[2/3] Desativando Smart App Control..." -ForegroundColor Cyan
try {
    $sacKey = "HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy"
    if (-not (Test-Path $sacKey)) {
        New-Item -Path $sacKey -Force | Out-Null
    }
    Set-ItemProperty -Path $sacKey -Name "VerifiedAndReputablePolicyState" -Value 0 -Type DWord
    Write-Host "  Smart App Control desativado." -ForegroundColor Green
    Write-Host "  (Reinicie o PC para aplicar completamente)" -ForegroundColor Yellow
} catch {
    Write-Host "  Aviso: $_" -ForegroundColor Yellow
}

# --- Adiciona exclusoes no Defender ---
Write-Host ""
Write-Host "[3/3] Adicionando exclusoes no Windows Defender..." -ForegroundColor Cyan
$paths = @(
    "$env:LOCALAPPDATA\Programs\Norte Tecnologia ERP",
    "$env:APPDATA\Norte Tecnologia ERP",
    "$env:APPDATA\norte-tecnologia-erp-updater"
)
foreach ($p in $paths) {
    try {
        Add-MpPreference -ExclusionPath $p -ErrorAction SilentlyContinue
        Write-Host "  Exclusao: $p" -ForegroundColor Green
    } catch {}
}
Add-MpPreference -ExclusionProcess "Norte Tecnologia ERP.exe" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Configuracao concluida!" -ForegroundColor Green
Write-Host "Reinicie o PC para aplicar todas as mudancas." -ForegroundColor Yellow
Write-Host "============================================"
Read-Host "Pressione Enter para fechar"
