// Content Script - STT&TTS de Satiro (100% Autônomo com Modo Direto Gemini & HUD Aprimorado)
(function() {
  // Previne injeção duplicada na mesma página
  if (window.__VOCALLENS_LOADED__) return;
  window.__VOCALLENS_LOADED__ = true;

  let isRecordingAudio = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let targetInputElement = null;
  let activeAudioPlayer = null;

  // Filas de Processamento Assíncrono (Narração & Transcrição)
  const ttsQueue = [];
  let isTtsProcessing = false;
  let totalTtsWords = [];

  const sttQueue = [];
  let isSttProcessing = false;

  // Variáveis para seleção de área Google Lens (Ctrl + Shift + Arrastar)
  let isSelectingArea = false;
  let startX = 0, startY = 0;
  let overlayEl = null;
  let selectionBoxEl = null;

  // Histórico local de transcrições e logs de API da sessão
  let sessionTranscriptions = [];
  let apiLogs = [];

  const DEFAULT_AGENTS = [
    {
      id: 'default-natural',
      name: '🎙️ Padrão / Natural',
      description: 'Voz equilibrada com entonação humana natural e ritmo balanceado.',
      preferredVoice: 'Kore',
      locutionInstruction: 'Você é um locutor profissional e envolvente. Dite os textos com ritmo dinâmico e tom natural.',
      narratorInstruction: 'Você é um narrador natural e expressivo. Leia o texto com dicção impecável, ritmo equilibrado e entonação humana.',
      transcriberInstruction: 'Transcreva com fidelidade absoluta o áudio recebido. Aplique pontuação correta e remova vícios de linguagem comuns.',
      visionInstruction: 'Analise detalhadamente a imagem capturada da tela com o Google Lens. Se contiver texto, transcreva ou leia-o com máxima precisão.'
    },
    {
      id: 'radio-host',
      name: '📻 Locutor Profissional & Rádio',
      description: 'Projeção forte, entonação comercial enérgica e ritmo dinâmico.',
      preferredVoice: 'Fenrir',
      locutionInstruction: 'Fale com a energia e cadência de um grande locutor de rádio e TV: voz encorpada, pausas enfáticas e entusiasmo cativante.',
      narratorInstruction: 'Leia como um apresentador de notícias de destaque: tom firme, projeção limpa e excelente ritmo.',
      transcriberInstruction: 'Transcreva destacando com pontuação expressiva e clareza formal.',
      visionInstruction: 'Descreva a imagem em formato de manchete e resumo vibrante dos pontos principais.'
    },
    {
      id: 'teacher-didactic',
      name: '🎓 Professor / Didático',
      description: 'Ritmo pausado, ênfase pedagógica e clareza explicativa.',
      preferredVoice: 'Charon',
      locutionInstruction: 'Explique de forma didática e acolhedora, como um professor paciente explicando conceitos importantes.',
      narratorInstruction: 'Leia em ritmo pausado e articulado, dando ênfase nas palavras-chave e facilitando o aprendizado.',
      transcriberInstruction: 'Transcreva preservando termos técnicos e estruturando com pontuação impecável.',
      visionInstruction: 'Analise e explique passo a passo diagramas, códigos e textos presentes na captura.'
    },
    {
      id: 'fast-summary',
      name: '⚡ Resumidor Rápido & Direto',
      description: 'Fala rápida e objetiva focada na essência do conteúdo.',
      preferredVoice: 'Puck',
      locutionInstruction: 'Seja direto ao ponto, com cadência ágil e foco nas informações mais relevantes.',
      narratorInstruction: 'Leia os pontos principais de forma ágil, fluida e concisa.',
      transcriberInstruction: 'Transcreva exatamente o essencial com máxima precisão.',
      visionInstruction: 'Sintetize imediatamente os tópicos centrais da tela capturada.'
    },
    {
      id: 'calm-zen',
      name: '🧘 Narrador Zen & Meditativo',
      description: 'Voz suave, ritmo lento e calmo, tom reconfortante.',
      preferredVoice: 'Zephyr',
      locutionInstruction: 'Fale com calma, tranquilidade e suavidade, trazendo paz e relaxamento para o ouvinte.',
      narratorInstruction: 'Leia com suavidade e serenidade, mantendo pausas harmoniosas e tom acolhedor.',
      transcriberInstruction: 'Transcreva com precisão e tranquilidade.',
      visionInstruction: 'Descreva o ambiente visual com sutileza e serenidade.'
    },
    {
      id: 'executive-formal',
      name: '💼 Executivo & Corporativo',
      description: 'Linguagem polida, postura corporativa séria e tom seguro.',
      preferredVoice: 'Fenrir',
      locutionInstruction: 'Adote uma postura executiva de alto nível: vocabulário refinado, tom seguro e direto aos resultados.',
      narratorInstruction: 'Leia relatórios e documentos corporativos com seriedade, clareza e autoridade profissional.',
      transcriberInstruction: 'Transcreva termos de negócios, siglas e números com rigor absoluto.',
      visionInstruction: 'Analise métricas, tabelas e gráficos da tela com foco em decisões de negócios.'
    },
    {
      id: 'friendly-chat',
      name: '💬 Amigável & Descontraído',
      description: 'Tom de conversa entre amigos, informal e caloroso.',
      preferredVoice: 'Puck',
      locutionInstruction: 'Fale de forma descontraída e amigável, como um bom amigo conversando num café.',
      narratorInstruction: 'Leia com naturalidade informal, leveza e simpatia genuína.',
      transcriberInstruction: 'Transcreva capturando o tom espontâneo da fala.',
      visionInstruction: 'Comente sobre o que está na tela de forma descontraída e acessível.'
    },
    {
      id: 'storyteller',
      name: '🧙 Contador de Histórias & Fantasia',
      description: 'Entonação rica em suspense, dramaticidade e expressividade teatral.',
      preferredVoice: 'Charon',
      locutionInstruction: 'Narre como um bardo contador de lendas: crie suspense, use nuances dramáticas e transporte o ouvinte.',
      narratorInstruction: 'Dê vida a cada frase com expressividade teatral, modulando o tom conforme a emoção do texto.',
      transcriberInstruction: 'Transcreva mantendo o ritmo poético e as exclamações originais.',
      visionInstruction: 'Descreva a cena visual como um cenário épico de uma grande aventura.'
    }
  ];

  // Configurações padrão com modo direto prioritário
  let settings = {
    connectionMode: 'direct',
    serverUrl: '',
    apiKey: 'YOUR_GEMINI_API_KEY',
    ttsModel: 'gemini-3.8-flash-lite-tts',
    sttModel: 'gemini-3.5-flash-lite',
    ttsVoice: 'Kore',
    activeAgentId: 'default-natural',
    activeNarratorAgentId: 'default-natural',
    activeTranscriberAgentId: 'default-natural',
    customAgents: [],
    customVoices: [],
    locutionInstruction: DEFAULT_AGENTS[0].locutionInstruction,
    narratorInstruction: DEFAULT_AGENTS[0].narratorInstruction,
    transcriberInstruction: DEFAULT_AGENTS[0].transcriberInstruction,
    visionInstruction: DEFAULT_AGENTS[0].visionInstruction,
    enableCtrlB: true,
    enableCtrlDrag: true,
    enablePauseBreak: true,
    soundFeedback: true,
    ttsSpeed: 1.0,
    ttsVolume: 1.0,
    shortcutNarrateConfig: { ctrl: true, shift: false, alt: false, code: 'KeyB', key: 'b' },
    shortcutRecordConfig: { ctrl: false, shift: false, alt: false, code: 'Pause', key: 'Pause' }
  };

  function getActiveAgent() {
    const list = [...DEFAULT_AGENTS, ...(Array.isArray(settings.customAgents) ? settings.customAgents : [])];
    return list.find(a => a.id === settings.activeAgentId) || list[0];
  }

  function getCurrentNarratorAgent() {
    const activeId = settings.activeNarratorAgentId || settings.activeAgentId || 'default-natural';
    const list = [...DEFAULT_AGENTS, ...(Array.isArray(settings.customAgents) ? settings.customAgents : [])];
    return list.find(a => a.id === activeId) || list[0];
  }

  function getCurrentTranscriberAgent() {
    const activeId = settings.activeTranscriberAgentId || settings.activeAgentId || 'default-natural';
    const list = [...DEFAULT_AGENTS, ...(Array.isArray(settings.customAgents) ? settings.customAgents : [])];
    return list.find(a => a.id === activeId) || list[0];
  }

  function loadSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(settings, (loaded) => {
        if (loaded) settings = Object.assign(settings, loaded);
      });
    }
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ sessionTranscriptions: [], apiLogs: [] }, (res) => {
        if (res && res.sessionTranscriptions) sessionTranscriptions = res.sessionTranscriptions;
        if (res && res.apiLogs) apiLogs = res.apiLogs;
      });
    }
  }
  loadSettings();

  // Escuta alterações de configurações em tempo real
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        for (let key in changes) {
          settings[key] = changes[key].newValue;
        }

        // Se o balão (HUD) de narração estiver aberto, atualiza suas informações em tempo real
        const hud = document.getElementById('vocallens-narration-hud');
        if (hud && hud.style.display !== 'none') {
          const titleEl = hud.querySelector('.vocallens-nhud-title');
          if (titleEl) {
            titleEl.innerText = `Narrando com Gemini (${settings.ttsVoice || 'Kore'})`;
          }
          const agentBadge = hud.querySelector('.vocallens-agent-badge');
          if (agentBadge) {
            const activeAgent = getActiveAgent();
            agentBadge.innerText = activeAgent.name.replace(/^(🎙️|📻|🎓|⚡|🧘|💼|💬|🧙|✨)\s*/, '');
          }
        }

        // Aplica velocidade e volume imediatamente ao player ativo
        if (changes.ttsSpeed) {
          const newSpd = parseFloat(changes.ttsSpeed.newValue || 1.0);
          if (activeAudioPlayer) {
            activeAudioPlayer.playbackRate = newSpd;
            activeAudioPlayer.defaultPlaybackRate = newSpd;
            activeAudioPlayer.preservesPitch = true;
          }
          updateNarrationHudSpeedUI(newSpd);
        }
        if (changes.ttsVolume) {
          const newVol = parseFloat(changes.ttsVolume.newValue ?? 1.0);
          if (activeAudioPlayer) {
            activeAudioPlayer.volume = newVol;
          }
          updateNarrationHudVolumeUI(newVol);
        }
      }
      if (area === 'local') {
        if (changes.sessionTranscriptions) sessionTranscriptions = changes.sessionTranscriptions.newValue || [];
        if (changes.apiLogs) apiLogs = changes.apiLogs.newValue || [];
      }
    });
  }

  // -------------------------------------------------------------
  // SISTEMA UNIVERSAL DRAGGABLE (ARRASTAR HUD COM MEMÓRIA DE POSIÇÃO)
  // -------------------------------------------------------------
  function makeDraggable(el, handleSelector) {
    if (!el || el._isDraggableInitialized) return;
    el._isDraggableInitialized = true;

    let isDragging = false;
    let startMouseX = 0, startMouseY = 0;
    let startElLeft = 0, startElTop = 0;

    // Restaura posição salva no localStorage se existir
    try {
      const savedPos = localStorage.getItem('vocallens_hud_pos');
      if (savedPos) {
        const pos = JSON.parse(savedPos);
        if (typeof pos.top === 'number' && typeof pos.left === 'number') {
          const maxLeft = Math.max(10, window.innerWidth - (el.offsetWidth || 350) - 10);
          const maxTop = Math.max(10, window.innerHeight - (el.offsetHeight || 260) - 10);
          const clampedLeft = Math.min(Math.max(10, pos.left), maxLeft);
          const clampedTop = Math.min(Math.max(10, pos.top), maxTop);
          el.style.left = clampedLeft + 'px';
          el.style.top = clampedTop + 'px';
          el.style.right = 'auto';
        }
      }
    } catch {}

    function onMouseDown(e) {
      if (e.button !== 0) return;
      const target = e.target;
      // Previne iniciar arrasto em controles interativos
      if (target.closest('button, input, select, textarea, .vocallens-nhud-text-box, .vocallens-hud-preview, .vocallens-sp-btn, .vocallens-slider, .vocallens-hud-word')) {
        return;
      }

      if (handleSelector && !target.closest(handleSelector) && target !== el) {
        return;
      }

      isDragging = true;
      startMouseX = e.clientX;
      startMouseY = e.clientY;

      const rect = el.getBoundingClientRect();
      startElLeft = rect.left;
      startElTop = rect.top;

      el.style.left = startElLeft + 'px';
      el.style.top = startElTop + 'px';
      el.style.right = 'auto';
      el.classList.add('vocallens-is-dragging');

      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('mouseup', onMouseUp, true);
      e.preventDefault();
    }

    function onMouseMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startMouseX;
      const dy = e.clientY - startMouseY;

      let newLeft = startElLeft + dx;
      let newTop = startElTop + dy;

      const maxLeft = window.innerWidth - el.offsetWidth - 8;
      const maxTop = window.innerHeight - el.offsetHeight - 8;

      newLeft = Math.min(Math.max(8, newLeft), maxLeft);
      newTop = Math.min(Math.max(8, newTop), maxTop);

      el.style.left = newLeft + 'px';
      el.style.top = newTop + 'px';
    }

    function onMouseUp() {
      if (!isDragging) return;
      isDragging = false;
      el.classList.remove('vocallens-is-dragging');
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('mouseup', onMouseUp, true);

      try {
        const rect = el.getBoundingClientRect();
        localStorage.setItem('vocallens_hud_pos', JSON.stringify({ left: rect.left, top: rect.top }));
      } catch {}
    }

    el.addEventListener('mousedown', onMouseDown);
  }

  // -------------------------------------------------------------
  // TELEMETRIA & LOGS DETALHADOS DE API GEMINI
  // -------------------------------------------------------------
  function logApiCall(entry) {
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logItem = {
      id: 'api-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now(),
      timeFormatted: timeStr,
      action: entry.action || 'API',
      model: entry.model || 'gemini-3.5-flash-lite',
      endpoint: entry.endpoint || 'generateContent',
      latencyMs: entry.latencyMs || 0,
      statusCode: entry.statusCode || (entry.success ? 200 : 500),
      statusText: entry.statusText || (entry.success ? 'OK' : 'Error'),
      success: Boolean(entry.success),
      payloadInfo: entry.payloadInfo || '',
      errorMessage: entry.errorMessage || null,
      mode: entry.mode || 'direct'
    };

    apiLogs.unshift(logItem);
    if (apiLogs.length > 50) apiLogs.pop();

    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      chrome.storage.local.set({ apiLogs });
    }

    console.log('[STT&TTS API Log]', logItem.action, logItem.model, logItem.latencyMs + 'ms', logItem.statusCode, logItem.payloadInfo);
  }

  // -------------------------------------------------------------
  // FLOATING HUD ELEGANTE UNIFICADO PARA TODAS AS AÇÕES
  // -------------------------------------------------------------
  let hudRecordingTimer = null;
  let hudSeconds = 0;

  function ensureHudElement() {
    let hud = document.getElementById('vocallens-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'vocallens-hud';
      hud.className = 'vocallens-hud-box';
      document.body.appendChild(hud);
      makeDraggable(hud, '.vocallens-hud-header');
    }
    return hud;
  }

  function showHud(text, icon = '🔊', duration = 3500, type = 'info') {
    const hud = ensureHudElement();
    hud.setAttribute('data-type', type);
    hud.style.display = 'flex';
    hud.style.opacity = '1';

    hud.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="vocallens-hud-icon">${icon}</span>
        <span class="vocallens-hud-text">${text}</span>
      </div>
    `;

    if (hud._timer) clearTimeout(hud._timer);
    if (duration > 0) {
      hud._timer = setTimeout(() => hideHud(), duration);
    }
  }

  // Exibe HUD com Estágio Numerado e Rico para Qualquer Ação (TTS, STT, Vision)
  function showStageHud({ actionType, currentStage, totalStages, title, subtitle, details, icon, type = 'processing', duration = 0 }) {
    const hud = ensureHudElement();
    hud.setAttribute('data-type', type);
    hud.style.display = 'flex';
    hud.style.opacity = '1';

    const stageBadge = actionType + ' [' + currentStage + '/' + totalStages + ']';

    let iconHtml = '<span class="vocallens-hud-spinner"></span>';
    if (icon === 'pulse') {
      iconHtml = '<span class="vocallens-hud-dot-pulse"></span>';
    } else if (icon === 'check') {
      iconHtml = '<span class="vocallens-hud-check">✓</span>';
    } else if (icon) {
      iconHtml = '<span style="font-size:14px;">' + icon + '</span>';
    }

    hud.innerHTML = `
      <div class="vocallens-hud-inner">
        <div class="vocallens-hud-header" style="justify-content: space-between;">
          <div style="display:flex; align-items:center; gap:6px;">
            ${iconHtml}
            <strong class="vocallens-hud-title">${title}</strong>
          </div>
          <div style="display:flex; align-items:center; gap:5px;">
            <span class="vocallens-hud-stage-badge">${stageBadge}</span>
            <button id="vocallens-hud-cancel-btn" class="vocallens-hud-btn-cancel" title="Cancelar / Parar processo (Esc)">⏹️ Parar</button>
          </div>
        </div>
        ${subtitle ? `<div class="vocallens-hud-sub">${subtitle}</div>` : ''}
        ${details ? `<div class="vocallens-hud-details">${details}</div>` : ''}
      </div>
    `;

    const cancelBtn = document.getElementById('vocallens-hud-cancel-btn');
    if (cancelBtn) {
      cancelBtn.onclick = (e) => {
        e.stopPropagation();
        stopAllNarration('Processo cancelado pelo usuário');
        if (isRecordingVoice) stopRecordingVoice(false);
        hideHud();
      };
    }

    if (hud._timer) clearTimeout(hud._timer);
    if (duration > 0) {
      hud._timer = setTimeout(() => hideHud(), duration);
    }
  }

  function showRecordingHud(hasTargetField) {
    const hud = ensureHudElement();
    hud.setAttribute('data-type', 'recording');
    hud.style.display = 'flex';
    hud.style.opacity = '1';

    hudSeconds = 0;
    hud.innerHTML = `
      <div class="vocallens-hud-inner">
        <div class="vocallens-hud-header" style="justify-content: space-between;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="vocallens-hud-dot-pulse"></span>
            <strong class="vocallens-hud-title">Gravando Voz no Microfone...</strong>
            <span class="vocallens-hud-counter" id="vocallens-hud-sec">0s</span>
          </div>
          <button id="vocallens-hud-rec-stop-btn" class="vocallens-hud-btn-cancel" title="Concluir Fala e Transcrever">⏹️ Parar &amp; Transcrever</button>
        </div>
        <div class="vocallens-hud-sub">
          ${hasTargetField ? '🎯 Alvo identificado no campo. Fale agora e pressione Pause ou clique no botão para finalizar.' : '🎙️ Fale agora com clareza. Pressione Pause ou clique no botão para finalizar.'}
        </div>
        <div class="vocallens-hud-stage-footer" style="font-size:10px; color:#38bdf8; margin-top:2px; display:flex; justify-content:space-between; align-items:center;">
          <span>STT [1/4] • Captura de Áudio</span>
          <span style="color:#ef4444; font-weight:600; cursor:pointer;" id="vocallens-hud-rec-abort-btn">❌ Cancelar / Descartar (Esc)</span>
        </div>
      </div>
    `;

    const stopRecBtn = document.getElementById('vocallens-hud-rec-stop-btn');
    if (stopRecBtn) {
      stopRecBtn.onclick = (e) => {
        e.stopPropagation();
        stopRecordingVoice(true);
      };
    }
    const abortRecBtn = document.getElementById('vocallens-hud-rec-abort-btn');
    if (abortRecBtn) {
      abortRecBtn.onclick = (e) => {
        e.stopPropagation();
        stopRecordingVoice(false);
        hideHud();
      };
    }

    clearInterval(hudRecordingTimer);
    hudRecordingTimer = setInterval(() => {
      hudSeconds++;
      const el = document.getElementById('vocallens-hud-sec');
      if (el) el.innerText = `${hudSeconds}s`;
    }, 1000);
  }

  function showSendingHud(actionName = 'STT', extraInfo = 'Enviando áudio comprimido para Gemini STT...') {
    clearInterval(hudRecordingTimer);
    showStageHud({
      actionType: actionName,
      currentStage: actionName === 'TTS' ? 1 : 2,
      totalStages: actionName === 'TTS' ? 3 : 4,
      title: 'Enviando Dados...',
      subtitle: extraInfo,
      details: 'Modelo: gemini-3.5-flash-lite (Google Generative AI)',
      type: 'sending'
    });
  }

  function showProcessingHud(actionName = 'STT', extraInfo = 'Transcrevendo fala e aplicando pontuação com IA...') {
    showStageHud({
      actionType: actionName,
      currentStage: actionName === 'TTS' ? 2 : 3,
      totalStages: actionName === 'TTS' ? 3 : 4,
      title: 'Processando com Gemini...',
      subtitle: extraInfo,
      details: 'Latência média: 250ms - 450ms',
      type: 'processing'
    });
  }

  // -------------------------------------------------------------
  // POP-UP HUD DE NARRAÇÃO COM CONTROLE EM TEMPO REAL E CAIXA RICA
  // -------------------------------------------------------------
  function ensureNarrationHudElement() {
    let hud = document.getElementById('vocallens-narration-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'vocallens-narration-hud';
      hud.className = 'vocallens-narration-box';
      document.body.appendChild(hud);
      makeDraggable(hud, '.vocallens-nhud-header');
    }
    return hud;
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, (m) => {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return m;
      }
    });
  }

  function updateNarrationHudSpeedUI(sp) {
    const hud = document.getElementById('vocallens-narration-hud');
    if (!hud) return;
    hud.querySelectorAll('.vocallens-sp-btn').forEach(b => {
      const bSp = parseFloat(b.getAttribute('data-speed'));
      if (Math.abs(bSp - sp) < 0.05) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    const valEl = document.getElementById('vocallens-speed-val');
    if (valEl) valEl.innerText = sp + 'x';
  }

  function updateNarrationHudVolumeUI(vol) {
    const slider = document.getElementById('vocallens-vol-slider');
    if (slider) slider.value = vol;
    const valEl = document.getElementById('vocallens-vol-val');
    if (valEl) valEl.innerText = Math.round(vol * 100) + '%';
  }

  function updateQueueBadge() {
    const badge = document.getElementById('vocallens-queue-badge');
    if (!badge) return;
    if (ttsQueue.length > 0) {
      badge.style.display = 'inline-block';
      badge.innerText = `+${ttsQueue.length} na fila`;
    } else {
      badge.style.display = 'none';
    }
  }

  function isNarrationActive() {
    if (activeAudioPlayer && !activeAudioPlayer.paused && !activeAudioPlayer.ended) return true;
    if (isTtsProcessing) return true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) return true;
    return false;
  }

  function stopAllNarration(reason = 'Narração interrompida') {
    isTtsProcessing = false;
    if (activeAudioPlayer) {
      try {
        activeAudioPlayer.pause();
        activeAudioPlayer.currentTime = 0;
      } catch (err) {}
      activeAudioPlayer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (err) {}
    }
    ttsQueue.length = 0;
    hideNarrationHud();
    if (reason) showHud(reason, '⏹️', 2000, 'info');
  }

  function showNarrationHud(fullText, source = 'selection') {
    const hud = ensureNarrationHudElement();
    hud.style.display = 'block';
    hud.style.opacity = '1';

    const currentSpd = Number(settings.ttsSpeed || 1.0);
    const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];

    const pillsHtml = speedOptions.map(sp => {
      const isActive = Math.abs(sp - currentSpd) < 0.05;
      return `<button class="vocallens-sp-btn ${isActive ? 'active' : ''}" data-speed="${sp}">${sp}x</button>`;
    }).join('');

    // Prepara palavras para acompanhamento em tempo real
    totalTtsWords = (fullText || '').split(/\s+/).filter(Boolean);
    const wordsHtml = totalTtsWords.map((word, i) => {
      return `<span class="vocallens-hud-word pending" id="vword-${i}" data-widx="${i}">${escapeHtml(word)} </span>`;
    }).join('');

    const activeAgent = getActiveAgent();
    hud.innerHTML = `
      <div class="vocallens-nhud-header">
        <div class="vocallens-nhud-title-wrap">
          <span class="vocallens-nhud-pulse"></span>
          <strong class="vocallens-nhud-title">Narrando com Gemini (${settings.ttsVoice || 'Kore'})</strong>
          <span class="vocallens-agent-badge" title="Agente Ativo">${escapeHtml(activeAgent.name.replace(/^(🎙️|📻|🎓|⚡|🧘|💼|💬|🧙|✨)\s*/, ''))}</span>
          <span id="vocallens-queue-badge" class="vocallens-queue-badge"></span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button id="vocallens-nhud-close" class="vocallens-nhud-close-btn" title="Fechar">&times;</button>
        </div>
      </div>

      <!-- Caixa de Texto Dedicada (5 a 6 linhas) com Seleção e Acompanhamento -->
      <div class="vocallens-nhud-text-container">
        <div id="vocallens-nhud-textbox" class="vocallens-nhud-text-box">${wordsHtml || escapeHtml(fullText)}</div>
        <button id="vocallens-renarrate-btn" class="vocallens-renarrate-btn">▶️ Narrar Seleção</button>
      </div>

      <div class="vocallens-nhud-controls">
        <button id="vocallens-nhud-playpause" class="vocallens-nhud-btn-action">⏸️ Pausar</button>
        <button id="vocallens-nhud-stop" class="vocallens-nhud-btn-stop">⏹️ Parar</button>
      </div>

      <div class="vocallens-nhud-sliders">
        <div class="vocallens-nhud-row">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span>Velocidade de Fala</span>
            <strong id="vocallens-speed-val" class="vocallens-val-badge">${currentSpd}x</strong>
          </div>
          <div class="vocallens-speed-pills">
            ${pillsHtml}
          </div>
        </div>

        <div class="vocallens-nhud-row">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span>Volume da Voz</span>
            <strong id="vocallens-vol-val" class="vocallens-val-badge">${Math.round((settings.ttsVolume ?? 1.0) * 100)}%</strong>
          </div>
          <div class="vocallens-slider-row">
            <input type="range" id="vocallens-vol-slider" min="0" max="1" step="0.05" value="${settings.ttsVolume ?? 1.0}" class="vocallens-slider" />
          </div>
        </div>
      </div>
    `;

    updateQueueBadge();

    // Evento de seleção de texto dentro do pop-up para narrar trechos sob demanda
    const textBox = document.getElementById('vocallens-nhud-textbox');
    const renarrateBtn = document.getElementById('vocallens-renarrate-btn');

    if (textBox && renarrateBtn) {
      const handleInnerSelection = () => {
        const selection = window.getSelection();
        const selText = selection ? selection.toString().trim() : '';
        if (selText && selText.length > 0 && textBox.contains(selection.anchorNode)) {
          renarrateBtn.style.display = 'block';
          renarrateBtn.onclick = (e) => {
            e.stopPropagation();
            renarrateBtn.style.display = 'none';
            narrateSelection(selText, null, null, true);
          };
        } else {
          renarrateBtn.style.display = 'none';
        }
      };

      textBox.addEventListener('mouseup', handleInnerSelection);
      textBox.addEventListener('keyup', handleInnerSelection);
    }

  // Eventos dos botões do HUD de Narração
  const closeBtn = document.getElementById('vocallens-nhud-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      stopAllNarration('Narração encerrada');
    };
  }

  const stopBtn = document.getElementById('vocallens-nhud-stop');
  if (stopBtn) {
    stopBtn.onclick = () => {
      stopAllNarration('Narração interrompida');
    };
  }

    const playPauseBtn = document.getElementById('vocallens-nhud-playpause');
    if (playPauseBtn) {
      playPauseBtn.onclick = () => {
        if (activeAudioPlayer) {
          if (activeAudioPlayer.paused) {
            activeAudioPlayer.play();
            playPauseBtn.innerHTML = '⏸️ Pausar';
          } else {
            activeAudioPlayer.pause();
            playPauseBtn.innerHTML = '▶️ Continuar';
          }
        } else if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            playPauseBtn.innerHTML = '⏸️ Pausar';
          } else {
            window.speechSynthesis.pause();
            playPauseBtn.innerHTML = '▶️ Continuar';
          }
        }
      };
    }

    // CORREÇÃO CRÍTICA DE VELOCIDADE EM TEMPO REAL
    hud.querySelectorAll('.vocallens-sp-btn').forEach(btn => {
      btn.onclick = () => {
        const sp = parseFloat(btn.getAttribute('data-speed'));
        settings.ttsSpeed = sp;

        // Aplica instantaneamente ao áudio em reprodução
        if (activeAudioPlayer) {
          activeAudioPlayer.playbackRate = sp;
          activeAudioPlayer.defaultPlaybackRate = sp;
          activeAudioPlayer.preservesPitch = true;
        }

        // Salva em tempo real
        if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
          chrome.storage.sync.set({ ttsSpeed: sp });
        }

        updateNarrationHudSpeedUI(sp);
        console.log('[STT&TTS de Satiro] Velocidade de reprodução alterada para:', sp + 'x');
      };
    });

    // Slider de Volume em TEMPO REAL
    const volSlider = document.getElementById('vocallens-vol-slider');
    if (volSlider) {
      const applyVol = (e) => {
        const vol = parseFloat(e.target.value);
        settings.ttsVolume = vol;
        if (activeAudioPlayer) {
          activeAudioPlayer.volume = vol;
        }
        if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
          chrome.storage.sync.set({ ttsVolume: vol });
        }
        const valEl = document.getElementById('vocallens-vol-val');
        if (valEl) valEl.innerText = Math.round(vol * 100) + '%';
      };
      volSlider.oninput = applyVol;
      volSlider.onchange = applyVol;
    }
  }

  function hideNarrationHud() {
    const hud = document.getElementById('vocallens-narration-hud');
    if (hud) {
      hud.style.opacity = '0';
      setTimeout(() => { hud.style.display = 'none'; }, 250);
    }
  }

  function saveToHistory(text, target, imageBase64 = null) {
    const dateStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    sessionTranscriptions.unshift({
      id: 'tx-' + Date.now(),
      text: text,
      target: target,
      time: dateStr,
      image: imageBase64
    });
    if (sessionTranscriptions.length > 50) sessionTranscriptions.pop();
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      chrome.storage.local.set({ sessionTranscriptions });
    }
  }

  function showReadyToTypeHud(transcribedText, targetElement) {
    const hud = ensureHudElement();
    hud.setAttribute('data-type', 'ready');

    const targetName = targetElement ? (targetElement.id || targetElement.name || targetElement.tagName.toLowerCase()) : 'Campo Livre';
    saveToHistory(transcribedText, targetName);

    if (targetElement) {
      hud.innerHTML = `
        <div class="vocallens-hud-inner">
          <div class="vocallens-hud-header" style="justify-content: space-between;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="vocallens-hud-check">✓</span>
              <strong class="vocallens-hud-title">Texto Inserido com Sucesso!</strong>
            </div>
            <span class="vocallens-hud-stage-badge">STT [4/4]</span>
          </div>
          <div class="vocallens-hud-preview">"${transcribedText.length > 120 ? transcribedText.substring(0, 117) + '...' : transcribedText}"</div>
          <div class="vocallens-hud-sub">Inserido no elemento alvo: <strong style="color:#6ee7b7;">${targetName}</strong></div>
        </div>
      `;
      setTimeout(() => hideHud(), 4000);
    } else {
      const snippet = transcribedText.length > 120 ? transcribedText.substring(0, 117) + '...' : transcribedText;
      hud.innerHTML = `
        <div class="vocallens-hud-inner">
          <div class="vocallens-hud-header" style="justify-content: space-between;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="vocallens-hud-check">✓</span>
              <strong class="vocallens-hud-title">Transcrição Concluída</strong>
            </div>
            <button id="vocallens-copy-btn" class="vocallens-hud-btn-copy">Copiar Texto</button>
          </div>
          <div class="vocallens-hud-preview">"${snippet}"</div>
          <div class="vocallens-hud-sub">Clique em qualquer campo para auto-digitar ou use o botão copiar.</div>
        </div>
      `;

      const btn = document.getElementById('vocallens-copy-btn');
      if (btn) {
        btn.onclick = async (e) => {
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(transcribedText);
            btn.innerText = '✓ Copiado';
            setTimeout(() => { btn.innerText = 'Copiar Texto'; }, 2000);
          } catch (err) {
            navigator.clipboard.writeText(transcribedText);
          }
        };
      }

      // Permite colar no próximo campo clicado
      const onFieldClick = (e) => {
        if (isTextInputElement(e.target)) {
          insertTranscribedText(e.target, transcribedText);
          showHud('Texto inserido no campo clicado!', '✅', 2500, 'success');
          document.removeEventListener('click', onFieldClick, true);
        }
      };
      document.addEventListener('click', onFieldClick, true);
      setTimeout(() => {
        document.removeEventListener('click', onFieldClick, true);
      }, 12000);
    }
  }

  function hideHud() {
    clearInterval(hudRecordingTimer);
    const hud = document.getElementById('vocallens-hud');
    if (hud) {
      hud.style.opacity = '0';
      setTimeout(() => { hud.style.display = 'none'; }, 300);
    }
  }

  // Reprodução de áudio com garantia de velocidade e volume em tempo real
  function playAudio(audioBase64, mimeType = 'audio/wav', originalText = '') {
    try {
      if (activeAudioPlayer) {
        activeAudioPlayer.pause();
        activeAudioPlayer = null;
      }
      const audioUrl = audioBase64.startsWith('data:') 
        ? audioBase64 
        : `data:${mimeType};base64,${audioBase64}`;
      
      const audio = new Audio(audioUrl);
      const targetSpeed = Number(settings.ttsSpeed || 1.0);
      const targetVolume = settings.ttsVolume !== undefined ? Number(settings.ttsVolume) : 1.0;

      audio.playbackRate = targetSpeed;
      audio.defaultPlaybackRate = targetSpeed;
      audio.volume = targetVolume;
      audio.preservesPitch = true;

      // Event listeners para manter velocidade e volume intactos no Chrome
      audio.addEventListener('loadedmetadata', () => {
        audio.playbackRate = Number(settings.ttsSpeed || 1.0);
        audio.volume = Number(settings.ttsVolume ?? 1.0);
      });
      audio.addEventListener('play', () => {
        audio.playbackRate = Number(settings.ttsSpeed || 1.0);
        audio.volume = Number(settings.ttsVolume ?? 1.0);
      });
      audio.addEventListener('playing', () => {
        audio.playbackRate = Number(settings.ttsSpeed || 1.0);
        audio.volume = Number(settings.ttsVolume ?? 1.0);
      });
      audio.addEventListener('canplay', () => {
        audio.playbackRate = Number(settings.ttsSpeed || 1.0);
        audio.volume = Number(settings.ttsVolume ?? 1.0);
      });
      audio.addEventListener('ratechange', () => {
        const expected = Number(settings.ttsSpeed || 1.0);
        if (Math.abs(audio.playbackRate - expected) > 0.01) {
          audio.playbackRate = expected;
        }
      });

      // Acompanhamento palavra por palavra em tempo real
      audio.addEventListener('timeupdate', () => {
        if (!audio.duration || totalTtsWords.length === 0) return;
        const progress = audio.currentTime / audio.duration;
        const currentWordIdx = Math.min(Math.floor(progress * totalTtsWords.length), totalTtsWords.length - 1);

        for (let i = 0; i < totalTtsWords.length; i++) {
          const span = document.getElementById('vword-' + i);
          if (!span) continue;
          if (i < currentWordIdx) {
            span.className = 'vocallens-hud-word spoken';
          } else if (i === currentWordIdx) {
            if (!span.classList.contains('active-speaking')) {
              span.className = 'vocallens-hud-word active-speaking';
              span.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          } else {
            span.className = 'vocallens-hud-word pending';
          }
        }
      });

      activeAudioPlayer = audio;

      audio.onended = () => {
        activeAudioPlayer = null;
        isTtsProcessing = false;

        // Se houver mais narrações na fila, executa a próxima automaticamente
        if (ttsQueue.length > 0) {
          const next = ttsQueue.shift();
          updateQueueBadge();
          executeNarrationItem(next.text, next.voice, next.inst);
        } else {
          hideNarrationHud();
        }
      };

      audio.play().catch(e => console.warn('[STT&TTS de Satiro] Falha na reprodução de áudio:', e));
      if (originalText) {
        showNarrationHud(originalText);
      }
    } catch (err) {
      console.error('[STT&TTS de Satiro] Erro ao instanciar áudio:', err);
      isTtsProcessing = false;
    }
  }

  // -------------------------------------------------------------
  // MOTOR DE IA DIRETO & FALLBACK INTELIGENTE (SEM ERROS 403 / 404)
  // -------------------------------------------------------------
  function pcm16ToWavBlob(pcmBytes, sampleRate = 24000) {
    const dataLength = pcmBytes.length;
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    function writeStr(offset, str) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataLength, true);
    return new Blob([header, pcmBytes], { type: 'audio/wav' });
  }

  function blobToBase64(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
  }

  function speakFallbackNative(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'pt-BR';
      if (settings.ttsSpeed) utter.rate = Number(settings.ttsSpeed);
      if (settings.ttsVolume !== undefined) utter.volume = Number(settings.ttsVolume);
      
      utter.onend = () => {
        isTtsProcessing = false;
        if (ttsQueue.length > 0) {
          const next = ttsQueue.shift();
          updateQueueBadge();
          executeNarrationItem(next.text, next.voice, next.inst);
        } else {
          hideNarrationHud();
        }
      };

      window.speechSynthesis.speak(utter);
      showNarrationHud(text, 'browser');
      return true;
    }
    return false;
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
          apiKeys: [settings.apiKey || '', '', '', '', '', '', '', '', ''],
          logicalQuotaDay: '',
          quotaCounters: {}
        });
        return;
      }
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
            apiKeys[0] = settings.apiKey || 'YOUR_GEMINI_API_KEY';
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
        selectedKey = settings.apiKey || '';
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

  async function executeDirectWithFallback(taskName, cascade, payloadInfo, action) {
    let lastErr = null;
    const modelList = cascade;

    for (let m = 0; m < modelList.length; m++) {
      const model = modelList[m];
      for (let attempt = 1; attempt <= 3; attempt++) {
        const attemptStart = Date.now();
        try {
          const res = await action(model);
          const latency = Date.now() - attemptStart;
          
          logApiCall({
            action: taskName,
            model: model,
            latencyMs: latency,
            statusCode: 200,
            statusText: 'OK',
            success: true,
            payloadInfo: payloadInfo || (taskName + ' concluído com sucesso'),
            mode: 'direct'
          });

          return res;
        } catch (err) {
          lastErr = err;
          const latency = Date.now() - attemptStart;
          console.warn('[STT&TTS de Satiro ' + taskName + '] Tentativa ' + attempt + '/3 no modelo ' + model + ' falhou:', err);

          logApiCall({
            action: taskName,
            model: model,
            latencyMs: latency,
            statusCode: isQuotaOrNotFoundError(err) ? 429 : 500,
            statusText: 'Tentativa ' + attempt + ' falhou: ' + (err.message || 'Erro'),
            success: false,
            payloadInfo: payloadInfo,
            errorMessage: err.message || String(err),
            mode: 'direct'
          });

          if (isQuotaOrNotFoundError(err)) {
            break;
          }

          if (attempt < 3) {
            await new Promise(r => setTimeout(r, attempt * 350));
          } else {
            break;
          }
        }
      }
    }

    let msg = lastErr?.message || 'Erro desconhecido';
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      msg = 'Cota do plano gratuito do Gemini excedida (429). Por favor aguarde alguns segundos ou adicione suas próprias chaves Gemini.';
    }
    throw new Error('Falha após retries na cadeia de fallback (' + modelList.join(' -> ') + '): ' + msg);
  }

  function isQuotaExceededError(err) {
    const msg = String(err.message || err).toLowerCase();
    return msg.includes('quota') || msg.includes('limit') || msg.includes('exhausted') || msg.includes('429') || msg.includes('exceeded');
  }

  function resolveDirectGeminiModelName(modelName) {
    const m = String(modelName || '').toLowerCase().trim();
    if (m === 'gemini-3.8-live-thinking' || m === 'gemini-3.8-live-extended-thinking' || m.includes('thinking')) {
      return 'gemini-3.8-live-extended-thinking';
    }
    if (m === 'gemini-3.8-live') return 'gemini-3.8-live';
    if (m === 'gemini-3-flash-live') return 'gemini-3-flash-live';
    if (m === 'gemini-3.5-transcribe-live' || m.includes('transcribe-live') || m.includes('translate')) {
      return 'gemini-3.5-transcribe-live';
    }
    if (m.endsWith('-tts') || m.includes('flash-lite-tts') || m.includes('flash-tts')) {
      return m;
    }
    if (m.includes('maps') || m.includes('grounding')) return 'gemini-2.5-flash';
    if (m.includes('3.8-flash-lite') || m.includes('lite')) return 'gemini-2.5-flash-lite';
    if (m.includes('3.8-flash') || m.includes('3.8')) return 'gemini-2.5-flash';
    if (m.includes('3.1-flash') || m.includes('3.1')) return 'gemini-2.0-flash';
    if (m.includes('2.5-flash') || m.includes('2.5')) return 'gemini-2.5-flash';
    return m || 'gemini-2.5-flash';
  }

  const EXT_TTS_CASCADE = [
    'gemini-3.8-flash-lite-tts',
    'gemini-3.8-flash-tts',
    'gemini-3.1-flash-tts',
    'gemini-2.5-flash-tts',
    'gemini-3-flash-live',
    'gemini-3.5-transcribe-live',
    'gemini-3.8-live',
    'gemini-3.8-live-thinking'
  ];

  const EXT_STT_CASCADE = [
    'gemini-3.8-live-thinking',
    'gemini-3.8-live',
    'gemini-3-flash-live',
    'gemini-3.8-flash-lite-stt',
    'gemini-3.8-flash-stt',
    'gemini-3.1-flash-stt',
    'gemini-2.5-flash-stt',
    'gemini-3.5-transcribe-live'
  ];

  async function directGeminiTTS(text, voiceOverride = null, instOverride = null) {
    const data = await getRotationData();
    const keys = data.apiKeys.map(k => k ? k.trim() : '').filter(Boolean);
    if (keys.length === 0) {
      keys.push(settings.apiKey || '');
    }

    const activeAgent = getCurrentNarratorAgent();
    let baseVoiceName = voiceOverride || activeAgent?.preferredVoice || settings.ttsVoice || 'Kore';
    let voiceInstruction = instOverride || '';

    const customVoices = settings.customVoices || [];
    const customMatch = customVoices.find(cv => cv.id === baseVoiceName || cv.name === baseVoiceName);
    if (customMatch) {
      baseVoiceName = customMatch.baseVoice || 'Kore';
      if (customMatch.instruction) {
        voiceInstruction = customMatch.instruction;
      }
    }

    let fullInstruction = instOverride || activeAgent.narratorInstruction || settings.narratorInstruction || 'Narre com dicção clara e entonação natural em português:';
    if (voiceInstruction) {
      fullInstruction = '[Instrução da Voz: ' + voiceInstruction + ']\n' + fullInstruction;
    }
    const prompt = fullInstruction + '\n' + text;

    const chosenTTS = activeAgent.ttsModel || settings.ttsModel || 'gemini-3.8-flash-lite-tts';
    const ttsCascade = [chosenTTS, ...EXT_TTS_CASCADE.filter(m => m !== chosenTTS)];

    let lastErr = null;

    for (let k = 0; k < keys.length; k++) {
      const apiKey = keys[k];
      let keyExhausted = false;

      for (let m = 0; m < ttsCascade.length; m++) {
        if (keyExhausted) break;
        const modelName = ttsCascade[m];
        const resolvedApiName = resolveDirectGeminiModelName(modelName);

        for (let attempt = 1; attempt <= 2; attempt++) {
          const attemptStart = Date.now();
          const payloadInfo = `Texto: ${text.length} chars | Voz: ${baseVoiceName} | Chave #${k + 1}/${keys.length} | Modelo: ${modelName} (Tentativa ${attempt}/2)`;

          try {
            const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + resolvedApiName + ':generateContent?key=' + encodeURIComponent(apiKey);
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  responseModalities: ['AUDIO'],
                  speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: baseVoiceName } }
                  }
                }
              })
            });

            if (!res.ok) {
              const errJson = await res.json().catch(() => ({}));
              throw new Error(errJson.error?.message || ('HTTP ' + res.status));
            }

            const resData = await res.json();
            const raw = resData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!raw) throw new Error('O modelo ' + modelName + ' não retornou áudio');

            // Incrementa contador de cota da chave
            await incrementQuotaCounter(k, m % 2, getLogicalQuotaDay(), data.quotaCounters || {});

            const latency = Date.now() - attemptStart;
            logApiCall({
              action: 'TTS',
              model: modelName,
              latencyMs: latency,
              statusCode: 200,
              statusText: 'OK',
              success: true,
              payloadInfo: payloadInfo,
              mode: 'direct'
            });

            const bin = atob(raw);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const wavBlob = pcm16ToWavBlob(bytes, 24000);
            return await blobToBase64(wavBlob);

          } catch (err) {
            lastErr = err;
            const latency = Date.now() - attemptStart;
            console.warn(`[TTS Fallback] Falha com Chave #${k + 1}, modelo ${modelName}:`, err);

            logApiCall({
              action: 'TTS',
              model: modelName,
              latencyMs: latency,
              statusCode: isQuotaExceededError(err) ? 429 : 500,
              statusText: `Chave #${k + 1} Falhou: ` + (err.message || 'Erro'),
              success: false,
              payloadInfo: payloadInfo,
              errorMessage: err.message || String(err),
              mode: 'direct'
            });

            if (isQuotaExceededError(err)) {
              const counters = data.quotaCounters || {};
              counters[`key_${k}_model_${m % 2}`] = 10;
              if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ quotaCounters: counters });
              }
              continue;
            }

            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 300));
            }
          }
        }
      }
    }

    let msg = lastErr?.message || 'Erro desconhecido';
    if (isQuotaExceededError(msg)) {
      msg = 'Cota do plano gratuito do Gemini excedida (429) em todas as chaves configuradas. Por favor insira chaves adicionais no painel ou aguarde a renovação diária.';
    }
    throw new Error('Cadeia de fallback de chaves/modelos esgotada. Erro final: ' + msg);
  }

  async function directGeminiSTT(audioBase64, mimeType) {
    const data = await getRotationData();
    const keys = data.apiKeys.map(k => k ? k.trim() : '').filter(Boolean);
    if (keys.length === 0) {
      keys.push(settings.apiKey || '');
    }

    const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const cleanMime = (mimeType || 'audio/webm').split(';')[0];
    const activeAgent = getCurrentTranscriberAgent();
    const prompt = activeAgent.transcriberInstruction || settings.transcriberInstruction || 'Transcreva com fidelidade absoluta o áudio recebido. Retorne apenas o texto transcrito, sem introduções ou aspas.';
    const chosenSTT = activeAgent.sttModel || settings.sttModel || 'gemini-3.5-flash-lite';
    const sttCascade = [chosenSTT, ...EXT_STT_CASCADE.filter(m => m !== chosenSTT)];

    let lastErr = null;

    for (let k = 0; k < keys.length; k++) {
      const apiKey = keys[k];
      let keyExhausted = false;

      for (let m = 0; m < sttCascade.length; m++) {
        if (keyExhausted) break;
        const modelName = sttCascade[m];
        const resolvedApiName = resolveDirectGeminiModelName(modelName);

        const payloadInfo = `Áudio (${Math.round(cleanBase64.length / 1024)} KB) | Chave #${k + 1}/${keys.length} | Modelo: ${modelName}`;

        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedApiName}:generateContent?key=${encodeURIComponent(apiKey)}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inlineData: { mimeType: cleanMime, data: cleanBase64 } },
                  { text: prompt }
                ]
              }]
            })
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error?.message || ('HTTP ' + res.status));
          }

          const resData = await res.json();
          const text = resData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (!text) throw new Error('O modelo ' + modelName + ' retornou transcrição vazia');

          await incrementQuotaCounter(k, m % 2, getLogicalQuotaDay(), data.quotaCounters || {});

          logApiCall({
            action: 'STT',
            model: modelName,
            latencyMs: 100,
            statusCode: 200,
            statusText: 'OK',
            success: true,
            payloadInfo: payloadInfo,
            mode: 'direct'
          });

          return text;

        } catch (err) {
          lastErr = err;
          console.warn(`[STT Fallback] Falha com Chave #${k + 1}, modelo ${modelName}:`, err);

          logApiCall({
            action: 'STT',
            model: modelName,
            latencyMs: 100,
            statusCode: isQuotaExceededError(err) ? 429 : 500,
            statusText: `Chave #${k + 1} Falhou: ` + (err.message || 'Erro'),
            success: false,
            payloadInfo: payloadInfo,
            errorMessage: err.message || String(err),
            mode: 'direct'
          });

          if (isQuotaExceededError(err)) {
            const counters = data.quotaCounters || {};
            counters[`key_${k}_model_${m % 2}`] = 10;
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ quotaCounters: counters });
            }
            continue;
          }
        }
      }
    }

    throw lastErr || new Error('Nenhum modelo de STT ou chave de API conseguiu transcrever o áudio.');
  }

  async function directGeminiVision(imageBase64) {
    const data = await getRotationData();
    const keys = data.apiKeys.map(k => k ? k.trim() : '').filter(Boolean);
    if (keys.length === 0) {
      keys.push(settings.apiKey || '');
    }

    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const prompt = settings.visionInstruction || 'Analise detalhadamente a imagem capturada da tela com o Google Lens e descreva os textos e elementos visuais com clareza em português.';

    let lastErr = null;

    for (let k = 0; k < keys.length; k++) {
      const apiKey = keys[k];
      const modelName = 'gemini-2.5-flash';
      const payloadInfo = `Recorte Lens (${Math.round(cleanBase64.length / 1024)} KB) | Chave #${k + 1}/${keys.length}`;

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { mimeType: 'image/png', data: cleanBase64 } },
                { text: prompt }
              ]
            }]
          })
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || ('HTTP ' + res.status));
        }

        const resData = await res.json();
        const text = resData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!text) throw new Error('O modelo ' + modelName + ' não gerou interpretação visual');

        await incrementQuotaCounter(k, 0, getLogicalQuotaDay(), data.quotaCounters || {});

        logApiCall({
          action: 'Vision',
          model: modelName,
          latencyMs: 100,
          statusCode: 200,
          statusText: 'OK',
          success: true,
          payloadInfo: payloadInfo,
          mode: 'direct'
        });

        return text;

      } catch (err) {
        lastErr = err;
        console.warn(`[Vision Fallback] Falha com Chave #${k + 1}:`, err);

        logApiCall({
          action: 'Vision',
          model: modelName,
          latencyMs: 100,
          statusCode: isQuotaExceededError(err) ? 429 : 500,
          statusText: `Chave #${k + 1} Falhou: ` + (err.message || 'Erro'),
          success: false,
          payloadInfo: payloadInfo,
          errorMessage: err.message || String(err),
          mode: 'direct'
        });

        if (isQuotaExceededError(err)) {
          const counters = data.quotaCounters || {};
          counters[`key_${k}_model_0`] = 10;
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ quotaCounters: counters });
          }
        }
      }
    }

    throw lastErr || new Error('Nenhum modelo de Vision ou chave de API conseguiu interpretar a imagem.');
  }

  // -------------------------------------------------------------
  // REQUISITO 1: NARRAÇÃO DE TEXTO SELECIONADO COM FILA DE ÁUDIO
  // -------------------------------------------------------------
  async function executeNarrationItem(textToNarrate, voiceOverride = null, instOverride = null) {
    isTtsProcessing = true;
    showSendingHud('TTS', 'Enviando texto (' + textToNarrate.length + ' caracteres) para Gemini TTS...');

    let narrated = false;

    // 1. PRIORIDADE MÁXIMA: Conexão Direta com API Gemini
    if (settings.apiKey && settings.apiKey.trim()) {
      try {
        showProcessingHud('TTS', 'Sintetizando áudio neural com a voz ' + (voiceOverride || settings.ttsVoice || 'Kore') + '...');
        const wavBase64 = await directGeminiTTS(textToNarrate, voiceOverride, instOverride);

        showStageHud({
          actionType: 'TTS',
          currentStage: 3,
          totalStages: 3,
          title: 'Narrando com Gemini',
          subtitle: 'Voz Neural: ' + (voiceOverride || settings.ttsVoice || 'Kore') + ' (24kHz PCM)',
          icon: 'pulse',
          type: 'ready',
          duration: 3000
        });

        playAudio(wavBase64, 'audio/wav', textToNarrate);
        narrated = true;
      } catch (apiErr) {
        console.warn('[STT&TTS de Satiro] Falha na API direta do Gemini TTS:', apiErr);
      }
    }

    // 2. Servidor Backend Opcional
    if (!narrated && settings.serverUrl && settings.serverUrl.trim() && !settings.serverUrl.includes('localhost:3000')) {
      try {
        showProcessingHud('TTS', 'Sintetizando via backend local...');
        const res = await fetch(`${settings.serverUrl}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToNarrate,
            instruction: instOverride || settings.narratorInstruction,
            voice: voiceOverride || settings.ttsVoice,
            apiKey: settings.apiKey
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.audioBase64) {
            playAudio(data.audioBase64, data.mimeType || 'audio/wav', textToNarrate);
            narrated = true;
          }
        }
      } catch (err) {}
    }

    // 3. Fallback: Voz Nativa do Navegador
    if (!narrated) {
      const spoken = speakFallbackNative(textToNarrate);
      if (spoken) {
        if (!settings.apiKey) {
          showHud('Narrando com voz local do navegador. Adicione sua Chave Gemini para vozes neurais!', '🔊', 5000, 'info');
        }
      } else {
        isTtsProcessing = false;
        showHud('Insira sua Chave Gemini no ícone da extensão para narrar!', '🔑', 5000, 'warning');
      }
    }
  }

  function narrateSelection(selectedText, voiceOverride = null, instOverride = null, isImmediateReSelection = false) {
    if (!selectedText || !selectedText.trim()) {
      showHud('Selecione um texto na página antes de iniciar a narração.', '⚠️', 3000, 'warning');
      return;
    }

    const text = selectedText.trim();

    // Se houver narração ativa e o usuário disparou nova narração, cancela a anterior e inicia a nova
    if (isNarrationActive()) {
      stopAllNarration(null);
    }

    executeNarrationItem(text, voiceOverride, instOverride);
  }

  // Listener de mensagens do Service Worker
  if (typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'narrate_selected_text') {
        if (isNarrationActive()) {
          stopAllNarration('Narração interrompida');
          sendResponse({ success: true, stopped: true });
          return;
        }
        const sel = request.text || window.getSelection()?.toString().trim();
        narrateSelection(sel);
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'SET_ACTIVE_AGENT') {
        settings.activeAgentId = request.agentId;
        if (request.agent) {
          settings.locutionInstruction = request.agent.locutionInstruction;
          settings.narratorInstruction = request.agent.narratorInstruction;
          settings.transcriberInstruction = request.agent.transcriberInstruction;
          settings.visionInstruction = request.agent.visionInstruction;
          if (request.agent.preferredVoice) {
            settings.ttsVoice = request.agent.preferredVoice;
          }
        }
        // Atualiza UI do balão (HUD) se estiver aberto
        const hud = document.getElementById('vocallens-narration-hud');
        if (hud && hud.style.display !== 'none') {
          const titleEl = hud.querySelector('.vocallens-nhud-title');
          if (titleEl) {
            titleEl.innerText = `Narrando com Gemini (${settings.ttsVoice || 'Kore'})`;
          }
          const agentBadge = hud.querySelector('.vocallens-agent-badge');
          if (agentBadge && request.agent) {
            agentBadge.innerText = request.agent.name.replace(/^(🎙️|📻|🎓|⚡|🧘|💼|💬|🧙|✨)\s*/, '');
          }
        }
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'SET_TRANSCRIBER_AGENT') {
        settings.activeTranscriberAgentId = request.agentId;
        if (request.agent) {
          settings.transcriberInstruction = request.agent.transcriberInstruction;
          if (request.agent.sttModel) {
            settings.sttModel = request.agent.sttModel;
          }
        }
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'SET_AUDIO_VOLUME') {
        const vol = parseFloat(request.volume);
        settings.ttsVolume = vol;
        if (activeAudioPlayer) {
          activeAudioPlayer.volume = vol;
        }
        updateNarrationHudVolumeUI(vol);
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'SET_AUDIO_SPEED') {
        const spd = parseFloat(request.speed);
        settings.ttsSpeed = spd;
        if (activeAudioPlayer) {
          activeAudioPlayer.playbackRate = spd;
          activeAudioPlayer.defaultPlaybackRate = spd;
          activeAudioPlayer.preservesPitch = true;
        }
        updateNarrationHudSpeedUI(spd);
        sendResponse({ success: true });
        return true;
      }
    });
  }

  // Pop-up flutuante de apoio ao clicar com o botão direito na seleção de texto
  let floatingMenuEl = null;

  function hideFloatingMenu() {
    if (floatingMenuEl) {
      floatingMenuEl.style.display = 'none';
    }
  }

  document.addEventListener('contextmenu', (e) => {
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length > 0) {
      if (!floatingMenuEl) {
        floatingMenuEl = document.createElement('div');
        floatingMenuEl.id = 'vocallens-quick-narrate-btn';
        floatingMenuEl.style.cssText = 'position: fixed; z-index: 2147483647; background: #0f172a; border: 1px solid #38bdf8; border-radius: 8px; padding: 6px 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.8), 0 0 15px rgba(56,189,248,0.3); color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; user-select: none; transition: transform 0.1s ease, background 0.15s ease;';
        floatingMenuEl.innerHTML = '<span style="font-size:14px;">🎙️</span><span>Iniciar Narração</span><span style="background:#0284c7; color:#fff; font-size:9px; padding:1px 5px; border-radius:4px; margin-left:2px; font-weight:700;">Gemini</span>';
        document.body.appendChild(floatingMenuEl);

        floatingMenuEl.addEventListener('mouseenter', () => {
          floatingMenuEl.style.background = '#1e293b';
          floatingMenuEl.style.borderColor = '#0284c7';
        });
        floatingMenuEl.addEventListener('mouseleave', () => {
          floatingMenuEl.style.background = '#0f172a';
          floatingMenuEl.style.borderColor = '#38bdf8';
        });

        floatingMenuEl.addEventListener('click', (evt) => {
          evt.stopPropagation();
          evt.preventDefault();
          hideFloatingMenu();
          const currentText = window.getSelection()?.toString().trim();
          if (isNarrationActive()) {
            stopAllNarration('Narração interrompida');
          } else {
            narrateSelection(currentText);
          }
        });
      }

      const posX = Math.min(e.clientX + 10, window.innerWidth - 180);
      const posY = Math.min(e.clientY + 10, window.innerHeight - 50);
      floatingMenuEl.style.left = posX + 'px';
      floatingMenuEl.style.top = posY + 'px';
      floatingMenuEl.style.display = 'flex';
    } else {
      hideFloatingMenu();
    }
  });

  document.addEventListener('click', (e) => {
    if (floatingMenuEl && !floatingMenuEl.contains(e.target)) {
      hideFloatingMenu();
    }
  });

  document.addEventListener('scroll', hideFloatingMenu, true);

  // Atalho Configurável (Ctrl + B)
  document.addEventListener('keydown', async (e) => {
    if (!settings.enableCtrlB) return;
    
    const sc = settings.shortcutNarrateConfig;
    const match = sc && 
      (Boolean(e.ctrlKey) === Boolean(sc.ctrl)) &&
      (Boolean(e.shiftKey) === Boolean(sc.shift)) &&
      (Boolean(e.altKey) === Boolean(sc.alt)) &&
      (e.code === sc.code || e.key.toLowerCase() === sc.key.toLowerCase());

    if (match || ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B') && !sc)) {
      e.preventDefault();

      // SE HOUVER NARRAÇÃO EM EXECUÇÃO, O ATALHO PARARÁ A NARRAÇÃO IMEDIATAMENTE (TOGGLE)
      if (isNarrationActive()) {
        stopAllNarration('Narração interrompida pelo atalho (Ctrl+B)');
        return;
      }

      const selectedText = window.getSelection()?.toString().trim();
      narrateSelection(selectedText);
    }
  });

  // -------------------------------------------------------------
  // REQUISITO 2: GOOGLE LENS VISION COM ESTÁGIOS [1/4] A [4/4]
  // -------------------------------------------------------------
  function createSelectionOverlay() {
    if (overlayEl) return;
    overlayEl = document.createElement('div');
    overlayEl.id = 'vocallens-selection-overlay';

    selectionBoxEl = document.createElement('div');
    selectionBoxEl.id = 'vocallens-selection-box';
    selectionBoxEl.className = 'vocallens-lens-box';

    selectionBoxEl.innerHTML = `
      <div class="vocallens-lens-corner top-left"></div>
      <div class="vocallens-lens-corner top-right"></div>
      <div class="vocallens-lens-corner bottom-left"></div>
      <div class="vocallens-lens-corner bottom-right"></div>
      <div class="vocallens-lens-laser"></div>
      <div class="vocallens-lens-badge">
        <span class="vocallens-lens-dot"></span>
        <span>Google Lens • Solte para Fotografar e Analisar</span>
      </div>
    `;

    overlayEl.appendChild(selectionBoxEl);
    document.body.appendChild(overlayEl);
  }

  document.addEventListener('mousedown', (e) => {
    if (!settings.enableCtrlDrag) return;
    if ((e.ctrlKey && e.shiftKey) && e.button === 0) {
      isSelectingArea = true;
      startX = e.clientX;
      startY = e.clientY;

      createSelectionOverlay();
      overlayEl.style.display = 'block';
      selectionBoxEl.style.left = startX + 'px';
      selectionBoxEl.style.top = startY + 'px';
      selectionBoxEl.style.width = '0px';
      selectionBoxEl.style.height = '0px';
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isSelectingArea || !selectionBoxEl) return;
    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    selectionBoxEl.style.left = left + 'px';
    selectionBoxEl.style.top = top + 'px';
    selectionBoxEl.style.width = width + 'px';
    selectionBoxEl.style.height = height + 'px';
  });

  async function finishAreaSelection(e) {
    if (!isSelectingArea) return;
    isSelectingArea = false;

    const currentX = e.clientX;
    const currentY = e.clientY;
    const rect = {
      x: Math.min(startX, currentX),
      y: Math.min(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY),
      devicePixelRatio: window.devicePixelRatio || 1
    };

    if (overlayEl) overlayEl.style.display = 'none';
    if (rect.width < 15 || rect.height < 15) return;

    // Estágio 1/4: Capturando
    showStageHud({
      actionType: 'Lens',
      currentStage: 1,
      totalStages: 4,
      title: 'Capturando Área da Tela...',
      subtitle: 'Dimensões: ' + Math.round(rect.width) + 'x' + Math.round(rect.height) + 'px',
      icon: '📸',
      type: 'sending'
    });

    chrome.runtime.sendMessage({ action: 'capture_visible_tab' }, async (response) => {
      if (!response || !response.success || !response.dataUrl) {
        showHud('Não foi possível capturar a tela', '❌', 3000, 'error');
        return;
      }

      // Estágio 2/4: Enviando
      showStageHud({
        actionType: 'Lens',
        currentStage: 2,
        totalStages: 4,
        title: 'Enviando Recorte Visual...',
        subtitle: 'Enviando imagem para Gemini Vision (gemini-3.5-flash-lite)...',
        icon: '🚀',
        type: 'sending'
      });

      const croppedBase64 = await cropImage(response.dataUrl, rect);

      let processed = false;

      // 1. PRIORIDADE: Conexão Direta à API Gemini
      if (settings.apiKey && settings.apiKey.trim()) {
        try {
          showStageHud({
            actionType: 'Lens',
            currentStage: 3,
            totalStages: 4,
            title: 'Interpretando Imagem com IA...',
            subtitle: 'Extraindo textos, contexto e elementos visuais...',
            icon: '🧠',
            type: 'processing'
          });

          const description = await directGeminiVision(croppedBase64);
          if (description) {
            showStageHud({
              actionType: 'Lens',
              currentStage: 4,
              totalStages: 4,
              title: 'Narrando Leitura do Google Lens...',
              subtitle: 'Sintetizando voz neural do resultado visual...',
              icon: '🔊',
              type: 'ready',
              duration: 3500
            });

            narrateSelection(description);
            saveToHistory(description, 'Google Lens', croppedBase64);
            processed = true;
          }
        } catch (apiErr) {
          console.warn('[STT&TTS de Satiro] Falha na API direta do Google Lens:', apiErr);
        }
      }

      // 2. Servidor Backend Opcional
      if (!processed && settings.serverUrl && settings.serverUrl.trim() && !settings.serverUrl.includes('localhost:3000')) {
        try {
          const res = await fetch(`${settings.serverUrl}/api/vision-tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: croppedBase64,
              instruction: settings.visionInstruction,
              narratorInstruction: settings.narratorInstruction,
              voice: settings.ttsVoice,
              apiKey: settings.apiKey
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              if (data.audioBase64) {
                playAudio(data.audioBase64, data.mimeType || 'audio/wav', data.text);
              }
              saveToHistory(data.text || 'Análise visual narrada via servidor', 'Google Lens', croppedBase64);
              processed = true;
            }
          }
        } catch (err) {}
      }

      if (!processed) {
        showHud('Insira sua Chave Gemini no ícone da extensão para ativar o Google Lens!', '🔑', 5000, 'warning');
      }
    });
  }

  document.addEventListener('mouseup', finishAreaSelection);

  function cropImage(dataUrl, rect) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const dpr = rect.devicePixelRatio;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
          img,
          rect.x * dpr,
          rect.y * dpr,
          rect.width * dpr,
          rect.height * dpr,
          0,
          0,
          canvas.width,
          canvas.height
        );
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    });
  }

  // -------------------------------------------------------------
  // REQUISITO 3: PAUSE / BREAK -> STT COM FILA E INSERÇÃO ESTREITA
  // -------------------------------------------------------------
  async function processNextSttJob() {
    if (isSttProcessing || sttQueue.length === 0) return;
    isSttProcessing = true;
    const job = sttQueue.shift();

    try {
      showSendingHud('STT', 'Enviando áudio gravado (' + job.seconds + 's) para Gemini STT...');

      const reader = new FileReader();
      reader.onloadend = async () => {
        showProcessingHud('STT', 'Transcrevendo fala e aplicando pontuação com Gemini...');
        const base64Audio = reader.result;
        let transcribedText = null;

        // 1. PRIORIDADE: Conexão Direta com API Gemini
        if (settings.apiKey && settings.apiKey.trim()) {
          try {
            transcribedText = await directGeminiSTT(base64Audio, 'audio/webm');
          } catch (apiErr) {
            console.warn('[STT&TTS de Satiro] Falha na transcrição direta:', apiErr);
          }
        }

        // 2. Servidor Backend Opcional
        if (!transcribedText && settings.serverUrl && settings.serverUrl.trim() && !settings.serverUrl.includes('localhost:3000')) {
          try {
            const res = await fetch(`${settings.serverUrl}/api/stt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: 'audio/webm',
                instruction: settings.transcriberInstruction,
                apiKey: settings.apiKey
              })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.success && data.text) {
                transcribedText = data.text;
              }
            }
          } catch (err) {}
        }

        // Estágio 4/4: Concluído - Inserção Estrita no Campo Alvo Original
        if (transcribedText) {
          if (job.targetElement && document.contains(job.targetElement)) {
            insertTranscribedText(job.targetElement, transcribedText);
            showReadyToTypeHud(transcribedText, job.targetElement);
          } else {
            showReadyToTypeHud(transcribedText, null);
          }
        } else {
          showHud('Insira sua Chave Gemini no ícone da extensão para transcrever!', '🔑', 5000, 'warning');
        }

        isSttProcessing = false;
        if (sttQueue.length > 0) {
          processNextSttJob();
        }
      };
      reader.readAsDataURL(job.audioBlob);
    } catch (err) {
      console.error('[STT Queue Error]', err);
      isSttProcessing = false;
      if (sttQueue.length > 0) processNextSttJob();
    }
  }

  function isRecordingToggleKey(e) {
    const sc = settings.shortcutRecordConfig;
    if (sc) {
      const match = (Boolean(e.ctrlKey) === Boolean(sc.ctrl)) &&
                    (Boolean(e.shiftKey) === Boolean(sc.shift)) &&
                    (Boolean(e.altKey) === Boolean(sc.alt)) &&
                    (e.code === sc.code || e.key.toLowerCase() === sc.key.toLowerCase());
      if (match) return true;
    }

    const isPause = (
      e.key === 'Pause' ||
      e.code === 'Pause' ||
      e.key === 'Break' ||
      e.code === 'Break' ||
      e.keyCode === 19 ||
      e.which === 19 ||
      e.key === 'MediaPlayPause'
    );
    if (isPause) return true;

    if (e.ctrlKey && e.shiftKey && (e.code === 'Space' || e.key === ' ' || e.keyCode === 32)) {
      return true;
    }

    return false;
  }

  let lastToggleTimestamp = 0;

  async function handleRecordingToggle(e) {
    if (!settings.enablePauseBreak) return;
    if (!isRecordingToggleKey(e)) return;

    const now = Date.now();
    if (now - lastToggleTimestamp < 350) return;
    lastToggleTimestamp = now;

    e.preventDefault();
    e.stopPropagation();

    if (!isRecordingAudio) {
      // INICIAR GRAVAÇÃO
      const active = document.activeElement;
      targetInputElement = isTextInputElement(active) ? active : null;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) audioChunks.push(event.data);
        };

        const currentTargetField = targetInputElement;
        const capturedSeconds = hudSeconds;

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

          // Insere trabalho na FILA DE TRANSCRIÇÃO garantindo o campo alvo original
          sttQueue.push({
            audioBlob: audioBlob,
            targetElement: currentTargetField,
            seconds: hudSeconds || 1,
            timestamp: Date.now()
          });

          processNextSttJob();
        };

        mediaRecorder.start();
        isRecordingAudio = true;
        if (targetInputElement) highlightTargetElement(targetInputElement, true);
        showRecordingHud(Boolean(targetInputElement));

      } catch (err) {
        console.warn('[STT&TTS de Satiro] Permissão de microfone negada ou erro:', err);
        showHud('Microfone bloqueado! Clique no ícone da extensão para permitir.', '🎙️❌', 5500, 'warning');
      }

    } else {
      // PARAR GRAVAÇÃO
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      isRecordingAudio = false;
      if (targetInputElement) highlightTargetElement(targetInputElement, false);
    }
  }

  document.addEventListener('keydown', handleRecordingToggle, true);
  document.addEventListener('keyup', handleRecordingToggle, true);

  function isTextInputElement(el) {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea') return true;
    if (tag === 'input') {
      const type = (el.type || 'text').toLowerCase();
      return ['text', 'search', 'url', 'email', 'tel', 'password', ''].includes(type);
    }
    if (el.isContentEditable) return true;
    return false;
  }

  function highlightTargetElement(el, enable) {
    if (!el) return;
    if (enable) {
      el.dataset.vocallensOldOutline = el.style.outline;
      el.style.outline = '3px solid #0284c7';
      el.style.outlineOffset = '2px';
    } else {
      el.style.outline = el.dataset.vocallensOldOutline || '';
    }
  }

  function insertTranscribedText(el, text) {
    if (!el) return;
    try {
      el.focus();
      if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
        const start = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
        const end = typeof el.selectionEnd === 'number' ? el.selectionEnd : el.value.length;
        const currentVal = el.value || '';
        const needsSpace = start > 0 && !currentVal.slice(start - 1, start).match(/\s/);
        const textToInsert = (needsSpace ? ' ' : '') + text;

        el.value = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
        el.selectionStart = el.selectionEnd = start + textToInsert.length;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (el.isContentEditable) {
        document.execCommand('insertText', false, ' ' + text);
      }
    } catch (err) {
      console.error('[STT&TTS de Satiro] Falha na injeção de texto:', err);
    }
  }

  // ATALHO GLOBAL ESCAPE: Interrompe qualquer áudio ou cancela qualquer processo imediatamente
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isNarrationActive()) {
        stopAllNarration('Reprodução parada via tecla Esc');
      } else if (isRecordingAudio) {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        isRecordingAudio = false;
        hideHud();
      } else if (isSelectingArea) {
        if (overlayEl) overlayEl.style.display = 'none';
        isSelectingArea = false;
        hideHud();
      } else {
        hideHud();
        hideNarrationHud();
      }
    }
  }, true);

  // Escuta mensagens do Popup ou Background para parar áudio imediatamente ou sincronizar controles
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'STOP_ALL_AUDIO' || request.action === 'stopTts' || request.action === 'stopAudio') {
        stopAllNarration('Reprodução interrompida via extensão');
        sendResponse({ success: true });
        return true;
      }
      if (request.action === 'SET_AUDIO_SPEED') {
        const sp = parseFloat(request.speed || 1.0);
        settings.ttsSpeed = sp;
        if (activeAudioPlayer) {
          activeAudioPlayer.playbackRate = sp;
          activeAudioPlayer.defaultPlaybackRate = sp;
          activeAudioPlayer.preservesPitch = true;
        }
        updateNarrationHudSpeedUI(sp);
        sendResponse({ success: true });
        return true;
      }
      if (request.action === 'SET_AUDIO_VOLUME') {
        const vol = parseFloat(request.volume !== undefined ? request.volume : 1.0);
        settings.ttsVolume = vol;
        if (activeAudioPlayer) {
          activeAudioPlayer.volume = Math.min(1, Math.max(0, vol));
        }
        updateNarrationHudVolumeUI(vol);
        sendResponse({ success: true });
        return true;
      }
      if (request.action === 'SET_ACTIVE_AGENT') {
        settings.activeAgentId = request.agentId;
        if (request.agent) {
          settings.locutionInstruction = request.agent.locutionInstruction;
          settings.narratorInstruction = request.agent.narratorInstruction;
          settings.transcriberInstruction = request.agent.transcriberInstruction;
          settings.visionInstruction = request.agent.visionInstruction;
        }
        sendResponse({ success: true });
        return true;
      }
      if (request.action === 'GET_AUDIO_STATUS') {
        sendResponse({ isPlaying: isNarrationActive(), isRecording: isRecordingAudio });
        return true;
      }
    });
  }
})();
