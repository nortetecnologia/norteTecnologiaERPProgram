# release.ps1 — cria tag e dispara o build automatico no GitHub Actions
# Uso: .\scripts\release.ps1 0.2.0

param(
  [Parameter(Mandatory=$true)]
  [string]$Version
)

$tag = "v$Version"

# Atualizar versao no package.json
$pkg = Get-Content package.json -Raw | ConvertFrom-Json
$pkg.version = $Version
$pkg | ConvertTo-Json -Depth 100 | Out-File -FilePath package.json -Encoding utf8NoBOM

Write-Host "Versao atualizada para $Version"

# Commit e tag
git add package.json
git commit -m "chore: bump versao para $Version"
git tag $tag
git push origin master
git push origin $tag

Write-Host ""
Write-Host "Tag $tag enviada. GitHub Actions vai construir e publicar o release automaticamente."
Write-Host "Acompanhe em: https://github.com/nortetecnologia/norteTecnologiaERPProgram/actions"
