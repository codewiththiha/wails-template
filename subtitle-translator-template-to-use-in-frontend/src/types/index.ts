/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Represents a single parsed block from an SRT file.
 * Matches the deterministic layout requested in technical specs.
 */
export interface SRTBlock {
  index: number;      // Sequence number of the subtitle
  timestamp: string;  // e.g., "00:00:20,000 --> 00:00:23,071"
  text: string[];     // Original lines of text
}

/**
 * Tracks the translation progress, error state, and translated text for each SRTBlock.
 */
export interface TranslationState {
  index: number;
  translatedText: string[];
  status: 'pending' | 'translating' | 'completed' | 'failed';
  error?: string;
  workerId?: number;  // The ID of the simulated worker handling this block
}

/**
 * Active processing chunk metrics used for parallel worker distribution.
 */
export interface TranslationBatch {
  batchId: number;
  startIndex: number;
  endIndex: number;
  blockIndices: number[]; // Explicit block index tracking
  status: 'pending' | 'processing' | 'completed' | 'failed';
  workerId?: number;
}

/**
 * Configuration schema for the translation process.
 */
export interface ProjectConfig {
  sourceLanguage: string;
  targetLanguage: string;
  linesPerWorker: number; // Block count per batch
  maxConcurrency: number; // Concurrency limit
  temperature: number;    // Creative control for LLM, defaults to 0.3
  systemInstruction?: string; // Custom instruction overrides
}

/**
 * Visual details for our simulated worker pool monitor inside the terminal dashboard.
 */
export interface WorkerMonitor {
  id: number;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  currentBatchId: number | null;
  processingCount: number;
  label: string;
}

/**
 * Standard logs to print in the virtual terminal output of our desktop application template.
 */
export interface AppLog {
  id: string;
  timestamp: string; // ISO or local time representation
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
