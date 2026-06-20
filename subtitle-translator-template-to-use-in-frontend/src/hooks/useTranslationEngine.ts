/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { SRTBlock, ProjectConfig, WorkerMonitor, AppLog, TranslationState, TranslationBatch } from '../types';
import { GeminiService } from '../services/gemini.service';
import { stringifySRT } from '../utils/srtParser';

// Default project configuration values
const DEFAULT_CONFIG: ProjectConfig = {
  sourceLanguage: 'English',
  targetLanguage: 'Spanish',
  linesPerWorker: 50,
  maxConcurrency: 5,
  temperature: 0.3,
  systemInstruction: 'You are an advanced AV subtitle translation bot. Preserve format, tags, and subtitle numbers.'
};

/**
 * Custom React Hook managing the parallel SRT processing loop, concurrent Worker Queue,
 * and localStorage-backed progress recovery (Delta Progression).
 * 
 * Future Desktop integration design warning: 
 * State management triggers localStorage file buffers here. In full native packaging (e.g., Electron/Tauri), 
 * this would commit state backups to a local appData directory on standard SQLite or JSON schema files
 * via backend serialization commands.
 */
export function useTranslationEngine() {
  // --- 1. State Declarations (With localStorage hydration) ---
  const [config, setConfig] = useState<ProjectConfig>(() => {
    try {
      const saved = localStorage.getItem('sub_translator_config');
      const baseConfig = saved ? JSON.parse(saved) : { ...DEFAULT_CONFIG };
      
      /**
       * Sub-Feature: Load custom saved system instructions from localStorage.
       * If the user previously saved a custom prompt, it replaces the default provided prompt upon reloads.
       */
      const savedCustomPrompt = localStorage.getItem('saved_system_instruction');
      if (savedCustomPrompt !== null) {
        baseConfig.systemInstruction = savedCustomPrompt;
      }
      
      return baseConfig;
    } catch {
      try {
        const savedCustomPrompt = localStorage.getItem('saved_system_instruction');
        if (savedCustomPrompt !== null) {
          return { ...DEFAULT_CONFIG, systemInstruction: savedCustomPrompt };
        }
      } catch {}
      return DEFAULT_CONFIG;
    }
  });

  const [fileName, setFileName] = useState<string>(() => {
    return localStorage.getItem('sub_translator_filename') || '';
  });

  const [originalBlocks, setOriginalBlocks] = useState<SRTBlock[]>(() => {
    try {
      const saved = localStorage.getItem('sub_translator_original_blocks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [translations, setTranslations] = useState<Record<number, string[]>>(() => {
    try {
      const saved = localStorage.getItem('sub_translator_translations');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [statuses, setStatuses] = useState<Record<number, 'pending' | 'translating' | 'completed' | 'failed'>>(() => {
    try {
      const saved = localStorage.getItem('sub_translator_statuses');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [workerMonitors, setWorkerMonitors] = useState<WorkerMonitor[]>([]);
  const [logs, setLogs] = useState<AppLog[]>([]);

  // --- 2. Refs for Thread Safety & Dynamic Loop Tracking ---
  const isTranslatingRef = useRef<boolean>(false);
  const queueRef = useRef<TranslationBatch[]>([]);
  const activeWorkersCountRef = useRef<number>(0);
  const workersRef = useRef<WorkerMonitor[]>([]);
  
  // Keep latest refs of state objects to avoid stale closure references inside asynchronous loops
  const configRef = useRef<ProjectConfig>(config);
  const originalBlocksRef = useRef<SRTBlock[]>(originalBlocks);
  const translationsRef = useRef<Record<number, string[]>>(translations);
  const statusesRef = useRef<Record<number, 'pending' | 'translating' | 'completed' | 'failed'>>(statuses);

  // Synchronize Refs with state
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { originalBlocksRef.current = originalBlocks; }, [originalBlocks]);
  useEffect(() => { translationsRef.current = translations; }, [translations]);
  useEffect(() => { statusesRef.current = statuses; }, [statuses]);

  // Synchronize dynamic state indicators to localStorage
  useEffect(() => {
    localStorage.setItem('sub_translator_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('sub_translator_original_blocks', JSON.stringify(originalBlocks));
    localStorage.setItem('sub_translator_filename', fileName);
  }, [originalBlocks, fileName]);

  useEffect(() => {
    localStorage.setItem('sub_translator_translations', JSON.stringify(translations));
  }, [translations]);

  useEffect(() => {
    localStorage.setItem('sub_translator_statuses', JSON.stringify(statuses));
  }, [statuses]);

  // --- 3. Custom Virtual Terminal Logging Engine ---
  const addLog = useCallback((message: string, level: 'info' | 'success' | 'warning' | 'error') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const logId = Math.random().toString(36).substring(2, 9);
    
    setLogs(prev => [
      { id: logId, timestamp, level, message },
      ...prev.slice(0, 499) // Keep last 500 logs to prevent memory leaks in long translations
    ]);
  }, []);

  // Initialize Worker Pool visual slots
  const initWorkerPool = useCallback((concurrency: number) => {
    const workers: WorkerMonitor[] = [];
    for (let i = 1; i <= concurrency; i++) {
      workers.push({
        id: i,
        status: 'idle',
        currentBatchId: null,
        processingCount: 0,
        label: `Worker Thread #${i}`
      });
    }
    workersRef.current = workers;
    setWorkerMonitors(workers);
  }, []);

  // Update a single worker's state in both UI state and background ref
  const updateWorkerState = useCallback((
    workerId: number,
    update: Partial<WorkerMonitor>
  ) => {
    workersRef.current = workersRef.current.map(w => {
      if (w.id === workerId) {
        return { ...w, ...update };
      }
      return w;
    });
    setWorkerMonitors([...workersRef.current]);
  }, []);

  // --- 4. SRT Input Management ---
  const loadOriginalSRT = useCallback((blocks: SRTBlock[], name: string) => {
    setFileName(name);
    setOriginalBlocks(blocks);
    
    // Reset status mappings for incoming blocks context
    const initialStatuses: Record<number, 'pending' | 'translating' | 'completed' | 'failed'> = {};
    const initialTranslations: Record<number, string[]> = {};
    
    blocks.forEach(b => {
      initialStatuses[b.index] = 'pending';
    });

    setStatuses(initialStatuses);
    setTranslations(initialTranslations);
    setLogs([]);
    addLog(`Loaded subtitle file: "${name}" containing ${blocks.length} parsed subtitle cards. Ready for Translation.`, 'info');
  }, [addLog]);

  // Clear existing session context and reset queue pointers
  const clearSession = useCallback(() => {
    localStorage.removeItem('sub_translator_original_blocks');
    localStorage.removeItem('sub_translator_filename');
    localStorage.removeItem('sub_translator_translations');
    localStorage.removeItem('sub_translator_statuses');
    
    setOriginalBlocks([]);
    setFileName('');
    setTranslations({});
    setStatuses({});
    setIsTranslating(false);
    isTranslatingRef.current = false;
    queueRef.current = [];
    activeWorkersCountRef.current = 0;
    setLogs([]);
    addLog('System storage initialized. Application buffers empty.', 'warning');
  }, [addLog]);

  // --- 5. Parallel Batch Core Loop Logic ---
  const processNextQueueItem = useCallback(async (workerId: number) => {
    // Escape loop if translation flag was flipped off (e.g., Paused) or queue is empty
    if (!isTranslatingRef.current) {
      updateWorkerState(workerId, { status: 'idle', currentBatchId: null });
      return;
    }

    // Locate the first pending batch
    const nextBatchIndex = queueRef.current.findIndex(b => b.status === 'pending');
    if (nextBatchIndex === -1) {
      updateWorkerState(workerId, { status: 'completed', currentBatchId: null });
      return; // Queue depleted for this thread!
    }

    // Lock the batch immediately to prevent race conditions with overlapping threads
    const batch = queueRef.current[nextBatchIndex];
    batch.status = 'processing';
    batch.workerId = workerId;

    updateWorkerState(workerId, {
      status: 'processing',
      currentBatchId: batch.batchId,
      processingCount: workersRef.current[workerId - 1].processingCount + 1
    });

    // Extract the exact block structures corresponding to this chunk
    const targetBlocks = originalBlocksRef.current.filter(b => 
      batch.blockIndices.includes(b.index)
    );

    // Update state to render "translating" indicators in the UI columns
    setStatuses(prev => {
      const next = { ...prev };
      batch.blockIndices.forEach(idx => {
        next[idx] = 'translating';
      });
      return next;
    });

    addLog(`[Thread #${workerId}] Initiating translation for Batch #${batch.batchId} (${targetBlocks.length} lines)`, 'info');

    try {
      // Invoke simulated/mocked Gemini translation service
      const translatedData = await GeminiService.translateBatch(
        targetBlocks,
        configRef.current,
        (msg, lvl) => addLog(`[Thread #${workerId}] ${msg}`, lvl)
      );

      // Verify task didn't get abandoned while waiting for the network call
      if (!isTranslatingRef.current) {
        batch.status = 'pending';
        // Revert block UI states back so they can be parsed in the next run
        setStatuses(prev => {
          const next = { ...prev };
          batch.blockIndices.forEach(idx => {
            if (next[idx] === 'translating') {
              next[idx] = 'pending';
            }
          });
          return next;
        });
        updateWorkerState(workerId, { status: 'idle', currentBatchId: null });
        return;
      }

      // Success paths: commit translations to state dictionary and localStorage
      const translationUpdates: Record<number, string[]> = {};
      translatedData.forEach(item => {
        translationUpdates[item.id] = item.text;
      });

      // Update states
      batch.status = 'completed';
      
      setTranslations(prev => {
        const next = { ...prev, ...translationUpdates };
        return next;
      });

      setStatuses(prev => {
        const next = { ...prev };
        batch.blockIndices.forEach(idx => {
          next[idx] = 'completed';
        });
        return next;
      });

      addLog(`[Thread #${workerId}] Batch #${batch.batchId} translation finalized successfully. Committed to secure store.`, 'success');

    } catch (err: any) {
      // Handle exceptions gracefully
      batch.status = 'failed';
      addLog(`[Thread #${workerId}] Critical failure on Batch #${batch.batchId}: ${err.message || err}`, 'error');

      // Update state mapping
      setStatuses(prev => {
        const next = { ...prev };
        batch.blockIndices.forEach(idx => {
          next[idx] = 'failed';
        });
        return next;
      });

      updateWorkerState(workerId, { status: 'failed' });
    }

    // Recurse to pop next queue block after completed tasks
    if (isTranslatingRef.current) {
      processNextQueueItem(workerId);
    }
  }, [addLog, updateWorkerState]);

  // --- 6. Execution Controllers ---
  const startTranslation = useCallback(async () => {
    if (originalBlocks.length === 0) {
      addLog('No active subtitle file detected in workspace buffers. Import an SRT file under "Project Setup" first.', 'warning');
      return;
    }

    if (isTranslating) return;

    addLog('Starting parallel translation engine...', 'info');
    setIsTranslating(true);
    isTranslatingRef.current = true;

    // Retrieve newest setup variables
    const { linesPerWorker, maxConcurrency } = configRef.current;
    
    // Initialize monitors visualizers
    initWorkerPool(maxConcurrency);

    // Filter pending/missing blocks to process (Delta Progression enforcement)
    const pendingBlocks = originalBlocks.filter(b => {
      const currentStatus = statusesRef.current[b.index];
      return currentStatus !== 'completed';
    });

    if (pendingBlocks.length === 0) {
      addLog('All subtitle blocks in this workspace are already marked as "Completed". Reset project if you wish to translate again.', 'success');
      setIsTranslating(false);
      isTranslatingRef.current = false;
      return;
    }

    const deltaCount = pendingBlocks.length;
    const initialCompleted = originalBlocks.length - deltaCount;

    if (initialCompleted > 0) {
      addLog(`Delta Progression: Located ${initialCompleted} already-translated blocks. Skipping these and processing remaining ${deltaCount} blocks.`, 'success');
    } else {
      addLog(`Queue setup: Subdividing ${deltaCount} pending blocks for batch slicing.`, 'info');
    }

    // Divide delta items into batch segments
    const slicedBatches: TranslationBatch[] = [];
    let currentBatchBlocks: number[] = [];
    let currentBatchId = 1;

    for (let i = 0; i < pendingBlocks.length; i++) {
      currentBatchBlocks.push(pendingBlocks[i].index);

      // Slice if we hit line-per-worker capacity, or reached end of block array
      if (currentBatchBlocks.length === linesPerWorker || i === pendingBlocks.length - 1) {
        slicedBatches.push({
          batchId: currentBatchId++,
          startIndex: currentBatchBlocks[0],
          endIndex: currentBatchBlocks[currentBatchBlocks.length - 1],
          blockIndices: [...currentBatchBlocks],
          status: 'pending'
        });
        currentBatchBlocks = [];
      }
    }

    queueRef.current = slicedBatches;
    addLog(`Constructed ${slicedBatches.length} batch segments (Allocated size: ~${linesPerWorker} blocks per segment).`, 'info');

    // Launch worker execution channels with staggered 500ms rate-limit throttling
    activeWorkersCountRef.current = maxConcurrency;
    for (let threadId = 1; threadId <= maxConcurrency; threadId++) {
      if (!isTranslatingRef.current) break; // In case of instant trigger interruption

      // Throttle starting worker launches to protect downline API rates
      if (threadId > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      addLog(`Launching parallel consumer Thread #${threadId}...`, 'info');
      processNextQueueItem(threadId);
    }

  }, [originalBlocks, isTranslating, initWorkerPool, addLog, processNextQueueItem]);

  const pauseTranslation = useCallback(() => {
    if (!isTranslating) return;

    addLog('Translation Paused by User request. Finishing already-assigned network requests...', 'warning');
    setIsTranslating(false);
    isTranslatingRef.current = false;

    // Refresh remaining idle workers to idle immediately
    workersRef.current.forEach(w => {
      if (w.status === 'idle' || w.status === 'processing') {
        updateWorkerState(w.id, { status: 'idle', currentBatchId: null });
      }
    });

  }, [isTranslating, addLog, updateWorkerState]);

  // Reset block translation statuses to repeat configuration
  const resetTranslation = useCallback(() => {
    pauseTranslation();
    
    const initialStatuses: Record<number, 'pending' | 'translating' | 'completed' | 'failed'> = {};
    const initialTranslations: Record<number, string[]> = {};
    
    originalBlocks.forEach(b => {
      initialStatuses[b.index] = 'pending';
    });

    setStatuses(initialStatuses);
    setTranslations(initialTranslations);
    setLogs([]);
    addLog('State matrix completely reset to Pending. Original parsed chunks preserved.', 'info');
  }, [originalBlocks, pauseTranslation, addLog]);

  // Set individual configurations
  const updateConfig = useCallback((newConfig: Partial<ProjectConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...newConfig
    }));
  }, []);

  // Export SRT Reconstructor interface
  const generateExportSRT = useCallback((): string => {
    return stringifySRT(originalBlocks, translations);
  }, [originalBlocks, translations]);

  // --- 7. Analytics Progress Indicators ---
  const totalBlocks = originalBlocks.length;
  const completedBlocks = Object.values(statuses).filter(s => s === 'completed').length;
  const inProgressBlocks = Object.values(statuses).filter(s => s === 'translating').length;
  const failedBlocks = Object.values(statuses).filter(s => s === 'failed').length;
  const pendingBlocksCount = totalBlocks - completedBlocks - inProgressBlocks - failedBlocks;

  const progressPercent = totalBlocks > 0 
    ? Math.round((completedBlocks / totalBlocks) * 100) 
    : 0;

  // Track if overall task has finished
  useEffect(() => {
    if (isTranslating && totalBlocks > 0 && completedBlocks === totalBlocks) {
      setIsTranslating(false);
      isTranslatingRef.current = false;
      addLog('CONGRATULATIONS: High-parallel translation task successfully completed.', 'success');
      
      // Idle worker visualizers
      workersRef.current.forEach(w => {
        updateWorkerState(w.id, { status: 'completed', currentBatchId: null });
      });
    }
  }, [isTranslating, completedBlocks, totalBlocks, addLog, updateWorkerState]);

  return {
    config,
    fileName,
    originalBlocks,
    translations,
    statuses,
    isTranslating,
    workerMonitors,
    logs,
    progressPercent,
    analytics: {
      total: totalBlocks,
      completed: completedBlocks,
      translating: inProgressBlocks,
      failed: failedBlocks,
      pending: pendingBlocksCount
    },
    loadOriginalSRT,
    clearSession,
    startTranslation,
    pauseTranslation,
    resetTranslation,
    updateConfig,
    generateExportSRT,
    addCustomLog: addLog
  };
}
