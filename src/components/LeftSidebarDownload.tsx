import React, { useState } from 'react';
import { Download, CheckCircle2, Loader2, FolderArchive, ArrowRight } from 'lucide-react';
import { downloadExtensionZipFile, DEFAULT_EXTENSION_ZIP_NAME } from '../utils/zipGenerator';
import { ExtensionSettings } from '../types';

interface LeftSidebarDownloadProps {
  settings: ExtensionSettings;
  onNavigateToExtensionTab?: () => void;
}

export const LeftSidebarDownload: React.FC<LeftSidebarDownloadProps> = ({
  settings,
  onNavigateToExtensionTab,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleDownload = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setDownloading(true);
      await downloadExtensionZipFile(settings);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Erro ao baixar extensão:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <aside
      aria-label="Painel Lateral Esquerdo de Download da Extensão"
      className="fixed left-4 bottom-6 sm:bottom-8 z-50 flex flex-col items-start gap-2 select-none"
    >
      {/* Botão Flutuante Principal na Lateral Esquerda */}
      <div
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className="flex items-center gap-2 group flex-row-reverse sm:flex-row"
      >
        {/* Botão de Ação Direta */}
        <button
          id="btn-download-lateral-esquerda"
          onClick={handleDownload}
          disabled={downloading}
          className={`px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl font-bold text-xs sm:text-sm text-white shadow-2xl flex items-center gap-2.5 transition-all duration-200 cursor-pointer disabled:opacity-60 transform active:scale-95 ${
            downloadSuccess
              ? 'bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 shadow-emerald-900/50'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/50 shadow-blue-900/60 hover:shadow-blue-500/40 hover:-translate-y-0.5'
          }`}
          title="Baixar Pacote .ZIP da Extensão para Google Chrome"
        >
          {downloading ? (
            <>
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-blue-200" />
              <span className="font-semibold">Gerando ZIP...</span>
            </>
          ) : downloadSuccess ? (
            <>
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-white animate-bounce" />
              <span className="font-bold">Baixado com Sucesso!</span>
            </>
          ) : (
            <>
              <div className="p-1 rounded-lg bg-white/15">
                <Download className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex flex-col text-left">
                <span className="leading-tight font-bold tracking-tight">Baixar Extensão</span>
                <span className="text-[10px] text-blue-200 font-medium">Pacote (.ZIP)</span>
              </div>
            </>
          )}
        </button>

        {/* Card Expansível com Informações ao Passar o Mouse */}
        {expanded && (
          <div className="bg-slate-900/95 border border-blue-500/30 backdrop-blur-md rounded-xl p-3 shadow-2xl shadow-blue-950/80 text-xs text-slate-200 animate-in fade-in slide-in-from-left-2 duration-150 flex flex-col gap-1.5 max-w-xs">
            <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
              <FolderArchive className="h-4 w-4" />
              <span>STT&amp;TTS de Satiro (ZIP)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Pacote com <code className="text-blue-300">manifest.json</code>, ícones, HUD e scripts prontos para instalar no Chrome.
            </p>
            {onNavigateToExtensionTab && (
              <button
                onClick={onNavigateToExtensionTab}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 pt-1 cursor-pointer"
              >
                <span>Ver arquivos e instruções</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
