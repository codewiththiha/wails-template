/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { parseSRT } from '../../utils/srtParser';
import { SRTBlock } from '../../types';

interface FileDropZoneProps {
  fileName: string;
  totalBlocks: number;
  onFileLoaded: (blocks: SRTBlock[], fileName: string) => void;
  onClearSession: () => void;
  addCustomLog: (message: string, level: 'info' | 'success' | 'warning' | 'error') => void;
}

/**
 * FileDropZone Component
 * Handles local subtitle uploads via drop grids & interactive file pickers.
 * 
 * ============================================================================
 * FUTURE NATIVE DESKTOP EXPANSION COMMENTARY:
 * ============================================================================
 * Under the local desktop paradigm (e.g., Tauri, Electron):
 * - Raw HTML input elements can trigger sandboxing warning prompts in highly locked environments.
 * - This component can be seamlessly upgraded to trigger a native dialog:
 *   ```ts
 *   import { open } from '@tauri-apps/api/dialog';
 *   import { readTextFile } from '@tauri-apps/api/fs';
 *   
 *   const selectDesktopFile = async () => {
 *     const selected = await open({
 *       filters: [{ name: 'Subtitles', extensions: ['srt'] }],
 *       multiple: false
 *     });
 *     if (selected && typeof selected === 'string') {
 *       const content = await readTextFile(selected);
 *       const parsed = parseSRT(content);
 *       onFileLoaded(parsed, selected.split('/').pop());
 *     }
 *   };
 *   ```
 * - This provides standard system dropdown widgets, native IO performance, and bypasses memory limits.
 * ============================================================================
 */
export const FileDropZone: React.FC<FileDropZoneProps> = ({
  fileName,
  totalBlocks,
  onFileLoaded,
  onClearSession,
  addCustomLog
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processRawString = (content: string, name: string) => {
    try {
      const parsed = parseSRT(content);
      if (parsed.length === 0) {
        addCustomLog("Failed parsing SRT. Confirm regex-compliance and text density tags.", "error");
        return;
      }
      onFileLoaded(parsed, name);
    } catch (e: any) {
      addCustomLog(`Parsing Error Exception: ${e.message || e}`, "error");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.srt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          processRawString(text, file.name);
        };
        reader.readAsText(file);
      } else {
        addCustomLog("Invalid file extension. Only .srt standard subtitle streams allowed.", "error");
      }
    }
  };

  const handleManualSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processRawString(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const triggerInputClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full flex flex-col gap-6 font-mono">
      
      {/* Active File Metadata Header */}
      {fileName ? (
        <div className="bg-slate-900 border border-cyan-500/20 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded bg-cyan-950/40 border border-cyan-800/40 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">LOADED SUBTITLES</p>
              <h3 className="text-slate-100 font-bold text-sm tracking-tight mt-1">{fileName}</h3>
              <p className="text-xs text-slate-400 mt-1">Found <span className="text-cyan-400 font-semibold">{totalBlocks}</span> subtitle blocks.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClearSession}
              className="px-3.5 py-1.5 rounded bg-slate-950 border border-rose-900/30 text-rose-400 hover:bg-rose-950/20 hover:border-rose-500/30 text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer"
            >
              Clear Subtitles
            </button>
          </div>
        </div>
      ) : (
        /* File Upload Interactive DropZone Box */
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerInputClick}
          className={`w-full min-h-[180px] rounded-lg border-2 border-dashed p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-250 ${
            isDragActive
              ? 'border-cyan-400 bg-cyan-950/15'
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt"
            onChange={handleManualSelect}
            className="hidden"
          />
          <div className={`p-4 rounded-full mb-3 transition-colors ${isDragActive ? 'text-cyan-400' : 'text-slate-500'}`}>
            <Upload className="w-8 h-8 animate-pulse text-cyan-400" />
          </div>
          <h4 className="text-slate-200 text-sm font-bold tracking-wide">
            DRAG & DROP SUBTITLE FILE (.SRT)
          </h4>
          <p className="text-slate-400 text-xs mt-1.5 max-w-md font-sans">
            Drop your subtitle file here to parse it, or click here to browse and select a file from your computer.
          </p>
          <div className="mt-4 flex gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-950 border border-slate-800/80 px-2 py-0.5 rounded">
              Standard .srt format
            </span>
          </div>
        </div>
      )}

    </div>
  );
};
