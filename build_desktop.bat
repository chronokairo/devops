@echo off
echo Compilando release do Riluvi - Editor de Texto por Voz para Windows...
flutter build windows --release
echo.
echo Build concluído! O executável está em:
echo build\windows\runner\Release\riluvi.exe
echo.
echo Para executar o app:
echo cd build\windows\runner\Release
echo riluvi.exe
pause
