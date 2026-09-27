import JSZip from 'jszip';
import { EXTENSION_FILES } from '../data/extensionFiles';
import { ExtensionSettings } from '../types';

/**
 * Gera o ícone PNG oficial para a extensão Chrome baseado no design STT&TTS de Satiro
 */
export function createExtensionIcon(size: number): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Fundo transparente ou suavemente arredondado escuro para alto contraste na barra do Chrome
    const radius = size * 0.18;
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, radius);
    ctx.fill();

    // Borda sutil de destaque
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = Math.max(1, size * 0.02);
    ctx.stroke();

    // 1. Estrela Gemini 4 Pontas no Topo (Azul -> Violeta)
    const starCx = size * 0.5;
    const starCy = size * 0.26;
    const starOuter = size * 0.22;

    const starGrad = ctx.createLinearGradient(
      starCx - starOuter,
      starCy - starOuter,
      starCx + starOuter,
      starCy + starOuter
    );
    starGrad.addColorStop(0, '#38bdf8');
    starGrad.addColorStop(0.5, '#6366f1');
    starGrad.addColorStop(1, '#a855f7');

    ctx.save();
    ctx.fillStyle = starGrad;
    ctx.shadowColor = 'rgba(99, 102, 241, 0.6)';
    ctx.shadowBlur = size * 0.1;
    ctx.beginPath();
    ctx.moveTo(starCx, starCy - starOuter);
    ctx.quadraticCurveTo(starCx, starCy, starCx + starOuter, starCy);
    ctx.quadraticCurveTo(starCx, starCy, starCx, starCy + starOuter);
    ctx.quadraticCurveTo(starCx, starCy, starCx - starOuter, starCy);
    ctx.quadraticCurveTo(starCx, starCy, starCx, starCy - starOuter);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. Microfone (Esquerda) inclinado em direção ao Alto-Falante
    const micX = size * 0.38;
    const micY = size * 0.54;
    ctx.save();
    ctx.translate(micX, micY);
    ctx.rotate(-Math.PI / 7); // ~25 graus de inclinação

    // Corpo metálico escuro do microfone
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(1, size * 0.02);
    ctx.beginPath();
    ctx.roundRect(-size * 0.035, 0, size * 0.07, size * 0.15, size * 0.015);
    ctx.fill();
    ctx.stroke();

    // Cabeça do microfone (gaiola esférica com gradiente brilhante)
    const headGrad = ctx.createRadialGradient(-size * 0.01, -size * 0.04, 0, 0, -size * 0.04, size * 0.06);
    headGrad.addColorStop(0, '#f8fafc');
    headGrad.addColorStop(0.5, '#64748b');
    headGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, -size * 0.04, size * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Alto-falante de Som (Direita)
    const spkX = size * 0.63;
    const spkY = size * 0.54;
    const spkR = size * 0.11;

    ctx.save();
    // Aro externo metálico
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(1, size * 0.02);
    ctx.beginPath();
    ctx.arc(spkX, spkY, spkR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cone central
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(spkX, spkY, spkR * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Domo central brilhante
    const domeGrad = ctx.createRadialGradient(spkX - spkR * 0.1, spkY - spkR * 0.1, 0, spkX, spkY, spkR * 0.35);
    domeGrad.addColorStop(0, '#38bdf8');
    domeGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.arc(spkX, spkY, spkR * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Ondas Sonoras na Base
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(1.2, size * 0.035);
    ctx.lineCap = 'round';

    const waveY = size * 0.72;
    // Arcos esquerdos
    [0.12, 0.18, 0.24].forEach((rMult) => {
      ctx.beginPath();
      ctx.arc(size * 0.38, waveY, size * rMult, Math.PI * 0.55, Math.PI * 1.05);
      ctx.stroke();
    });

    // Arcos direitos
    [0.12, 0.18, 0.24].forEach((rMult) => {
      ctx.beginPath();
      ctx.arc(size * 0.62, waveY, size * rMult, -Math.PI * 0.05, Math.PI * 0.45);
      ctx.stroke();
    });
    ctx.restore();

    canvas.toBlob((blob) => {
      resolve(blob || new Blob([]));
    }, 'image/png');
  });
}

/**
 * Cria o arquivo .ZIP com todos os arquivos atualizados em tempo real prontos para carregar no Chrome
 */
export async function generateExtensionZip(currentSettings?: Partial<ExtensionSettings>): Promise<Blob> {
  // 1. Tenta baixar o arquivo compilado diretamente do servidor backend (100% fiel aos arquivos reais em disco)
  try {
    if (typeof window !== 'undefined') {
      const serverResp = await fetch(`/api/download-extension-zip?t=${Date.now()}`);
      if (serverResp.ok) {
        return await serverResp.blob();
      }
    }
  } catch (err) {
    console.warn('[ZIP Generator] Servidor direto indisponível, gerando no cliente:', err);
  }

  // 2. Fallback: Constrói dinamicamente no navegador com JSZip
  const zip = new JSZip();

  const fileList = [
    { path: 'manifest.json' },
    { path: 'background.js' },
    { path: 'content.js' },
    { path: 'content.css' },
    { path: 'popup.html' },
    { path: 'popup.js' },
    { path: 'options.html' },
    { path: 'options.js' },
    { path: 'README.md' },
    { path: '.env.example' },
    { path: 'atualizar_extensao.sh' },
    { path: 'atualizar_extensao.bat' },
  ];

  // Busca sempre a versão mais recente dos arquivos servidos pelo servidor
  for (const item of fileList) {
    let content = '';
    try {
      if (typeof window !== 'undefined') {
        const response = await fetch(`/${item.path}?t=${Date.now()}`);
        if (response.ok) {
          const txt = await response.text();
          // Garante que não é a página HTML do SPA caindo no fallback do Vite
          if (txt && !txt.trim().startsWith('<!') && !txt.trim().startsWith('<html')) {
            content = txt;
          }
        }
      }
    } catch (e) {
      console.warn(`[ZIP Generator] Falha ao obter ${item.path} via fetch:`, e);
    }

    // Se a busca falhar, utiliza os arquivos empacotados em EXTENSION_FILES
    if (!content) {
      const fallback = EXTENSION_FILES.find((f) => f.path === item.path || f.filename === item.path);
      if (fallback) {
        content = fallback.content;
      }
    }

    if (content) {
      // Injeta a chave de API e configurações customizadas se disponíveis
      if (currentSettings?.apiKey) {
        if (item.path === 'content.js' || item.path === 'popup.js' || item.path === 'options.js') {
          content = content.replace(
            /apiKey:\s*['"][^'"]*['"]/,
            `apiKey: '${currentSettings.apiKey}'`
          );
        }
      }

      zip.file(item.path, content);
    }
  }

  // 2. Gerar e adicionar ícones oficiais
  const icon16 = await createExtensionIcon(16);
  const icon48 = await createExtensionIcon(48);
  const icon128 = await createExtensionIcon(128);

  const iconsFolder = zip.folder('icons');
  if (iconsFolder) {
    iconsFolder.file('icon16.png', icon16);
    iconsFolder.file('icon48.png', icon48);
    iconsFolder.file('icon128.png', icon128);
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Nome de arquivo ZIP centralizado e padronizado em toda a aplicação
 */
export const DEFAULT_EXTENSION_ZIP_NAME = 'STT-TTS-Satiro.zip';

/**
 * Função centralizada para download direto do arquivo .zip da extensão
 */
export async function downloadExtensionZipFile(
  settings: ExtensionSettings,
  customFilename?: string
): Promise<void> {
  const filename = customFilename || DEFAULT_EXTENSION_ZIP_NAME;
  const zipBlob = await generateExtensionZip(settings);
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
