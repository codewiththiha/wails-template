/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useTranslationEngine } from './hooks/useTranslationEngine';
import { FileDropZone } from './components/features/FileDropZone';
import { TranslationConfig } from './components/features/TranslationConfig';
import { SubtitlePreview } from './components/features/SubtitlePreview';
import { ProgressBar } from './components/ui/ProgressBar';
import { Badge } from './components/ui/Badge';
import {
  FileText,
  Globe,
  Settings,
  Cpu,
  Terminal,
  Download,
  Copy,
  Check,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  AlertCircle,
  Clock,
  BookOpen
} from 'lucide-react';

export default function App() {
  const {
    config,
    fileName,
    originalBlocks,
    translations,
    statuses,
    isTranslating,
    workerMonitors,
    logs,
    progressPercent,
    analytics,
    loadOriginalSRT,
    clearSession,
    startTranslation,
    pauseTranslation,
    resetTranslation,
    updateConfig,
    generateExportSRT,
    addCustomLog
  } = useTranslationEngine();

  // Active Workspace Navigation Tab
  // Options: 'setup' | 'engine' | 'output'
  const [activeTab, setActiveTab] = useState<'setup' | 'engine' | 'output'>('setup');
  
  // Terminal log filter search string
  const [logSearchQuery, setLogSearchQuery] = useState('');
  
  // Copy confirmation trigger
  const [isCopied, setIsCopied] = useState(false);

  // Auto-redirect to Translation Engine when a file is imported so the user is guided smoothly
  const prevFileNameRef = useState(fileName);
  useEffect(() => {
    if (fileName && prevFileNameRef[0] !== fileName) {
      setActiveTab('engine');
      prevFileNameRef[1](fileName);
    }
  }, [fileName, prevFileNameRef]);

  // Terminal logs filtering
  const filteredLogs = logs.filter(log => {
    if (!logSearchQuery.trim()) return true;
    return log.message.toLowerCase().includes(logSearchQuery.toLowerCase());
  });

  const handleCopyToClipboard = () => {
    try {
      const compiledSRT = generateExportSRT();
      navigator.clipboard.writeText(compiledSRT);
      setIsCopied(true);
      addCustomLog('Compiled SRT exported directly to system clipboard.', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e: any) {
      addCustomLog(`Format Copy Failure: ${e.message || e}`, 'error');
    }
  };

  const handleSaveToDesktop = () => {
    try {
      const compiledSRT = generateExportSRT();
      const decodedLanguage = config.targetLanguage.toLowerCase().substring(0, 3);
      const originalWithoutExtension = fileName.endsWith('.srt') ? fileName.slice(0, -4) : 'subtitle';
      const exportName = `${originalWithoutExtension}_translated_${decodedLanguage}.srt`;

      const blob = new Blob([compiledSRT], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      addCustomLog(`Translated standard SRT file disk buffer written: "${exportName}"`, 'success');
    } catch (e: any) {
      addCustomLog(`Disk Export Exception: ${e.message || e}`, 'error');
    }
  };

  return (
    <div id="app-window-frame" className="w-full h-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden border border-slate-900">
      
      {/* 1. Sleek System Window Header Bar (Desktop Paradigm) */}
      <header id="app-header-bar" className="bg-slate-950 border-b border-slate-900 px-6 py-3.5 flex items-center justify-between shrink-0 font-mono">
        <div className="flex items-center gap-3">
          <div className="relative w-3 h-3 flex items-center justify-center">
            <span className={`${isTranslating ? 'absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-40 animate-ping' : ''}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isTranslating ? 'bg-fuchsia-500' : 'bg-cyan-500'}`} />
          </div>
          <div className="flex items-center gap-2">
            <h1 id="app-title-tag" className="text-xs font-bold text-slate-100 tracking-[0.15em] uppercase">
              Gemini SRT Translator
            </h1>
            <span className="text-[9px] font-bold text-cyan-400/90 border border-cyan-950 bg-cyan-950/20 px-1.5 py-0.5 rounded tracking-widest">
              v1.2.0
            </span>
          </div>
        </div>

        {/* Dynamic Center Channel: Mode Indicators */}
        <div className="hidden md:flex items-center gap-6 text-[10px] uppercase font-bold tracking-wider">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Languages:</span>
            <span className="text-slate-200">{config.sourceLanguage || 'N/A'}</span>
            <span className="text-cyan-400 font-bold">&#8594;</span>
            <span className="text-fuchsia-400">{config.targetLanguage || 'N/A'}</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-2 text-slate-400">
            <span>Concurrency:</span>
            <span className="text-cyan-400">{config.maxConcurrency} Workers</span>
          </div>
        </div>

        {/* Diagnostic Metadata Badges */}
        <div className="flex items-center gap-4 text-[10px] text-slate-400">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/40 px-2.5 py-1 rounded border border-slate-900 font-semibold select-text">
            <Clock className="w-3.5 h-3.5 text-cyan-400/90" />
            <span>UTC: 2026-06-20</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/40 px-2 py-1 rounded border border-slate-900 text-slate-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-100 uppercase text-[9px] tracking-wider">{isTranslating ? 'PROCESSING' : 'STANDBY'}</span>
          </div>
        </div>
      </header>

      {/* 2. Secondary Horizontal Navigation Menu */}
      <nav id="app-horizontal-nav" className="flex border-b border-slate-900 bg-slate-950 shrink-0 font-mono">
        <button
          id="nav-setup-tab"
          onClick={() => setActiveTab('setup')}
          className={`relative px-6 md:px-8 py-3.5 text-xs font-black uppercase tracking-widest transition-all cursor-pointer border-r border-slate-900 ${
            activeTab === 'setup'
              ? 'text-cyan-400 bg-slate-900/60'
              : 'text-slate-400 hover:bg-slate-900/20 hover:text-slate-200'
          }`}
        >
          Project Setup
          {activeTab === 'setup' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400" />
          )}
        </button>
        <button
          id="nav-engine-tab"
          onClick={() => setActiveTab('engine')}
          className={`relative px-6 md:px-8 py-3.5 text-xs font-black uppercase tracking-widest transition-all cursor-pointer border-r border-slate-900 ${
            activeTab === 'engine'
              ? 'text-cyan-400 bg-slate-900/60'
              : 'text-slate-400 hover:bg-slate-900/20 hover:text-slate-200'
          }`}
        >
          Translator
          {activeTab === 'engine' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400" />
          )}
        </button>
        <button
          id="nav-output-tab"
          onClick={() => setActiveTab('output')}
          className={`relative px-6 md:px-8 py-3.5 text-xs font-black uppercase tracking-widest transition-all cursor-pointer border-r border-slate-900 ${
            activeTab === 'output'
              ? 'text-cyan-400 bg-slate-900/60'
              : 'text-slate-400 hover:bg-slate-900/20 hover:text-slate-200'
          }`}
        >
          Logs and Export
          {activeTab === 'output' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400" />
          )}
        </button>
      </nav>

      {/* 3. Primary Wide Content Workspace Panel */}
      <main id="app-workspace-panel" className="flex-1 bg-slate-950 p-6 flex flex-col min-h-0 overflow-y-auto">
        
        {/* ---- Tab 1 Setup Workspace Render ---- */}
        {activeTab === 'setup' && (
          <div id="setup-workspace-container" className="w-full flex flex-col gap-6 max-w-5xl mx-auto">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 tracking-tight">
                <Settings className="w-5 h-5 text-cyan-400" />
                PROJECT TRANSLATION SETUP
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
                Import subtitle files under UTF-8 rules, configure target translation options, and adjust processing parameters.
              </p>
            </div>

            {/* Sub-Feature: Dragger Drop-Zone */}
            <FileDropZone
              fileName={fileName}
              totalBlocks={analytics.total}
              onFileLoaded={loadOriginalSRT}
              onClearSession={clearSession}
              addCustomLog={addCustomLog}
            />

            {/* Sub-Feature: Config Parameters */}
            <TranslationConfig
              config={config}
              onUpdateConfig={updateConfig}
              disabled={isTranslating}
            />


          </div>
        )}

        {/* ---- Tab 2 Concurrency Engine Workspace ---- */}
        {activeTab === 'engine' && (
          <div id="engine-workspace-container" className="flex-1 flex flex-col gap-6 min-h-0">
            
            {/* Dynamic Header details */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 bg-slate-900/30 p-4 rounded-lg border border-slate-900">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-fuchsia-400" />
                  TRANSLATOR STATUS CONSOLE
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-1">
                  Active Subtitle File: <span className="text-slate-100 font-mono font-bold select-all">{fileName || 'None loaded'}</span>
                </p>
              </div>

              {/* Engine Activation Actions */}
              <div className="flex items-center gap-2 font-mono">
                {isTranslating ? (
                  <button
                    onClick={pauseTranslation}
                    className="px-4 py-2 rounded bg-amber-500 text-slate-950 font-black uppercase tracking-wider text-xs flex items-center gap-2 hover:bg-amber-400 transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                  >
                    <Pause className="w-3.5 h-3.5 fill-slate-950" />
                    Pause Translation
                  </button>
                ) : (
                  <button
                    onClick={startTranslation}
                    disabled={analytics.total === 0}
                    className={`px-4 py-2 rounded font-black uppercase tracking-wider text-xs flex items-center gap-2 cursor-pointer transition-all ${
                      analytics.total === 0
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-900'
                        : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    Start Translation
                  </button>
                )}

                <button
                  onClick={resetTranslation}
                  disabled={analytics.total === 0}
                  className={`p-2 rounded border uppercase font-bold text-xs flex items-center justify-center cursor-pointer transition-all ${
                    analytics.total === 0
                      ? 'border-slate-900 text-slate-600 cursor-not-allowed'
                      : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                  title="Reset Grid to Pending States"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress Bar Summary Overlay Grid */}
            {analytics.total > 0 && (
              <div className="bg-slate-900/30 px-5 py-4 rounded-lg border border-slate-900 shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  
                  <div className="col-span-12 md:col-span-7">
                    <ProgressBar
                      value={progressPercent}
                      label="TRANSLATION PROGRESS"
                      sublabel={`${progressPercent}% Completed`}
                      color="cyan"
                    />
                  </div>

                  {/* Numeric analytics boxes */}
                  <div className="col-span-12 md:col-span-5 grid grid-cols-4 gap-2 font-mono text-[10px] uppercase font-bold text-slate-400 text-center">
                    <div className="bg-slate-955/85 p-2 rounded border border-slate-900">
                      <span className="block text-slate-200 text-xs font-black leading-none mb-1">{analytics.total}</span>
                      TOTAL
                    </div>
                    <div className="bg-slate-955/85 p-2 rounded border border-slate-900">
                      <span className="block text-cyan-400 text-xs font-black leading-none mb-1">{analytics.completed}</span>
                      DONE
                    </div>
                    <div className="bg-slate-955/85 p-2 rounded border border-slate-900">
                      <span className="block text-fuchsia-400 text-xs font-black leading-none mb-1">{analytics.translating}</span>
                      ACTIVE
                    </div>
                    <div className="bg-slate-955/85 p-2 rounded border border-slate-900">
                      <span className="block text-rose-450 text-xs font-black leading-none mb-1">{analytics.failed}</span>
                      FAILED
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Dynamic Simulated Worker Threads Bento Panel */}
            {isTranslating && workerMonitors.length > 0 && (
              <div className="shrink-0 bg-slate-950/50 p-4 rounded-lg border border-slate-900">
                <div className="flex items-center gap-1.5 mb-3">
                  <Layers className="w-3.5 h-3.5 text-fuchsia-400" />
                  <h5 className="text-[9px] text-fuchsia-400 font-bold uppercase tracking-widest font-mono">
                    Simulated Parallel Worker Pool ({workerMonitors.length} Active Workers)
                  </h5>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {workerMonitors.map((worker) => {
                    const isActive = worker.status === 'processing';
                    const isComplete = worker.status === 'completed';
                    const isFail = worker.status === 'failed';

                    let statusColor = 'border-slate-900 text-slate-500 bg-slate-900/10';
                    let dotColor = 'bg-slate-700';

                    if (isActive) {
                      statusColor = 'border-fuchsia-500/20 text-fuchsia-400 bg-fuchsia-950/10 animate-pulse';
                      dotColor = 'bg-fuchsia-450 animate-ping';
                    } else if (isComplete) {
                      statusColor = 'border-cyan-500/20 text-cyan-400 bg-cyan-950/5';
                      dotColor = 'bg-cyan-400';
                    } else if (isFail) {
                      statusColor = 'border-rose-500/30 text-rose-400 bg-rose-950/10';
                      dotColor = 'bg-rose-500';
                    }

                    return (
                      <div
                        key={worker.id}
                        className={`p-3 rounded border font-mono text-[10px] leading-relaxed transition-all ${statusColor}`}
                      >
                        <div className="flex items-center justify-between font-bold mb-1.5">
                          <span>THREAD #{worker.id}</span>
                          <span className="flex h-1.5 w-1.5 relative">
                            <span className={`inline-flex rounded-full h-full w-full ${dotColor}`} />
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase leading-none font-semibold flex flex-col gap-1.5">
                          <div>
                            STATUS:{' '}
                            <span className={`font-bold uppercase ${isActive ? 'text-fuchsia-450' : isComplete ? 'text-cyan-405' : 'text-slate-400'}`}>
                              {worker.status}
                            </span>
                          </div>
                          <div>
                            BATCH:{' '}
                            <span className="text-slate-300">
                              {worker.currentBatchId ? `#${worker.currentBatchId}` : 'IDLE'}
                            </span>
                          </div>
                          <div>
                            LOOPS:{' '}
                            <span className="text-slate-300">{worker.processingCount}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Main review grid component */}
            <div className="flex-1 min-h-0">
              {analytics.total > 0 ? (
                <SubtitlePreview
                  blocks={originalBlocks}
                  translations={translations}
                  statuses={statuses}
                  isTranslating={isTranslating}
                />
              ) : (
                <div className="w-full flex-1 min-h-[300px] border border-slate-900 bg-slate-950/40 rounded-lg flex flex-col items-center justify-center p-8 text-center">
                  <BookOpen className="w-12 h-12 text-slate-800 mb-3" />
                  <h5 className="text-slate-404 font-bold text-sm uppercase tracking-wide">Workspace Empty</h5>
                  <p className="text-slate-500 text-xs mt-1.5 max-w-sm font-sans leading-relaxed">
                    You must load subtitles under <b>Project Setup</b> to translate.
                  </p>
                  <button
                    onClick={() => setActiveTab('setup')}
                    className="mt-4 px-4 py-1.5 rounded bg-cyan-950/45 border border-cyan-800/40 text-cyan-400 text-xs font-bold uppercase tracking-wider hover:bg-cyan-900/40 cursor-pointer transition-all"
                  >
                    Route to Setup
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ---- Tab 3 Output & Logs Workspace ---- */}
        {activeTab === 'output' && (
          <div id="output-workspace-container" className="w-full flex-col gap-6 max-w-5xl mx-auto h-full flex">
            
            {/* Grid 2 Columns split: Left is Logs console, Right is SRT text box */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch h-full pb-6">
              
              {/* COLUMN LEFT: CLI TERMINAL LOGS FEED (xl:col-span-5) */}
              <div id="terminal-logs-column" className="xl:col-span-5 flex flex-col gap-3 min-h-[350px]">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-fuchsia-400" />
                    SYSTEM ACTIVITY LOGS
                  </h3>
                  <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                    Live logs showing concurrent translation activities.
                  </p>
                </div>

                {/* Log Filter Inputs */}
                <div className="flex gap-2 font-mono">
                  <input
                    id="cli-log-search"
                    type="text"
                    placeholder="Filter terminal shells..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    className="flex-1 bg-slate-900/50 border border-slate-900 rounded px-2.5 py-1.5 text-[10px] font-mono focus:outline-none focus:border-cyan-500 placeholder-slate-600 animate-pulse-once"
                  />
                  <button
                    onClick={() => setLogSearchQuery('')}
                    className="px-3 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] text-slate-400 font-black uppercase cursor-pointer transition-all"
                  >
                    Clear Filter
                  </button>
                </div>

                {/* Terminal Log screen block */}
                <div className="flex-1 bg-slate-955 border border-slate-900 rounded p-4 font-mono text-[10px] text-slate-300 overflow-y-auto leading-relaxed select-text min-h-[320px]">
                  <div className="text-slate-500 font-bold border-b border-slate-900 pb-1.5 mb-2.5 flex justify-between select-none">
                    <span>CONSOLE_LOG_STREAM // LIMIT: 200</span>
                    <span className="text-emerald-400/90 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      LIVE
                    </span>
                  </div>

                  {filteredLogs.length === 0 ? (
                    <p className="text-slate-600 italic text-center py-16 select-none font-sans">No system logs matches filters.</p>
                  ) : (
                    <div className="flex flex-col gap-2 font-mono">
                      {filteredLogs.map((log) => {
                        const levelColors = {
                          info: 'text-slate-400',
                          success: 'text-cyan-400 font-semibold',
                          warning: 'text-amber-400 font-semibold',
                          error: 'text-rose-400 font-bold'
                        };

                        return (
                          <div key={log.id} className="flex gap-2 leading-relaxed items-start">
                            <span className="text-slate-600 select-none font-semibold">[{log.timestamp}]</span>
                            <span className={`shrink-0 select-none uppercase font-bold text-[9px] px-1.5 bg-slate-900 border border-slate-805 rounded ${levelColors[log.level]}`}>
                              {log.level}
                            </span>
                            <p className="break-all select-all flex-1 text-slate-300">{log.message}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN RIGHT: RECONSTRUCTED OUTPUT EXPORTER (xl:col-span-7) */}
              <div id="srt-exporter-column" className="xl:col-span-7 flex flex-col gap-3 min-h-[350px]">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    ASSEMBLED SRT DIALECT EXPORT
                  </h3>
                  <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                    Assembled timeline blocks sequentially into a standard compliant SRT file.
                  </p>
                </div>

                {/* Save/Export Interactive Header widgets */}
                <div className="flex flex-wrap gap-2.5 font-mono">
                  <button
                    onClick={handleSaveToDesktop}
                    disabled={analytics.total === 0}
                    className={`flex-1 min-w-[140px] px-4 py-2.5 rounded font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      analytics.total === 0
                        ? 'bg-slate-900 border border-slate-850 text-slate-600 cursor-not-allowed'
                        : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    Save SRT File
                  </button>

                  <button
                    onClick={handleCopyToClipboard}
                    disabled={analytics.total === 0}
                    className={`flex-1 min-w-[145px] px-4 py-2.5 rounded font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                      analytics.total === 0
                        ? 'border-slate-900 text-slate-600 cursor-not-allowed'
                        : 'border-slate-800 text-slate-350 hover:text-slate-100 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    {isCopied ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4" />}
                    {isCopied ? 'SRT COPIED!' : 'COPY TO CLIPBOARD'}
                  </button>
                </div>

                {/* Textarea View of active reconstructed script layout */}
                <div className="relative flex-1 flex flex-col min-h-[320px]">
                  <textarea
                    id="raw-srt-assembler"
                    readOnly
                    value={analytics.total > 0 ? generateExportSRT() : ''}
                    placeholder="Load subtitles and run translation pipeline. The compliant reconstructed SRT string will assemble in real-time here..."
                    className="w-full h-full flex-1 bg-slate-955 border border-slate-900 rounded p-4 font-mono text-[10px] text-cyan-300/95 leading-relaxed placeholder-slate-650 focus:outline-none resize-none select-text"
                  />
                  
                  {/* Visual Overlay if no subtitles loaded */}
                  {analytics.total === 0 && (
                    <div className="absolute inset-0 bg-slate-955/95 backdrop-blur-[0.5px] border border-dashed border-slate-900 rounded flex flex-col items-center justify-center p-6 text-center select-none font-mono">
                      <AlertCircle className="w-8 h-8 text-slate-700 mb-2" />
                      <h5 className="text-slate-404 font-bold text-xs uppercase tracking-wider">No Compiled Subtitle Stream</h5>
                      <p className="text-slate-600 text-[10px] mt-1.5 max-w-xs font-sans leading-relaxed">
                        Rebuilt SRT blocks require an active file dataset. Load subtitling data in step 01 to stream results here.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* 4. Elegant Minimalist System Bottom Footer bar */}
      <footer id="app-footer-bar" className="shrink-0 bg-slate-950 text-[10px] px-6 py-3 border-t border-slate-900 flex justify-between select-none font-mono text-slate-500">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Status: <strong className="text-slate-400 font-semibold uppercase">{isTranslating ? 'Translating' : 'Standby'}</strong></span>
          </div>
          <span className="text-slate-600">|</span>
          <span>
            Progress: <strong className="text-slate-400 font-bold uppercase">{analytics.total > 0 ? `${analytics.completed}/${analytics.total} Blocks` : '0 Blocks'}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5">
            Completion: <strong className="text-cyan-400 font-bold">{progressPercent}%</strong>
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Local Cache Synced</span>
        </div>
      </footer>

    </div>
  );
}
