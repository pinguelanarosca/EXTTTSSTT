import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Download,
  Terminal,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  FolderGit2,
  Copy,
  Check,
  Package,
  Layers,
  Sparkles,
  Upload,
  Key,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  Info,
  Laptop,
  Command,
  Zap,
  CheckCheck
} from 'lucide-react';
import { GitStatusData, GitUpdateResult } from '../types';
import { downloadExtensionZipFile } from '../utils/zipGenerator';
import { ExtensionSettings } from '../types';

interface GithubUpdaterProps {
  settings: ExtensionSettings;
}

export const GithubUpdater: React.FC<GithubUpdaterProps> = ({ settings }) => {
  const [repoUrl, setRepoUrl] = useState('https://github.com/pinguelanarosca/SatiroSTT-TTS');
  const [branch, setBranch] = useState('main');
  const [force, setForce] = useState(false);
  const [osTab, setOsTab] = useState<'windows' | 'linux'>('linux');

  // Estados para Envio / Push de Commit
  const [pushCommitMessage, setPushCommitMessage] = useState('Atualização STT & TTS Satiro');
  const [githubToken, setGithubToken] = useState('');
  const [pushForce, setPushForce] = useState(false);
  const [pushing, setPushing] = useState(false);

  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusData, setStatusData] = useState<GitStatusData | null>(null);

  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<GitUpdateResult | null>(null);

  const [restartingChrome, setRestartingChrome] = useState(false);
  const [restartMessage, setRestartMessage] = useState<string | null>(null);

  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '[$] Central de Atualização Rápida e Automação inicializada.',
    '[$] Pronto para sincronizar repositório local, clonar pasta única para múltiplas contas e executar scripts.',
  ]);

  const [copiedClone, setCopiedClone] = useState(false);
  const [copiedPull, setCopiedPull] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  };

  const linuxCloneCmd = `git clone ${repoUrl}.git ~/STT-TTS-Satiro`;
  const windowsCloneCmd = `git clone ${repoUrl}.git C:\\STT-TTS-Satiro`;

  const linuxPullCmd = `cd ~/STT-TTS-Satiro && git pull origin ${branch}`;
  const windowsPullCmd = `cd C:\\STT-TTS-Satiro ; git pull origin ${branch}`;

  const linuxScriptContent = `#!/bin/bash
cd ~/STT-TTS-Satiro && git pull origin ${branch}
echo "=========================================="
echo "  ✓ Extensão STT&TTS de Satiro Atualizada!"
echo "=========================================="`;

  const windowsScriptContent = `@echo off
cd C:\\STT-TTS-Satiro
git pull origin ${branch}
echo.
echo ==========================================
echo   Extensao STT e TTS Satiro Atualizada!
echo ==========================================
pause`;

  const handleCopyText = (text: string, setCopiedState: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2500);
  };

  // 1. Verificar Status do Git
  const handleCheckStatus = async () => {
    try {
      setLoadingStatus(true);
      addLog('Verificando status do Git e repositório local...');
      const res = await fetch('/api/git/status');
      const data: GitStatusData = await res.json();
      setStatusData(data);

      if (data.remoteUrl && !data.remoteUrl.includes('example')) {
        setRepoUrl(data.remoteUrl);
      }
      if (data.branch) {
        setBranch(data.branch);
      }

      addLog(`Status obtido: ${data.isGitRepo ? 'Repositório Git ativo' : 'Pasta não inicializada como Git'}`);
      addLog(`Branch: ${data.branch} | Commit: ${data.currentCommit} | Modificados: ${data.modifiedFiles.length}`);
      if (data.hasUpdates) {
        addLog(`⚡ Atualização detectada no GitHub! Commit remoto: ${data.remoteLatestCommit}`);
      }
    } catch (err: any) {
      addLog(`❌ Erro ao consultar status do Git: ${err.message}`);
    } finally {
      setLoadingStatus(false);
    }
  };

  // 2. Puxar / Atualizar do GitHub via Backend
  const handlePullUpdates = async () => {
    try {
      setUpdating(true);
      setUpdateResult(null);
      addLog(`Iniciando git pull de ${repoUrl} (branch: ${branch})...`);

      const res = await fetch('/api/git/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          branch,
          force,
          runInstall: false,
        }),
      });

      const data: GitUpdateResult = await res.json();
      setUpdateResult(data);

      if (data.success) {
        addLog(`✓ Atualização concluída com sucesso! ${data.message || 'Código sincronizado.'}`);
      } else {
        addLog(`❌ Falha na atualização: ${data.error}`);
      }

      data.steps.forEach((st) => {
        addLog(`[${st.command}] -> ${st.success ? 'OK' : 'FALHA'}: ${st.output.slice(0, 150)}`);
      });

      handleCheckStatus();
    } catch (err: any) {
      addLog(`❌ Erro ao atualizar: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // 3. Enviar / Push de Alterações para o GitHub
  const handlePushUpdates = async () => {
    if (!githubToken.trim()) {
      addLog('⚠️ Insira um Personal Access Token (PAT) do GitHub para autorizar o push.');
      return;
    }

    try {
      setPushing(true);
      addLog(`Enviando alterações para ${repoUrl} (branch: ${branch})...`);

      const res = await fetch('/api/git/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          branch,
          commitMessage: pushCommitMessage || 'Atualização STT & TTS Satiro',
          githubToken: githubToken.trim(),
          force: pushForce,
        }),
      });

      const data = await res.json();
      if (data.success) {
        addLog(`✓ Push efetuado com sucesso no GitHub! Commit: ${data.commitHash}`);
        handleCheckStatus();
      } else {
        addLog(`❌ Falha no push: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`❌ Erro ao enviar para o GitHub: ${err.message}`);
    } finally {
      setPushing(false);
    }
  };

  // 4. Reiniciar Google Chrome
  const handleRestartChrome = async () => {
    try {
      setRestartingChrome(true);
      setRestartMessage(null);
      addLog('Solicitando reinicialização do Google Chrome...');

      const res = await fetch('/api/system/restart-chrome', { method: 'POST' });
      const data = await res.json();
      setRestartMessage(data.message || 'Comando enviado ao sistema.');
      addLog(`[Chrome] ${data.message}`);
    } catch (err: any) {
      setRestartMessage(`Erro ao reiniciar Chrome: ${err.message}`);
      addLog(`❌ Erro ao reiniciar Chrome: ${err.message}`);
    } finally {
      setRestartingChrome(false);
    }
  };

  useEffect(() => {
    handleCheckStatus();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header da Aba Atualização */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-500/30 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold uppercase tracking-wider">
            <Zap className="h-3.5 w-3.5" />
            <span>Atualização Ágil para 12 Contas</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Central de Atualização da Extensão
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Elimine a necessidade de baixar e descompactar arquivos `.zip` repetidamente. Use uma única pasta compartilhada no disco e atualize todas as 12 contas do Google instantaneamente com um único comando de terminal.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handleCheckStatus}
            disabled={loadingStatus}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 shadow flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`h-4 w-4 text-blue-400 ${loadingStatus ? 'animate-spin' : ''}`} />
            <span>Verificar Status</span>
          </button>

          <button
            onClick={() => downloadExtensionZipFile(settings)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Baixar ZIP de Backup</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🚀 GUIA DEFINITIVO: 1 PASTA PARA 12 CONTAS VIA TERMINAL */}
      {/* ========================================================= */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Command className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Como Atualizar as 12 Contas com 1 Único Comando
              </h2>
              <p className="text-xs text-slate-400">
                O Chrome apenas cria um atalho para a pasta no disco. Clone uma única vez e todas as contas usam a mesma pasta!
              </p>
            </div>
          </div>

          {/* Alternador de Sistema Operacional */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setOsTab('linux')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                osTab === 'linux' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Linux / macOS / WSL</span>
            </button>
            <button
              onClick={() => setOsTab('windows')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                osTab === 'windows' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Laptop className="h-3.5 w-3.5" />
              <span>Windows</span>
            </button>
          </div>
        </div>

        {/* Passos 1, 2 e 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Passo 1 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/30">
                  1
                </span>
                <h3 className="font-bold text-xs text-slate-100">Clonagem Inicial (1 Única Vez)</h3>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Abra seu terminal e clone o projeto em uma pasta fixa no seu computador:
              </p>
            </div>

            <div className="space-y-2">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2 font-mono text-[11px] text-cyan-300">
                <span className="truncate">{osTab === 'linux' ? linuxCloneCmd : windowsCloneCmd}</span>
                <button
                  onClick={() => handleCopyText(osTab === 'linux' ? linuxCloneCmd : windowsCloneCmd, setCopiedClone)}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0 transition cursor-pointer"
                  title="Copiar comando de clone"
                >
                  {copiedClone ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 italic">
                Em seguida, abra <code className="text-slate-400">chrome://extensions</code> nas 12 contas e aponte para essa mesma pasta clonada.
              </p>
            </div>
          </div>

          {/* Passo 2 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 ring-1 ring-blue-500/30">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                  2
                </span>
                <h3 className="font-bold text-xs text-emerald-400">Comando de 1 Linha para Atualizar</h3>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Sempre que houver novidades, execute este comando no terminal para atualizar a pasta:
              </p>
            </div>

            <div className="space-y-2">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2 font-mono text-[11px] text-emerald-300">
                <span className="truncate">{osTab === 'linux' ? linuxPullCmd : windowsPullCmd}</span>
                <button
                  onClick={() => handleCopyText(osTab === 'linux' ? linuxPullCmd : windowsPullCmd, setCopiedPull)}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0 transition cursor-pointer"
                  title="Copiar comando de pull"
                >
                  {copiedPull ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-emerald-400/80 font-medium">
                Pronto! Todas as 12 contas já receberão os novos arquivos na mesma hora!
              </p>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-6 w-6 rounded-full bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center border border-purple-500/30">
                  3
                </span>
                <h3 className="font-bold text-xs text-slate-100">Atalho / Script com 2 Cliques</h3>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Crie um arquivo <code className="text-purple-300">{osTab === 'linux' ? 'atualizar.sh' : 'atualizar.bat'}</code> para atualizar sem precisar digitar:
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleCopyText(osTab === 'linux' ? linuxScriptContent : windowsScriptContent, setCopiedScript)}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedScript ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Código do Script Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-purple-400" />
                    <span>Copiar Script {osTab === 'linux' ? '.sh' : '.bat'}</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-500 italic">
                Basta dar 2 cliques no script sempre que quiser sincronizar com o GitHub.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* PAINEL DE CONTROLE GIT & SINCRONIZAÇÃO EM TEMPO REAL */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna da Esquerda: Ações Git */}
        <div className="lg:col-span-6 space-y-5">
          {/* Card de Configuração do Repositório */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FolderGit2 className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-100">Repositório &amp; Branch</h3>
              </div>
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
                {statusData?.branch || 'main'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">URL do Repositório GitHub:</label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-slate-200 font-mono text-xs focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Branch:</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-slate-200 font-mono text-xs focus:outline-none transition"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handlePullUpdates}
                    disabled={updating}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${updating ? 'animate-spin' : ''}`} />
                    <span>{updating ? 'Baixando...' : 'Puxar (Git Pull)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card de Envio / Push de Alterações */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-100">Enviar Alterações (Git Push)</h3>
              </div>
              <span className="text-[10px] text-slate-400">Workspace &rarr; GitHub</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Mensagem do Commit:</label>
                <input
                  type="text"
                  value={pushCommitMessage}
                  onChange={(e) => setPushCommitMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2 text-slate-200 text-xs focus:outline-none transition"
                  placeholder="Ex: Atualização dos agentes e vozes Gemini"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">GitHub Personal Access Token (PAT):</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2 text-slate-200 font-mono text-xs focus:outline-none transition"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>

              <button
                onClick={handlePushUpdates}
                disabled={pushing || !githubToken.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Upload className={`h-4 w-4 ${pushing ? 'animate-bounce' : ''}`} />
                <span>{pushing ? 'Enviando Commits...' : 'Enviar para o Repositório (Push)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Coluna da Direita: Terminal de Logs em Tempo Real */}
        <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200 font-mono">Terminal de Logs de Atualização</span>
            </div>
            <button
              onClick={() => setTerminalLogs(['[$] Terminal limpo. Pronto para novos comandos.'])}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-mono transition cursor-pointer"
            >
              Limpar
            </button>
          </div>

          {/* Janela de Terminal com Scroll */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 font-mono text-[11px] text-slate-300 h-72 overflow-y-auto space-y-1.5 leading-relaxed">
            {terminalLogs.map((line, idx) => {
              const isOk = line.includes('✓') || line.includes('Sucesso');
              const isErr = line.includes('❌') || line.includes('Erro') || line.includes('FALHA');
              const isCmd = line.startsWith('[$]');
              return (
                <div
                  key={idx}
                  className={`break-all ${
                    isOk ? 'text-emerald-400' : isErr ? 'text-rose-400' : isCmd ? 'text-cyan-400' : 'text-slate-300'
                  }`}
                >
                  {line}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 text-xs pt-1">
            <button
              onClick={handleRestartChrome}
              disabled={restartingChrome}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`h-3.5 w-3.5 ${restartingChrome ? 'animate-spin' : ''}`} />
              <span>Reiniciar Processos Chrome</span>
            </button>

            {restartMessage && (
              <span className="text-[11px] text-cyan-400 font-mono truncate">{restartMessage}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
