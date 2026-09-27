const fs = require('fs');
const path = require('path');

const fileDefinitions = [
  {
    filename: '.env.example',
    path: '.env.example',
    description: 'Arquivo de exemplo de configuração da chave de API do Google Gemini',
    language: 'text'
  },
  {
    filename: 'manifest.json',
    path: 'manifest.json',
    description: 'Manifesto da extensão Chrome (Manifest V3)',
    language: 'json'
  },
  {
    filename: 'background.js',
    path: 'background.js',
    description: 'Background Service Worker para captura de abas e menus de contexto',
    language: 'javascript'
  },
  {
    filename: 'content.js',
    path: 'content.js',
    description: 'Content Script injetado em abas (Narração, Google Lens e Transcrição)',
    language: 'javascript'
  },
  {
    filename: 'content.css',
    path: 'content.css',
    description: 'Estilos CSS do HUD flutuante e do Viewfinder do Google Lens',
    language: 'css'
  },
  {
    filename: 'popup.html',
    path: 'popup.html',
    description: 'Interface HTML do Popup da extensão com abas e console TTS',
    language: 'html'
  },
  {
    filename: 'popup.js',
    path: 'popup.js',
    description: 'Lógica JS do Popup com gravação direta por microfone e histórico',
    language: 'javascript'
  },
  {
    filename: 'options.html',
    path: 'options.html',
    description: 'Central de Opções Completa da Extensão com Mixer TTS e Agentes',
    language: 'html'
  },
  {
    filename: 'options.js',
    path: 'options.js',
    description: 'Lógica JS da Central de Opções com teste de voz e gerenciador de chaves',
    language: 'javascript'
  },
  {
    filename: 'README.md',
    path: 'README.md',
    description: 'Guia de instalação e utilização da extensão Chrome',
    language: 'markdown'
  },
  {
    filename: 'atualizar_extensao.bat',
    path: 'atualizar_extensao.bat',
    description: 'Script do Windows para atualização automática via Git',
    language: 'bat'
  },
  {
    filename: 'atualizar_extensao.sh',
    path: 'atualizar_extensao.sh',
    description: 'Script Linux/macOS para atualização automática via Git',
    language: 'bash'
  }
];

const rootDir = path.resolve(__dirname, '..');

let output = `import { ExtensionFileItem } from '../types';

export const DEFAULT_SETTINGS = {
  connectionMode: 'direct' as const,
  apiKey: 'YOUR_GEMINI_API_KEY',
  serverUrl: '',
  ttsModel: 'gemini-3.8-flash-lite-tts',
  sttModel: 'gemini-3.5-flash-lite',
  ttsVoice: 'Kore' as const,
  narratorInstruction: 'Você é um narrador natural e expressivo. Leia o texto com dicção impecável, ritmo equilibrado e entonação humana. Converta siglas e números para forma falada fluida.',
  transcriberInstruction: 'Transcreva com fidelidade absoluta o áudio recebido. Aplique pontuação correta (pontos, vírgulas, interrogações), remova gagueiras e vícios de linguagem comuns (como "ééé", "tipo assim"). Retorne estritamente o texto transcrito, sem introduções ou observações.',
  visionInstruction: 'Analise detalhadamente a imagem capturada da tela com o Google Lens. Se contiver texto, transcreva ou leia-o com máxima precisão. Se contiver gráficos, tabelas ou código, resuma e descreva os pontos centrais de forma concisa e natural para ser ouvida.',
  enableCtrlB: true,
  enableCtrlDrag: true,
  enablePauseBreak: true,
  soundFeedback: true,
  ttsSpeed: 1.0,
  ttsPitch: 0,
  ttsVolume: 1.0,
  ttsBass: 0,
  ttsMid: 0,
  ttsTreble: 0,
  ttsAmbience: 'none' as const,
  ttsAmbienceVolume: 0.2,
};

export const EXTENSION_FILES: ExtensionFileItem[] = [
`;

fileDefinitions.forEach((def, index) => {
  const filePath = path.join(rootDir, def.path);
  let fileContent = '';
  if (fs.existsSync(filePath)) {
    fileContent = fs.readFileSync(filePath, 'utf8');
  } else {
    console.warn(`[syncExtensionFiles] File not found: ${filePath}`);
  }

  output += `  {\n`;
  output += `    filename: ${JSON.stringify(def.filename)},\n`;
  output += `    path: ${JSON.stringify(def.path)},\n`;
  output += `    description: ${JSON.stringify(def.description)},\n`;
  output += `    language: ${JSON.stringify(def.language)},\n`;
  output += `    content: ${JSON.stringify(fileContent)}\n`;
  output += `  }${index < fileDefinitions.length - 1 ? ',' : ''}\n`;
});

output += `];\n`;

const targetTsFile = path.join(rootDir, 'src', 'data', 'extensionFiles.ts');
fs.writeFileSync(targetTsFile, output, 'utf8');
console.log(`Successfully synchronized ${fileDefinitions.length} files into ${targetTsFile}`);
