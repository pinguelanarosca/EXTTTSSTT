import { ModalityAgent } from '../types';

export const DEFAULT_MODALITY_AGENTS: ModalityAgent[] = [
  // 1. MODALIDADE: LOCUÇÃO (Voz Comercial, Spots, Anúncios, Foco)
  {
    id: 'agent-loc-radio',
    name: 'Locutor Radialista & Broadcast',
    role: 'Voz encorpada, dicção expressiva e ritmo dinâmico para notícias, avisos e chamadas.',
    modality: 'locution',
    model: 'gemini-2.5-flash',
    voiceName: 'Fenrir',
    systemInstruction: 'Você é um locutor profissional de rádio e broadcast. Pronuncie o texto com impostação vocal firme, energia controlada, pausas enfáticas e dicção cristalina em português brasileiro.',
    badge: 'Popular',
    temperature: 0.3
  },
  {
    id: 'agent-loc-exec',
    name: 'Apresentador Executivo & Podcast',
    role: 'Tom profissional, calmo, seguro e articulado para apresentações e podcasts.',
    modality: 'locution',
    model: 'gemini-2.5-pro',
    voiceName: 'Kore',
    systemInstruction: 'Você é um apresentador executivo e podcaster de alto nível. Comunique as ideias com clareza impecável, entonação acolhedora, tom assertivo e ritmo equilibrado.',
    badge: 'Premium',
    temperature: 0.4
  },
  {
    id: 'agent-loc-energetic',
    name: 'Locutor Comercial & Impacto',
    role: 'Voz enérgica, vibrante e persuasiva para destacar informações essenciais.',
    modality: 'locution',
    model: 'gemini-2.5-flash',
    voiceName: 'Puck',
    systemInstruction: 'Você é um locutor comercial de alto impacto. Mantenha entonação alegre, ritmo acelerado e envolvente, destacando pontos-chave com vivacidade.',
    badge: 'Energia',
    temperature: 0.5
  },

  // 2. MODALIDADE: NARRAÇÃO (Textos Longos, Artigos, Livros)
  {
    id: 'agent-narr-audiobook',
    name: 'Narrador de Audiobooks & Literatura',
    role: 'Cadência fluida, pausas dramáticas naturais e respiração suave.',
    modality: 'narration',
    model: 'gemini-2.5-pro',
    voiceName: 'Charon',
    systemInstruction: 'Você é um narrador experiente de audiolivros e literatura. Leia o texto com profundidade, respeito absoluto à pontuação, modulação emocional sutil e ritmo tranquilo e envolvente.',
    badge: 'Recomendado',
    temperature: 0.3
  },
  {
    id: 'agent-narr-teacher',
    name: 'Professor Didático & Acadêmico',
    role: 'Tom explicativo, pausado e de fácil assimilação para estudos e pesquisas.',
    modality: 'narration',
    model: 'gemini-2.5-flash',
    voiceName: 'Zephyr',
    systemInstruction: 'Você é um professor e pesquisador acadêmico. Narre artigos, papers e tutoriais com clareza conceitual, ritmo moderado e tom amigável e instrutivo.',
    badge: 'Didático',
    temperature: 0.2
  },
  {
    id: 'agent-narr-natural',
    name: 'Narrador Natural & Conversacional',
    role: 'Leitura leve como se estivesse conversando diretamente com o ouvinte.',
    modality: 'narration',
    model: 'gemini-2.5-flash',
    voiceName: 'Kore',
    systemInstruction: 'Você é um narrador contemporâneo com tom coloquial e natural. Leia com espontaneidade, sem artificialismos mecânicos.',
    badge: 'Humano',
    temperature: 0.4
  },

  // 3. MODALIDADE: TRANSCRIÇÃO (STT de Microfone e Áudios)
  {
    id: 'agent-stt-verbatim',
    name: 'Transcritor Estenógrafo Perfeito',
    role: 'Fidelidade absoluta palavra por palavra com pontuação gramatical impecável.',
    modality: 'transcription',
    model: 'gemini-2.5-flash',
    systemInstruction: 'Você é um transcritor estenógrafo profissional de alta precisão. Transcreva o áudio em português do Brasil respeitando todas as palavras faladas, aplicando pontuação correta (pontos, vírgulas, interrogações e parágrafos) e sem adicionar comentários ou introduções.',
    badge: 'Fidelidade 100%',
    temperature: 0.1
  },
  {
    id: 'agent-stt-revisor',
    name: 'Revisor & Limpador de Vícios',
    role: 'Remove "hums", repetições, hesitações e organiza em frases fluidas.',
    modality: 'transcription',
    model: 'gemini-2.5-flash',
    systemInstruction: 'Transcreva o áudio eliminando vícios de linguagem (como "ééé", "tipo assim", "né", gaguejos e repetições involuntárias). Formate o texto resultante de maneira elegante, coesa e pronta para publicação.',
    badge: 'Produtividade',
    temperature: 0.2
  },
  {
    id: 'agent-stt-notes',
    name: 'Transcritor Sintetizador de Notas',
    role: 'Transcreve e estrutura a fala em tópicos e bullet points.',
    modality: 'transcription',
    model: 'gemini-2.5-pro',
    systemInstruction: 'Transcreva o conteúdo falado e organize as ideias principais em tópicos estruturados (bullet points), mantendo os termos técnicos e destaques.',
    badge: 'Estruturado',
    temperature: 0.2
  },

  // 4. MODALIDADE: RECORTE & CAPTURA DE TELA (OCR & Análise Visual)
  {
    id: 'agent-vis-ocr',
    name: 'Analista Visual & OCR Técnico',
    role: 'Extração precisa de textos, tabelas, formulários e botões em tela.',
    modality: 'vision',
    model: 'gemini-2.5-flash',
    systemInstruction: 'Você é um especialista em OCR e análise de capturas de tela. Identifique e transcreva com rigor todo o texto contido na imagem recortada. Se for uma tabela ou formulário, preserve a estrutura. Se for uma mensagem ou artigo, entregue o texto limpo e legível.',
    badge: 'Precisão OCR',
    temperature: 0.1
  },
  {
    id: 'agent-vis-reader',
    name: 'Leitor Visual Acessível',
    role: 'Lê o texto da imagem de forma fluida e sintetiza gráficos ou diagramas.',
    modality: 'vision',
    model: 'gemini-2.5-flash',
    systemInstruction: 'Analise a imagem da tela capturada. Extraia o texto principal para ser lido em voz alta e, se houver infográficos ou diagramas visuais, adicione uma síntese explicativa curta entre colchetes.',
    badge: 'Acessibilidade',
    temperature: 0.2
  },
  {
    id: 'agent-vis-code',
    name: 'Extrator de Código & IDEs',
    role: 'Reconhece trechos de código em editores, logs de terminal e erros visuais.',
    modality: 'vision',
    model: 'gemini-2.5-pro',
    systemInstruction: 'Você é um extrator técnico de código e interfaces de desenvolvimento. Transcreva blocos de código presentes na imagem com indentação, mantendo nomes de variáveis e sintaxes exatas da linguagem.',
    badge: 'Dev OCR',
    temperature: 0.1
  }
];

export const TTS_CASCADE_ORDER = [
  { id: 'gemini-3.8-live-thinking', name: 'Gemini 3.8 Live Extended Thinking', desc: 'Raciocínio profundo e fala natural em tempo real' },
  { id: 'gemini-3.8-live', name: 'Gemini 3.8 Live', desc: 'Streaming bidirecional ultrarrápido' },
  { id: 'gemini-3-flash-live', name: 'Gemini 3 Flash Live', desc: 'Sessão contínua de áudio ao vivo' },
  { id: 'gemini-3.8-flash-lite-tts', name: 'Gemini 3.8 Flash Lite TTS', desc: 'Latência mínima para frases curtas' },
  { id: 'gemini-3.8-flash-tts', name: 'Gemini 3.8 Flash TTS', desc: 'Equilíbrio ideal entre naturalidade e velocidade' },
  { id: 'gemini-3.1-flash-tts', name: 'Gemini 3.1 Flash TTS', desc: 'Geração rápida de voz' },
  { id: 'gemini-2.5-flash-tts', name: 'Gemini 2.5 Flash TTS', desc: 'Estabilidade e ampla compatibilidade' },
  { id: 'gemini-3.1-flash-maps-grounding', name: 'Map grounding Gemini 3.1 Flash TTS', desc: 'Síntese ancorada com localização e contexto' }
];

export const STT_CASCADE_ORDER = [
  { id: 'gemini-3.8-live-thinking', name: 'Gemini 3.8 Live Extended Thinking', desc: 'Transcrição com raciocínio e pontuação precisa' },
  { id: 'gemini-3.8-live', name: 'Gemini 3.8 Live', desc: 'Streaming de transcrição ao vivo' },
  { id: 'gemini-3-flash-live', name: 'Gemini 3 Flash Live', desc: 'Detecção contínua de fala' },
  { id: 'gemini-3.8-flash-lite-stt', name: 'Gemini 3.8 Flash Lite STT', desc: 'Transcrição instantânea com menor latência' },
  { id: 'gemini-3.8-flash-stt', name: 'Gemini 3.8 Flash STT', desc: 'Alta fidelidade de vocabulário' },
  { id: 'gemini-3.1-flash-stt', name: 'Gemini 3.1 Flash STT', desc: 'Transcrição estável para áudios longos' },
  { id: 'gemini-2.5-flash-stt', name: 'Gemini 2.5 Flash STT', desc: 'Fidelidade gramatical completa' },
  { id: 'gemini-3.1-flash-maps-grounding', name: 'Map grounding Gemini 3.1 Flash STT', desc: 'Transcrição com ancoragem geográfica' }
];

export const AVAILABLE_MODELS = [
  {
    id: 'gemini-3.8-live-thinking',
    name: 'Gemini 3.8 Live Extended Thinking',
    category: 'Live & Raciocínio',
    description: 'Modo Live com raciocínio estendido e dicção expressiva.',
    recommendedFor: ['narration', 'transcription', 'locution']
  },
  {
    id: 'gemini-3.8-live',
    name: 'Gemini 3.8 Live',
    category: 'Live Tempo Real',
    description: 'Streaming contínuo de áudio com latência ultrabaixa.',
    recommendedFor: ['locution', 'transcription']
  },
  {
    id: 'gemini-3-flash-live',
    name: 'Gemini 3 Flash Live',
    category: 'Live Flash',
    description: 'Interação rápida em tempo real para ditado e comandos.',
    recommendedFor: ['transcription', 'locution']
  },
  {
    id: 'gemini-3.8-flash-lite-tts',
    name: 'Gemini 3.8 Flash Lite TTS',
    category: 'TTS Ultra Rápido',
    description: 'Especialista em geração de fala imediata.',
    recommendedFor: ['locution', 'narration']
  },
  {
    id: 'gemini-3.8-flash-tts',
    name: 'Gemini 3.8 Flash TTS',
    category: 'TTS Geral',
    description: 'Vozes humanas expressivas com entonação natural.',
    recommendedFor: ['narration', 'locution']
  },
  {
    id: 'gemini-3.1-flash-tts',
    name: 'Gemini 3.1 Flash TTS',
    category: 'TTS Produção',
    description: 'Síntese de voz com resposta rápida.',
    recommendedFor: ['narration']
  },
  {
    id: 'gemini-2.5-flash-tts',
    name: 'Gemini 2.5 Flash TTS',
    category: 'TTS Flash',
    description: 'Excelente compatibilidade e resposta ágil.',
    recommendedFor: ['locution', 'narration']
  },
  {
    id: 'gemini-3.1-flash-maps-grounding',
    name: 'Map grounding Gemini 3.1 Flash TTS',
    category: 'Ancoragem & Mapas',
    description: 'Síntese com conhecimento contextual e geográfico.',
    recommendedFor: ['narration', 'vision']
  }
];
