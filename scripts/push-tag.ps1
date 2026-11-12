Set-Location "C:\Users\hiago\Downloads\Norte Tecnologia ERP Program"
Write-Host "Enviando master..."
git push origin master
Write-Host "Enviando tag v0.3.3..."
git push origin v0.3.3
Write-Host "Pronto! GitHub Actions vai construir o v0.3.3."
