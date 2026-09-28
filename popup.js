// Popup Logic - STT&TTS de Satiro (100% Autônomo com Modo Direto Gemini)
(function initPopup() {
  let activeAudio = null;
  let isRecording = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let recordTimer = null;
  let recordSeconds = 0;

  const DEFAULT_AGENTS = [
    {
      id: 'default-natural',
      name: '🎙️ Padrão / Natural',
      description: 'Voz equilibrada com entonação humana natural e ritmo balanceado.',
      preferredVoice: 'Kore',
      locutionInstruction: 'Você é um locutor profissional e envolvente. Dite os textos com ritmo dinâmico e tom natural.',
      narratorInstruction: 'Você é um narrador natural e expressivo. Leia o texto com dicção impecável, ritmo equilibrado e entonação humana.',
      transcriberInstruction: 'Transcreva com fidelidade absoluta o áudio recebido. Aplique pontuação correta e remova vícios de linguagem comuns.',
      visionInstruction: 'Analise detalhadamente a imagem capturada da tela com o Google Lens. Se contiver texto, transcreva ou leia-o com máxima precisão.',
      isCustom: false
    },
    {
      id: 'radio-host',
      name: '📻 Locutor Profissional & Rádio',
      description: 'Projeção forte, entonação comercial enérgica e ritmo dinâmico.',
      preferredVoice: 'Fenrir',
      locutionInstruction: 'Fale com a energia e cadência de um grande locutor de rádio e TV: voz encorpada, pausas enfáticas e entusiasmo cativante.',
      narratorInstruction: 'Leia como um apresentador de notícias de destaque: tom firme, projeção limpa e excelente ritmo.',
      transcriberInstruction: 'Transcreva destacando com pontuação expressiva e clareza formal.',
      visionInstruction: 'Descreva a imagem em formato de manchete e resumo vibrante dos pontos principais.',
      isCustom: false
    },
    {
      id: 'teacher-didactic',
      name: '🎓 Professor / Didático',
      description: 'Ritmo pausado, ênfase pedagógica e clareza explicativa.',
      preferredVoice: 'Charon',
      locutionInstruction: 'Explique de forma didática e acolhedora, como um professor paciente explicando conceitos importantes.',
      narratorInstruction: 'Leia em ritmo pausado e articulado, dando ênfase nas palavras-chave e facilitando o aprendizado.',
      transcriberInstruction: 'Transcreva preservando termos técnicos e estruturando com pontuação impecável.',
      visionInstruction: 'Analise e explique passo a passo diagramas, códigos e textos presentes na captura.',
      isCustom: false
    },
    {
      id: 'fast-summary',
      name: '⚡ Resumidor Rápido & Direto',
      description: 'Fala rápida e objetiva focada na essência do conteúdo.',
      preferredVoice: 'Puck',
      locutionInstruction: 'Seja direto ao ponto, com cadência ágil e foco nas informações mais relevantes.',
      narratorInstruction: 'Leia os pontos principais de forma ágil, fluida e concisa.',
      transcriberInstruction: 'Transcreva exatamente o essencial com máxima precisão.',
      visionInstruction: 'Sintetize imediatamente os tópicos centrais da tela capturada.',
      isCustom: false
    },
    {
      id: 'calm-zen',
      name: '🧘 Narrador Zen & Meditativo',
      description: 'Voz suave, ritmo lento e calmo, tom reconfortante.',
      preferredVoice: 'Zephyr',
      locutionInstruction: 'Fale com calma, tranquilidade e suavidade, trazendo paz e relaxamento para o ouvinte.',
      narratorInstruction: 'Leia com suavidade e serenidade, mantendo pausas harmoniosas e tom acolhedor.',
      transcriberInstruction: 'Transcreva com precisão e tranquilidade.',
      visionInstruction: 'Descreva o ambiente visual com sutileza e serenidade.',
      isCustom: false
    },
    {
      id: 'executive-formal',
      name: '💼 Executivo & Corporativo',
      description: 'Linguagem polida, postura corporativa séria e tom seguro.',
      preferredVoice: 'Fenrir',
      locutionInstruction: 'Adote uma postura executiva de alto nível: vocabulário refinado, tom seguro e direto aos resultados.',
      narratorInstruction: 'Leia relatórios e documentos corporativos com seriedade, clareza e autoridade profissional.',
      transcriberInstruction: 'Transcreva termos de negócios, siglas e números com rigor absoluto.',
      visionInstruction: 'Analise métricas, tabelas e gráficos da tela com foco em decisões de negócios.',
      isCustom: false
    },
    {
      id: 'friendly-chat',
      name: '💬 Amigável & Descontraído',
      description: 'Tom de conversa entre amigos, informal e caloroso.',
      preferredVoice: 'Puck',
      locutionInstruction: 'Fale de forma descontraída e amigável, como um bom amigo conversando num café.',
      narratorInstruction: 'Leia com naturalidade informal, leveza e simpatia genuína.',
      transcriberInstruction: 'Transcreva capturando o tom espontâneo da fala.',
      visionInstruction: 'Comente sobre o que está na tela de forma descontraída e acessível.',
      isCustom: false
    },
    {
      id: 'storyteller',
      name: '🧙 Contador de Histórias & Fantasia',
      description: 'Entonação rica em suspense, dramaticidade e expressividade teatral.',
      preferredVoice: 'Charon',
      locutionInstruction: 'Narre como um bardo contador de lendas: crie suspense, use nuances dramáticas e transporte o ouvinte.',
      narratorInstruction: 'Dê vida a cada frase com expressividade teatral, modulando o tom conforme a emoção do texto.',
      transcriberInstruction: 'Transcreva mantendo o ritmo poético e as exclamações originais.',
      visionInstruction: 'Descreva a cena visual como um cenário épico de uma grande aventura.',
      isCustom: false
    }
  ];

  const defaults = {
    serverUrl: '',
    connectionMode: 'direct',
    ttsVoice: 'Kore',
    ttsSpeed: 1.0,
    ttsVolume: 1.0,
    activeAgentId: 'default-natural',
    activeNarratorAgentId: 'default-natural',
    activeTranscriberAgentId: 'default-natural',
    customAgents: [],
    ttsModel: 'gemini-3.8-flash-lite-tts',
    sttModel: 'gemini-3.5-flash-lite',
    apiKey: 'YOUR_GEMINI_API_KEY',
    narratorInstruction: DEFAULT_AGENTS[0].narratorInstruction,
    locutionInstruction: DEFAULT_AGENTS[0].locutionInstruction,
    transcriberInstruction: DEFAULT_AGENTS[0].transcriberInstruction,
    visionInstruction: DEFAULT_AGENTS[0].visionInstruction
  };

  let currentSettings = { ...defaults };
  let allAgentsList = [...DEFAULT_AGENTS];

  // Utilitário de reprodução PCM 24kHz
  function pcmToWav(pcm16Data, sampleRate = 24000) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const buffer = new ArrayBuffer(44 + pcm16Data.length);
    const view = new DataView(buffer);

    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcm16Data.length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, pcm16Data.length, true);

    new Uint8Array(buffer, 44).set(pcm16Data);
    return buffer;
  }

  function uint8ArrayToBase64(bytes) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([bytes]);
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function isQuotaOrNotFoundError(err) {
    if (!err) return false;
    const msg = String(err.message || err.error?.message || (typeof err === 'object' ? JSON.stringify(err) : err) || '').toLowerCase();
    return (
      msg.includes('429') ||
      msg.includes('400') ||
      msg.includes('404') ||
      msg.includes('503') ||
      msg.includes('quota') ||
      msg.includes('resource_exhausted') ||
      msg.includes('exceeded your current quota') ||
      msg.includes('rate limit') ||
      msg.includes('unavailable') ||
      msg.includes('no longer available') ||
      msg.includes('high demand') ||
      msg.includes('not_found') ||
      msg.includes('not found') ||
      msg.includes('não retornou fluxo') ||
      msg.includes('não gerou áudio') ||
      msg.includes('nenhum áudio gerado') ||
      msg.includes('não retornou áudio')
    );
  }

  // -------------------------------------------------------------
  // SISTEMA DE ROTATION / BALANCEAMENTO AUTOMÁTICO DE CHAVES & MODELOS
  // -------------------------------------------------------------
  const ROTATION_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite'
  ];

  function getBrasiliaTime() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc - (3 * 3600000));
  }

  function getLogicalQuotaDay() {
    const br = getBrasiliaTime();
    if (br.getHours() < 4) {
      br.setDate(br.getDate() - 1);
    }
    return br.getFullYear() + '-' + String(br.getMonth() + 1).padStart(2, '0') + '-' + String(br.getDate()).padStart(2, '0');
  }

  function getRotationData() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        resolve({
          apiKeys: [currentSettings.apiKey || '', '', '', '', '', '', '', '', ''],
          logicalQuotaDay: '',
          quotaCounters: {}
        });
        return;
      }
      chrome.storage.local.get({
        apiKeys: ['', '', '', '', '', '', '', '', ''],
        logicalQuotaDay: '',
        quotaCounters: {}
      }, (localData) => {
        chrome.storage.sync.get({
          apiKeys: localData.apiKeys
        }, (syncData) => {
          const apiKeys = syncData.apiKeys || localData.apiKeys || ['', '', '', '', '', '', '', '', ''];
          if (apiKeys.every(k => !k) && currentSettings.apiKey) {
            apiKeys[0] = currentSettings.apiKey;
          }
          resolve({
            apiKeys,
            logicalQuotaDay: localData.logicalQuotaDay || '',
            quotaCounters: localData.quotaCounters || {}
          });
        });
      });
    });
  }

  async function getRotatingCredentials() {
    const data = await getRotationData();
    const currentDay = getLogicalQuotaDay();
    let counters = data.quotaCounters || {};

    if (data.logicalQuotaDay !== currentDay) {
      counters = {};
    }

    const keys = data.apiKeys;
    let selectedKey = null;
    let selectedModel = null;
    let selectedKeyIdx = -1;
    let selectedModelIdx = -1;

    for (let k = 0; k < 9; k++) {
      const key = keys[k] ? keys[k].trim() : '';
      if (!key) continue;

      for (let m = 0; m < 2; m++) {
        const model = ROTATION_MODELS[m];
        const counterKey = `key_${k}_model_${m}`;
        const count = counters[counterKey] || 0;

        if (count < 10) {
          selectedKey = key;
          selectedModel = model;
          selectedKeyIdx = k;
          selectedModelIdx = m;
          break;
        }
      }
      if (selectedKey) break;
    }

    if (!selectedKey) {
      for (let k = 0; k < 9; k++) {
        if (keys[k] && keys[k].trim()) {
          selectedKey = keys[k].trim();
          selectedModel = ROTATION_MODELS[0];
          selectedKeyIdx = k;
          selectedModelIdx = 0;
          break;
        }
      }
      if (!selectedKey) {
        selectedKey = currentSettings.apiKey || '';
        selectedModel = ROTATION_MODELS[0];
        selectedKeyIdx = 0;
        selectedModelIdx = 0;
      }
    }

    return {
      apiKey: selectedKey,
      model: selectedModel,
      keyIndex: selectedKeyIdx,
      modelIndex: selectedModelIdx,
      counters: counters,
      logicalQuotaDay: currentDay
    };
  }

  async function incrementQuotaCounter(keyIdx, modelIdx, logicalDay, currentCounters) {
    if (keyIdx < 0) return;
    const counterKey = `key_${keyIdx}_model_${modelIdx}`;
    currentCounters[counterKey] = (currentCounters[counterKey] || 0) + 1;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        logicalQuotaDay: logicalDay,
        quotaCounters: currentCounters
      });
    }
  }

  function savePopupApiLog(entry) {
    chrome.storage.local.get({ apiLogs: [] }, (res) => {
      const logs = res.apiLogs || [];
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      logs.unshift({
        id: 'pop-' + Date.now(),
        timestamp: Date.now(),
        timeFormatted: timeStr,
        action: entry.action,
        model: entry.model,
        latencyMs: entry.latencyMs,
        statusCode: entry.statusCode || 200,
        statusText: entry.statusText || 'OK',
        success: Boolean(entry.success),
        payloadInfo: entry.payloadInfo || '',
        errorMessage: entry.errorMessage || null,
        mode: 'direct'
      });
      if (logs.length > 50) logs.pop();
      chrome.storage.local.set({ apiLogs: logs }, () => {
        if (typeof loadApiLogs === 'function') loadApiLogs();
      });
    });
  }

  async function executePopupFallback(taskName, cascade, payloadInfo, action) {
    let lastErr = null;
    const modelList = cascade;
    for (let m = 0; m < modelList.length; m++) {
      const model = modelList[m];
      for (let attempt = 1; attempt <= 3; attempt++) {
        const start = Date.now();
        try {
          const res = await action(model);
          const latency = Date.now() - start;
          savePopupApiLog({
            action: taskName,
            model: model,
            latencyMs: latency,
            statusCode: 200,
            statusText: 'OK',
            success: true,
            payloadInfo: payloadInfo
          });
          return res;
        } catch (err) {
          lastErr = err;
          const latency = Date.now() - start;
          console.warn('[Popup ' + taskName + '] Tentativa ' + attempt + '/3 no modelo ' + model + ' falhou:', err);
          
          savePopupApiLog({
            action: taskName,
            model: model,
            latencyMs: latency,
            statusCode: isQuotaOrNotFoundError(err) ? 429 : 500,
            statusText: 'Falha: ' + (err.message || 'Erro'),
            success: false,
            payloadInfo: payloadInfo,
            errorMessage: err.message
          });

          if (isQuotaOrNotFoundError(err)) {
            console.warn('[Popup ' + taskName + '] Cota excedida ou modelo ' + model + ' indisponível. Alternando para o próximo modelo...');
            break;
          }

          if (attempt < 3) {
            await new Promise(r => setTimeout(r, attempt * 300));
          } else {
            break;
          }
        }
      }
    }
    let msg = lastErr?.message || 'Erro desconhecido';
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      msg = 'Cota do plano gratuito do Gemini excedida (429). Aguarde alguns segundos ou insira sua própria chave Gemini.';
    }
    throw new Error('Falha em todos os modelos (' + modelList.join(' -> ') + '): ' + msg);
  }

  // Direct Gemini TTS - Primário: Gemini 3.5 Flash Lite (com fallback 3.1 Flash Lite -> 3.5 Flash -> TTS Preview)
  async function directGeminiTTS(text, voiceOverride = null, instOverride = null) {
    const creds = await getRotatingCredentials();
    if (!creds.apiKey) throw new Error('Chave Gemini não configurada');
    
    let baseVoiceName = voiceOverride || currentSettings.ttsVoice || 'Kore';
    let voiceInstruction = instOverride || '';

    // Resolução de Voz Personalizada
    const customList = currentSettings.customVoices || [];
    const customMatch = customList.find(cv => cv.id === baseVoiceName || cv.name === baseVoiceName);
    if (customMatch) {
      baseVoiceName = customMatch.baseVoice || 'Kore';
      if (customMatch.instruction) {
        voiceInstruction = customMatch.instruction;
      }
    }

    let fullPrompt = currentSettings.narratorInstruction || 'Narre com tom natural e fluida articulação em português:';
    if (voiceInstruction) {
      fullPrompt = '[Instrução da Voz: ' + voiceInstruction + ']\n' + fullPrompt;
    }
    fullPrompt += '\n' + text;

    await incrementQuotaCounter(creds.keyIndex, creds.modelIndex, creds.logicalQuotaDay, creds.counters);
    const useCount = creds.counters[`key_${creds.keyIndex}_model_${creds.modelIndex}`] || 0;
    const payloadInfo = `Texto: ${text.length} chars | Voz: ${baseVoiceName} | Chave #${creds.keyIndex + 1} | Modelo ${creds.modelIndex === 0 ? '3.5' : '3.1'} [${useCount}/10]`;

    const chosenTTS = currentSettings.ttsModel || 'gemini-3.8-flash-lite-tts';
    const ttsCascade = [chosenTTS, 'gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview'].filter((v, i, a) => a.indexOf(v) === i);

    return await executePopupFallback('TTS', ttsCascade, payloadInfo, async (modelName) => {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent?key=' + encodeURIComponent(creds.apiKey);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: baseVoiceName
                }
              }
            }
          }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || ('Erro Gemini TTS: ' + res.status));
      }

      const data = await res.json();
      const candidate = data.candidates?.[0]?.content?.parts?.[0];
      const audioData = candidate?.inlineData?.data;
      if (!audioData) throw new Error('Nenhum áudio gerado pelo modelo ' + modelName);

      const binaryStr = atob(audioData);
      const pcmBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        pcmBytes[i] = binaryStr.charCodeAt(i);
      }
      const wavBuffer = pcmToWav(pcmBytes, 24000);
      return await uint8ArrayToBase64(new Uint8Array(wavBuffer));
    });
  }

  // Direct Gemini STT - Primário: Gemini 3.5 Flash Lite (com fallback 3.1 Flash Lite -> 3.5 Flash)
  async function directGeminiSTT(base64Audio, mimeType = 'audio/webm') {
    const creds = await getRotatingCredentials();
    if (!creds.apiKey) throw new Error('Chave Gemini não configurada');

    const cleanBase64 = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
    const promptText = currentSettings.transcriberInstruction || 'Transcreva com precisão o que foi dito neste áudio em português.';

    await incrementQuotaCounter(creds.keyIndex, creds.modelIndex, creds.logicalQuotaDay, creds.counters);
    const useCount = creds.counters[`key_${creds.keyIndex}_model_${creds.modelIndex}`] || 0;
    const payloadInfo = `Áudio (${Math.round(cleanBase64.length / 1024)} KB) | Chave #${creds.keyIndex + 1} | Modelo ${creds.modelIndex === 0 ? '3.5' : '3.1'} [${useCount}/10]`;

    const chosenSTT = currentSettings.sttModel || 'gemini-3.5-flash-lite';
    const sttCascade = [chosenSTT, 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'].filter((v, i, a) => a.indexOf(v) === i);

    return await executePopupFallback('STT', sttCascade, payloadInfo, async (modelName) => {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent?key=' + encodeURIComponent(creds.apiKey);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: mimeType, data: cleanBase64 } },
              { text: promptText }
            ]
          }]
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || ('Erro Gemini STT: ' + res.status));
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) throw new Error('Transcrição vazia retornada por ' + modelName);
      return text;
    });
  }

  function speakFallbackNative(text) {
    if (!window.speechSynthesis) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = currentSettings.ttsSpeed || 1.0;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function maskKey(key) {
    if (!key) return 'Nenhuma chave (.env)';
    if (key.length <= 10) return key.substring(0, 3) + '***' + key.substring(key.length - 2);
    return key.substring(0, 6) + '...' + key.substring(key.length - 4);
  }

  // Atualizar UI de Status da Chave e as 9 chaves rotativas
  function updateApiKeyUI() {
    const listEl = document.getElementById('popupKeysList');
    if (!listEl) return;

    getRotationData().then((data) => {
      const currentDay = getLogicalQuotaDay();
      const counters = data.logicalQuotaDay === currentDay ? (data.quotaCounters || {}) : {};
      const keys = data.apiKeys;

      listEl.innerHTML = '';
      let hasAnyKey = false;

      for (let k = 0; k < 9; k++) {
        const key = keys[k] ? keys[k].trim() : '';
        const masked = key ? maskKey(key) : '(Vazia)';
        const count0 = counters[`key_${k}_model_0`] || 0;
        const count1 = counters[`key_${k}_model_1`] || 0;

        if (key) hasAnyKey = true;

        const row = document.createElement('div');
        row.style.cssText = 'background:#020617; border:1px solid #1e293b; border-radius:8px; padding:6px 8px; display:flex; flex-direction:column; gap:4px; font-size:11px;';
        
        row.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#e2e8f0;">Chave #${k + 1}: <span style="font-family:monospace; color:#94a3b8;">${masked}</span></strong>
            <span style="font-size:9px; background:${key ? '#065f46' : '#1e293b'}; color:${key ? '#a7f3d0' : '#64748b'}; padding:1px 5px; border-radius:4px;">
              ${key ? 'Ativa' : 'Inativa'}
            </span>
          </div>
          ${key ? `
            <div style="display:flex; gap:8px; align-items:center; margin-top:2px;">
              <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; margin-bottom:2px;">
                  <span>3.5 Flash</span>
                  <span style="font-family:monospace; color:#38bdf8;">${count0}/10</span>
                </div>
                <div style="background:#1e293b; height:4px; border-radius:2px; overflow:hidden;">
                  <div style="background:${count0 >= 10 ? '#ef4444' : '#38bdf8'}; width:${(count0/10)*100}%; height:100%;"></div>
                </div>
              </div>
              <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; margin-bottom:2px;">
                  <span>3.1 Flash</span>
                  <span style="font-family:monospace; color:#34d399;">${count1}/10</span>
                </div>
                <div style="background:#1e293b; height:4px; border-radius:2px; overflow:hidden;">
                  <div style="background:${count1 >= 10 ? '#ef4444' : '#34d399'}; width:${(count1/10)*100}%; height:100%;"></div>
                </div>
              </div>
            </div>
          ` : '<div style="font-size:9px; color:#64748b; font-style:italic;">Não configurada</div>'}
        `;
        listEl.appendChild(row);
      }

      if (!hasAnyKey) {
        listEl.innerHTML = `
          <div style="text-align:center; padding:12px; color:#f59e0b; font-size:10px; border:1px dashed #f59e0b; border-radius:8px; background:rgba(245,158,11,0.05);">
            ⚠️ Nenhuma chave API Gemini configurada!<br>Abra a Central de Opções Completa para configurá-las.
          </div>
        `;
      }
    });
  }

  function renderVoiceDropdown() {
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect) return;

    voiceSelect.innerHTML = '';

    const stdGroup = document.createElement('optgroup');
    stdGroup.label = 'Vozes Nativas Gemini';

    const stdVoices = [
      { id: 'Kore', name: 'Kore (Equilibrada e Humana)' },
      { id: 'Puck', name: 'Puck (Dinâmica e Jovem)' },
      { id: 'Charon', name: 'Charon (Grave e Serena)' },
      { id: 'Fenrir', name: 'Fenrir (Forte e Firme)' },
      { id: 'Zephyr', name: 'Zephyr (Suave e Calma)' },
      { id: 'Aoede', name: 'Aoede (Expressiva)' },
      { id: 'Calliope', name: 'Calliope (Melódica)' },
      { id: 'Orpheus', name: 'Orpheus (Narrador)' }
    ];

    stdVoices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.name;
      stdGroup.appendChild(opt);
    });
    voiceSelect.appendChild(stdGroup);

    const customList = currentSettings.customVoices || [];
    if (customList.length > 0) {
      const customGroup = document.createElement('optgroup');
      customGroup.label = '⭐ Vozes Personalizadas';
      customList.forEach(cv => {
        const opt = document.createElement('option');
        opt.value = cv.id;
        opt.textContent = '⭐ ' + cv.name + ' (Base ' + cv.baseVoice + ')';
        customGroup.appendChild(opt);
      });
      voiceSelect.appendChild(customGroup);
    }

    if (currentSettings.ttsVoice) {
      voiceSelect.value = currentSettings.ttsVoice;
    }
  }

  // Navegação de Abas
  document.querySelectorAll('.popup-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.popup-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(btn.dataset.tab);
      if (pane) pane.classList.add('active');

      if (btn.dataset.tab === 'tab-history') {
        loadHistory();
        loadApiLogs();
      }
    });
  });

  // Carregar dados salvos
  chrome.storage.sync.get(defaults, (items) => {
    currentSettings = Object.assign(currentSettings, items);
    
    // Carrega agentes pré-definidos + customizados
    const customList = Array.isArray(items.customAgents) ? items.customAgents : [];
    allAgentsList = [...DEFAULT_AGENTS, ...customList];

    // Renderiza seletor de Agentes
    renderAgentDropdown();

    // Voz dropdown com suporte a vozes nativas e personalizadas
    renderVoiceDropdown();

    // Configura Volume Slider no Popup
    const volSlider = document.getElementById('popupVolumeSlider');
    const volBadge = document.getElementById('popupVolumeBadge');
    if (volSlider) {
      const vol = currentSettings.ttsVolume !== undefined ? Number(currentSettings.ttsVolume) : 1.0;
      volSlider.value = vol;
      if (volBadge) volBadge.innerText = Math.round(vol * 100) + '%';

      const updateVol = (e) => {
        const val = parseFloat(e.target.value);
        currentSettings.ttsVolume = val;
        if (volBadge) volBadge.innerText = Math.round(val * 100) + '%';
        chrome.storage.sync.set({ ttsVolume: val });
        if (activeAudio) activeAudio.volume = val;
        broadcastToActiveTab({ action: 'SET_AUDIO_VOLUME', volume: val });
      };

      volSlider.addEventListener('input', updateVol);
      volSlider.addEventListener('change', updateVol);
    }

    // Configura Velocidade no Popup
    const spBadge = document.getElementById('popupSpeedBadge');
    if (spBadge) {
      const sp = currentSettings.ttsSpeed || 1.0;
      spBadge.innerText = sp + 'x';
      document.querySelectorAll('.speed-pill').forEach(p => {
        if (Math.abs(parseFloat(p.dataset.speed) - sp) < 0.05) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });
    }

    // Listener de cliques nos botões de velocidade (speed-pill) no Popup
    document.querySelectorAll('.speed-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const sp = parseFloat(pill.dataset.speed);
        currentSettings.ttsSpeed = sp;

        if (spBadge) spBadge.innerText = sp + 'x';

        document.querySelectorAll('.speed-pill').forEach(p => {
          if (Math.abs(parseFloat(p.dataset.speed) - sp) < 0.05) {
            p.classList.add('active');
          } else {
            p.classList.remove('active');
          }
        });

        // Salva configuração em tempo real no Chrome Sync
        chrome.storage.sync.set({ ttsSpeed: sp });

        // Atualiza áudio em reprodução local de teste se houver
        if (activeAudio) {
          activeAudio.playbackRate = sp;
          activeAudio.defaultPlaybackRate = sp;
        }

        // Transmite para a página ativa para atualizar o balão/player flutuante instantaneamente
        broadcastToActiveTab({ action: 'SET_AUDIO_SPEED', speed: sp });
      });
    });

    // Link para Gerenciar Agentes nas Opções
    const openAgentsLink = document.getElementById('openOptionsAgentsLink');
    if (openAgentsLink) {
      openAgentsLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          window.open(chrome.runtime.getURL('options.html'));
        }
      });
    }

    // Seleção de Modelo TTS
    const ttsModelSelect = document.getElementById('ttsModelSelect');
    if (ttsModelSelect) {
      if (currentSettings.ttsModel) {
        ttsModelSelect.value = currentSettings.ttsModel;
      }
      ttsModelSelect.addEventListener('change', (e) => {
        const selectedModel = e.target.value;
        currentSettings.ttsModel = selectedModel;
        chrome.storage.sync.set({ ttsModel: selectedModel });
      });
    }

    // Seleção de voz
    const voiceSelect = document.getElementById('voiceSelect');
    if (voiceSelect) {
      voiceSelect.addEventListener('change', (e) => {
        const selected = e.target.value;
        currentSettings.ttsVoice = selected;
        chrome.storage.sync.set({ ttsVoice: selected });
      });
    }

    // Expandir/Recolher formulário de Voz Personalizada
    const toggleFormBtn = document.getElementById('toggleCustomVoiceFormBtn');
    const customContainer = document.getElementById('customVoiceFormContainer');
    if (toggleFormBtn && customContainer) {
      toggleFormBtn.addEventListener('click', () => {
        if (customContainer.style.display === 'none' || !customContainer.style.display) {
          customContainer.style.display = 'flex';
          toggleFormBtn.innerText = '- Recolher';
        } else {
          customContainer.style.display = 'none';
          toggleFormBtn.innerText = '+ Expandir';
        }
      });
    }

    // Testar nova voz personalizada
    const testNewVoiceBtn = document.getElementById('testNewVoiceBtn');
    if (testNewVoiceBtn) {
      testNewVoiceBtn.addEventListener('click', async () => {
        const text = document.getElementById('newVoiceTestTextInput')?.value || 'Demonstração de voz.';
        const baseVoice = document.getElementById('newVoiceBaseSelect')?.value || 'Kore';
        const inst = document.getElementById('newVoiceInstInput')?.value || '';

        testNewVoiceBtn.innerText = 'Gerando...';
        try {
          const wavBase64 = await directGeminiTTS(text, baseVoice, inst);
          if (activeAudio) activeAudio.pause();
          activeAudio = new Audio('data:audio/wav;base64,' + wavBase64);
          activeAudio.playbackRate = currentSettings.ttsSpeed || 1.0;
          activeAudio.volume = currentSettings.ttsVolume !== undefined ? currentSettings.ttsVolume : 1.0;
          activeAudio.play();
          testNewVoiceBtn.innerText = '▶️ Testar Voz';
        } catch (err) {
          alert('Erro ao testar voz: ' + (err.message || err));
          testNewVoiceBtn.innerText = '▶️ Testar Voz';
        }
      });
    }

    // Salvar nova voz personalizada
    const saveNewVoiceBtn = document.getElementById('saveNewVoiceBtn');
    if (saveNewVoiceBtn) {
      saveNewVoiceBtn.addEventListener('click', () => {
        const name = document.getElementById('newVoiceNameInput')?.value?.trim();
        const baseVoice = document.getElementById('newVoiceBaseSelect')?.value || 'Kore';
        const inst = document.getElementById('newVoiceInstInput')?.value?.trim() || '';

        if (!name) {
          alert('Por favor, informe um nome para a nova voz.');
          return;
        }

        const newVoice = {
          id: 'cv-' + Date.now(),
          name: name,
          baseVoice: baseVoice,
          instruction: inst
        };

        const customList = currentSettings.customVoices || [];
        customList.push(newVoice);
        currentSettings.customVoices = customList;
        currentSettings.ttsVoice = newVoice.id;

        chrome.storage.sync.set({
          customVoices: customList,
          ttsVoice: newVoice.id
        }, () => {
          renderVoiceDropdown();
          saveNewVoiceBtn.innerText = '✓ Salvo!';
          setTimeout(() => { saveNewVoiceBtn.innerText = '➕ Salvar Voz'; }, 2000);
        });
      });
    }

    // Velocidade
    document.querySelectorAll('.speed-pill').forEach(pill => {
      const spd = parseFloat(pill.dataset.speed);
      if (Math.abs(spd - (currentSettings.ttsSpeed || 1.0)) < 0.05) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    updateApiKeyUI();
    maybeAutoFetchKey();
  });

  function renderAgentDropdown() {
    const narratorSelect = document.getElementById('popupNarratorAgentSelect');
    const narratorDesc = document.getElementById('popupNarratorAgentDesc');
    const transcriberSelect = document.getElementById('popupTranscriberAgentSelect');
    const transcriberDesc = document.getElementById('popupTranscriberAgentDesc');

    if (!narratorSelect || !transcriberSelect) return;

    const populateSelect = (select, activeId, descEl) => {
      select.innerHTML = '';
      const standardGroup = document.createElement('optgroup');
      standardGroup.label = '🎭 Agentes Pré-Configurados';
      const customGroup = document.createElement('optgroup');
      customGroup.label = '✨ Meus Agentes Personalizados';

      allAgentsList.forEach(agent => {
        const opt = document.createElement('option');
        opt.value = agent.id;
        opt.textContent = agent.name;
        if (agent.isCustom) {
          customGroup.appendChild(opt);
        } else {
          standardGroup.appendChild(opt);
        }
      });

      select.appendChild(standardGroup);
      if (customGroup.children.length > 0) {
        select.appendChild(customGroup);
      }

      select.value = activeId;
      const currentAgent = allAgentsList.find(a => a.id === activeId) || allAgentsList[0];
      if (descEl && currentAgent) {
        descEl.innerText = currentAgent.description || '';
      }
    };

    const activeNarratorId = currentSettings.activeNarratorAgentId || currentSettings.activeAgentId || 'default-natural';
    const activeTranscriberId = currentSettings.activeTranscriberAgentId || currentSettings.activeAgentId || 'default-natural';

    populateSelect(narratorSelect, activeNarratorId, narratorDesc);
    populateSelect(transcriberSelect, activeTranscriberId, transcriberDesc);

    narratorSelect.addEventListener('change', (e) => {
      const chosenId = e.target.value;
      currentSettings.activeNarratorAgentId = chosenId;
      currentSettings.activeAgentId = chosenId; // Para retrocompatibilidade
      const agent = allAgentsList.find(a => a.id === chosenId);

      if (agent) {
        if (narratorDesc) narratorDesc.innerText = agent.description || '';
        
        // Se o agente possui voz preferida, atualiza
        if (agent.preferredVoice) {
          currentSettings.ttsVoice = agent.preferredVoice;
          const vSel = document.getElementById('voiceSelect');
          if (vSel) vSel.value = agent.preferredVoice;
        }

        const modelToUse = agent.ttsModel || currentSettings.ttsModel || 'gemini-3.8-flash-lite-tts';
        const ttsModelSelect = document.getElementById('ttsModelSelect');
        if (ttsModelSelect) ttsModelSelect.value = modelToUse;

        chrome.storage.sync.set({
          activeNarratorAgentId: chosenId,
          activeAgentId: chosenId,
          ttsVoice: currentSettings.ttsVoice,
          ttsModel: modelToUse,
          narratorInstruction: agent.narratorInstruction,
          locutionInstruction: agent.locutionInstruction,
          visionInstruction: agent.visionInstruction
        });

        broadcastToActiveTab({ action: 'SET_ACTIVE_AGENT', agentId: chosenId, agent: agent });
      }
    });

    transcriberSelect.addEventListener('change', (e) => {
      const chosenId = e.target.value;
      currentSettings.activeTranscriberAgentId = chosenId;
      const agent = allAgentsList.find(a => a.id === chosenId);

      if (agent) {
        if (transcriberDesc) transcriberDesc.innerText = agent.description || '';

        const sttModelToUse = agent.sttModel || currentSettings.sttModel || 'gemini-3.5-flash-lite';

        chrome.storage.sync.set({
          activeTranscriberAgentId: chosenId,
          sttModel: sttModelToUse,
          transcriberInstruction: agent.transcriberInstruction
        });

        broadcastToActiveTab({ action: 'SET_TRANSCRIBER_AGENT', agentId: chosenId, agent: agent });
      }
    });
  }

  function broadcastToActiveTab(msg) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, msg, () => {
            if (chrome.runtime.lastError) {}
          });
        }
      });
    }
  }

  // Resetar Contadores Manualmente no Popup
  const btnQuickResetCounters = document.getElementById('btnQuickResetCounters');
  if (btnQuickResetCounters) {
    btnQuickResetCounters.addEventListener('click', () => {
      if (confirm('Deseja zerar manualmente todos os contadores de cota diária de todas as chaves?')) {
        chrome.storage.local.set({ quotaCounters: {} }, () => {
          updateApiKeyUI();
          alert('Contadores reiniciados com sucesso!');
        });
      }
    });
  }

  // Tentar obter chave automaticamente do servidor apenas se ainda não configurada
  function maybeAutoFetchKey() {
    if (!currentSettings.apiKey || !currentSettings.apiKey.trim()) {
      const rawServer = currentSettings.serverUrl || 'http://localhost:3000';
      const serverBase = rawServer.endsWith('/') ? rawServer.slice(0, -1) : rawServer;
      fetch(serverBase + '/api/get-key').then(r => r.json()).then(data => {
        if (!currentSettings.apiKey || !currentSettings.apiKey.trim()) {
          if (data.fullKey) {
            currentSettings.apiKey = data.fullKey;
            chrome.storage.sync.set({ apiKey: data.fullKey });
            if (quickApiKeyInput && !quickApiKeyInput.value) {
              quickApiKeyInput.value = data.fullKey;
            }
            updateApiKeyUI();
          }
        }
      }).catch(() => {});
    }
  }

  // Validar Chave de .env no Google
  const validateApiKeyBtn = document.getElementById('validateApiKeyBtn');
  const apiKeyValidationMsg = document.getElementById('apiKeyValidationMsg');
  if (validateApiKeyBtn) {
    validateApiKeyBtn.addEventListener('click', async () => {
      const key = currentSettings.apiKey || (quickApiKeyInput ? quickApiKeyInput.value.trim() : '');
      if (!key) {
        if (apiKeyValidationMsg) {
          apiKeyValidationMsg.innerText = '⚠️ Nenhuma chave encontrada em .env.';
          apiKeyValidationMsg.style.color = '#f59e0b';
        }
        return;
      }

      validateApiKeyBtn.innerText = 'Testando com Google...';
      try {
        const primaryTestModel = 'gemini-3.1-flash-lite';
        const fallbackTestModel = 'gemini-2.5-flash-lite';
        let testedModel = primaryTestModel;

        let url = `https://generativelanguage.googleapis.com/v1beta/models/${primaryTestModel}:generateContent?key=${encodeURIComponent(key)}`;
        let res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'ping' }] }]
          })
        });

        if (!res.ok) {
          testedModel = fallbackTestModel;
          url = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackTestModel}:generateContent?key=${encodeURIComponent(key)}`;
          res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'ping' }] }]
            })
          });
        }

        if (res.ok) {
          if (apiKeyValidationMsg) {
            apiKeyValidationMsg.innerText = `✓ Chave Gemini Válida e Operacional! (${testedModel})`;
            apiKeyValidationMsg.style.color = '#34d399';
          }
        } else {
          const err = await res.json().catch(() => ({}));
          if (apiKeyValidationMsg) {
            apiKeyValidationMsg.innerText = '❌ Erro na chave: ' + (err.error?.message || ('Código HTTP ' + res.status));
            apiKeyValidationMsg.style.color = '#f87171';
          }
        }
      } catch (err) {
        if (apiKeyValidationMsg) {
          apiKeyValidationMsg.innerText = '❌ Erro de conexão com a API Google: ' + (err.message || err);
          apiKeyValidationMsg.style.color = '#f87171';
        }
      } finally {
        validateApiKeyBtn.innerText = '🔍 Validar Chave no Google Gemini';
      }
    });
  }

  // Gerenciamento da Caixa de Transcrição Dedicada no Popup
  const popupTransBox = document.getElementById('popupTranscribedBox');
  const transCharCount = document.getElementById('transCharCount');
  const clearPopupTransBtn = document.getElementById('clearPopupTransBtn');
  const playPopupTransBtn = document.getElementById('playPopupTransBtn');
  const copyPopupTransBtn = document.getElementById('copyPopupTransBtn');

  function updateTransCharCount() {
    if (transCharCount && popupTransBox) {
      const len = popupTransBox.value.length;
      transCharCount.innerText = len + (len === 1 ? ' caractere' : ' caracteres');
    }
  }

  if (popupTransBox) {
    popupTransBox.addEventListener('input', updateTransCharCount);
  }

  if (clearPopupTransBtn && popupTransBox) {
    clearPopupTransBtn.addEventListener('click', () => {
      popupTransBox.value = '';
      updateTransCharCount();
    });
  }

  if (copyPopupTransBtn && popupTransBox) {
    copyPopupTransBtn.addEventListener('click', async () => {
      const text = popupTransBox.value;
      if (!text) return;
      await navigator.clipboard.writeText(text);
      copyPopupTransBtn.innerText = '✓ Copiado!';
      setTimeout(() => { copyPopupTransBtn.innerText = '📋 Copiar'; }, 1500);
    });
  }

  if (playPopupTransBtn && popupTransBox) {
    playPopupTransBtn.addEventListener('click', () => {
      const text = popupTransBox.value.trim();
      if (text) {
        playTtsSample(text);
      }
    });
  }

  // Sub-abas de Histórico e Logs com Accordions Expansíveis
  const subTabHistoryBtn = document.getElementById('subTabHistoryBtn');
  const subTabApiLogsBtn = document.getElementById('subTabApiLogsBtn');
  const historyViewContainer = document.getElementById('historyViewContainer');
  const apiLogsViewContainer = document.getElementById('apiLogsViewContainer');

  if (subTabHistoryBtn && subTabApiLogsBtn) {
    subTabHistoryBtn.addEventListener('click', () => {
      subTabHistoryBtn.classList.add('active');
      subTabApiLogsBtn.classList.remove('active');
      if (historyViewContainer) historyViewContainer.style.display = 'block';
      if (apiLogsViewContainer) apiLogsViewContainer.style.display = 'none';
      loadHistory();
    });

    subTabApiLogsBtn.addEventListener('click', () => {
      subTabApiLogsBtn.classList.add('active');
      subTabHistoryBtn.classList.remove('active');
      if (historyViewContainer) historyViewContainer.style.display = 'none';
      if (apiLogsViewContainer) apiLogsViewContainer.style.display = 'block';
      loadApiLogs();
    });
  }

  // Carregar Histórico em Accordion Expansível
  function loadHistory() {
    chrome.storage.local.get({ sessionTranscriptions: [] }, (res) => {
      const list = res.sessionTranscriptions || [];
      const countEl = document.getElementById('histCount');
      if (countEl) countEl.innerText = list.length;

      const container = document.getElementById('historyList');
      if (!container) return;

      if (list.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding:24px 8px; color:#64748b; font-size:11px;">
            Nenhuma fala gravada ainda.<br>Pressione Pause ou grave pelo microfone para transcrever.
          </div>
        `;
        return;
      }

      container.innerHTML = list.slice(0, 15).map((item, idx) => {
        const words = item.text.trim().split(/\s+/).filter(Boolean).length;
        const chars = item.text.length;
        const targetLabel = item.target || 'Campo Livre';
        const snippet = item.text.length > 45 ? item.text.substring(0, 42) + '...' : item.text;

        return `
          <div class="accordion-card ${idx === 0 ? 'open' : ''}">
            <div class="accordion-header" data-idx="${idx}">
              <div style="display:flex; align-items:center; gap:6px; overflow:hidden; flex:1;">
                <span class="badge-pill info">${targetLabel}</span>
                <span style="font-size:11px; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">"${snippet}"</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                <span style="font-size:9px; color:#64748b;">${item.time || ''}</span>
                <span class="accordion-chevron">▶</span>
              </div>
            </div>
            <div class="accordion-body">
              <div style="color:#f1f5f9; background:#020617; padding:8px; border-radius:6px; border:1px solid #1e293b; line-height:1.4; margin-bottom:8px; user-select:text;">
                ${item.text}
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:9px; color:#64748b;">${words} palavras • ${chars} caracteres</span>
                <div style="display:flex; gap:4px;">
                  <button class="btn-trans-mini btn-h-copy" data-text="${encodeURIComponent(item.text)}">📋 Copiar</button>
                  <button class="btn-trans-mini primary btn-h-tts" data-text="${encodeURIComponent(item.text)}">🔊 Ouvir</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Alternar accordion
      container.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
          const card = header.closest('.accordion-card');
          if (card) {
            card.classList.toggle('open');
          }
        });
      });

      // Ações dos botões
      container.querySelectorAll('.btn-h-copy').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const txt = decodeURIComponent(btn.dataset.text);
          await navigator.clipboard.writeText(txt);
          btn.innerText = '✓ Copiado';
          setTimeout(() => { btn.innerText = '📋 Copiar'; }, 1500);
        });
      });

      container.querySelectorAll('.btn-h-tts').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const txt = decodeURIComponent(btn.dataset.text);
          playTtsSample(txt);
        });
      });
    });
  }
  loadHistory();

  // Carregar Logs e Telemetria de API em Accordion Expansível
  function loadApiLogs() {
    chrome.storage.local.get({ apiLogs: [] }, (res) => {
      const logs = res.apiLogs || [];
      const container = document.getElementById('apiLogsList');
      if (!container) return;

      if (logs.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding:24px 8px; color:#64748b; font-size:11px;">
            Nenhuma requisição de API registrada ainda.<br>Realize uma ação para visualizar a telemetria.
          </div>
        `;
        return;
      }

      container.innerHTML = logs.slice(0, 15).map((item, idx) => {
        const isSuccess = Boolean(item.success);
        const statusBadge = `<span class="badge-pill ${isSuccess ? 'success' : 'error'}">${item.statusCode || (isSuccess ? 200 : 500)} ${item.statusText || (isSuccess ? 'OK' : 'Falha')}</span>`;
        const actionBadge = `<span class="badge-pill info">${item.action}</span>`;

        return `
          <div class="accordion-card ${idx === 0 ? 'open' : ''}">
            <div class="accordion-header" data-idx="${idx}">
              <div style="display:flex; align-items:center; gap:6px;">
                ${actionBadge}
                <span style="font-size:11px; font-weight:600; color:#f8fafc;">${item.model}</span>
                ${statusBadge}
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:10px; color:#38bdf8; font-family:monospace;">${item.latencyMs}ms</span>
                <span class="accordion-chevron">▶</span>
              </div>
            </div>
            <div class="accordion-body">
              <div style="font-family:monospace; font-size:10px; color:#cbd5e1; line-height:1.4; background:#020617; padding:8px; border-radius:6px; border:1px solid #1e293b; margin-bottom:6px;">
                <div><strong style="color:#94a3b8;">Horário:</strong> ${item.timeFormatted || new Date(item.timestamp || Date.now()).toLocaleTimeString('pt-BR')}</div>
                <div><strong style="color:#94a3b8;">Payload:</strong> ${item.payloadInfo || 'N/A'}</div>
                <div><strong style="color:#94a3b8;">Modo:</strong> ${item.mode || 'direct'}</div>
                ${item.errorMessage ? `<div style="color:#f87171; margin-top:4px;"><strong style="color:#f87171;">Erro:</strong> ${item.errorMessage}</div>` : ''}
              </div>
              <div style="display:flex; justify-content:flex-end;">
                <button class="btn-trans-mini btn-copy-log" data-json="${encodeURIComponent(JSON.stringify(item, null, 2))}">📋 Copiar Detalhes JSON</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
          const card = header.closest('.accordion-card');
          if (card) {
            card.classList.toggle('open');
          }
        });
      });

      container.querySelectorAll('.btn-copy-log').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const jsonStr = decodeURIComponent(btn.dataset.json);
          await navigator.clipboard.writeText(jsonStr);
          btn.innerText = '✓ JSON Copiado';
          setTimeout(() => { btn.innerText = '📋 Copiar Detalhes JSON'; }, 1500);
        });
      });
    });
  }

  // Mudança de voz
  const voiceSelect = document.getElementById('voiceSelect');
  if (voiceSelect) {
    voiceSelect.addEventListener('change', () => {
      currentSettings.ttsVoice = voiceSelect.value;
      chrome.storage.sync.set({ ttsVoice: currentSettings.ttsVoice });
    });
  }

  // CORREÇÃO CRÍTICA DE VELOCIDADE NO POPUP (Persistência Imediata e Re-aplicação Robusta)
  document.querySelectorAll('.speed-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const sp = parseFloat(pill.dataset.speed);
      currentSettings.ttsSpeed = sp;
      
      document.querySelectorAll('.speed-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      chrome.storage.sync.set({ ttsSpeed: sp });

      if (activeAudio) {
        activeAudio.playbackRate = sp;
        activeAudio.defaultPlaybackRate = sp;
      }
      console.log('[Popup STT&TTS] Velocidade alterada para:', sp + 'x');
    });
  });

  // Reproduzir Amostra TTS
  async function playTtsSample(textToPlay) {
    const testBtn = document.getElementById('testTtsBtn');
    const stopBtn = document.getElementById('stopTtsBtn');

    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }

    testBtn.innerText = 'Sintetizando...';
    testBtn.disabled = true;

    const sampleText = textToPlay || ('Olá! Esta é uma demonstração da voz neural ' + (currentSettings.ttsVoice || 'Kore') + ' do STT&TTS de Satiro.');

    // 1. Tenta Modo Direto Gemini
    if (currentSettings.apiKey && currentSettings.apiKey.trim()) {
      try {
        const wavBase64 = await directGeminiTTS(sampleText);
        const audio = new Audio('data:audio/wav;base64,' + wavBase64);
        const spd = Number(currentSettings.ttsSpeed || 1.0);
        
        audio.playbackRate = spd;
        audio.defaultPlaybackRate = spd;

        audio.addEventListener('loadedmetadata', () => {
          audio.playbackRate = Number(currentSettings.ttsSpeed || 1.0);
        });
        audio.addEventListener('play', () => {
          audio.playbackRate = Number(currentSettings.ttsSpeed || 1.0);
        });
        audio.addEventListener('playing', () => {
          audio.playbackRate = Number(currentSettings.ttsSpeed || 1.0);
        });

        activeAudio = audio;

        testBtn.style.display = 'none';
        stopBtn.style.display = 'flex';

        activeAudio.onended = () => {
          activeAudio = null;
          testBtn.style.display = 'flex';
          stopBtn.style.display = 'none';
          testBtn.innerText = '▶️ Testar Voz com Gemini';
          testBtn.disabled = false;
        };

        await activeAudio.play();
        return;
      } catch (err) {
        console.warn('[STT&TTS de Satiro] Falha na síntese direta:', err);
      }
    }

    // 2. Fallback de voz nativa se não houver chave ou der erro
    speakFallbackNative(sampleText);
    testBtn.innerText = '▶️ Testar Voz com Gemini';
    testBtn.disabled = false;
  }

  const testBtn = document.getElementById('testTtsBtn');
  if (testBtn) testBtn.addEventListener('click', () => playTtsSample());

  const stopBtn = document.getElementById('stopTtsBtn');
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // Interrompe áudio em abas ativas
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'STOP_ALL_AUDIO' }, () => {
              if (chrome.runtime.lastError) {}
            });
          }
        });
      }

      testBtn.style.display = 'flex';
      stopBtn.style.display = 'none';
      testBtn.innerText = '▶️ Testar Voz com Gemini';
      testBtn.disabled = false;
    });
  }

  // GRAVAÇÃO DIRETA NO POPUP COM SOLICITAÇÃO NATIVA DE MICROFONE
  const directRecordBtn = document.getElementById('directRecordBtn');
  const micLabel = document.getElementById('micLabel');
  const micTimer = document.getElementById('micTimer');
  const micStatusSub = document.getElementById('micStatusSub');

  if (directRecordBtn) {
    directRecordBtn.addEventListener('click', async () => {
      if (!isRecording) {
        // INICIAR GRAVAÇÃO NO POPUP
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioChunks = [];
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) audioChunks.push(e.data);
          };

          mediaRecorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            if (micLabel) micLabel.innerText = 'Transcrevendo com Gemini...';
            if (micStatusSub) micStatusSub.innerText = 'Enviando áudio diretamente para a API Gemini...';

            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = async () => {
              try {
                let transcribedText = '';
                if (currentSettings.apiKey && currentSettings.apiKey.trim()) {
                  transcribedText = await directGeminiSTT(reader.result, 'audio/webm');
                } else {
                  throw new Error('Chave Gemini ausente. Insira sua chave acima.');
                }

                if (transcribedText) {
                  if (micLabel) micLabel.innerText = '✓ Fala Transcrita!';
                  if (micStatusSub) micStatusSub.innerText = '"' + (transcribedText.length > 60 ? transcribedText.substring(0, 57) + '...' : transcribedText) + '"';

                  // Insere diretamente na caixa de transcrição do popup
                  if (popupTransBox) {
                    popupTransBox.value = transcribedText;
                    updateTransCharCount();
                  }

                  // Copia para área de transferência
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(transcribedText).catch(() => {});
                  }

                  // Salva no histórico
                  chrome.storage.local.get({ sessionTranscriptions: [] }, (r) => {
                    const list = r.sessionTranscriptions || [];
                    list.unshift({
                      text: transcribedText,
                      target: 'Popup STT&TTS de Satiro',
                      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    });
                    chrome.storage.local.set({ sessionTranscriptions: list }, () => loadHistory());
                  });

                  setTimeout(() => {
                    if (micLabel) micLabel.innerText = 'Gravar Fala no Microfone';
                    if (micStatusSub) micStatusSub.innerText = 'Clique para ditar e transcrever via Gemini STT';
                  }, 4000);

                } else {
                  if (micLabel) micLabel.innerText = 'Nenhuma fala detectada';
                  if (micStatusSub) micStatusSub.innerText = 'Fale mais próximo ao microfone e tente novamente.';
                }
              } catch (err) {
                if (micLabel) micLabel.innerText = 'Erro na Transcrição';
                if (micStatusSub) micStatusSub.innerText = err.message || 'Verifique sua Chave Gemini.';
              }
            };
            reader.readAsDataURL(audioBlob);
          };

          mediaRecorder.start();
          isRecording = true;
          recordSeconds = 0;
          if (directRecordBtn) directRecordBtn.classList.add('recording');
          if (micLabel) micLabel.innerText = 'Pressione para Finalizar';
          if (micTimer) {
            micTimer.style.display = 'inline';
            micTimer.innerText = '0s';
          }
          if (micStatusSub) micStatusSub.innerText = 'Ouvindo sua fala... Clique novamente para transcrever com IA.';

          recordTimer = setInterval(() => {
            recordSeconds++;
            if (micTimer) micTimer.innerText = recordSeconds + 's';
          }, 1000);

        } catch (err) {
          console.warn('[STT&TTS] Microfone bloqueado no popup:', err);
          if (micLabel) micLabel.innerText = '🔑 Autorizar Microfone no Chrome';
          if (micStatusSub) micStatusSub.innerHTML = 'O Chrome bloqueia o pop-up de permissão nesta janela. <strong style="color:#38bdf8; text-decoration:underline; cursor:pointer;" id="popupOpenMicAuthTab">Clique aqui para autorizar em 1 segundo</strong>.';
          
          const openTabEl = document.getElementById('popupOpenMicAuthTab');
          if (openTabEl) {
            openTabEl.addEventListener('click', (e) => {
              e.stopPropagation();
              chrome.tabs.create({ url: chrome.runtime.getURL('options.html?authMic=1') });
            });
          }
          
          // Se o usuário clicar no botão principal enquanto estiver nesse estado, abrir a aba de autorização diretamente:
          const handleAuthClick = (e) => {
            e.stopPropagation();
            if (directRecordBtn) directRecordBtn.removeEventListener('click', handleAuthClick);
            chrome.tabs.create({ url: chrome.runtime.getURL('options.html?authMic=1') });
          };
          if (directRecordBtn) directRecordBtn.addEventListener('click', handleAuthClick, { once: true });
        }

      } else {
        // PARAR GRAVAÇÃO
        clearInterval(recordTimer);
        if (micTimer) micTimer.style.display = 'none';
        if (directRecordBtn) directRecordBtn.classList.remove('recording');
        isRecording = false;

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }
    });
  }

  // Abrir Central de Opções
  const openOptionsBtn = document.getElementById('openOptionsBtn');
  if (openOptionsBtn) {
    openOptionsBtn.addEventListener('click', () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      }
    });
  }

  // Botão dedicado de autorizar microfone no popup
  const popupAuthMicBtn = document.getElementById('popupAuthMicBtn');
  if (popupAuthMicBtn) {
    popupAuthMicBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html?authMic=1') });
    });
  }

  // ==========================================
  // LÓGICA DA ABA DE ATUALIZAÇÃO VIA GITHUB
  // ==========================================
  const popupCheckGitBtn = document.getElementById('popupCheckGitBtn');
  const popupPullGitBtn = document.getElementById('popupPullGitBtn');
  const popupReloadExtBtn = document.getElementById('popupReloadExtBtn');
  const popupRestartChromeBtn = document.getElementById('popupRestartChromeBtn');
  const popupGitCommit = document.getElementById('popupGitCommit');
  const popupGitDirty = document.getElementById('popupGitDirty');
  const popupGitBadge = document.getElementById('popupGitBadge');
  const popupUpdateLogs = document.getElementById('popupUpdateLogs');

  function addPopupUpdateLog(msg) {
    if (!popupUpdateLogs) return;
    const line = document.createElement('div');
    line.innerText = msg;
    line.style.padding = '1px 0';
    popupUpdateLogs.appendChild(line);
    popupUpdateLogs.scrollTop = popupUpdateLogs.scrollHeight;
  }

  function getServerBaseUrl() {
    const raw = currentSettings.serverUrl || 'http://localhost:3000';
    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
  }

  // Consulta direta à API Pública do GitHub com detecção inteligente de repositório e branch
  async function fetchDirectGitHubStatus() {
    const candidateRepos = [
      'pinguelanarosca/EXTTTSSTT',
      'pinguelanarosca/FalaGemini',
      'pinguelanarosca/SatiroSTT-TTS',
      'pinguelanarosca/STT-TTSByAlee'
    ];
    const candidateBranches = ['main', 'master'];

    let lastError = null;

    for (const repo of candidateRepos) {
      for (const branch of candidateBranches) {
        try {
          const res = await fetch('https://api.github.com/repos/' + repo + '/commits/' + branch, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
          });
          if (res.ok) {
            const data = await res.json();
            const sha = data.sha ? data.sha.substring(0, 7) : branch;
            const msg = data.commit?.message ? data.commit.message.split('\n')[0] : 'Último commit';
            const author = data.commit?.author?.name || 'GitHub';
            const date = data.commit?.author?.date ? new Date(data.commit.author.date).toLocaleString('pt-BR') : '';

            return {
              isGitRepo: true,
              branch: branch,
              currentCommit: sha,
              commitDate: date,
              commitMessage: msg,
              author: author,
              remoteUrl: 'https://github.com/' + repo,
              repoName: repo,
              dirty: false,
              hasUpdates: true,
              source: 'github_api'
            };
          } else if (res.status === 404) {
            lastError = new Error('Repositório ou branch não encontrada (' + repo + '@' + branch + ')');
          } else {
            lastError = new Error('GitHub API HTTP ' + res.status);
          }
        } catch (e) {
          lastError = e;
        }
      }
    }

    throw lastError || new Error('Não foi possível conectar ao GitHub');
  }

  async function checkGitStatusInPopup() {
    if (!popupCheckGitBtn) return;
    popupCheckGitBtn.disabled = true;
    popupCheckGitBtn.innerText = 'Consultando...';
    addPopupUpdateLog('[$] Consultando status no GitHub (pinguelanarosca/EXTTTSSTT)...');

    try {
      let data = null;

      // 1. Tenta API direta do GitHub
      try {
        data = await fetchDirectGitHubStatus();
        addPopupUpdateLog('✓ Conectado diretamente à API pública do GitHub!');
      } catch (ghErr) {
        // 2. Se a API do GitHub falhar, tenta o servidor local caso esteja ativo
        const sUrl = getServerBaseUrl();
        try {
          const res = await fetch(sUrl + '/api/git/status', {
            headers: { 'Accept': 'application/json' }
          });
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('application/json')) {
            data = await res.json();
            addPopupUpdateLog('✓ Conectado ao servidor local.');
          }
        } catch {}

        if (!data) {
          throw new Error(ghErr.message || 'Verifique sua conexão com a internet');
        }
      }

      if (data) {
        if (popupGitBadge) popupGitBadge.innerText = (data.repoName ? data.repoName.split('/')[1] : '') + ' (' + (data.branch || 'main') + ')';
        if (popupGitCommit) popupGitCommit.innerText = data.currentCommit || 'N/A';
        if (popupGitDirty) {
          popupGitDirty.innerText = data.source === 'github_api' ? 'Sincronizado com GitHub' : (data.dirty ? (data.modifiedFiles?.length + ' alterados') : 'Limpa (Clean)');
          popupGitDirty.style.color = '#34d399';
        }

        addPopupUpdateLog('📌 Último Commit: ' + data.currentCommit + ' - "' + (data.commitMessage || '') + '"');
        if (data.commitDate) {
          addPopupUpdateLog('📅 Data: ' + data.commitDate + (data.author ? ' (' + data.author + ')' : ''));
        }
        addPopupUpdateLog('⚡ Dica: execute "atualizar_extensao.bat" na pasta da extensão para atualizar tudo automaticamente!');
      }
    } catch (err) {
      addPopupUpdateLog('❌ Falha na consulta: ' + (err.message || err));
      addPopupUpdateLog('💡 Para atualizar sem internet ou API, execute atualizar_extensao.bat na pasta.');
    } finally {
      popupCheckGitBtn.disabled = false;
      popupCheckGitBtn.innerText = '🔍 1. Verificar Status Git';
    }
  }

  if (popupCheckGitBtn) {
    popupCheckGitBtn.addEventListener('click', checkGitStatusInPopup);
  }

  if (popupPullGitBtn) {
    popupPullGitBtn.addEventListener('click', async () => {
      popupPullGitBtn.disabled = true;
      popupPullGitBtn.innerText = 'Baixando...';
      addPopupUpdateLog('[$] Iniciando download da versão mais recente do GitHub...');

      let pullSucceeded = false;

      // 1. Tentar pull via servidor local se existir
      try {
        const sUrl = getServerBaseUrl();
        const res = await fetch(sUrl + '/api/git/pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ repoUrl: 'https://github.com/pinguelanarosca/EXTTTSSTT', branch: 'main', force: false, runInstall: true })
        });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) {
          const data = await res.json();
          if (data.steps) {
            data.steps.forEach(s => {
              addPopupUpdateLog((s.success ? '✓ ' : '⚠️ ') + s.name + ' (' + s.durationMs + 'ms)');
            });
          }
          if (data.success) {
            pullSucceeded = true;
            addPopupUpdateLog('✓ ' + data.message);
          }
        }
      } catch (e) {
        // Servidor local não respondeu, usaremos download direto
      }

      // 2. Se não estiver rodando servidor local, abrir download direto do ZIP do GitHub
      if (!pullSucceeded) {
        const repoZipUrl = 'https://github.com/pinguelanarosca/EXTTTSSTT/archive/refs/heads/main.zip';
        addPopupUpdateLog('📥 Baixando pacote ZIP atualizado do repositório GitHub...');
        chrome.tabs.create({ url: repoZipUrl });
        addPopupUpdateLog('✓ Download do arquivo ZIP iniciado!');
        addPopupUpdateLog('⚡ Após descompactar na pasta da extensão, clique no botão 3 (Recarregar Extensão).');
      }

      popupPullGitBtn.disabled = false;
      popupPullGitBtn.innerText = '⬇️ 2. Baixar & Instalar do GitHub';
    });
  }

  if (popupReloadExtBtn) {
    popupReloadExtBtn.addEventListener('click', () => {
      addPopupUpdateLog('[$] Recarregando extensão com nova versão...');
      setTimeout(() => {
        chrome.runtime.reload();
      }, 150);
    });
  }

  if (popupRestartChromeBtn) {
    popupRestartChromeBtn.addEventListener('click', async () => {
      addPopupUpdateLog('[$] Enviando sinal de reinício ao Chrome...');
      try {
        const sUrl = getServerBaseUrl();
        fetch(sUrl + '/api/git/restart-chrome', { method: 'POST' }).catch(() => {});
      } catch {}

      try {
        navigator.clipboard.writeText('chrome://restart');
        addPopupUpdateLog('✓ chrome://restart copiado para área de transferência.');
      } catch {}

      try {
        chrome.tabs.create({ url: 'chrome://restart' });
      } catch {
        addPopupUpdateLog('Abra uma nova aba e digite chrome://restart para reiniciar.');
      }
    });
  }
})();
