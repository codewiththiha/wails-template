/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { SRTBlock } from '../../types';
import { Badge } from '../ui/Badge';
import { Search, SlidersHorizontal, BookOpen, AlertCircle } from 'lucide-react';

interface SubtitlePreviewProps {
  blocks: SRTBlock[];
  translations: Record<number, string[]>;
  statuses: Record<number, 'pending' | 'translating' | 'completed' | 'failed'>;
  isTranslating: boolean;
}

/**
 * Split Screen Subtitle Spreadsheet Review Grid.
 * Displays high-contrast translation previews alongside original SRT strings with filters.
 */
export const SubtitlePreview: React.FC<SubtitlePreviewProps> = ({
  blocks,
  translations,
  statuses,
  isTranslating
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  // Multi-state filter matches
  const filteredBlocks = useMemo(() => {
    return blocks.filter((block) => {
      const status = statuses[block.index] || 'pending';
      
      // Filter tab checks
      if (activeFilter !== 'all' && status !== activeFilter) {
        return false;
      }

      // Keyword queries checks
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const originalTextMatch = block.text.join(' ').toLowerCase().includes(query);
        const translatedTextMatch = translations[block.index]
          ? translations[block.index].join(' ').toLowerCase().includes(query)
          : false;
        
        return originalTextMatch || translatedTextMatch || String(block.index) === query;
      }

      return true;
    });
  }, [blocks, translations, statuses, activeFilter, searchTerm]);

  // Analytics counts for quick tab selection pills
  const counts = useMemo(() => {
    const total = blocks.length;
    let completed = 0;
    let translating = 0;
    let failed = 0;

    Object.values(statuses).forEach((s) => {
      if (s === 'completed') completed++;
      else if (s === 'translating') translating++;
      else if (s === 'failed') failed++;
    });

    return {
      all: total,
      completed,
      pending: total - completed - translating - failed,
      failed
    };
  }, [blocks.length, statuses]);

  return (
    <div className="w-full flex flex-col gap-4 font-mono text-xs h-full">
      
      {/* Filtering Options Panel Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
        
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all duration-100 uppercase cursor-pointer border ${
              activeFilter === 'all'
                ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            All CHUNKS ({counts.all})
          </button>
          
          <button
            onClick={() => setActiveFilter('completed')}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all duration-100 uppercase cursor-pointer border ${
              activeFilter === 'completed'
                ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-cyan-400/80 hover:border-cyan-800'
            }`}
          >
            Completed ({counts.completed})
          </button>

          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all duration-100 uppercase cursor-pointer border ${
              activeFilter === 'pending'
                ? 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending ({counts.pending})
          </button>

          <button
            onClick={() => setActiveFilter('failed')}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all duration-100 uppercase cursor-pointer border ${
              activeFilter === 'failed'
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-400'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-400/80 hover:border-rose-900'
            }`}
          >
            Failed ({counts.failed})
          </button>
        </div>

        {/* Text Keyword Search Box Container */}
        <div className="relative w-full lg:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 pointer-events-none">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            id="subtitle-search"
            type="text"
            placeholder="Search keywords or indices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-[11px] placeholder-slate-500 focus:border-cyan-500"
          />
        </div>

      </div>

      {/* Spreadsheet Main Grid Area */}
      {filteredBlocks.length === 0 ? (
        <div className="flex-1 min-h-[300px] border border-slate-800 bg-slate-950/60 rounded-lg flex flex-col items-center justify-center p-8 text-center">
          <BookOpen className="w-10 h-10 text-slate-700 mb-3" />
          <h5 className="text-slate-300 font-bold text-sm">No Grid Frames Located</h5>
          <p className="text-slate-500 text-xs mt-1 max-w-sm font-sans leading-relaxed">
            {searchTerm.trim() !== '' 
              ? `There are no subtitle segments matching details for "${searchTerm}".` 
              : "This filtration channel is empty. Set your filters or active file load vectors to retrieve block frames."}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto border border-slate-800 bg-slate-950/80 rounded-lg max-h-[50vh] xl:max-h-[55vh]">
          
          {/* Header Row */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-800 grid grid-cols-12 gap-2 p-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider z-10 select-none">
            <div className="col-span-1 text-center">ID</div>
            <div className="col-span-2">TIMESTAMP</div>
            <div className="col-span-4 border-l border-slate-800/60 pl-3">ORIGINAL TRANSCRIPT</div>
            <div className="col-span-4 border-l border-slate-800/60 pl-3">NEURAL TRANSLATION</div>
            <div className="col-span-1 text-center border-l border-slate-800/60">STATUS</div>
          </div>

          {/* Subtitle Rows */}
          <div className="divide-y divide-slate-900">
            {filteredBlocks.map((block) => {
              const status = statuses[block.index] || 'pending';
              const isProcessing = status === 'translating';
              const isDone = status === 'completed';
              const isErr = status === 'failed';

              const rowHighlight = isProcessing 
                ? 'bg-fuchsia-950/10' 
                : isErr 
                  ? 'bg-rose-950/5' 
                  : 'hover:bg-slate-900/30';

              return (
                <div
                  key={block.index}
                  className={`grid grid-cols-12 gap-2 p-3.5 items-start text-[11px] transition-colors leading-relaxed ${rowHighlight}`}
                >
                  
                  {/* ID Field */}
                  <div className="col-span-1 text-center">
                    <span className="font-bold text-slate-200 font-mono text-[10px] bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded shadow-sm">
                      #{block.index}
                    </span>
                  </div>

                  {/* Timestamp Line */}
                  <div className="col-span-2 text-slate-500 font-semibold font-mono text-[10px] select-all mt-0.5">
                    {block.timestamp.replace(' --> ', '\n---> ')}
                  </div>

                  {/* Original Input Sentence Columns */}
                  <div className="col-span-4 border-l border-slate-800/40 pl-3 select-text font-medium text-slate-200">
                    <div className="flex flex-col gap-1">
                      {block.text.map((line, idx) => (
                        <p key={idx} className="whitespace-pre-wrap">{line}</p>
                      ))}
                    </div>
                  </div>

                  {/* Translated Output Sentence Columns */}
                  <div className="col-span-4 border-l border-slate-800/40 pl-3 select-text">
                    {isDone ? (
                      <div className="flex flex-col gap-1 text-cyan-300 font-semibold">
                        {translations[block.index]?.map((line, idx) => (
                          <p key={idx} className="whitespace-pre-wrap">{line}</p>
                        ))}
                      </div>
                    ) : isProcessing ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-fuchsia-400 font-bold tracking-widest animate-pulse flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-bounce" />
                          TRANSLATING...
                        </span>
                        <div className="h-2.5 w-32 bg-slate-900 border border-slate-850 rounded p-[1px] mt-1 overflow-hidden">
                          <div className="bg-fuchsia-500 h-full w-2/3 animate-infinite-shimmer rounded-sm" />
                        </div>
                      </div>
                    ) : isErr ? (
                      <div className="flex items-start gap-1.5 text-rose-400 font-semibold bg-rose-950/15 p-1.5 rounded border border-rose-900/20">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Translation Pipeline Interrupted. Failcode: 429.</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 italic select-none">
                        Pending worker queue dispatch...
                      </span>
                    )}
                  </div>

                  {/* Operational Status Tag Column */}
                  <div className="col-span-1 text-center flex justify-center border-l border-slate-800/40 min-h-[30px] items-center">
                    <Badge type={status} />
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};
