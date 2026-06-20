/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ProjectConfig } from '../../types';
import { Slider } from '../ui/Slider';
import { Globe, Settings, Cpu, FileText, Maximize2, Minimize2, Save } from 'lucide-react';

interface TranslationConfigProps {
  config: ProjectConfig;
  onUpdateConfig: (config: Partial<ProjectConfig>) => void;
  disabled?: boolean;
}

// Support a rich list of standard languages for fast mapping
const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Italian',
  'Portuguese',
  'Dutch',
  'Korean',
  'Chinese'
];

/**
 * Technical Project Configuration panel.
 * Designed with dual column metadata parameters aligning with grid standards.
 */
export const TranslationConfig: React.FC<TranslationConfigProps> = ({
  config,
  onUpdateConfig,
  disabled = false
}) => {
  // isExpanded controls the height (rows count) of the system instructions textarea.
  // When active, the rows count scales up to allow focused editing.
  const [isExpanded, setIsExpanded] = useState(false);
  
  // isSaved handles the temporary visual feedback state of the Save button.
  // Provides feedback upon committing system-level instruction changes to storage.
  const [isSaved, setIsSaved] = useState(false);

  /**
   * Action trigger to commit the customized system prompt guidelines explicitly
   * to raw localStorage buffers.
   * On subsequent application loads/refresh cycles, the custom set of instructions
   * will load and override factory configurations natively inside the state hydration stream.
   * This respects custom system directives and maintains operational consistency.
   */
  const handleSavePrompt = () => {
    try {
      localStorage.setItem('saved_system_instruction', config.systemInstruction || '');
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      console.error('Failed to preserve system instruction in local storage', e);
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 font-mono text-xs">
      
      {/* Visual Workspace Section Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
        <Globe className="w-4 h-4 text-cyan-400" />
        <h4 className="text-[11px] text-slate-100 font-bold uppercase tracking-widest">
          LANGUAGE CONFIGURATION
        </h4>
      </div>

      {/* Language Selections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Language Column */}
        <div className="flex flex-col gap-1.5 p-3.5 bg-slate-900/40 border border-slate-800/60 rounded-lg">
          <label className="text-slate-400 font-bold text-[10px] tracking-wider uppercase">
            Source Language
          </label>
          <div className="relative mt-1">
            <input
              type="text"
              value={config.sourceLanguage}
              disabled={disabled}
              onChange={(e) => onUpdateConfig({ sourceLanguage: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="e.g. English, Spanish, Japanese..."
            />
          </div>
        </div>

        {/* Target Language Column */}
        <div className="flex flex-col gap-1.5 p-3.5 bg-slate-900/40 border border-slate-800/60 rounded-lg">
          <label className="text-slate-400 font-bold text-[10px] tracking-wider uppercase">
            Target Language
          </label>
          <div className="relative mt-1">
            <input
              type="text"
              value={config.targetLanguage}
              disabled={disabled}
              onChange={(e) => onUpdateConfig({ targetLanguage: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="e.g. Spanish, French, German..."
            />
          </div>
        </div>
      </div>

      {/* Parallel Batch Slicing Metrics Grid */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 mt-2">
        <Cpu className="w-4 h-4 text-cyan-400" />
        <h4 className="text-[11px] text-slate-100 font-bold uppercase tracking-widest">
          ENGINE CONFIGURATION
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Slider 1: linesPerWorker (block frame slicing frequency) */}
        <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
          <Slider
            id="lines-per-worker"
            label="Blocks Per Batch"
            tooltip="subtitle blocks processed per batch"
            min={5}
            max={100}
            step={5}
            value={config.linesPerWorker}
            onChange={(val) => onUpdateConfig({ linesPerWorker: val })}
            suffix=" blocks"
          />
        </div>

        {/* Slider 2: maxConcurrency (active parallel workers) */}
        <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
          <Slider
            id="max-concurrency"
            label="Concurrency Limit"
            tooltip="maximum parallel translator workers"
            min={1}
            max={10}
            step={1}
            value={config.maxConcurrency}
            onChange={(val) => onUpdateConfig({ maxConcurrency: val })}
            suffix=" threads"
          />
        </div>

        {/* Slider 3: Temperature (entropy controls) */}
        <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
          <Slider
            id="temperature-entropy"
            label="Creativity (Temperature)"
            tooltip="creative vocabulary diversity for generation"
            min={0.0}
            max={1.0}
            step={0.1}
            value={config.temperature}
            onChange={(val) => onUpdateConfig({ temperature: val })}
            suffix=""
          />
        </div>
      </div>

      {/* Advanced Prompt Guidelines and Context Overrides */}
      <div className="flex flex-col gap-1.5 mt-2">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 mb-2">
          <FileText className="w-4 h-4 text-fuchsia-400" />
          <h4 className="text-[11px] text-slate-100 font-bold uppercase tracking-widest">
            Gemini System Instructions
          </h4>
        </div>
        
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-lg flex flex-col gap-2">
          {/* Header Action row for the custom prompt control panel */}
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Prompt Guidelines
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white hover:bg-slate-900 transition-all text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1"
              >
                {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                {isExpanded ? 'Minimize' : 'Expand'}
              </button>
              <button
                type="button"
                onClick={handleSavePrompt}
                className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-800 hover:border-cyan-700 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/40 transition-all text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                {isSaved ? 'Saved Default' : 'Save Default'}
              </button>
            </div>
          </div>

          <textarea
            id="system-prompt"
            value={config.systemInstruction || ''}
            disabled={disabled}
            rows={isExpanded ? 14 : 3}
            onChange={(e) => onUpdateConfig({ systemInstruction: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800/80 rounded p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 leading-relaxed disabled:opacity-50 text-[11px] font-mono resize-none focus:border-cyan-400 transition-all"
            placeholder="Introduce additional custom translator rules (e.g. preserve slang, match tone...)"
          />
          <p className="text-[10px] text-slate-500 italic mt-0.5 font-sans">
            * This system prompt guides the translation model (e.g., maintaining specific terminology).
          </p>
        </div>
      </div>

    </div>
  );
};
