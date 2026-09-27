@echo off
chcp 65001 >nul
title Atualizador Automatico - STT e TTS de Satiro
echo ================================================================
echo       STT & TTS de Satiro - Atualizador da Extensão
echo ================================================================
echo.
echo [1/3] Verificando repositorio local...
echo.

if exist ".git" (
    echo [2/3] Repositorio Git detectado. Executando git pull...
    git pull origin main
    if %errorlevel% neq 0 (
        git pull origin master
    )
    if %errorlevel% neq 0 (
        git pull
    )
) else (
    echo [2/3] Pasta nao e um repositorio Git. Baixando arquivos atualizados do servidor via PowerShell...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $u = 'https://github.com/pinguelanarosca/EXTTTSSTT/archive/refs/heads/main.zip'; Write-Host ('Baixando ' + $u + '...'); Invoke-WebRequest -Uri $u -OutFile 'update_temp.zip'; Expand-Archive -Path 'update_temp.zip' -DestinationPath '.' -Force; Remove-Item 'update_temp.zip' -Force; Write-Host '✓ Arquivos substituidos com sucesso!'"
)

echo.
echo [3/3] Atualizacao concluida com sucesso!
echo ================================================================
echo Proximo passo:
echo  1. Abra o Google Chrome.
echo  2. Acesse chrome://extensions/
echo  3. Clique em 'Recarregar Extensao' (icone de circulo com seta).
echo ================================================================
echo.
pause
