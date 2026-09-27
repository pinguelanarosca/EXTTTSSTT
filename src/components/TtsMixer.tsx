import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  CheckCircle2,
  Loader2,
  Play,
  Square,
  Download,
  RotateCcw,
  Sliders,
  MessageSquare,
  Mic,
  Eye,
  Layers,
  Wand2,
  BookmarkCheck,
  Check
} from 'lucide-react';
import { ExtensionSettings } from '../types';
import {
  audioMixer,
  MixerTrackConfig,
  MixerEqConfig,
  AmbienceType,
  audioBufferToWavBlob,
} from '../utils/audioMixerEngine';
import { AudioVisualizerCanvas } from './AudioVisualizerCanvas';

interface TtsMixerProps {
  settings: ExtensionSettings;
  onUpdateSettings: (newSettings: Partial<ExtensionSettings>) => void;
}

export const TtsMixer: React.FC<TtsMixerProps> = ({
  settings,
  onUpdateSettings,
}) => {
  // Master Controls
  const [masterVolume, setMasterVolume] = useState<number>(settings.ttsVolume ?? 1.0);
  const [masterMuted, setMasterMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Pronto para mixar e ouvir');
  const [applySuccess, setApplySuccess] = useState(false);

  // Track State (Active Voice)
  const [activeVoice, setActiveVoice] = useState<string>(settings.ttsVoice || 'Kore');
  const [trackSpeed, setTrackSpeed] = useState<number>(settings.ttsSpeed ?? 1.0);
  const [trackPitch, setTrackPitch] = useState<number>(settings.ttsPitch ?? 0);

  // Equalizer
  const [eq, setEq] = useState<MixerEqConfig>({
    bass: settings.ttsBass ?? 2,
    mid: settings.ttsMid ?? 1,
    treble: settings.ttsTreble ?? 2,
    enabled: true,
  });

  // Ambience
  const [ambienceType, setAmbienceType] = useState<AmbienceType>(
    (settings.ttsAmbience as AmbienceType) || 'none'
  );
  const [ambienceVolume, setAmbienceVolume] = useState<number>(
    settings.ttsAmbienceVolume ?? 0.3
  );

  // Script Preview
  const [sampleScript, setSampleScript] = useState<string>(
    'Bem-vindo ao STT&TTS de Satiro Studio. As instruções personalizadas de voz, narração, transcrição e OCR visual estão ativas e calibradas.'
  );

  const lastRenderedBufferRef = useRef<AudioBuffer | null>(null);

  // Initialize Web Audio Engine
  useEffect(() => {
    audioMixer.init();
    audioMixer.setOnStateChange((playing) => {
      setIsPlaying(playing);
    });

    return () => {
      audioMixer.stopAll();
    };
  }, []);

  useEffect(() => {
    audioMixer.setMasterVolume(masterMuted ? 0 : masterVolume);
  }, [masterVolume, masterMuted]);

  useEffect(() => {
    audioMixer.setEQ(eq.bass, eq.mid, eq.treble, eq.enabled);
  }, [eq]);

  useEffect(() => {
    if (isPlaying && ambienceType !== 'none') {
      audioMixer.startAmbience(ambienceType, ambienceVolume);
    } else {
      audioMixer.stopAmbience();
    }
  }, [isPlaying, ambienceType, ambienceVolume]);

  // Synthesis Handler
  const handlePlayPreview = async () => {
    if (isPlaying) {
      audioMixer.stopAll();
      setIsPlaying(false);
      return;
    }

    try {
      setIsSynthesizing(true);
      setStatusMessage(`Sintetizando voz "${activeVoice}" via Gemini TTS...`);

      const res = await fetch('/api/synthesize-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleScript,
          voiceName: activeVoice,
          instruction: settings.narratorInstruction,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.audioData) {
        throw new Error(data.error || 'Falha ao obter áudio do servidor');
      }

      const buffer = await audioMixer.decodeAudio(data.audioData);
      lastRenderedBufferRef.current = buffer;

      const trackConfig: MixerTrackConfig = {
        volume: 1.0,
        pan: 0,
        speed: trackSpeed,
        pitchSemi: trackPitch,
        mute: false,
        solo: false,
      };

      setStatusMessage('Reproduzindo áudio no Master com Espectro Ativo');
      audioMixer.playVoiceTrack(buffer, trackConfig, 'A', () => {
        setStatusMessage('Reprodução finalizada');
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Erro: ${err.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleStop = () => {
    audioMixer.stopAll();
    setIsPlaying(false);
    setStatusMessage('Reprodução parada');
  };

  const handleDownloadWav = () => {
    const buffer = lastRenderedBufferRef.current;
    if (!buffer) {
      setStatusMessage('Reproduza uma prévia primeiro para carregar o áudio na memória.');
      return;
    }

    try {
      const wavBlob = audioBufferToWavBlob(buffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `satiro-tts-${activeVoice.toLowerCase()}-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage('Áudio WAV exportado com sucesso!');
    } catch (err: any) {
      setStatusMessage(`Erro ao exportar áudio: ${err.message}`);
    }
  };

  const handleApplyToExtension = () => {
    onUpdateSettings({
      ttsVoice: activeVoice,
      ttsSpeed: trackSpeed,
      ttsPitch: trackPitch,
      ttsVolume: masterVolume,
      ttsBass: eq.bass,
      ttsMid: eq.mid,
      ttsTreble: eq.treble,
      ttsAmbience: ambienceType,
      ttsAmbienceVolume: ambienceVolume,
    });
    setApplySuccess(true);
    setStatusMessage('Configurações aplicadas à extensão com sucesso!');
    setTimeout(() => setApplySuccess(false), 3000);
  };

  const standardVoices = [
    { id: 'Kore', name: 'Kore', desc: 'Voz Equilibrada, Clara e Humana', gender: 'Feminino' },
    { id: 'Puck', name: 'Puck', desc: 'Voz Jovem, Dinâmica e Espontânea', gender: 'Masculino' },
    { id: 'Charon', name: 'Charon', desc: 'Voz Grave, Serena e Profunda', gender: 'Masculino' },
    { id: 'Fenrir', name: 'Fenrir', desc: 'Voz Firme, Imponente e Autoritária', gender: 'Masculino' },
    { id: 'Zephyr', name: 'Zephyr', desc: 'Voz Suave, Calma e Relaxante', gender: 'Feminino' },
    { id: 'Aoede', name: 'Aoede', desc: 'Voz Expressiva e Articulada', gender: 'Feminino' },
    { id: 'Calliope', name: 'Calliope', desc: 'Voz Melódica e Cadenciada', gender: 'Feminino' },
    { id: 'Orpheus', name: 'Orpheus', desc: 'Voz Teatral e Narrativa', gender: 'Masculino' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* ========================================================= */}
      {/* 0. MONITOR DE ESPECTRO DE NÍVEL MASTER & CONTROLES MASTER */}
      {/* ========================================================= */}
      <section className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Mixer TTS Completo
                </h1>
                <span className="text-[10px] font-bold tracking-wide bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full uppercase">
                  Monitor Master DSP
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visualização do espectro em tempo real, controle de saída master e equalização.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleApplyToExtension}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/25 transition cursor-pointer"
            >
              {applySuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Configurações Salvas!</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Salvar na Extensão</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadWav}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <Download className="h-4 w-4 text-blue-400" />
              <span>Exportar WAV</span>
            </button>
          </div>
        </div>

        {/* Espectrograma Master Canvas */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-8 bg-slate-950/80 border border-slate-800 rounded-xl p-3 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2 text-[11px] font-mono text-slate-400 px-1">
              <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <span className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
                ANALISADOR DE ESPECTRO MASTER (20Hz - 20kHz)
              </span>
              <span>{statusMessage}</span>
            </div>
            <div className="h-28 w-full rounded-lg overflow-hidden bg-slate-950">
              <AudioVisualizerCanvas isPlaying={isPlaying} />
            </div>
          </div>

          {/* Faders Master & Equalizador */}
          <div className="lg:col-span-4 bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            {/* Master Volume */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Volume2 className="h-4 w-4 text-cyan-400" />
                  <span>Volume Master:</span>
                </span>
                <span className="font-mono text-cyan-300 font-bold">{Math.round(masterVolume * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <button
                  onClick={() => setMasterMuted(!masterMuted)}
                  className={`p-1.5 rounded-lg border text-xs cursor-pointer transition ${
                    masterMuted
                      ? 'bg-rose-950/60 border-rose-500/50 text-rose-400'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                  title={masterMuted ? 'Desmutar Áudio' : 'Mutar Áudio'}
                >
                  {masterMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* EQ Rápido (Graves, Médios, Agudos) */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
              <div className="text-center">
                <span className="text-slate-400 block">Graves</span>
                <span className="font-mono text-cyan-400">{eq.bass > 0 ? `+${eq.bass}` : eq.bass}dB</span>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="1"
                  value={eq.bass}
                  onChange={(e) => setEq({ ...eq, bass: parseInt(e.target.value) })}
                  className="w-full accent-cyan-400 mt-1"
                />
              </div>
              <div className="text-center">
                <span className="text-slate-400 block">Médios</span>
                <span className="font-mono text-cyan-400">{eq.mid > 0 ? `+${eq.mid}` : eq.mid}dB</span>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="1"
                  value={eq.mid}
                  onChange={(e) => setEq({ ...eq, mid: parseInt(e.target.value) })}
                  className="w-full accent-cyan-400 mt-1"
                />
              </div>
              <div className="text-center">
                <span className="text-slate-400 block">Agudos</span>
                <span className="font-mono text-cyan-400">{eq.treble > 0 ? `+${eq.treble}` : eq.treble}dB</span>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="1"
                  value={eq.treble}
                  onChange={(e) => setEq({ ...eq, treble: parseInt(e.target.value) })}
                  className="w-full accent-cyan-400 mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 1. SELEÇÃO DE VOZ NATURAL E ATIVA */}
      {/* ========================================================= */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Volume2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">1. Seleção de Voz Natural e Ativa</h2>
              <p className="text-xs text-slate-400">
                Escolha o timbre neural principal do Gemini TTS e ajuste velocidade e entonação.
              </p>
            </div>
          </div>
          <span className="text-xs text-blue-400 font-semibold bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 self-start sm:self-auto">
            Voz Ativa: {activeVoice}
          </span>
        </div>

        {/* Grid de Vozes Nativas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {standardVoices.map((v) => {
            const isSelected = activeVoice === v.id;
            return (
              <button
                key={v.id}
                onClick={() => {
                  setActiveVoice(v.id);
                  onUpdateSettings({ ttsVoice: v.id });
                }}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500/80 shadow-md shadow-blue-950/60 ring-1 ring-blue-500/50 text-white'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
                    {v.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{v.gender}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{v.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Controles de Velocidade & Pitch da Voz */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Velocidade de Reprodução:</span>
              <span className="font-mono text-blue-400">{trackSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={trackSpeed}
              onChange={(e) => {
                const sp = parseFloat(e.target.value);
                setTrackSpeed(sp);
                onUpdateSettings({ ttsSpeed: sp });
              }}
              className="w-full accent-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Tom &amp; Pitch (Semitons):</span>
              <span className="font-mono text-blue-400">{trackPitch > 0 ? `+${trackPitch}` : trackPitch} st</span>
            </div>
            <input
              type="range"
              min="-6"
              max="6"
              step="1"
              value={trackPitch}
              onChange={(e) => {
                const p = parseInt(e.target.value);
                setTrackPitch(p);
                onUpdateSettings({ ttsPitch: p });
              }}
              className="w-full accent-blue-500"
            />
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. INSTRUÇÕES GERAIS PARA O NARRADOR */}
      {/* ========================================================= */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">2. Instruções Gerais para o Narrador</h2>
              <p className="text-xs text-slate-400">
                Diretrizes de dicção, pausas, tom emocional e cadência para a leitura de textos e artigos.
              </p>
            </div>
          </div>
        </div>

        {/* Presets Rápidos de Narração */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-400 font-semibold self-center mr-1">Presets:</span>
          {[
            { label: 'Humano & Equilibrado', text: 'Você é um narrador natural e expressivo. Leia o texto com dicção impecável, ritmo equilibrado e entonação humana.' },
            { label: 'Audiolivro & Literatura', text: 'Você é um narrador de literatura e audiolivros. Respeite as pausas dramáticas, módulos emocionais sutis e cadência calma.' },
            { label: 'Jornalístico & Notícias', text: 'Adote um tom jornalístico, direto, objetivo e com impostação vocal firme e clara.' },
            { label: 'Didático & Ensino', text: 'Narre com tom didático, pausado e acolhedor, facilitando a compreensão de conceitos complexos.' },
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => onUpdateSettings({ narratorInstruction: preset.text })}
              className="text-xs bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:text-indigo-300 text-slate-300 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Textarea de Instrução */}
        <textarea
          value={settings.narratorInstruction || ''}
          onChange={(e) => onUpdateSettings({ narratorInstruction: e.target.value })}
          rows={3}
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3.5 text-xs text-slate-200 font-sans leading-relaxed focus:outline-none transition"
          placeholder="Insira as instruções gerais do narrador..."
        />
      </section>

      {/* ========================================================= */}
      {/* 3. INSTRUÇÕES PARA O TRANSCRITOR */}
      {/* ========================================================= */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">3. Instruções para o Transcritor</h2>
              <p className="text-xs text-slate-400">
                Regras para conversão de fala em texto, estenografia e eliminação de vícios de linguagem.
              </p>
            </div>
          </div>
        </div>

        {/* Presets Rápidos de Transcrição */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-400 font-semibold self-center mr-1">Presets:</span>
          {[
            { label: 'Estenógrafo Fiel 100%', text: 'Transcreva com fidelidade absoluta o áudio recebido em português do Brasil. Aplique pontuação correta e sem inventar dados.' },
            { label: 'Revisor Limpo', text: 'Transcreva eliminando vícios de linguagem (hums, né, tipo assim). Formate frases de forma coesa e clara.' },
            { label: 'Notas e Tópicos', text: 'Transcreva o conteúdo e organize as ideias principais em tópicos estruturados com bullet points.' },
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => onUpdateSettings({ transcriberInstruction: preset.text })}
              className="text-xs bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:text-emerald-300 text-slate-300 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Textarea de Instrução */}
        <textarea
          value={settings.transcriberInstruction || ''}
          onChange={(e) => onUpdateSettings({ transcriberInstruction: e.target.value })}
          rows={3}
          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3.5 text-xs text-slate-200 font-sans leading-relaxed focus:outline-none transition"
          placeholder="Insira as instruções para transcrição de áudio e microfone..."
        />
      </section>

      {/* ========================================================= */}
      {/* 4. INSTRUÇÕES PARA RECORTE DE TELA */}
      {/* ========================================================= */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">4. Instruções para Recorte de Tela</h2>
              <p className="text-xs text-slate-400">
                Parâmetros para análise visual de recortes de tela, OCR técnico e síntese de infográficos.
              </p>
            </div>
          </div>
        </div>

        {/* Presets Rápidos de Visão / OCR */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-400 font-semibold self-center mr-1">Presets:</span>
          {[
            { label: 'OCR Rigoroso', text: 'Analise detalhadamente a imagem capturada da tela. Se contiver texto, transcreva com máxima precisão e formatação original.' },
            { label: 'Leitura Acessível', text: 'Extraia o texto da imagem para leitura em voz alta. Descreva resumidamente gráficos ou diagramas presentes entre colchetes.' },
            { label: 'Código e Tabelas', text: 'Identifique códigos-fonte ou tabelas na tela e preserve rigorosamente a indentação, colunas e estruturas.' },
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => onUpdateSettings({ visionInstruction: preset.text })}
              className="text-xs bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:text-purple-300 text-slate-300 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Textarea de Instrução */}
        <textarea
          value={settings.visionInstruction || ''}
          onChange={(e) => onUpdateSettings({ visionInstruction: e.target.value })}
          rows={3}
          className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl p-3.5 text-xs text-slate-200 font-sans leading-relaxed focus:outline-none transition"
          placeholder="Insira as instruções para recortes de tela e OCR visual..."
        />
      </section>

      {/* ========================================================= */}
      {/* BARRA DE TESTE E REPRODUÇÃO EM TEMPO REAL */}
      {/* ========================================================= */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-semibold text-slate-300">Texto de Teste para o Studio Master:</label>
          <input
            type="text"
            value={sampleScript}
            onChange={(e) => setSampleScript(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            onClick={isPlaying ? handleStop : handlePlayPreview}
            disabled={isSynthesizing}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg flex items-center gap-2 transition cursor-pointer disabled:opacity-50 ${
              isPlaying
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-900/40'
            }`}
          >
            {isSynthesizing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sintetizando...</span>
              </>
            ) : isPlaying ? (
              <>
                <Square className="h-4 w-4" />
                <span>Parar Áudio</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Ouvir com Espectro Master</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
