import React, { useState } from 'react';
import { 
  Bot, 
  Key, 
  Cpu, 
  Sparkles, 
  Mic, 
  Volume2, 
  Eye, 
  Radio, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw, 
  Play, 
  Loader2, 
  Layers,
  Wand2
} from 'lucide-react';
import { ExtensionSettings, ModalityType, ModalityAgent } from '../types';
import { DEFAULT_MODALITY_AGENTS, AVAILABLE_MODELS } from '../data/modalityAgents';

interface AgentsModelsApiTabProps {
  settings: ExtensionSettings;
  onUpdateSettings: (newSettings: Partial<ExtensionSettings>) => void;
}

export const AgentsModelsApiTab: React.FC<AgentsModelsApiTabProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [activeModality, setActiveModality] = useState<ModalityType>('locution');
  const [validatingKey, setValidatingKey] = useState(false);
  const [keyValidationStatus, setKeyValidationStatus] = useState<{
    tested: boolean;
    valid?: boolean;
    message?: string;
  }>({ tested: false });

  const [testingSample, setTestingSample] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Validação da Chave API
  const handleValidateKey = async () => {
    setValidatingKey(true);
    setKeyValidationStatus({ tested: false });
    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: settings.apiKey || '' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setKeyValidationStatus({
          tested: true,
          valid: true,
          message: data.message || 'Chave API Gemini verificada e pronta para uso!',
        });
      } else {
        setKeyValidationStatus({
          tested: true,
          valid: false,
          message: data.error || 'A chave informada não é válida ou não possui cota.',
        });
      }
    } catch (err: any) {
      setKeyValidationStatus({
        tested: true,
        valid: false,
        message: 'Erro ao conectar com o serviço de validação.',
      });
    } finally {
      setValidatingKey(false);
    }
  };

  // Agentes por modalidade
  const agentsForActiveModality = DEFAULT_MODALITY_AGENTS.filter(
    (a) => a.modality === activeModality
  );

  // Selecionar Agente e preencher modelo e instrução automaticamente
  const handleSelectAgent = (agent: ModalityAgent) => {
    if (agent.modality === 'locution') {
      onUpdateSettings({
        locutionAgentId: agent.id,
        locutionModel: agent.model,
        locutionInstruction: agent.systemInstruction,
        ...(agent.voiceName ? { ttsVoice: agent.voiceName } : {}),
      });
    } else if (agent.modality === 'narration') {
      onUpdateSettings({
        narrationAgentId: agent.id,
        narrationModel: agent.model,
        narratorInstruction: agent.systemInstruction,
        ...(agent.voiceName ? { ttsVoice: agent.voiceName } : {}),
      });
    } else if (agent.modality === 'transcription') {
      onUpdateSettings({
        transcriptionAgentId: agent.id,
        transcriptionModel: agent.model,
        transcriberInstruction: agent.systemInstruction,
      });
    } else if (agent.modality === 'vision') {
      onUpdateSettings({
        visionAgentId: agent.id,
        visionModel: agent.model,
        visionInstruction: agent.systemInstruction,
      });
    }
  };

  // Teste interativo da modalidade ativa
  const handleTestModality = async () => {
    setTestingSample(true);
    setTestResult(null);
    try {
      if (activeModality === 'locution' || activeModality === 'narration') {
        const textToSpeak =
          activeModality === 'locution'
            ? 'Atenção ouvintes: Este é um teste de locução dinâmica com a voz configurada.'
            : 'Capítulo um: A narração flui com cadência natural, respeitando cada pontuação do texto.';

        const inst =
          activeModality === 'locution'
            ? settings.locutionInstruction || settings.narratorInstruction
            : settings.narratorInstruction;

        const res = await fetch('/api/synthesize-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            voiceName: settings.ttsVoice || 'Kore',
            instruction: inst,
          }),
        });
        const data = await res.json();
        if (data.audioData) {
          const audio = new Audio('data:audio/wav;base64,' + data.audioData);
          audio.playbackRate = settings.ttsSpeed || 1.0;
          await audio.play();
          setTestResult('Áudio sintetizado e reproduzido com sucesso via Gemini!');
        } else {
          setTestResult('Síntese finalizada.');
        }
      } else if (activeModality === 'transcription') {
        setTestResult('Agente de transcrição configurado. Use o microfone no laboratório ou no popup para gravar.');
      } else if (activeModality === 'vision') {
        setTestResult('Agente de recorte e OCR pronto. Utilize o atalho de captura ou o botão no navegador.');
      }
    } catch (err: any) {
      setTestResult('Erro no teste: ' + (err.message || 'Falha de comunicação.'));
    } finally {
      setTestingSample(false);
    }
  };

  // Obter valores atuais da modalidade selecionada
  const getCurrentModalityConfig = () => {
    switch (activeModality) {
      case 'locution':
        return {
          title: 'Modalidade 1: Locução (Voz / Anúncios / Foco)',
          description: 'Configuração de tom vocal, spots, anúncios e leitura de alta energia ou impacto.',
          agentId: settings.locutionAgentId || 'agent-loc-radio',
          model: settings.locutionModel || 'gemini-2.5-flash',
          instruction: settings.locutionInstruction || 'Você é um locutor profissional. Pronuncie com impostação vocal firme e dicção clara.',
          setInstruction: (val: string) => onUpdateSettings({ locutionInstruction: val }),
          setModel: (m: string) => onUpdateSettings({ locutionModel: m }),
          icon: Radio,
          iconColor: 'text-amber-400',
        };
      case 'narration':
        return {
          title: 'Modalidade 2: Narração (Leitura Contínua / Artigos / Livros)',
          description: 'Leitura cadenciada e expressiva para longos artigos da web, PDFs e audiolivros.',
          agentId: settings.narrationAgentId || 'agent-narr-audiobook',
          model: settings.narrationModel || 'gemini-2.5-pro',
          instruction: settings.narratorInstruction || 'Você é um narrador natural e expressivo. Leia com ritmo equilibrado.',
          setInstruction: (val: string) => onUpdateSettings({ narratorInstruction: val }),
          setModel: (m: string) => onUpdateSettings({ narrationModel: m }),
          icon: Volume2,
          iconColor: 'text-blue-400',
        };
      case 'transcription':
        return {
          title: 'Modalidade 3: Transcrição (STT de Voz / Microfone e Mídia)',
          description: 'Conversão em tempo real de fala para texto, estenografia e revisão de ditados.',
          agentId: settings.transcriptionAgentId || 'agent-stt-verbatim',
          model: settings.transcriptionModel || 'gemini-2.5-flash',
          instruction: settings.transcriberInstruction || 'Transcreva com precisão e pontuação correta.',
          setInstruction: (val: string) => onUpdateSettings({ transcriberInstruction: val }),
          setModel: (m: string) => onUpdateSettings({ transcriptionModel: m }),
          icon: Mic,
          iconColor: 'text-emerald-400',
        };
      case 'vision':
        return {
          title: 'Modalidade 4: Capturas de Tela (OCR & Transcrição Visual)',
          description: 'Análise multimodal de imagens recortadas, extração de texto, tabelas e código de tela.',
          agentId: settings.visionAgentId || 'agent-vis-ocr',
          model: settings.visionModel || 'gemini-2.5-flash',
          instruction: settings.visionInstruction || 'Analise a imagem da tela e extraia o texto com máxima precisão.',
          setInstruction: (val: string) => onUpdateSettings({ visionInstruction: val }),
          setModel: (m: string) => onUpdateSettings({ visionModel: m }),
          icon: Eye,
          iconColor: 'text-purple-400',
        };
    }
  };

  const currentModality = getCurrentModalityConfig();
  const ModalityIcon = currentModality.icon;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. SEÇÃO CENTRALIZADA: CHAVE API GEMINI */}
      <section className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
              <Key className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Chave de API Google Gemini</h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="h-3 w-3" />
                  Segura
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Utilizada por todos os agentes de Locução, Narração, Transcrição (STT) e Visão Computacional (OCR).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleValidateKey}
              disabled={validatingKey}
              className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-900/40"
            >
              {validatingKey ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Validando Chave...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Testar Conexão</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Input da Chave */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-8 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Token da Chave API</span>
              <span className="text-[11px] text-slate-500">Chave lida automaticamente do ambiente</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={settings.apiKey || ''}
                onChange={(e) => onUpdateSettings({ apiKey: e.target.value })}
                placeholder="Insira sua chave AIzaSy..."
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none transition"
              />
            </div>
          </div>

          <div className="md:col-span-4 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Origem:</span>
              <span className="text-blue-400 font-mono font-semibold">.env</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Fallback Automático:</span>
              <span className="text-emerald-400 font-semibold">Ativo (3 retentativas)</span>
            </div>
          </div>
        </div>

        {/* Mensagem de Validação */}
        {keyValidationStatus.tested && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in duration-150 ${
              keyValidationStatus.valid
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            {keyValidationStatus.valid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{keyValidationStatus.message}</span>
          </div>
        )}
      </section>

      {/* 2. NAVEGAÇÃO ENTRE AS 4 MODALIDADES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-400" />
              <span>Seleção de Agente &amp; Modelo por Modalidade</span>
            </h3>
            <p className="text-xs text-slate-400">
              Escolha e personalize o comportamento de cada agente para tarefas específicas.
            </p>
          </div>
        </div>

        {/* Seletor de Modalidade em Grid 4 Colunas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            onClick={() => setActiveModality('locution')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-2 cursor-pointer ${
              activeModality === 'locution'
                ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-950/40 text-white ring-1 ring-amber-500/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <Radio className={`h-5 w-5 ${activeModality === 'locution' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300">
                Modalidade 1
              </span>
            </div>
            <div>
              <span className="text-xs font-bold block text-slate-100">Locução</span>
              <span className="text-[11px] text-slate-400 block line-clamp-1">Spots, anúncios e impacto</span>
            </div>
          </button>

          <button
            onClick={() => setActiveModality('narration')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-2 cursor-pointer ${
              activeModality === 'narration'
                ? 'bg-blue-950/30 border-blue-500/60 shadow-lg shadow-blue-950/40 text-white ring-1 ring-blue-500/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <Volume2 className={`h-5 w-5 ${activeModality === 'narration' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300">
                Modalidade 2
              </span>
            </div>
            <div>
              <span className="text-xs font-bold block text-slate-100">Narração</span>
              <span className="text-[11px] text-slate-400 block line-clamp-1">Leitura contínua e audiolivros</span>
            </div>
          </button>

          <button
            onClick={() => setActiveModality('transcription')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-2 cursor-pointer ${
              activeModality === 'transcription'
                ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/40 text-white ring-1 ring-emerald-500/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <Mic className={`h-5 w-5 ${activeModality === 'transcription' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300">
                Modalidade 3
              </span>
            </div>
            <div>
              <span className="text-xs font-bold block text-slate-100">Transcrição (STT)</span>
              <span className="text-[11px] text-slate-400 block line-clamp-1">Fala para texto em tempo real</span>
            </div>
          </button>

          <button
            onClick={() => setActiveModality('vision')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-2 cursor-pointer ${
              activeModality === 'vision'
                ? 'bg-purple-950/30 border-purple-500/60 shadow-lg shadow-purple-950/40 text-white ring-1 ring-purple-500/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <Eye className={`h-5 w-5 ${activeModality === 'vision' ? 'text-purple-400' : 'text-slate-400'}`} />
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300">
                Modalidade 4
              </span>
            </div>
            <div>
              <span className="text-xs font-bold block text-slate-100">Recortes de Tela</span>
              <span className="text-[11px] text-slate-400 block line-clamp-1">OCR e análise visual de tela</span>
            </div>
          </button>
        </div>

        {/* 3. PAINEL DE CONFIGURAÇÃO DA MODALIDADE ATIVA */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
          {/* Cabeçalho da Modalidade */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-800 rounded-xl">
                <ModalityIcon className={`h-6 w-6 ${currentModality.iconColor}`} />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-white">{currentModality.title}</h4>
                <p className="text-xs text-slate-400">{currentModality.description}</p>
              </div>
            </div>

            <button
              onClick={handleTestModality}
              disabled={testingSample}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {testingSample ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Testando...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-blue-400" />
                  <span>Testar Agente</span>
                </>
              )}
            </button>
          </div>

          {/* Feedback de Teste */}
          {testResult && (
            <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-xl text-xs text-blue-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400 shrink-0" />
              <span>{testResult}</span>
            </div>
          )}

          {/* Escolha do Agente Especialista */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-blue-400" />
              <span>Selecione o Agente Especialista:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {agentsForActiveModality.map((agent) => {
                const isSelected = currentModality.agentId === agent.id;
                return (
                  <div
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-950/30 border-blue-500/70 shadow-lg shadow-blue-950/50 text-white ring-1 ring-blue-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                          {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
                          {agent.name}
                        </span>
                        {agent.badge && (
                          <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                            {agent.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{agent.role}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Modelo: {agent.model}</span>
                      {agent.voiceName && <span>Voz: {agent.voiceName}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seletor de Modelo Gemini & Instrução de Sistema */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Seletor de Modelo */}
            <div className="lg:col-span-5 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-blue-400" />
                <span>Modelo de IA para esta Modalidade:</span>
              </label>

              <div className="space-y-2">
                {AVAILABLE_MODELS.map((mod) => {
                  const isCurrent = currentModality.model === mod.id;
                  return (
                    <div
                      key={mod.id}
                      onClick={() => currentModality.setModel(mod.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'bg-slate-800 border-blue-500/70 text-white'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block">{mod.name}</span>
                        <span className="text-[11px] text-slate-400">{mod.category}</span>
                      </div>
                      {isCurrent ? (
                        <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border border-slate-700" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prompt de Sistema / Instruções */}
            <div className="lg:col-span-7 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wand2 className="h-4 w-4 text-amber-400" />
                  <span>Instruções do Sistema do Agente:</span>
                </span>
                <span className="text-[11px] text-slate-500 font-normal">Editável em tempo real</span>
              </label>

              <textarea
                value={currentModality.instruction}
                onChange={(e) => currentModality.setInstruction(e.target.value)}
                rows={5}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-slate-200 font-sans leading-relaxed resize-y focus:outline-none transition"
                placeholder="Insira as instruções comportamentais para este agente..."
              />
              <p className="text-[11px] text-slate-500">
                Dica: Você pode especificar dicção, pontuação, vocabulário técnico ou regras de formatação.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
