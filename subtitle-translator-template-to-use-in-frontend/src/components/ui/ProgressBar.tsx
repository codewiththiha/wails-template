/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ProgressBarProps {
  id?: string;
  value: number; // Value out of 100
  label?: string;
  sublabel?: string;
  color?: 'cyan' | 'magenta' | 'slate';
}

/**
 * Reusable Desktop-Grade High-Contrast Progress Bar.
 * Built with subtle neon borders, digital font trackers, and glow highlights.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  id = 'progressbar',
  value,
  label,
  sublabel,
  color = 'cyan'
}) => {
  const percent = Math.min(Math.max(value, 0), 100);

  // Styling maps based on desired vaporwave visual color cues
  const colorMap = {
    cyan: {
      bar: 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]',
      text: 'text-cyan-400',
      border: 'border-cyan-950/40 bg-slate-900/40'
    },
    magenta: {
      bar: 'bg-fuchsia-500 shadow-[0_0_12px_rgba(217,70,239,0.4)]',
      text: 'text-fuchsia-400',
      border: 'border-fuchsia-950/40 bg-slate-900/40'
    },
    slate: {
      bar: 'bg-slate-400',
      text: 'text-slate-400',
      border: 'border-slate-800 bg-slate-900/20'
    }
  };

  const currentTheme = colorMap[color];

  return (
    <div id={id} className="w-full font-mono text-xs">
      {(label || sublabel) && (
        <div className="flex justify-between items-center mb-1.5 px-0.5">
          {label && <span className="font-medium text-slate-300">{label}</span>}
          {sublabel && <span className={`text-right font-semibold ${currentTheme.text}`}>{sublabel}</span>}
        </div>
      )}
      <div className={`w-full h-2.5 rounded border ${currentTheme.border} p-[1px] overflow-hidden`}>
        <div
          className={`h-full rounded-sm transition-all duration-300 ease-out ${currentTheme.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
