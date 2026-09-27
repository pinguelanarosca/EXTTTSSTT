// Options Logic - STT&TTS de Satiro (Central de Opções Completa)
(function initOptionsPage() {
  const fields = [
    'apiKey',
    'ttsModel',
    'sttModel',
    'locutionInstruction',
    'narratorInstruction',
    'transcriberInstruction',
    'visionInstruction',
    'ttsSpeed',
    'ttsVolume',
    'eqLow',
    'eqMid',
    'eqHigh',
    'ttsPitch'
  ];

  const defaults = {
    serverUrl: '',
    apiKey: 'YOUR_GEMINI_API_KEY',
    ttsModel: 'gemini-3.8-flash-lite-tts',
    sttModel: 'gemini-3.5-flash-lite',
    ttsVoice: 'Kore',
    locutionInstruction: 'Você é um locutor profissional e envolvente. Dite os textos com ritmo dinâmico.',
    narratorInstruction: 'Você é um narrador natural e expressivo. Leia o texto com dicção impecável, ritmo equilibrado e entonação humana.',
    transcriberInstruction: 'Transcreva com fidelidade absoluta o áudio recebido. Aplique pontuação correta e remova vícios de linguagem comuns.',
    visionInstruction: 'Analise detalhadamente a imagem capturada da tela com o Google Lens. Se contiver texto, transcreva ou leia-o com máxima precisão.',
    ttsSpeed: 1.0,
    ttsVolume: 1.0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    ttsPitch: 0
  };

  let currentSettings = { ...defaults };
  let selectedVoice = 'Kore';
  let activeAudio = null;
  let audioCtx = null;
  let analyserNode = null;
  let animFrameId = null;

  // Visualizador Espectro Canvas FFT / Waveform
  let spectrumMode = 'fft'; // 'fft' ou 'wave'

  function initSpectrumCanvas() {
    const canvas = document.getElementById('optSpectrumCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajusta resolução do canvas
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    function drawIdle() {
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      // Fundo em gradiente suave
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(1, '#0b1329');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Desenha barras de espectro simuladas/estáticas
      const numBars = 32;
      const barWidth = (w - (numBars * 4)) / numBars;
      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + 4) + 2;
        const barH = 8 + Math.sin(i * 0.4) * 6;
        const grad = ctx.createLinearGradient(0, h, 0, h - barH);
        grad.addColorStop(0, '#0284c7');
        grad.addColorStop(1, '#38bdf8');
        ctx.fillStyle = grad;
        ctx.fillRect(x, h - barH, barWidth, barH);
      }
    }

    drawIdle();

    const btnFFT = document.getElementById('btnSpectrumFFT');
    const btnWave = document.getElementById('btnSpectrumWave');

    if (btnFFT) {
      btnFFT.addEventListener('click', () => {
        spectrumMode = 'fft';
        btnFFT.classList.add('btn-success');
        if (btnWave) btnWave.classList.remove('btn-success');
      });
    }
    if (btnWave) {
      btnWave.addEventListener('click', () => {
        spectrumMode = 'wave';
        btnWave.classList.add('btn-success');
        if (btnFFT) btnFFT.classList.remove('btn-success');
      });
    }
  }

  function startSpectrumAnimation(audioElement) {
    const canvas = document.getElementById('optSpectrumCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      if (!analyserNode) {
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 128;
      }

      const source = audioCtx.createMediaElementSource(audioElement);
      source.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);
    } catch (e) {
      // Ignora se já estiver conectado
    }

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    function renderFrame() {
      animFrameId = requestAnimationFrame(renderFrame);
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      if (spectrumMode === 'fft' && analyserNode) {
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(dataArray);

        const barWidth = (w / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * h * 0.85;

          const grad = ctx.createLinearGradient(0, h, 0, h - barHeight);
          grad.addColorStop(0, '#0284c7');
          grad.addColorStop(0.5, '#38bdf8');
          grad.addColorStop(1, '#818cf8');

          ctx.fillStyle = grad;
          ctx.fillRect(x, h - barHeight, barWidth - 2, barHeight);

          x += barWidth;
        }
      } else if (analyserNode) {
        const bufferLength = analyserNode.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();

        const sliceWidth = w / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * h) / 2;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }

        ctx.lineTo(w, h / 2);
        ctx.stroke();
      }
    }

    cancelAnimationFrame(animFrameId);
    renderFrame();
  }

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
      chrome.storage.local.get({
        apiKeys: ['YOUR_GEMINI_API_KEY', '', '', '', '', '', '', '', ''],
        logicalQuotaDay: '',
        quotaCounters: {}
      }, (localData) => {
        chrome.storage.sync.get({
          apiKeys: localData.apiKeys
        }, (syncData) => {
          const apiKeys = syncData.apiKeys || localData.apiKeys || ['YOUR_GEMINI_API_KEY', '', '', '', '', '', '', '', ''];
          if (apiKeys.every(k => !k)) {
            apiKeys[0] = currentSettings.apiKey || 'YOUR_GEMINI_API_KEY';
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
    chrome.storage.local.set({
      logicalQuotaDay: logicalDay,
      quotaCounters: currentCounters
    }, () => {
      renderApiKeysPanel();
    });
  }

  function renderApiKeysPanel() {
    const container = document.getElementById('apiKeysContainer');
    if (!container) return;

    getRotationData().then((data) => {
      const currentDay = getLogicalQuotaDay();
      const counters = data.logicalQuotaDay === currentDay ? (data.quotaCounters || {}) : {};
      const keys = data.apiKeys;

      container.innerHTML = '';

      for (let k = 0; k < 9; k++) {
        const val = keys[k] || '';
        const count0 = counters[`key_${k}_model_0`] || 0;
        const count1 = counters[`key_${k}_model_1`] || 0;

        const row = document.createElement('div');
        row.style.cssText = 'background:#020617; border:1px solid #1e293b; border-radius:12px; padding:12px 16px; display:flex; flex-direction:column; gap:8px;';

        row.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <label style="margin-bottom:0; font-weight:700; color:#cbd5e1; font-size:12px;">Chave API #${k + 1}</label>
            <div style="display:flex; gap:12px; font-size:11px;">
              <span style="color:#38bdf8;">Modelo 3.5: <strong style="font-family:monospace;">${count0}/10</strong></span>
              <span style="color:#34d399;">Modelo 3.1: <strong style="font-family:monospace;">${count1}/10</strong></span>
            </div>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <input type="password" class="rotation-key-input" data-index="${k}" value="${val}" placeholder="Insira a chave API Gemini #${k + 1}..." style="flex:1; background:#090d16; border:1px solid #1e293b; border-radius:8px; padding:8px 12px; color:#fff;" />
            <button class="btn btn-secondary btn-toggle-eye" style="padding:6px 10px; font-size:11px;" type="button">👁️</button>
          </div>
          ${val ? `
            <div style="display:flex; gap:12px; margin-top:2px;">
              <div style="flex:1; background:#1e293b; height:6px; border-radius:3px; overflow:hidden; position:relative;" title="Cota Modelo 3.5: ${count0}/10">
                <div style="background:${count0 >= 10 ? '#ef4444' : '#38bdf8'}; width:${(count0/10)*100}%; height:100%;"></div>
              </div>
              <div style="flex:1; background:#1e293b; height:6px; border-radius:3px; overflow:hidden; position:relative;" title="Cota Modelo 3.1: ${count1}/10">
                <div style="background:${count1 >= 10 ? '#ef4444' : '#34d399'}; width:${(count1/10)*100}%; height:100%;"></div>
              </div>
            </div>
          ` : ''}
        `;

        container.appendChild(row);
      }

      // Input changes save
      container.querySelectorAll('.rotation-key-input').forEach(input => {
        input.addEventListener('input', () => {
          const idx = parseInt(input.dataset.index);
          keys[idx] = input.value.trim();
          chrome.storage.local.set({ apiKeys: keys });
          chrome.storage.sync.set({ apiKeys: keys }, () => {
            // Sincroniza a chave de fallback primária com a primeira da lista
            if (idx === 0) {
              chrome.storage.sync.set({ apiKey: keys[0] });
            }
          });
        });
      });

      // Eye toggle
      container.querySelectorAll('.btn-toggle-eye').forEach(btn => {
        btn.addEventListener('click', () => {
          const input = btn.previousElementSibling;
          if (input && input.type === 'password') {
            input.type = 'text';
            btn.innerText = '🔒';
          } else if (input) {
            input.type = 'password';
            btn.innerText = '👁️';
          }
        });
      });
    });
  }

  // Resetar Contadores de Cota Manualmente
  const btnResetQuotaCounters = document.getElementById('btnResetQuotaCounters');
  if (btnResetQuotaCounters) {
    btnResetQuotaCounters.addEventListener('click', () => {
      if (confirm('Deseja zerar manualmente todos os contadores de cota diária de todas as chaves?')) {
        chrome.storage.local.set({ quotaCounters: {} }, () => {
          renderApiKeysPanel();
          showToast();
        });
      }
    });
  }

  const OFFICIAL_TTS_MODELS = [
    'gemini-3.8-flash-lite-tts',
    'gemini-3.8-flash-tts',
    'gemini-3.1-flash-tts-preview'
  ];

  const OFFICIAL_STT_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-2.5-flash'
  ];

  // Testar Chave Ativa Atual
  const testActiveKeyBtn = document.getElementById('testActiveKeyBtn');
  if (testActiveKeyBtn) {
    testActiveKeyBtn.addEventListener('click', async () => {
      testActiveKeyBtn.innerText = 'Testando...';
      const pingResult = document.getElementById('pingResult');
      if (pingResult) pingResult.innerText = '';

      try {
        const creds = await getRotatingCredentials();
        if (!creds.apiKey) {
          throw new Error('Nenhuma chave API ativa configurada.');
        }

        const chosenTTS = currentSettings.ttsModel || 'gemini-3.8-flash-lite-tts';
        const chosenSTT = currentSettings.sttModel || 'gemini-3.5-flash-lite';

        // Teste de conexão direta no modelo de TTS selecionado
        const ttsUrl = `https://generativelanguage.googleapis.com/v1beta/models/${chosenTTS}:generateContent?key=${encodeURIComponent(creds.apiKey)}`;
        const ttsRes = await fetch(ttsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'teste de conexao tts' }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' }
                }
              }
            }
          })
        });

        if (ttsRes.ok) {
          if (pingResult) {
            pingResult.innerText = `✓ Conexão bem-sucedida! Chave #${creds.keyIndex + 1} validada no modelo TTS (${chosenTTS}) e pronta para STT (${chosenSTT}).`;
            pingResult.style.color = '#34d399';
          }
        } else {
          const err = await ttsRes.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP ${ttsRes.status}`);
        }
      } catch (err) {
        if (pingResult) {
          pingResult.innerText = `❌ Falha: ${err.message}`;
          pingResult.style.color = '#f87171';
        }
      } finally {
        testActiveKeyBtn.innerText = '🔍 Testar Chave Ativa Atual';
      }
    });
  }

  async function directGeminiTTS(text, _ignored, voiceName) {
    const creds = await getRotatingCredentials();
    if (!creds.apiKey) throw new Error('Insira sua Chave Gemini no painel de chaves rotativas da aba Agentes & API.');

    const promptText = (currentSettings.narratorInstruction || 'Narre com tom natural:') + '\n' + text;
    const selectedV = voiceName || selectedVoice || 'Kore';

    // Incrementa cota antes da requisição para alinhar com a métrica do Google
    await incrementQuotaCounter(creds.keyIndex, creds.modelIndex, creds.logicalQuotaDay, creds.counters);

    const chosenTTS = currentSettings.ttsModel || 'gemini-3.8-flash-lite-tts';
    const ttsCascade = [chosenTTS, ...OFFICIAL_TTS_MODELS.filter(m => m !== chosenTTS)];

    let lastErr = null;
    for (const ttsModel of ttsCascade) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${ttsModel}:generateContent?key=${encodeURIComponent(creds.apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: selectedV }
                }
              }
            }
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || (`Erro Gemini TTS (${res.status})`));
        }

        const data = await res.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0];
        const audioData = candidate?.inlineData?.data;
        if (!audioData) throw new Error(`O modelo ${ttsModel} não retornou fluxo de áudio.`);

        const binaryStr = atob(audioData);
        const pcmBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          pcmBytes[i] = binaryStr.charCodeAt(i);
        }
        const wavBuffer = pcmToWav(pcmBytes, 24000);
        return await uint8ArrayToBase64(new Uint8Array(wavBuffer));
      } catch (err) {
        lastErr = err;
        console.warn(`[STT&TTS Options] Falha no modelo TTS ${ttsModel}:`, err);
      }
    }

    throw lastErr || new Error('Nenhum modelo de TTS conseguiu gerar o áudio.');
  }

  async function directGeminiSTT(base64Audio, _ignored) {
    const creds = await getRotatingCredentials();
    if (!creds.apiKey) throw new Error('Insira sua Chave Gemini no painel de chaves rotativas da aba Agentes & API.');

    const cleanBase64 = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
    const promptText = currentSettings.transcriberInstruction || 'Transcreva com fidelidade o áudio.';

    await incrementQuotaCounter(creds.keyIndex, creds.modelIndex, creds.logicalQuotaDay, creds.counters);

    const chosenSTT = currentSettings.sttModel || 'gemini-3.5-flash-lite';
    const sttCascade = [chosenSTT, ...OFFICIAL_STT_MODELS.filter(m => m !== chosenSTT)];

    let lastErr = null;
    for (const modelName of sttCascade) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(creds.apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { mimeType: 'audio/webm', data: cleanBase64 } },
                { text: promptText }
              ]
            }]
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || (`Erro Gemini STT (${res.status})`));
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!text) throw new Error(`O modelo ${modelName} retornou texto vazio.`);
        return text;
      } catch (err) {
        lastErr = err;
        console.warn(`[STT&TTS Options] Falha no modelo STT ${modelName}:`, err);
      }
    }

    throw lastErr || new Error('Nenhum modelo de STT conseguiu transcrever o áudio.');
  }

  // Navegação por Abas
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) {
        target.classList.add('active');
        if (btn.dataset.tab === 'tab-mixer') {
          setTimeout(initSpectrumCanvas, 50);
        } else if (btn.dataset.tab === 'tab-history') {
          loadHistoryTable();
        }
      }
    });
  });

  // Carregar dados salvos
  chrome.storage.sync.get(defaults, (items) => {
    currentSettings = Object.assign(currentSettings, items);
    fields.forEach(field => {
      const el = document.getElementById(field);
      if (el) {
        el.value = items[field] !== undefined ? items[field] : defaults[field];
      }
    });

    if (items.ttsVoice) {
      selectedVoice = items.ttsVoice;
      updateVoiceButtonsUI(selectedVoice);
    }

    updateLabels();
    initSpectrumCanvas();
    renderApiKeysPanel();
  });

  function updateLabels() {
    const sEl = document.getElementById('ttsSpeed');
    const vEl = document.getElementById('ttsVolume');
    const lowEl = document.getElementById('eqLow');
    const midEl = document.getElementById('eqMid');
    const highEl = document.getElementById('eqHigh');
    const pEl = document.getElementById('ttsPitch');

    const spVal = document.getElementById('speedVal');
    const volVal = document.getElementById('volumeVal');
    const lowVal = document.getElementById('eqLowVal');
    const midVal = document.getElementById('eqMidVal');
    const highVal = document.getElementById('eqHighVal');
    const pVal = document.getElementById('pitchVal');

    if (sEl && spVal) spVal.innerText = parseFloat(sEl.value).toFixed(1) + 'x';
    if (vEl && volVal) volVal.innerText = Math.round(parseFloat(vEl.value) * 100) + '%';
    if (lowEl && lowVal) lowVal.innerText = lowEl.value + 'dB';
    if (midEl && midVal) midVal.innerText = midEl.value + 'dB';
    if (highEl && highVal) highVal.innerText = highEl.value + 'dB';
    if (pEl && pVal) pVal.innerText = pEl.value + ' st';
  }

  function updateVoiceButtonsUI(voice) {
    document.querySelectorAll('.voice-pill').forEach(pill => {
      if (pill.dataset.voice === voice) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  document.querySelectorAll('.voice-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      selectedVoice = pill.dataset.voice;
      updateVoiceButtonsUI(selectedVoice);
      saveSettingsAuto();
    });
  });

  let autoSaveTimeout = null;
  function saveSettingsAuto() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      const toSave = { ttsVoice: selectedVoice };
      fields.forEach(field => {
        const el = document.getElementById(field);
        if (el) {
          toSave[field] = el.type === 'range' ? parseFloat(el.value) : el.value;
        }
      });

      chrome.storage.sync.set(toSave, () => {
        showToast();
      });
    }, 300);
  }

  fields.forEach(field => {
    const el = document.getElementById(field);
    if (el) {
      el.addEventListener('input', () => {
        updateLabels();
        saveSettingsAuto();
      });
    }
  });

  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveSettingsAuto();
    });
  }

  function showToast() {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2200);
  }

  // Permissão de Microfone no Chrome
  const micStatusEl = document.getElementById('micPermissionStatus');
  const grantMicAuthBtn = document.getElementById('btnGrantMicAuth');

  async function checkMicPermission() {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const p = await navigator.permissions.query({ name: 'microphone' });
        if (p.state === 'granted') {
          if (micStatusEl) {
            micStatusEl.innerText = 'Status: ✓ Autorizado e Ativo no Chrome!';
            micStatusEl.style.color = '#34d399';
          }
          if (grantMicAuthBtn) grantMicAuthBtn.innerText = '✓ Microfone Autorizado';
        } else if (p.state === 'denied') {
          if (micStatusEl) {
            micStatusEl.innerText = 'Status: ⚠️ Bloqueado nas configurações do Chrome.';
            micStatusEl.style.color = '#f87171';
          }
        } else {
          if (micStatusEl) micStatusEl.innerText = 'Status: Aguardando permissão...';
        }
      }
    } catch (err) {
      if (micStatusEl) micStatusEl.innerText = 'Status: Pronto para solicitar';
    }
  }

  checkMicPermission();

  if (window.location.search.includes('authMic=1')) {
    setTimeout(() => {
      if (grantMicAuthBtn) grantMicAuthBtn.click();
    }, 300);
  }

  if (grantMicAuthBtn) {
    grantMicAuthBtn.addEventListener('click', async () => {
      grantMicAuthBtn.innerText = 'Solicitando no Chrome...';
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        if (micStatusEl) {
          micStatusEl.innerText = 'Status: ✓ Autorizado e Testado com Sucesso!';
          micStatusEl.style.color = '#34d399';
        }
        grantMicAuthBtn.innerText = '✓ Microfone Autorizado';
      } catch (err) {
        if (micStatusEl) {
          micStatusEl.innerText = 'Status: ❌ Permissão negada (' + err.message + ')';
          micStatusEl.style.color = '#f87171';
        }
        grantMicAuthBtn.innerText = 'Tentar Novamente';
      }
    });
  }

  // TESTE DE SÍNTESE NO LAB & MIXER
  async function handleTtsTest(textInputId, statusElId, buttonEl) {
    const input = document.getElementById(textInputId);
    const status = document.getElementById(statusElId);
    const text = input ? input.value.trim() : 'Teste de síntese de voz';
    const apiKey = currentSettings.apiKey || document.getElementById('apiKey')?.value.trim();

    if (buttonEl) buttonEl.innerText = 'Sintetizando...';
    if (status) {
      status.innerText = 'Gerando áudio com Gemini...';
      status.style.color = '#38bdf8';
    }

    try {
      const base64Audio = await directGeminiTTS(text, apiKey, selectedVoice);
      if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
      }
      activeAudio = new Audio('data:audio/wav;base64,' + base64Audio);
      activeAudio.volume = currentSettings.ttsVolume || 1.0;
      activeAudio.playbackRate = currentSettings.ttsSpeed || 1.0;

      activeAudio.onplay = () => {
        startSpectrumAnimation(activeAudio);
        if (status) {
          status.innerText = '▶️ Reproduzindo...';
          status.style.color = '#34d399';
        }
      };
      activeAudio.onended = () => {
        if (status) status.innerText = '✓ Concluído';
        if (buttonEl) buttonEl.innerText = '▶️ Sintetizar Novamente';
      };

      await activeAudio.play();
    } catch (err) {
      if (status) {
        status.innerText = '❌ Erro: ' + err.message;
        status.style.color = '#f87171';
      }
      if (buttonEl) buttonEl.innerText = '▶️ Tentar Novamente';
    }
  }

  const btnTestLabTts = document.getElementById('btnTestLabTts');
  if (btnTestLabTts) {
    btnTestLabTts.addEventListener('click', () => {
      handleTtsTest('labTtsInput', 'labTtsStatus', btnTestLabTts);
    });
  }

  const testMixerAudioBtn = document.getElementById('testMixerAudioBtn');
  if (testMixerAudioBtn) {
    testMixerAudioBtn.addEventListener('click', () => {
      handleTtsTest('labTtsInput', 'labTtsStatus', testMixerAudioBtn);
    });
  }

  // TESTE DE TRANSCRIÇÃO NO LAB (STT)
  let labMediaRecorder = null;
  let labAudioChunks = [];
  const btnTestLabStt = document.getElementById('btnTestLabStt');
  const labSttStatus = document.getElementById('labSttStatus');
  const labSttResult = document.getElementById('labSttResult');

  if (btnTestLabStt) {
    btnTestLabStt.addEventListener('click', async () => {
      if (labMediaRecorder && labMediaRecorder.state === 'recording') {
        labMediaRecorder.stop();
        btnTestLabStt.innerText = 'Processando...';
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        labMediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        labAudioChunks = [];

        labMediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) labAudioChunks.push(e.data);
        };

        labMediaRecorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          if (labSttStatus) labSttStatus.innerText = 'Transcrevendo via Gemini STT...';

          const audioBlob = new Blob(labAudioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const apiKey = currentSettings.apiKey || document.getElementById('apiKey')?.value.trim();
              const transcript = await directGeminiSTT(reader.result, apiKey);
              if (labSttResult) labSttResult.innerText = '"' + transcript + '"';
              if (labSttStatus) labSttStatus.innerText = '✓ Transcrito com Sucesso!';
              btnTestLabStt.innerText = '🎙️ Gravar Novamente';
            } catch (err) {
              if (labSttStatus) labSttStatus.innerText = '❌ Erro: ' + err.message;
              btnTestLabStt.innerText = '🎙️ Gravar Novamente';
            }
          };
          reader.readAsDataURL(audioBlob);
        };

        labMediaRecorder.start();
        btnTestLabStt.innerText = '⏹️ Parar Gravação';
        if (labSttStatus) labSttStatus.innerText = '🔴 Gravando voz... Fale agora!';
      } catch (err) {
        if (labSttStatus) labSttStatus.innerText = '❌ Erro ao acessar microfone: ' + err.message;
      }
    });
  }

  // Tabela de Histórico
  function loadHistoryTable() {
    chrome.storage.local.get({ sessionTranscriptions: [] }, (res) => {
      const container = document.getElementById('historyTableContainer');
      if (!container) return;
      const list = res.sessionTranscriptions || [];
      if (list.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:32px; color:#64748b;">Nenhuma transcrição gravada ainda. Pressione Pause/Break para ditar em qualquer página.</div>';
        return;
      }

      let html = `
        <table class="history-table">
          <thead>
            <tr>
              <th>Data / Hora</th>
              <th>Texto Transcrito</th>
              <th>Caracteres</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
      `;

      list.forEach((item, idx) => {
        const text = typeof item === 'string' ? item : item.text;
        const time = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Recent';
        html += `
          <tr>
            <td style="color:#94a3b8; font-family:monospace; white-space:nowrap;">${time}</td>
            <td style="font-weight:500;">${escapeHtml(text)}</td>
            <td style="color:#38bdf8; font-family:monospace;">${text.length}</td>
            <td style="white-space:nowrap;">
              <button class="btn btn-secondary btn-copy-hist" data-text="${escapeHtml(text)}" style="font-size:11px; padding:4px 8px;">Copiar</button>
            </td>
          </tr>
        `;
      });

      html += '</tbody></table>';
      container.innerHTML = html;

      container.querySelectorAll('.btn-copy-hist').forEach(b => {
        b.addEventListener('click', (e) => {
          navigator.clipboard.writeText(e.target.dataset.text);
          e.target.innerText = '✓ Copiado';
          setTimeout(() => { e.target.innerText = 'Copiar'; }, 1500);
        });
      });
    });
  }

  const btnClearHistoryBtn = document.getElementById('btnClearHistoryBtn');
  if (btnClearHistoryBtn) {
    btnClearHistoryBtn.addEventListener('click', () => {
      chrome.storage.local.set({ sessionTranscriptions: [] }, () => {
        loadHistoryTable();
      });
    });
  }

  // Sincronização Git na Aba de Opções
  const optCheckGitBtn = document.getElementById('optCheckGitBtn');
  const optPullGitBtn = document.getElementById('optPullGitBtn');
  const optReloadExtBtn = document.getElementById('optReloadExtBtn');
  const optRestartChromeBtn = document.getElementById('optRestartChromeBtn');
  const optGitLogs = document.getElementById('optGitLogs');

  function addOptGitLog(msg) {
    if (!optGitLogs) return;
    const line = document.createElement('div');
    line.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    optGitLogs.appendChild(line);
    optGitLogs.scrollTop = optGitLogs.scrollHeight;
  }

  if (optCheckGitBtn) {
    optCheckGitBtn.addEventListener('click', async () => {
      addOptGitLog('Verificando status do repositório no GitHub (pinguelanarosca/EXTTTSSTT)...');
      try {
        const res = await fetch('https://api.github.com/repos/pinguelanarosca/EXTTTSSTT/commits/main');
        if (res.ok) {
          const data = await res.json();
          addOptGitLog(`✓ Último commit no GitHub: ${data.sha.substring(0, 7)} - "${data.commit.message}"`);
        } else {
          addOptGitLog(`Repositório verificado (Status HTTP: ${res.status}).`);
        }
      } catch (err) {
        addOptGitLog(`Erro ao consultar GitHub: ${err.message}`);
      }
    });
  }

  if (optPullGitBtn) {
    optPullGitBtn.addEventListener('click', () => {
      addOptGitLog('Iniciando download do pacote ZIP atualizado de pinguelanarosca/EXTTTSSTT...');
      window.open('https://github.com/pinguelanarosca/EXTTTSSTT/archive/refs/heads/main.zip', '_blank');
      addOptGitLog('✓ Download iniciado no navegador.');
    });
  }

  if (optReloadExtBtn) {
    optReloadExtBtn.addEventListener('click', () => {
      addOptGitLog('Recarregando extensão...');
      chrome.runtime.reload();
    });
  }

  if (optRestartChromeBtn) {
    optRestartChromeBtn.addEventListener('click', () => {
      addOptGitLog('Para reiniciar o Google Chrome: digite chrome://restart na barra de endereços e tecle Enter.');
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
