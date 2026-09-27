import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  FastForward,
  X,
  Sparkles,
  RotateCcw,
  Maximize2,
  Minimize2,
  GripHorizontal,
  Check,
  MousePointerClick,
  Clock,
  Layers
} from 'lucide-react';
import { ExtensionSettings } from '../types';

interface NarrationHudProps {
  isPlaying: boolean;
  isPaused?: boolean;
  narratedText?: string;
  sourceType?: 'selection' | 'vision' | 'preview';
  speed: number;
  volume: number;
  voiceName?: string;
  progressPercent?: number; // 0 a 100
  currentTime?: number;
  duration?: number;
  onTogglePlayPause: () => void;
  onStop: () => void;
  onReplay?: () => void;
  onPlaySelection?: (selectedText: string) => void;
  onChangeSpeed: (newSpeed: number) => void;
  onChangeVolume: (newVolume: number) => void;
  onDismiss: () => void;
}

export const NarrationHud: React.FC<NarrationHudProps> = ({
  isPlaying,
  isPaused = false,
  narratedText = '',
  sourceType = 'selection',
  speed,
  volume,
  voiceName = 'Kore',
  progressPercent = 0,
  currentTime = 0,
  duration = 0,
  onTogglePlayPause,
  onStop,
  onReplay,
  onPlaySelection,
  onChangeSpeed,
  onChangeVolume,
  onDismiss,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Posição para arrastar livremente (Drag & Drop)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  const hudRef = useRef<HTMLDivElement>(null);

  // Delay inteligente após término da fala (15 segundos)
  const [isFinished, setIsFinished] = useState(false);
  const [closeCountdown, setCloseCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<any>(null);

  // Monitorar se terminou a fala para iniciar contagem regressiva suave
  useEffect(() => {
    if (isPlaying) {
      setIsFinished(false);
      setCloseCountdown(null);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    } else if (isFinished || (!isPlaying && !isPaused && narratedText && progressPercent >= 98)) {
      setIsFinished(true);
      if (closeCountdown === null) {
        setCloseCountdown(15);
      }
    }
  }, [isPlaying, isPaused, progressPercent, narratedText]);

  // Contagem regressiva do delay de fechamento
  useEffect(() => {
    if (closeCountdown !== null && closeCountdown > 0) {
      countdownTimerRef.current = setInterval(() => {
        setCloseCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownTimerRef.current);
            onDismiss();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      };
    }
  }, [closeCountdown, onDismiss]);

  // Cancelar fechamento automático se o usuário interagir
  const handleKeepOpen = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCloseCountdown(null);
  };

  // Fechar o popup e parar a narração
  const handleCloseClick = () => {
    if (isPlaying || isPaused) {
      onStop();
    }
    onDismiss();
  };

  // Drag & Drop Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Apenas se clicar no cabeçalho ou barra de arrastar
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

  // Detecção de seleção manual de texto dentro da caixa de narração
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedSnippet(selection.toString().trim());
    } else {
      setSelectedSnippet('');
    }
  };

  if (!isPlaying && !isPaused && !isFinished && !narratedText) return null;

  // Lógica de Karaokê Reverso / Progresso do Texto:
  // Inicialmente todo o texto está selecionado (destacado).
  // Conforme o progresso avança (0 a 100%), a parte lida perde a seleção e a restante fica em destaque.
  const words = narratedText.split(/(\s+)/); // Preserva espaços
  const totalWords = words.filter((w) => w.trim().length > 0).length;
  const currentWordIndex = Math.min(
    words.length,
    Math.floor((progressPercent / 100) * words.length)
  );

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];

  // =========================================================================
  // SE ESTIVER MINIMIZADO: MINI-PILL FLUTUANTE DISCRETA COM CONTROLES
  // =========================================================================
  if (isMinimized) {
    return (
      <aside
        id="vocallens-narration-minipill"
        aria-label="Controle Minimizado de Narração"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-cyan-500/50 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 select-none"
        style={{
          backgroundColor: 'rgba(10, 15, 30, 0.72)',
          boxShadow: '0 10px 30px rgba(6, 182, 212, 0.35)',
        }}
      >
        <span className="relative flex h-3 w-3">
          {isPlaying && !isPaused ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          )}
        </span>

        <div className="flex flex-col text-left">
          <span className="text-xs font-bold text-white flex items-center gap-1">
            <span>{isPaused ? 'Pausado' : 'Narrando...'}</span>
            <span className="text-[10px] text-cyan-300 font-mono">({voiceName})</span>
          </span>
          <span className="text-[10px] text-slate-300 font-mono">
            {Math.round(progressPercent)}% concluído
          </span>
        </div>

        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
          <button
            onClick={onTogglePlayPause}
            className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition cursor-pointer"
            title={isPaused ? 'Continuar' : 'Pausar'}
          >
            {isPaused ? <Play className="h-3 w-3 fill-current" /> : <Pause className="h-3 w-3 fill-current" />}
          </button>

          <button
            onClick={onStop}
            className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer"
            title="Parar áudio"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>

          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 transition cursor-pointer"
            title="Expandir janela completa"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // =========================================================================
  // POP-UP COMPLETO DO NARRADOR (70% TRANSLÚCIDO + ARRASTÁVEL + KARAOKÊ REVERSO)
  // =========================================================================
  return (
    <aside
      ref={hudRef}
      id="vocallens-narration-hud"
      aria-label="Console de Narração STT&TTS de Satiro"
      className="fixed z-50 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-cyan-400/50 p-4 shadow-2xl backdrop-blur-xl transition-shadow duration-200 animate-in fade-in slide-in-from-top-4 select-none"
      style={{
        backgroundColor: 'rgba(10, 15, 30, 0.72)', // Fundo 70% translúcido conforme solicitado
        boxShadow: isDragging
          ? '0 25px 50px rgba(6, 182, 212, 0.45)'
          : '0 20px 40px -10px rgba(6, 182, 212, 0.30)',
        top: position ? `${position.y}px` : '1.25rem',
        left: position ? `${position.x}px` : undefined,
        right: position ? undefined : '1.25rem',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Cabeçalho do Pop-up (Área de Arrastar / Drag Handle) */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between border-b border-cyan-500/25 pb-2.5 cursor-grab active:cursor-grabbing group"
        title="Clique e arraste para mover este pop-up"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-4 w-4 text-cyan-400/60 group-hover:text-cyan-300 transition" />
          <div className="relative flex h-3 w-3">
            {isPlaying && !isPaused ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </>
            ) : isPaused ? (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{isPaused ? 'Narração Pausada' : isFinished ? 'Narração Concluída' : 'Narrando com Gemini'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                {voiceName}
              </span>
            </h3>
            <p className="text-[10px] text-slate-300">
              {sourceType === 'vision' ? 'Google Lens (Visão + Voz)' : 'Texto Selecionado (Ctrl+B)'}
            </p>
          </div>
        </div>

        {/* Botões de Controle da Janela (Minimizar / Fechar) */}
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition cursor-pointer"
            title="Minimizar para mini-botão flutuante"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleCloseClick}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/50 transition cursor-pointer"
            title="Fechar e parar narração"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Barra de Progresso Visual de Reprodução */}
      <div className="mt-2.5 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
          <span>{isPaused ? '⏸️ Pausado' : isFinished ? '✓ Concluído' : '🔊 Em Reprodução'}</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-slate-900/90 rounded-full h-1.5 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 h-full rounded-full transition-all duration-150"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CAIXA DE TEXTO COMPLETO COM EFEITO DE SELEÇÃO E DESSELEÇÃO DINÂMICA      */}
      {/* ========================================================================= */}
      <div className="mt-3 space-y-2 no-drag">
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span className="font-semibold flex items-center gap-1 text-cyan-400">
            <MousePointerClick className="h-3 w-3" />
            <span>Texto em Leitura:</span>
          </span>
          <span className="text-[10px] text-slate-400">
            {narratedText.length} caracteres • {totalWords} palavras
          </span>
        </div>

        {/* Caixa de Texto Completo Scrollável */}
        <div
          onMouseUp={handleTextSelection}
          className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-sans leading-relaxed max-h-40 overflow-y-auto select-text scrollbar-thin scrollbar-thumb-slate-700"
          style={{
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Efeito de Karaokê Reverso / Desseleção Progressiva:
              - A parte já falada (wordIndex < currentWordIndex) é exibida em texto lido suave.
              - A parte que AINDA FALTA ser falada permanece selecionada / destacada com fundo azul translúcido. */}
          {words.map((word, idx) => {
            const isRead = idx < currentWordIndex;
            const isCurrent = idx >= currentWordIndex && idx < currentWordIndex + 2;
            return (
              <span
                key={idx}
                className={`transition-colors duration-150 ${
                  isRead
                    ? 'text-slate-400 font-normal'
                    : isCurrent
                    ? 'bg-cyan-500/40 text-cyan-100 font-bold px-0.5 rounded shadow-sm'
                    : 'bg-blue-600/25 text-slate-100 font-medium px-0.5 rounded'
                }`}
              >
                {word}
              </span>
            );
          })}
        </div>

        {/* Botão de Ação para Trecho Selecionado Manualmente */}
        {selectedSnippet && onPlaySelection && (
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="text-[11px] text-cyan-200 truncate flex-1 font-mono">
              Trecho: "{selectedSnippet.slice(0, 30)}..."
            </div>
            <button
              onClick={() => onPlaySelection(selectedSnippet)}
              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Ouvir Seleção</span>
            </button>
          </div>
        )}
      </div>

      {/* Controles Principais de Áudio: Play/Pause, Parar, Repetir */}
      <div className="mt-3 grid grid-cols-2 gap-2 no-drag">
        <button
          id="narration-play-pause-btn"
          onClick={onTogglePlayPause}
          className={`py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
            isPaused
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              : isFinished
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30'
          }`}
        >
          {isPaused ? (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Continuar</span>
            </>
          ) : isFinished ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Ouvir Novamente</span>
            </>
          ) : (
            <>
              <Pause className="h-3.5 w-3.5 fill-current" />
              <span>Pausar</span>
            </>
          )}
        </button>

        {isFinished ? (
          <button
            onClick={onDismiss}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            <span>Fechar Agora</span>
          </button>
        ) : (
          <button
            id="narration-stop-btn"
            onClick={onStop}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/60 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            <span>Parar Narração</span>
          </button>
        )}
      </div>

      {/* Controles de Velocidade & Volume */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2.5 no-drag">
        {/* Velocidade de Fala */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1 font-medium">
            <span className="flex items-center gap-1">
              <FastForward className="h-3 w-3 text-cyan-400" />
              <span>Velocidade de Fala:</span>
            </span>
            <span className="font-bold text-cyan-300 font-mono">{speed}x</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  Math.abs(speed - s) < 0.05
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Volume */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1 font-medium">
            <span className="flex items-center gap-1">
              {volume > 0 ? (
                <Volume2 className="h-3 w-3 text-cyan-400" />
              ) : (
                <VolumeX className="h-3 w-3 text-slate-500" />
              )}
              <span>Volume da Narração:</span>
            </span>
            <span className="font-bold text-slate-200 font-mono">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>

      {/* Banner de Delay de Fechamento com Temporizador e Botão de Manter Aberto */}
      {isFinished && closeCountdown !== null && (
        <div className="mt-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center justify-between gap-2 text-[11px] text-slate-300 animate-in fade-in duration-200 no-drag">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span>Fechando em <strong>{closeCountdown}s</strong>...</span>
          </div>
          <button
            onClick={handleKeepOpen}
            className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-[10px] border border-slate-700 cursor-pointer"
          >
            Manter Aberto
          </button>
        </div>
      )}
    </aside>
  );
};
