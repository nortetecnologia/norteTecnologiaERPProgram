; Configurações extras do instalador NSIS
; Este arquivo é carregado automaticamente pelo electron-builder

!macro customInstall
  ; Adiciona exclusão no Windows Defender via PowerShell
  nsExec::ExecToLog 'powershell.exe -NonInteractive -ExecutionPolicy Bypass -Command "Add-MpPreference -ExclusionPath \"$INSTDIR\" -ExclusionProcess \"Norte Tecnologia ERP.exe\" -ErrorAction SilentlyContinue"'

  ; Registra o app nos programas confiáveis do sistema
  WriteRegStr HKCU "SOFTWARE\Microsoft\Windows\CurrentVersion\Run" "NorteTecnologiaERP" ""
!macroend

!macro customUnInstall
  ; Remove exclusão do Defender ao desinstalar
  nsExec::ExecToLog 'powershell.exe -NonInteractive -ExecutionPolicy Bypass -Command "Remove-MpPreference -ExclusionPath \"$INSTDIR\" -ExclusionProcess \"Norte Tecnologia ERP.exe\" -ErrorAction SilentlyContinue"'

  DeleteRegValue HKCU "SOFTWARE\Microsoft\Windows\CurrentVersion\Run" "NorteTecnologiaERP"
!macroend
