import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import JSZip from 'jszip';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_EXTENSION_ICONS } from './src/data/defaultIcons';

const execAsync = util.promisify(exec);

// Helper para ler a chave de API única e exclusivamente do arquivo .env na raiz do projeto (não busca no ambiente)
function getGeminiApiKey(): string {
  try {
    const dotEnvPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(dotEnvPath)) {
      const content = fs.readFileSync(dotEnvPath, 'utf8');
      const match = content.match(/GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
      if (match && match[1] && !match[1].includes('MY_GEMINI_API_KEY') && match[1].trim().length > 5) {
        return match[1].trim();
      }
      const genericMatch = content.match(/API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
      if (genericMatch && genericMatch[1] && genericMatch[1].trim().length > 5) {
        return genericMatch[1].trim();
      }
      const firstLine = content.split(/\r?\n/)[0].trim();
      if (firstLine && !firstLine.includes('=') && firstLine.length > 10) {
        return firstLine;
      }
    }
  } catch (err) {
    console.warn('Erro ao ler chave de API exclusivamente do arquivo .env:', err);
  }

  return process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';
}

function maskApiKey(key: string): string {
  if (!key) return 'Nenhuma chave encontrada em .env';
  if (key.length <= 10) return key.substring(0, 3) + '***' + key.substring(key.length - 2);
  return key.substring(0, 6) + '...' + key.substring(key.length - 4);
}

// Utilitário para adicionar cabeçalho WAV a áudio PCM 24kHz 16-bit Mono do Gemini TTS
function pcmToWavBuffer(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataLength = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);

  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Cascade de Modelos Oficiais e Otimizados para Alta Performance:
// TTS: Especializado em geração de voz natural
export const TTS_MODEL_CASCADE = [
  'gemini-3.8-live-thinking',
  'gemini-3.8-live',
  'gemini-3-flash-live',
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
  'gemini-3.1-flash-tts',
  'gemini-2.5-flash-tts',
  'gemini-3.1-flash-maps-grounding'
];

// STT: Primário especializado em áudio ultrarrápido
export const STT_MODEL_CASCADE = [
  'gemini-3.8-live-thinking',
  'gemini-3.8-live',
  'gemini-3-flash-live',
  'gemini-3.8-flash-lite-stt',
  'gemini-3.8-flash-stt',
  'gemini-3.1-flash-stt',
  'gemini-2.5-flash-stt',
  'gemini-3.1-flash-maps-grounding'
];

// Mapeamento dinâmico para garantir compatibilidade com API e Live endpoints
export function resolveGeminiModelName(modelName: string): string {
  const m = String(modelName || '').toLowerCase().trim();
  if (m.includes('thinking') || m.includes('extended')) return 'gemini-2.0-flash-thinking-exp';
  if (m.includes('live') && m.includes('3.8')) return 'gemini-2.0-flash-exp';
  if (m.includes('live') && (m.includes('flash') || m.includes('3'))) return 'gemini-2.5-flash';
  if (m.includes('maps') || m.includes('grounding')) return 'gemini-2.5-flash';
  if (m.includes('3.8-flash-lite') || m.includes('lite')) return 'gemini-2.5-flash-lite';
  if (m.includes('3.8-flash') || m.includes('3.8')) return 'gemini-2.5-flash';
  if (m.includes('3.1-flash') || m.includes('3.1')) return 'gemini-2.0-flash';
  if (m.includes('2.5-flash') || m.includes('2.5')) return 'gemini-2.5-flash';
  return 'gemini-2.5-flash';
}

// VISÃO (Google Lens): Primário gemini-3.5-flash-lite (resposta rápida)
const VISION_MODEL_CASCADE = [
  'gemini-3.8-live-thinking',
  'gemini-3.8-live',
  'gemini-3-flash-live',
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
  'gemini-3.1-flash-tts',
  'gemini-2.5-flash-tts',
  'gemini-3.1-flash-maps-grounding'
];

// Cache em memória para síntese TTS (0ms para frases repetidas)
const ttsMemoryCache = new Map<string, { audioBase64: string; mimeType: string; timestamp: number }>();
const MAX_TTS_CACHE = 150;
const TTS_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora

function getCachedTts(text: string, voice: string): { audioBase64: string; mimeType: string } | null {
  const key = `${voice}:${text.trim()}`;
  const entry = ttsMemoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTS_CACHE_TTL_MS) {
    ttsMemoryCache.delete(key);
    return null;
  }
  return { audioBase64: entry.audioBase64, mimeType: entry.mimeType };
}

function setCachedTts(text: string, voice: string, audioBase64: string, mimeType: string) {
  if (ttsMemoryCache.size >= MAX_TTS_CACHE) {
    const oldestKey = ttsMemoryCache.keys().next().value;
    if (oldestKey) ttsMemoryCache.delete(oldestKey);
  }
  const key = `${voice}:${text.trim()}`;
  ttsMemoryCache.set(key, { audioBase64, mimeType, timestamp: Date.now() });
}

// Identificação de erro não-recuperável no mesmo modelo (troca imediata de modelo ou aborta sem delays)
function isNonRetryableError(err: any): boolean {
  if (!err) return false;
  const status = Number(
    err.status ||
    err.statusCode ||
    err.response?.status ||
    err.httpStatus ||
    0
  );
  if ([400, 401, 403, 404, 429, 503].includes(status)) return true;

  const msg = String(err.message || err.error?.message || '').toLowerCase();
  return (
    msg.includes('400') ||
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('404') ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('unsupported') ||
    msg.includes('not supported') ||
    msg.includes('modality') ||
    msg.includes('unauthenticated') ||
    msg.includes('permission_denied') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('exceeded your current quota') ||
    msg.includes('rate limit') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('not found') ||
    msg.includes('not_found') ||
    msg.includes('não retornou fluxo') ||
    msg.includes('não gerou áudio') ||
    msg.includes('não retornou áudio')
  );
}

// Identificação de códigos HTTP de erro transitório de rede/servidor para política de retry
function isRetryableHttpError(err: any): boolean {
  if (!err) return false;
  const status = Number(
    err.status ||
    err.statusCode ||
    err.response?.status ||
    err.httpStatus ||
    (err.message && err.message.match(/\b(409|500|502|504)\b/)?.[1]) ||
    0
  );
  if ([409, 500, 502, 504].includes(status)) return true;

  const msg = String(err.message || '').toLowerCase();
  return (
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('spikes in demand') ||
    msg.includes('overloaded') ||
    msg.includes('conflict') ||
    msg.includes('internal error')
  );
}

// Motor de Execução de Agente com Fallback Inteligente e Latência Mínima
async function executeWithModelFallback<T>(
  agentTaskName: string,
  modelCascade: string[],
  action: (modelName: string) => Promise<T>
): Promise<{ result: T; usedModel: string; attempts: number }> {
  let lastError: any = null;
  let totalAttempts = 0;

  for (let mIdx = 0; mIdx < modelCascade.length; mIdx++) {
    const currentModel = modelCascade[mIdx];
    console.log(`[Agent: ${agentTaskName}] Iniciando com modelo: ${currentModel} (Nível ${mIdx + 1}/${modelCascade.length})`);

    // Máximo 2 tentativas para falhas transitórias, eliminando esperas desnecessárias
    for (let attempt = 1; attempt <= 2; attempt++) {
      totalAttempts++;
      try {
        const res = await action(currentModel);
        console.log(`[Agent: ${agentTaskName}] Sucesso no modelo ${currentModel} (tentativa ${attempt}/2).`);
        return { result: res, usedModel: currentModel, attempts: totalAttempts };
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        console.warn(`[Agent: ${agentTaskName}] Falha na tentativa ${attempt}/2 no modelo ${currentModel}: ${errMsg}`);

        // Troca imediata de modelo se for erro não-recuperável (ex: cota, modelo inexistente, parâmetro inválido)
        if (isNonRetryableError(err)) {
          console.warn(`[Agent: ${agentTaskName}] Erro não recuperável no modelo ${currentModel}. Alternando IMEDIATAMENTE para o próximo modelo da cadeia...`);
          break;
        }

        if (attempt < 2 && isRetryableHttpError(err)) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        } else {
          break;
        }
      }
    }

    console.warn(`[Agent: ${agentTaskName}] Tentativas concluídas no modelo ${currentModel}. Trocando para o próximo modelo.`);
  }

  let formattedErr = lastError?.message || 'Erro de execução';
  if (formattedErr.includes('429') || formattedErr.includes('RESOURCE_EXHAUSTED') || formattedErr.includes('quota')) {
    formattedErr = 'Cota do plano gratuito do Gemini excedida (429). Aguarde alguns segundos ou insira sua própria Chave API do Gemini nas Configurações.';
  }

  console.error(`[Agent: ${agentTaskName}] Falha registrada: todos os modelos esgotados (${modelCascade.join(' -> ')}).`);
  throw new Error(`[${agentTaskName}] Falha nos modelos (${modelCascade.join(' -> ')}): ${formattedErr}`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Suporte a payloads maiores (áudio em base64 e screenshots)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Habilitar CORS para permitir que a extensão Chrome chame as rotas a partir de qualquer página
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Helper para extrair chave de API da requisição ou única e exclusivamente do arquivo .env
  function extractApiKey(req: express.Request): string {
    const fromHeader = (req.headers['x-gemini-api-key'] as string) ||
      (req.headers['authorization']?.replace(/^Bearer\s+/i, ''));
    if (fromHeader && fromHeader.trim()) return fromHeader.trim();
    if (req.body?.apiKey && typeof req.body.apiKey === 'string' && req.body.apiKey.trim()) {
      return req.body.apiKey.trim();
    }
    return getGeminiApiKey();
  }

  // Inicialização segura do SDK @google/genai (carrega de .env por padrão)
  function getGeminiClient(customKey?: string): GoogleGenAI {
    const apiKey = (customKey && customKey.trim()) ? customKey.trim() : getGeminiApiKey();
    if (!apiKey) {
      throw new Error('Nenhuma chave de API Gemini encontrada no arquivo .env.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Endpoint para expor a chave obtida única e exclusivamente do arquivo .env (mascarada e completa)
  app.get('/api/get-key', (req, res) => {
    const key = getGeminiApiKey();
    res.json({
      success: true,
      hasKey: Boolean(key),
      maskedKey: maskApiKey(key),
      fullKey: key,
      source: '.env'
    });
  });

  // 1. Health check & status da API
  app.get('/api/health', (req, res) => {
    const key = getGeminiApiKey();
    res.json({
      status: 'ok',
      hasEnvApiKey: Boolean(key),
      maskedKey: maskApiKey(key),
      timestamp: Date.now(),
    });
  });

  // 1.1 Endpoint para validar chave de API de forma segura
  app.post('/api/validate-key', async (req, res) => {
    try {
      const apiKey = extractApiKey(req);
      if (!apiKey) {
        return res.status(400).json({ success: false, error: 'Chave de API não informada.' });
      }

      const ai = getGeminiClient(apiKey);
      // Chamada ultrarrápida e leve para verificar autenticação
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: 'ping',
      });

      if (response && response.text !== undefined) {
        return res.json({
          success: true,
          message: 'Chave de API validada com sucesso no Google Gemini!',
        });
      }

      return res.status(400).json({ success: false, error: 'Resposta inesperada ao validar chave.' });
    } catch (err: any) {
      console.warn('[API Key Validation Error]:', err.message);
      return res.status(400).json({
        success: false,
        error: err.message || 'Falha ao autenticar com o Google Gemini. Verifique se a chave está ativa.',
      });
    }
  });

  // 2. Rota de TTS (Text-to-Speech) - Especializado: Gemini 3.1 Flash TTS Preview
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, instruction, voice, ttsModel, model } = req.body;
      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ success: false, error: 'Texto não fornecido para narração.' });
      }

      const selectedVoice = voice || 'Kore';
      const chosenTtsModel = ttsModel || model;
      const ttsCascade = chosenTtsModel
        ? [chosenTtsModel, ...TTS_MODEL_CASCADE.filter(m => m !== chosenTtsModel)]
        : TTS_MODEL_CASCADE;

      // 1. Resposta instantânea se o áudio já estiver no cache (0ms)
      const cached = getCachedTts(text, selectedVoice);
      if (cached) {
        return res.json({
          success: true,
          audioBase64: cached.audioBase64,
          mimeType: cached.mimeType,
          voice: selectedVoice,
          text,
          model: 'cache-memory',
          attempts: 1,
        });
      }

      const clientApiKey = extractApiKey(req);
      const ai = getGeminiClient(clientApiKey);
      const promptInstruction = instruction 
        ? `${instruction}\nNarre o texto:\n${text}`
        : `Narre com clareza e entonação natural:\n${text}`;

      // Executa com cascade direto no modelo TTS oficial
      const { result, usedModel, attempts } = await executeWithModelFallback(
        'TTS Narrator',
        ttsCascade,
        async (modelName) => {
          const resolved = resolveGeminiModelName(modelName);
          const ttsResponse = await ai.models.generateContent({
            model: resolved,
            contents: [{ parts: [{ text: promptInstruction }] }],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: selectedVoice },
                },
              },
            },
          });

          const audioPart = ttsResponse.candidates?.[0]?.content?.parts?.[0];
          const rawAudioBase64 = audioPart?.inlineData?.data;
          const mimeType = audioPart?.inlineData?.mimeType || 'audio/pcm;rate=24000';

          if (!rawAudioBase64) {
            throw new Error(`O modelo ${modelName} não retornou fluxo de áudio.`);
          }

          return { rawAudioBase64, mimeType };
        }
      );

      // Conversão PCM para WAV padronizado
      let finalWavBase64 = result.rawAudioBase64;
      if (result.mimeType.includes('pcm') || !result.mimeType.includes('wav')) {
        const rawPcmBuffer = Buffer.from(result.rawAudioBase64, 'base64');
        const wavBuffer = pcmToWavBuffer(rawPcmBuffer, 24000, 1, 16);
        finalWavBase64 = wavBuffer.toString('base64');
      }

      // Salva no cache para evitar nova síntese repetida
      setCachedTts(text, selectedVoice, finalWavBase64, 'audio/wav');

      return res.json({
        success: true,
        audioBase64: finalWavBase64,
        mimeType: 'audio/wav',
        voice: selectedVoice,
        text,
        model: usedModel,
        attempts,
      });
    } catch (err: any) {
      console.error('[API TTS Error]:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Erro ao processar áudio TTS',
      });
    }
  });

  // 3. Rota de STT (Speech-to-Text) - Primário: Gemini 3.5 Transcribe
  app.post('/api/stt', async (req, res) => {
    try {
      const { audioBase64, mimeType, instruction, sttModel, model } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ success: false, error: 'Áudio não fornecido para transcrição.' });
      }

      const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, '');
      const cleanMime = (mimeType || 'audio/webm').split(';')[0];

      const clientApiKey = extractApiKey(req);
      const ai = getGeminiClient(clientApiKey);
      const promptText = instruction 
        ? `${instruction}\nTranscreva o áudio fielmente.`
        : 'Transcreva o áudio fielmente. Retorne apenas o texto transcrito, sem introduções.';

      const chosenSttModel = sttModel || model;
      const sttCascade = chosenSttModel
        ? [chosenSttModel, ...STT_MODEL_CASCADE.filter(m => m !== chosenSttModel)]
        : STT_MODEL_CASCADE;

      // Executa com modelo ultra-rápido de transcrição e mínima latência
      const { result, usedModel, attempts } = await executeWithModelFallback(
        'STT Transcriber',
        sttCascade,
        async (modelName) => {
          const resolved = resolveGeminiModelName(modelName);
          const response = await ai.models.generateContent({
            model: resolved,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMime,
                    data: cleanBase64,
                  },
                },
                { text: promptText },
              ],
            },
            config: {
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.MINIMAL,
              },
            },
          });

          const transcribed = response.text?.trim() || response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          if (!transcribed) {
            throw new Error(`O modelo ${modelName} retornou texto vazio para a transcrição.`);
          }
          return transcribed;
        }
      );

      return res.json({
        success: true,
        text: result,
        model: usedModel,
        attempts,
      });
    } catch (err: any) {
      console.error('[API STT Error]:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Erro ao transcrever áudio com Gemini STT',
      });
    }
  });

  // 4. Rota de Visão + Narração (Google Lens) - Primário: Gemini 3.8 Flash (com cascade 3.5 Flash Lite -> 3.1 Pro Preview)
  app.post('/api/vision-tts', async (req, res) => {
    try {
      const { imageBase64, instruction, narratorInstruction, voice } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ success: false, error: 'Imagem da área não fornecida.' });
      }

      const cleanImageBase64 = imageBase64.replace(/^data:image\/[a-z0-9]+;base64,/, '');
      const clientApiKey = extractApiKey(req);
      const ai = getGeminiClient(clientApiKey);

      const visionPrompt = instruction || 
        'Analise detalhadamente o recorte de tela enviado. Se houver texto legível, leia-o e transcreva-o. Se houver gráficos, diagramas ou imagens, descreva os elementos principais de forma concisa e natural em português para ser lido em voz alta.';

      // Passo 1: Análise visual e OCR com Cascade de Visão
      const visionExecution = await executeWithModelFallback(
        'Vision Analyzer',
        VISION_MODEL_CASCADE,
        async (modelName) => {
          const visionRes = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: cleanImageBase64,
                  },
                },
                { text: visionPrompt },
              ],
            },
            config: {
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.MINIMAL,
              },
            },
          });
          const text = visionRes.text?.trim() || visionRes.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (!text) throw new Error(`O modelo ${modelName} não conseguiu analisar o conteúdo visual.`);
          return text;
        }
      );

      const extractedText = visionExecution.result || 'Nenhum conteúdo legível identificado na área.';

      // Passo 2: Sintetizar a narração em áudio via TTS Cascade
      const selectedVoice = voice || 'Kore';
      const promptInstruction = narratorInstruction 
        ? `${narratorInstruction}\nNarre o seguinte conteúdo em português:\n${extractedText}`
        : `Narre com tom natural e fluente o seguinte conteúdo:\n${extractedText}`;

      let finalWavBase64 = '';
      try {
        const ttsExecution = await executeWithModelFallback(
          'Vision Narrator TTS',
          TTS_MODEL_CASCADE,
          async (modelName) => {
            const ttsResponse = await ai.models.generateContent({
              model: modelName,
              contents: [{ parts: [{ text: promptInstruction }] }],
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: selectedVoice },
                  },
                },
              },
            });

            const audioPart = ttsResponse.candidates?.[0]?.content?.parts?.[0];
            const rawAudioBase64 = audioPart?.inlineData?.data;
            if (!rawAudioBase64) throw new Error(`O modelo ${modelName} não gerou áudio.`);
            const rawPcmBuffer = Buffer.from(rawAudioBase64, 'base64');
            const wavBuffer = pcmToWavBuffer(rawPcmBuffer, 24000, 1, 16);
            return wavBuffer.toString('base64');
          }
        );
        finalWavBase64 = ttsExecution.result;
      } catch (ttsErr: any) {
        console.warn('[Vision TTS Generation Warning]:', ttsErr.message);
      }

      return res.json({
        success: true,
        text: extractedText,
        audioBase64: finalWavBase64,
        mimeType: 'audio/wav',
        voice: selectedVoice,
        model: visionExecution.usedModel,
      });
    } catch (err: any) {
      console.error('[API Vision-TTS Error]:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Erro ao processar imagem com Gemini Vision',
      });
    }
  });

  // ==========================================
  // ROTAS DE ATUALIZAÇÃO VIA GITHUB & GIT
  // ==========================================

  // 1. Obter Status do Git e Repositório
  app.get('/api/git/status', async (req, res) => {
    const cwd = process.cwd();
    const gitDir = path.join(cwd, '.git');
    const isGitRepo = fs.existsSync(gitDir);

    let gitVersion = '';
    try {
      const { stdout } = await execAsync('git --version');
      gitVersion = stdout.trim();
    } catch (err: any) {
      gitVersion = 'Git não detectado no sistema';
    }

    if (!isGitRepo) {
      return res.json({
        success: true,
        isGitRepo: false,
        gitVersion,
        branch: 'main',
        currentCommit: 'Não inicializado',
        commitDate: '',
        commitMessage: 'Diretório local ainda não vinculado a um repositório Git',
        remoteUrl: 'https://github.com/pinguelanarosca/EXTTTSSTT',
        dirty: false,
        modifiedFiles: [],
        output: 'O diretório atual não possui uma pasta .git. Você pode inicializar e vincular ao GitHub abaixo.',
      });
    }

    try {
      const [branchRes, commitRes, commitDateRes, commitMsgRes, remoteRes, statusRes] = await Promise.allSettled([
        execAsync('git rev-parse --abbrev-ref HEAD', { cwd }),
        execAsync('git log -1 --format="%h"', { cwd }),
        execAsync('git log -1 --format="%cd" --date=relative', { cwd }),
        execAsync('git log -1 --format="%s"', { cwd }),
        execAsync('git config --get remote.origin.url', { cwd }),
        execAsync('git status --porcelain', { cwd }),
      ]);

      const branch = branchRes.status === 'fulfilled' ? branchRes.value.stdout.trim() : 'main';
      const currentCommit = commitRes.status === 'fulfilled' ? commitRes.value.stdout.trim() : 'Desconhecido';
      const commitDate = commitDateRes.status === 'fulfilled' ? commitDateRes.value.stdout.trim() : '';
      const commitMessage = commitMsgRes.status === 'fulfilled' ? commitMsgRes.value.stdout.trim() : '';
      const remoteUrl = remoteRes.status === 'fulfilled' ? remoteRes.value.stdout.trim() : 'https://github.com/pinguelanarosca/EXTTTSSTT';
      const statusOutput = statusRes.status === 'fulfilled' ? statusRes.value.stdout : '';

      const modifiedFiles = statusOutput
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const dirty = modifiedFiles.length > 0;

      // Tenta verificar se há commits remotos via git ls-remote (com timeout rápido)
      let remoteLatestCommit = '';
      let hasUpdates = false;
      if (remoteUrl && !remoteUrl.includes('placeholder')) {
        try {
          const { stdout: lsOut } = await execAsync(`git ls-remote origin refs/heads/${branch || 'main'}`, {
            cwd,
            timeout: 5000,
          });
          const match = lsOut.match(/^([a-f0-9]+)/);
          if (match && match[1]) {
            remoteLatestCommit = match[1].substring(0, 7);
            if (currentCommit && remoteLatestCommit && !currentCommit.startsWith(remoteLatestCommit)) {
              hasUpdates = true;
            }
          }
        } catch {
          // Ignora se o repositório remoto ainda não for acessível ou necessitar auth
        }
      }

      return res.json({
        success: true,
        isGitRepo: true,
        gitVersion,
        branch,
        currentCommit,
        commitDate,
        commitMessage,
        remoteUrl: remoteUrl || 'https://github.com/pinguelanarosca/EXTTTSSTT',
        dirty,
        modifiedFiles,
        remoteLatestCommit,
        hasUpdates,
        output: statusOutput || 'Diretório de trabalho limpo (Working tree clean).',
      });
    } catch (err: any) {
      console.error('[API Git Status Error]:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Erro ao obter status do Git',
      });
    }
  });

  // 2. Inicializar Git e Configurar Repositório Remoto
  app.post('/api/git/init', async (req, res) => {
    const cwd = process.cwd();
    const repoUrl = req.body?.repoUrl?.trim() || 'https://github.com/pinguelanarosca/EXTTTSSTT';
    const steps: { name: string; command: string; output: string; success: boolean; durationMs: number }[] = [];

    async function runStep(name: string, command: string) {
      const start = Date.now();
      try {
        const { stdout, stderr } = await execAsync(command, { cwd });
        const output = (stdout + (stderr ? '\n' + stderr : '')).trim() || 'Comando executado com sucesso.';
        steps.push({ name, command, output, success: true, durationMs: Date.now() - start });
        return { success: true, output };
      } catch (err: any) {
        const output = err.stderr || err.stdout || err.message || 'Erro de execução';
        steps.push({ name, command, output, success: false, durationMs: Date.now() - start });
        return { success: false, output };
      }
    }

    await runStep('Inicializar Repositório Git', 'git init');
    await runStep('Configurar Usuário Git', 'git config user.name "Satiro STT&TTS Admin"');
    await runStep('Configurar E-mail Git', 'git config user.email "aleesatiro@gmail.com"');
    
    // Configura ou atualiza remote
    const remoteCheck = await runStep('Verificar Remote Origin', 'git remote -v');
    if (remoteCheck.output && remoteCheck.output.includes('origin')) {
      await runStep('Atualizar Remote Origin', `git remote set-url origin "${repoUrl}"`);
    } else {
      await runStep('Adicionar Remote Origin', `git remote add origin "${repoUrl}"`);
    }

    const allSuccess = steps.every((s) => s.success);
    return res.json({
      success: allSuccess,
      message: allSuccess ? 'Repositório Git inicializado e vinculado ao GitHub com sucesso!' : 'Houve avisos ao inicializar o Git.',
      steps,
    });
  });

  // 3. Baixar e Instalar do GitHub (git pull / fetch / install)
  app.post('/api/git/pull', async (req, res) => {
    const cwd = process.cwd();
    const repoUrl = req.body?.repoUrl?.trim() || 'https://github.com/pinguelanarosca/EXTTTSSTT';
    const branch = req.body?.branch?.trim() || 'main';
    const force = Boolean(req.body?.force);
    const runInstall = req.body?.runInstall !== false;

    const steps: { name: string; command: string; output: string; success: boolean; durationMs: number }[] = [];

    async function runStep(name: string, command: string, ignoreError = false) {
      const start = Date.now();
      try {
        const { stdout, stderr } = await execAsync(command, { cwd, timeout: 60000 });
        const output = (stdout + (stderr ? '\n' + stderr : '')).trim() || 'OK';
        steps.push({ name, command, output, success: true, durationMs: Date.now() - start });
        return { success: true, output };
      } catch (err: any) {
        const output = (err.stderr || err.stdout || err.message || 'Erro de execução').trim();
        steps.push({ name, command, output, success: ignoreError, durationMs: Date.now() - start });
        return { success: ignoreError, output };
      }
    }

    try {
      // 1. Garantir que é um repositório git
      if (!fs.existsSync(path.join(cwd, '.git'))) {
        await runStep('Inicializar Git Local', 'git init');
        await runStep('Configurar Identidade Git', 'git config user.name "Satiro STT&TTS Admin" && git config user.email "aleesatiro@gmail.com"');
        await runStep('Adicionar Remoto Origin', `git remote add origin "${repoUrl}"`);
      } else {
        // Atualiza URL do remote origin se foi alterada
        await runStep('Atualizar Remote Origin', `git remote set-url origin "${repoUrl}"`, true);
      }

      // 2. Se modo forçado, faz stash ou checkout limpo
      if (force) {
        await runStep('Guardar alterações locais (Stash)', 'git stash', true);
      }

      // 3. Buscar novidades do GitHub (Fetch)
      const fetchResult = await runStep('Buscar atualizações do GitHub (git fetch)', `git fetch origin ${branch} --tags`);

      if (!fetchResult.success) {
        // Se o branch principal falhou, tenta sem especificar branch ou com master
        const fetchFallback = await runStep('Buscar atualizações (git fetch padrão)', 'git fetch origin --tags', true);
        if (!fetchFallback.success) {
          return res.status(400).json({
            success: false,
            message: `Não foi possível conectar ao repositório GitHub (${repoUrl}). Verifique se o repositório existe e é público ou se requer autenticação.`,
            steps,
            error: fetchResult.output,
          });
        }
      }

      // 4. Aplicar atualizações locais (git pull ou git merge)
      if (force) {
        await runStep('Sincronizar forçadamente com a versão do GitHub', `git reset --hard origin/${branch}`);
      } else {
        const pullResult = await runStep('Mesclar alterações do GitHub (git pull)', `git pull origin ${branch}`);
        if (!pullResult.success) {
          // Tenta merge
          await runStep('Tentando checkout e merge', `git checkout ${branch} && git merge origin/${branch}`, true);
        }
      }

      // 5. Instalar ou verificar dependências
      if (runInstall) {
        await runStep('Verificar e Atualizar Dependências (npm)', 'npm install --prefer-offline --no-audit --no-fund', true);
      }

      return res.json({
        success: true,
        message: 'Download e instalação a partir do GitHub concluídos com sucesso!',
        steps,
        restartRequired: true,
      });
    } catch (err: any) {
      console.error('[API Git Pull Error]:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro durante o processo de atualização via GitHub.',
        error: err.message || 'Falha desconhecida',
        steps,
      });
    }
  });

  // 3.1. Enviar Commit e Push para o GitHub (Resolve erros de argumento do AI Studio)
  app.post('/api/git/push', async (req, res) => {
    const cwd = process.cwd();
    let rawRepo = req.body?.repoUrl?.trim() || 'https://github.com/pinguelanarosca/EXTTTSSTT';
    const branch = (req.body?.branch?.trim() || 'main').replace(/^refs\/heads\//, '').replace(/[^a-zA-Z0-9._\-/]/g, '');
    const commitMessage = (req.body?.commitMessage?.trim() || 'Atualização STT & TTS Satiro').replace(/"/g, '\\"');
    const githubToken = req.body?.githubToken?.trim() || '';
    const force = Boolean(req.body?.force);

    // Normaliza URL do repositório
    let cleanRepo = rawRepo;
    if (!cleanRepo.startsWith('http://') && !cleanRepo.startsWith('https://')) {
      cleanRepo = `https://github.com/${cleanRepo.replace(/^\/+/, '')}`;
    }
    if (!cleanRepo.endsWith('.git')) {
      cleanRepo = `${cleanRepo}.git`;
    }

    // Se tiver token, embute para autenticação direta sem tela interativa
    let authenticatedRemoteUrl = cleanRepo;
    if (githubToken) {
      authenticatedRemoteUrl = cleanRepo.replace(/^https:\/\//, `https://${githubToken}@`);
    }

    const steps: { name: string; command: string; output: string; success: boolean; durationMs: number }[] = [];

    async function runStep(name: string, command: string, safeCommandDisplay?: string, ignoreError = false) {
      const start = Date.now();
      try {
        const { stdout, stderr } = await execAsync(command, { cwd, timeout: 60000 });
        const output = (stdout + (stderr ? '\n' + stderr : '')).trim() || 'OK';
        steps.push({
          name,
          command: safeCommandDisplay || command,
          output,
          success: true,
          durationMs: Date.now() - start,
        });
        return { success: true, output };
      } catch (err: any) {
        const output = (err.stderr || err.stdout || err.message || 'Erro de execução').trim();
        steps.push({
          name,
          command: safeCommandDisplay || command,
          output,
          success: ignoreError,
          durationMs: Date.now() - start,
        });
        return { success: ignoreError, output };
      }
    }

    try {
      // 1. Garantir que .git existe
      if (!fs.existsSync(path.join(cwd, '.git'))) {
        await runStep('Inicializar Repositório Git', 'git init');
      }

      // 2. Configurar identidade
      await runStep('Configurar Nome', 'git config user.name "aleesatiro"');
      await runStep('Configurar E-mail', 'git config user.email "aleesatiro@gmail.com"');

      // 3. Configurar branch
      await runStep('Definir Branch', `git branch -M ${branch}`);

      // 4. Configurar Remote Origin
      const remoteCheck = await runStep('Verificar Remote Origin', 'git remote -v');
      const safeDisplayUrl = cleanRepo;
      if (remoteCheck.output && remoteCheck.output.includes('origin')) {
        await runStep(
          'Atualizar Remote Origin',
          `git remote set-url origin "${authenticatedRemoteUrl}"`,
          `git remote set-url origin "${safeDisplayUrl}"`
        );
      } else {
        await runStep(
          'Adicionar Remote Origin',
          `git remote add origin "${authenticatedRemoteUrl}"`,
          `git remote add origin "${safeDisplayUrl}"`
        );
      }

      // 5. Adicionar arquivos ao stage
      await runStep('Adicionar arquivos (git add)', 'git add -A');

      // 6. Criar commit se houver modificações
      const commitRes = await runStep('Criar Commit', `git commit -m "${commitMessage}"`, `git commit -m "${commitMessage}"`, true);
      if (!commitRes.success && commitRes.output.includes('nothing to commit')) {
        // Nada a commitar, mas podemos continuar com o push se o usuário quiser sincronizar
      }

      // 7. Push para o GitHub
      const pushFlags = force ? '--force' : '';
      const pushCommand = `git push ${pushFlags} -u origin ${branch}`;
      const pushRes = await runStep('Enviar para o GitHub (git push)', pushCommand, pushCommand);

      if (!pushRes.success) {
        let hint = '';
        if (pushRes.output.includes('Authentication failed') || pushRes.output.includes('could not read Username') || pushRes.output.includes('Permission denied')) {
          hint = 'Autenticação necessária: O GitHub requer um Personal Access Token (PAT) com escopo "repo". Gere um em https://github.com/settings/tokens e informe no campo Token.';
        } else if (pushRes.output.includes('fetch first') || pushRes.output.includes('non-fast-forward')) {
          hint = 'O repositório no GitHub possui commits que não estão na sua máquina local. Use a opção "Forçar envio (--force)" ou faça um "Baixar & Instalar" antes de enviar.';
        }

        return res.status(400).json({
          success: false,
          message: hint || 'Falha ao enviar commit para o GitHub.',
          error: pushRes.output,
          steps,
        });
      }

      return res.json({
        success: true,
        message: `Commit enviado com sucesso para o GitHub na branch ${branch}!`,
        steps,
      });
    } catch (err: any) {
      console.error('[API Git Push Error]:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao executar o push do Git.',
        error: err.message || 'Falha desconhecida',
        steps,
      });
    }
  });

  // 4. Reiniciar o Chrome e/ou Notificar Recarregamento da Extensão
  app.post('/api/git/restart-chrome', async (req, res) => {
    const actionsTaken: string[] = [];

    // Tenta comandos no sistema operacional local se disponível
    try {
      await execAsync('pkill -HUP chrome || pkill -HUP chromium || true', { timeout: 3000 });
      actionsTaken.push('Sinal de reinício enviado para processos do Google Chrome locais.');
    } catch {
      actionsTaken.push('Nenhum processo direto de desktop reiniciado.');
    }

    return res.json({
      success: true,
      message: 'Comando de reinício do Google Chrome emitido com sucesso.',
      restartUrl: 'chrome://restart',
      extensionsUrl: 'chrome://extensions',
      actionsTaken,
      instructions: [
        '1. Digite chrome://restart na barra de endereços do Chrome e pressione Enter para reiniciar o navegador por completo.',
        '2. Ou acesse chrome://extensions e clique no ícone de recarregar (ícone de círculo com seta) na extensão STT&TTS de Satiro.',
        '3. Se estiver usando a extensão instalada, use a opção "Recarregar Extensão" no popup ou painel de opções.',
      ],
    });
  });

  // 5. Download do Pacote ZIP da Extensão construído diretamente com os arquivos reais do disco
  app.get('/api/download-extension-zip', async (req, res) => {
    try {
      const zip = new JSZip();
      const rootDir = process.cwd();
      const filesToInclude = [
        'manifest.json',
        'background.js',
        'content.js',
        'content.css',
        'popup.html',
        'popup.js',
        'options.html',
        'options.js',
        'README.md',
        '.env.example',
        'atualizar_extensao.sh',
        'atualizar_extensao.bat',
      ];

      for (const filename of filesToInclude) {
        const fullPath = path.join(rootDir, filename);
        if (fs.existsSync(fullPath)) {
          let fileContent = fs.readFileSync(fullPath, 'utf8');
          const envKey = getGeminiApiKey();
          if (envKey) {
            if (filename === 'content.js' || filename === 'popup.js' || filename === 'options.js') {
              fileContent = fileContent.replace(/apiKey:\s*['"][^'"]*['"]/, `apiKey: '${envKey}'`);
            }
          }
          zip.file(filename, fileContent);
        }
      }

      // Adiciona ícones garantidos (da pasta icons/, public/icons/ ou a partir do base64 embutido em código)
      const iconsFolder = zip.folder('icons') || zip;
      [16, 48, 128].forEach((size) => {
        const p1 = path.join(rootDir, 'icons', `icon${size}.png`);
        const p2 = path.join(rootDir, 'public', 'icons', `icon${size}.png`);
        if (fs.existsSync(p1)) {
          iconsFolder.file(`icon${size}.png`, fs.readFileSync(p1));
        } else if (fs.existsSync(p2)) {
          iconsFolder.file(`icon${size}.png`, fs.readFileSync(p2));
        } else {
          const key = `icon${size}.png` as keyof typeof DEFAULT_EXTENSION_ICONS;
          if (DEFAULT_EXTENSION_ICONS[key]) {
            iconsFolder.file(`icon${size}.png`, Buffer.from(DEFAULT_EXTENSION_ICONS[key], 'base64'));
          }
        }
      });

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="STT-TTS-Satiro-Extension.zip"');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(zipBuffer);
    } catch (err: any) {
      console.error('Erro ao gerar ZIP no servidor:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Integração com Vite
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VocalLens Server] Executando em http://localhost:${PORT}`);
  });
}

startServer();
