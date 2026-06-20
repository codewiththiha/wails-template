/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SliderProps {
  id: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  tooltip?: string;
}

/**
 * Aesthetic Range Slider component designed for desktop control dashboards.
 * Blends sleek background grids with bright neon accents for extreme desktop styling.
 */
export const Slider: React.FC<SliderProps> = ({
  id,
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  suffix = '',
  tooltip
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className="w-full font-mono text-xs flex flex-col gap-2 p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg">
      <div className="flex justify-between items-center px-0.5">
        <div className="flex flex-col">
          <span className="text-slate-300 font-semibold uppercase tracking-wider">{label}</span>
          {tooltip && <span className="text-[10px] text-slate-500 mt-0.5 lowercase leading-none">{tooltip}</span>}
        </div>
        <span className="bg-slate-950 px-2 py-0.5 border border-slate-800 text-cyan-400 font-bold rounded shadow-inner">
          {value}
          {suffix}
        </span>
      </div>
      <div className="relative w-full flex items-center">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer border border-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 accent-cyan-400"
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600 px-0.5 select-none font-semibold">
        <span>MIN: {min}</span>
        <span>MAX: {max}</span>
      </div>
    </div>
  );
};
