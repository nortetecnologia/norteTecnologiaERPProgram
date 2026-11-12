# Gera o certificado de assinatura de codigo para o Norte Tecnologia ERP
# Execute UMA VEZ, depois adicione os valores no GitHub Secrets.
# Nao precisa de administrador.

param(
    [string]$OutputDir = $PSScriptRoot
)

$certName = "Norte Tecnologia ERP"

# Senha aleatoria forte para o PFX
$chars = (65..90) + (97..122) + (48..57)
$certPassword = -join ($chars | Get-Random -Count 24 | ForEach-Object { [char]$_ })

Write-Host "=== Criando certificado de assinatura de codigo ===" -ForegroundColor Yellow

$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject "CN=$certName, O=Norte Tecnologia, C=BR" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(10) `
    -HashAlgorithm SHA256 `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -KeyUsage DigitalSignature

Write-Host "Thumbprint: $($cert.Thumbprint)" -ForegroundColor Green

$pfxPath = Join-Path $OutputDir "NorteTecnologia-codesign.pfx"
$cerPath = Join-Path $OutputDir "NorteTecnologia-codesign.cer"
$secPwd  = ConvertTo-SecureString -String $certPassword -Force -AsPlainText

Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $secPwd | Out-Null
Export-Certificate   -Cert $cert -FilePath $cerPath | Out-Null

$pfxBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($pfxPath))

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "ADICIONE ESTES 2 SECRETS NO GITHUB:" -ForegroundColor Yellow
Write-Host "Repositorio > Settings > Secrets > Actions > New secret" -ForegroundColor Cyan
Write-Host "============================================================"
Write-Host ""
Write-Host "Secret: CODE_SIGNING_CERT_BASE64" -ForegroundColor White
Write-Host $pfxBase64 -ForegroundColor Gray
Write-Host ""
Write-Host "Secret: CODE_SIGNING_CERT_PASSWORD" -ForegroundColor White
Write-Host $certPassword -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Arquivos gerados:" -ForegroundColor Green
Write-Host "  PFX (privado - nao commitar): $pfxPath"
Write-Host "  CER (publico - distribuir):   $cerPath"
Write-Host ""
Write-Host "Distribute o .cer para instalar em cada PC da empresa." -ForegroundColor Yellow
Write-Host "Execute: scripts\instalar-certificado.ps1" -ForegroundColor Yellow
