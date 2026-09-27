#!/usr/bin/env bash
echo "================================================================"
echo "      STT & TTS de Satiro - Atualizador da Extensão             "
echo "================================================================"
echo ""
echo "[1/3] Verificando repositório local..."

if [ -d ".git" ]; then
    echo "[2/3] Repositório Git detectado. Executando git pull..."
    git pull origin main || git pull origin master || git pull
else
    echo "[2/3] Pasta não é um repositório Git local. Baixando arquivos atualizados do servidor..."
    
    if command -v curl &> /dev/null; then
        curl -L "https://github.com/pinguelanarosca/FalaGemini/archive/refs/heads/main.zip" -o update_temp.zip
    elif command -v wget &> /dev/null; then
        wget "https://github.com/pinguelanarosca/FalaGemini/archive/refs/heads/main.zip" -O update_temp.zip
    fi

    if [ -f "update_temp.zip" ]; then
        if unzip -o update_temp.zip > /dev/null 2>&1; then
            rm -f update_temp.zip
            echo "✓ Arquivos atualizados com sucesso via pacote ZIP!"
        else
            # Se falhar o unzip, pode ser que o download veio corrompido ou erro 404
            rm -f update_temp.zip
            echo "❌ Erro ao extrair o arquivo ZIP (arquivo corrompido ou repositório indisponível)."
            echo "Tentando instalar diretamente via Git Clone..."
            if command -v git &> /dev/null; then
                git clone https://github.com/pinguelanarosca/FalaGemini.git temp_clone && \
                cp -r temp_clone/* . && \
                rm -rf temp_clone && \
                echo "✓ Arquivos sincronizados com sucesso via Git Clone!"
            else
                exit 1
            fi
        fi
    else
        echo "❌ Falha ao baixar o pacote. Verifique sua conexão com a internet."
        exit 1
    fi
fi

echo ""
echo "[3/3] ✓ Extensão atualizada com sucesso!"
echo "Abra o Chrome (chrome://extensions/) e clique no ícone de recarregar (🔄) na extensão."
