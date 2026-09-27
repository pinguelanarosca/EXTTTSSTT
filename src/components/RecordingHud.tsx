import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Send,
  Sparkles,
  Check,
  Copy,
  AlertCircle,
  X,
  CornerDownLeft,
  Volume2,
  Sliders,
  Play,
  Square,
  History,
  Clock,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  GripHorizontal,
  Maximize2,
  Minimize2,
  Activity,
  Cpu,
  Zap
} from 'lucide-react';
import { ExtensionSettings, NarrationLog, RecordingStatus } from '../types';

interface RecordingHudProps {
  status: RecordingStatus;
  targetFieldId: string | null;
  targetFieldName?: string;
  transcribedText?: string;
  durationSeconds: number;
  settings: ExtensionSettings;
  onUpdateSettings?: (settings: Partial<ExtensionSettings>) => void;
  recentLogs?: NarrationLog[];
  onPlayTts?: (text: string, voice?: string) => void;
  onStopTts?: () => void;
  isTtsPlaying?: boolean;
  onStopRecording: () => void;
  onDismiss: () => void;
  onInsertIntoField?: (fieldId: string) => void;
}

export const RecordingHud: React.FC<RecordingHudProps> = ({
  status,
  targetFieldId,
  targetFieldName,
  transcribedText,
  durationSeconds,
  settings,
  onUpdateSettings,
  recentLogs = [],
  onPlayTts,
  onStopTts,
  isTtsPlaying = false,
  onStopRecording,
  onDismiss,
  onInsertIntoField,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'tts' | 'history'>('status');
  const [copied, setCopied] = useState(false);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [waitingForFieldClick, setWaitingForFieldClick] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Drag & drop pos
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  const hudRef = useRef<HTMLDivElement>(null);

  // Troca para a aba de status sempre que a gravação mudar de estado ativo
  useEffect(() => {
    if (status !== 'idle') {
      setActiveTab('status');
      setIsMinimized(false);
    }
  }, [status]);

  // Formatação do timer 00:00
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleCopy = async () => {
    if (transcribedText) {
      try {
        const prev = await navigator.clipboard.readText().catch(() => '');
        await navigator.clipboard.writeText(transcribedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);

        if (prev && prev !== transcribedText) {
          const restoreOnPaste = () => {
            window.removeEventListener('paste', restoreOnPaste, true);
            setTimeout(async () => {
              try {
                await navigator.clipboard.writeText(prev);
              } catch (e) {}
            }, 300);
          };
          window.addEventListener('paste', restoreOnPaste, true);
          setTimeout(() => {
            window.removeEventListener('paste', restoreOnPaste, true);
          }, 10000);
        }
      } catch (err) {
        console.warn('Erro ao copiar:', err);
      }
    }
  };

  const handleCopyLogText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLogId(id);
    setTimeout(() => setCopiedLogId(null), 1800);
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('.no-drag')) return;

    if (!hudRef.current) return;
    const rect = hudRef.current.getBoundingClientRect();
    const currentX = position ? position.x : rect.left;
    const currentY = position ? position.y : rect.top;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 380, dragStartRef.current.initX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 300, dragStartRef.current.initY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Se o usuário clicar em "Inserir no campo clicado" quando não havia alvo
  useEffect(() => {
    if (!waitingForFieldClick || !transcribedText || !onInsertIntoField) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        const id = target.id;
        if (id) {
          onInsertIntoField(id);
          setWaitingForFieldClick(false);
        }
      }
    };

    document.addEventListener('click', handleGlobalClick, { capture: true });
    return () => document.removeEventListener('click', handleGlobalClick, { capture: true });
  }, [waitingForFieldClick, transcribedText, onInsertIntoField]);

  // Fechar vs Minimizar
  const handleCloseClick = () => {
    if (status === 'recording' || status === 'sending' || status === 'processing') {
      setIsMinimized(true);
    } else {
      setIsMinimized(false);
      onDismiss();
    }
  };

  if (status === 'idle') return null;

  // Transcrições recentes para a mini-lista
  const transcriptionLogs = recentLogs.filter((l) => l.type === 'transcription').slice(0, 4);

  return (
    <aside
      ref={hudRef}
      id="vocallens-hud-container"
      aria-label="Console e Status STT&TTS de Satiro"
      className="fixed z-50 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl transition-shadow duration-200 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-top-4 select-none"
      style={{
        backgroundColor: 'rgba(10, 15, 30, 0.72)', // Fundo translúcido a 70% com alto contraste
        borderColor:
          status === 'recording'
            ? '#ef4444'
            : status === 'sending'
            ? '#38bdf8'
            : status === 'processing'
            ? '#a855f7'
            : status === 'ready'
            ? '#10b981'
            : '#38bdf8',
        boxShadow: isDragging
          ? '0 25px 50px rgba(0, 0, 0, 0.7)'
          : '0 20px 40px -10px rgba(0, 0, 0, 0.6)',
        top: position ? `${position.y}px` : '1.25rem',
        left: position ? `${position.x}px` : undefined,
        right: position ? undefined : '1.25rem',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Barra de Topo do Balão (Drag Handle com Mini-Abas) */}
      <div
        onMouseDown={handleMouseDown}
        className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing group"
        style={{
          borderColor:
            status === 'recording'
              ? 'rgba(239, 68, 68, 0.35)'
              : status === 'ready'
              ? 'rgba(16, 185, 129, 0.35)'
              : 'rgba(56, 189, 248, 0.35)',
        }}
        title="Clique e arraste para mover este pop-up"
      >
        <div className="flex items-center gap-1.5">
          <GripHorizontal className="h-4 w-4 text-slate-400/70 group-hover:text-cyan-300 transition" />
          
          {/* Indicador de Status / Mini Abas */}
          <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-medium no-drag">
            <button
              id="hud-tab-status-btn"
              onClick={() => setActiveTab('status')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'status'
                  ? status === 'recording'
                    ? 'bg-rose-500/25 text-rose-300 font-bold border border-rose-500/40'
                    : 'bg-slate-800/90 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {status === 'recording' ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <span>Gravando {formattedTime}</span>
                </>
              ) : status === 'sending' ? (
                <>
                  <span className="h-2 w-2 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : status === 'processing' ? (
                <>
                  <Sparkles className="h-3 w-3 text-purple-400 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : status === 'ready' ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span>Transcrito!</span>
                </>
              ) : (
                <>
                  <Mic className="h-3 w-3 text-cyan-400" />
                  <span>Microfone</span>
                </>
              )}
            </button>

            <button
              id="hud-tab-tts-btn"
              onClick={() => setActiveTab('tts')}
              className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'tts'
                  ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="h-3 w-3 text-cyan-400" />
              <span>TTS</span>
            </button>

            <button
              id="hud-tab-history-btn"
              onClick={() => setActiveTab('history')}
              className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-purple-500/25 text-purple-300 font-bold border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="h-3 w-3 text-purple-400" />
              <span>Logs</span>
            </button>
          </div>
        </div>

        {/* Botão de Minimizar / Fechar Balão */}
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            title="Minimizar para botão flutuante"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleCloseClick}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/50 transition cursor-pointer"
            title="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: STATUS DE GRAVAÇÃO / INFORMAÇÕES TÉCNICAS RICAS DO PROCESSO        */}
      {/* ========================================================================= */}
      {activeTab === 'status' && (
        <div className="p-4 space-y-3 no-drag">
          {status === 'recording' && (
            <>
              {/* Painel de Informações Ricas da Execução */}
              <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1">
                    <TargetIcon className="h-3 w-3 text-emerald-400" />
                    <span>Campo Alvo:</span>
                  </span>
                  {targetFieldId ? (
                    <span className="font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded truncate max-w-[170px]">
                      {targetFieldName || targetFieldId}
                    </span>
                  ) : (
                    <span className="font-medium text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
                      Nenhum campo (Modo Livre)
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-900">
                  <span className="flex items-center gap-1">
                    <Cpu className="h-3 w-3 text-cyan-400" />
                    <span>Modelo Ativo:</span>
                  </span>
                  <span className="text-cyan-300 font-mono font-medium">gemini-3.5-transcribe</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-400" />
                    <span>Conexão:</span>
                  </span>
                  <span className="text-slate-300 font-mono">⚡ API Direta Gemini</span>
                </div>
              </div>

              {/* Ondas sonoras animadas */}
              <div className="flex items-center justify-center gap-1.5 h-8 py-1 bg-rose-950/30 rounded-xl border border-rose-900/40">
                <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0.0s] h-3" />
                <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0.15s] h-6" />
                <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0.3s] h-8" />
                <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0.1s] h-5" />
                <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0.25s] h-7" />
                <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0.05s] h-4" />
                <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0.2s] h-6" />
              </div>

              <p className="text-[11px] text-slate-300 text-center leading-relaxed">
                Fale ao microfone. Pressione <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-100 font-mono">Pause</kbd> para finalizar e digitar no campo.
              </p>

              <button
                id="hud-stop-recording-btn"
                onClick={onStopRecording}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Mic className="h-3.5 w-3.5" />
                <span>Concluir Gravação</span>
              </button>
            </>
          )}

          {status === 'sending' && (
            <div className="space-y-2.5 py-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-blue-300 font-medium">
                  <Send className="h-4 w-4 text-blue-400" />
                  <span>Enviando áudio capturado...</span>
                </div>
                <span className="text-[10px] font-mono text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800">
                  STT [2/4]
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div className="bg-blue-500 h-full rounded-full w-2/3 animate-pulse" />
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Codificação Opus 48kHz</span>
                <span className="font-mono text-cyan-300">Tempo: {formattedTime}</span>
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="space-y-2.5 py-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-purple-300 font-medium">
                  <Sparkles className="h-4 w-4 text-purple-400 animate-spin" />
                  <span>Transcrevendo e pontuando com Gemini...</span>
                </div>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800">
                  STT [3/4]
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div className="bg-purple-500 h-full rounded-full w-5/6 animate-pulse" />
              </div>
              <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-900/60 text-[11px] text-purple-200 space-y-1">
                <div className="flex items-center justify-between font-mono">
                  <span>Modelo: Gemini 2.5 Flash STT</span>
                  <span className="text-purple-300">Latência: ~320ms</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Formatando pontuação gramatical e removendo ruídos de fala.
                </p>
              </div>
            </div>
          )}

          {status === 'ready' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>Transcrição Concluída:</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {transcribedText?.length || 0} chars • {transcribedText?.split(' ').length || 0} palavras
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 text-xs font-sans leading-relaxed max-h-36 overflow-y-auto select-text">
                "{transcribedText || 'Nenhum texto detectado.'}"
              </div>

              {targetFieldId ? (
                <div className="flex items-center justify-between text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/60">
                  <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span>Inserido no campo <strong>{targetFieldName || targetFieldId}</strong></span>
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-[11px] text-slate-200 hover:text-white underline cursor-pointer shrink-0"
                  >
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Pronto para digitar!</span>
                      <span className="text-[11px] text-amber-300/80">
                        Nenhum campo de texto estava em foco. Clique em "Digitar no Campo" e clique em qualquer input.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopy}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar Texto</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setWaitingForFieldClick(!waitingForFieldClick)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        waitingForFieldClick
                          ? 'bg-blue-600 text-white animate-pulse border border-blue-400'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      <CornerDownLeft className="h-3.5 w-3.5" />
                      <span>{waitingForFieldClick ? 'Clique no Campo...' : 'Digitar no Campo'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'idle' && (
            <div className="text-center py-4 space-y-2 text-xs text-slate-300">
              <div className="p-3 rounded-full bg-slate-800/90 w-fit mx-auto text-cyan-400 border border-slate-700">
                <Mic className="h-5 w-5" />
              </div>
              <p className="text-slate-200 font-medium">Microfone em repouso</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Clique em qualquer campo da página e tecle <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-100 font-mono">Pause</kbd> para gravar e digitar automaticamente com IA.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: MINI CONSOLE TTS */}
      {activeTab === 'tts' && (
        <div className="p-4 space-y-3.5 text-xs no-drag">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-200">
              <span className="font-semibold flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                Voz Gemini
              </span>
              <span className="text-[11px] text-cyan-300 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60">
                {settings.ttsVoice}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1">
              {(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'] as const).map((voice) => (
                <button
                  key={voice}
                  onClick={() => onUpdateSettings && onUpdateSettings({ ttsVoice: voice })}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-medium text-center transition cursor-pointer ${
                    settings.ttsVoice === voice
                      ? 'bg-cyan-600 text-white font-bold shadow-sm'
                      : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {voice}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-200">
              <span>Velocidade de Fala</span>
              <span className="font-mono text-cyan-400 text-[11px]">
                {(settings.ttsSpeed ?? 1.0).toFixed(1)}x
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.8, 1.0, 1.2, 1.5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => onUpdateSettings && onUpdateSettings({ ttsSpeed: speed })}
                  className={`py-1 rounded-md text-[11px] font-mono transition cursor-pointer ${
                    (settings.ttsSpeed ?? 1.0) === speed
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {speed.toFixed(1)}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
            {isTtsPlaying ? (
              <button
                onClick={onStopTts}
                className="flex-1 py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Parar Narração</span>
              </button>
            ) : (
              <button
                onClick={() =>
                  onPlayTts &&
                  onPlayTts(
                    transcribedText ||
                      'STT&TTS de Satiro: leitura com voz neural Google Gemini e alta fidelidade.',
                    settings.ttsVoice
                  )
                }
                className="flex-1 py-1.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Testar Voz ({settings.ttsVoice})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: HISTÓRICO RECENTE */}
      {activeTab === 'history' && (
        <div className="p-4 space-y-2.5 text-xs max-h-72 overflow-y-auto no-drag">
          {transcriptionLogs.length === 0 ? (
            <div className="text-center py-6 text-slate-400 space-y-1.5">
              <History className="h-6 w-6 mx-auto text-slate-500" />
              <p className="font-medium text-slate-300">Nenhuma transcrição recente</p>
              <p className="text-[11px] text-slate-400">
                Pressione Pause num campo para gravar suas falas.
              </p>
            </div>
          ) : (
            transcriptionLogs.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-800/40 truncate max-w-[140px]">
                    {item.targetFieldName || item.targetField || 'Livre'}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="h-3 w-3" />
                    {new Date(item.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-slate-100 font-sans text-[11px] line-clamp-2 leading-relaxed">
                  "{item.text}"
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[11px]">
                  <span className="text-slate-400">{item.wordCount || item.text.split(' ').length} palavras</span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLogText(item.id, item.text)}
                      className="text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLogId === item.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedLogId === item.id ? 'Copiado' : 'Copiar'}</span>
                    </button>

                    {onPlayTts && (
                      <button
                        onClick={() => onPlayTts(item.text, settings.ttsVoice)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Play className="h-2.5 w-2.5 fill-current" />
                        <span>Ouvir</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
};

// Ícone auxiliar
function TargetIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
