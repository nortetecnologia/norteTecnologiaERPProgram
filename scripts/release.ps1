# release.ps1 — cria tag e dispara o build automatico no GitHub Actions
# Uso: .\scripts\release.ps1 0.2.0

param(
  [Parameter(Mandatory=$true)]
  [string]$Version
)

$tag = "v$Version"

# Atualizar versao no package.json
$content = Get-Content package.json -Raw
$content = $content -replace '"version": "[^"]*"', "`"version`": `"$Version`""
$utf8NoBOM = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Resolve-Path "package.json").Path, $content, $utf8NoBOM)

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
