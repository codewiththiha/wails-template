/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface BadgeProps {
  id?: string;
  type: 'pending' | 'translating' | 'completed' | 'failed' | 'info' | 'success' | 'warning' | 'error';
  label?: string;
}

/**
 * Reusable vaporwave atomic status indicator badge.
 */
export const Badge: React.FC<BadgeProps> = ({ id, type, label }) => {
  const finalLabel = label || type.toUpperCase();

  const styleMap = {
    pending: {
      bg: 'bg-slate-900/80',
      border: 'border-slate-800',
      text: 'text-slate-400',
      dot: 'bg-slate-600 animate-pulse'
    },
    translating: {
      bg: 'bg-fuchsia-950/40',
      border: 'border-fuchsia-500/50',
      text: 'text-fuchsia-400 shadow-[0_0_8px_rgba(240,70,250,0.15)]',
      dot: 'bg-fuchsia-400 animate-ping'
    },
    completed: {
      bg: 'bg-cyan-950/40',
      border: 'border-cyan-500/50',
      text: 'text-cyan-400',
      dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]'
    },
    failed: {
      bg: 'bg-rose-950/40',
      border: 'border-rose-500/50',
      text: 'text-rose-400',
      dot: 'bg-rose-500 animate-pulse'
    },
    info: {
      bg: 'bg-blue-950/20',
      border: 'border-blue-900/60',
      text: 'text-blue-400',
      dot: 'bg-blue-400'
    },
    success: {
      bg: 'bg-emerald-950/20',
      border: 'border-emerald-900/60',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400'
    },
    warning: {
      bg: 'bg-amber-950/20',
      border: 'border-amber-900/60',
      text: 'text-amber-400',
      dot: 'bg-amber-400'
    },
    error: {
      bg: 'bg-red-950/40',
      border: 'border-red-900/60',
      text: 'text-red-400',
      dot: 'bg-red-500 animate-bounce'
    }
  };

  const activeStyle = styleMap[type] || styleMap.pending;

  return (
    <span
      id={id}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${activeStyle.bg} ${activeStyle.border} ${activeStyle.text} font-mono text-[10px] font-bold uppercase tracking-wider`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${activeStyle.dot}`} />
      {finalLabel}
    </span>
  );
};
