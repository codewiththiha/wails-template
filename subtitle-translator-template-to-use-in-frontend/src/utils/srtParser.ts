/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SRTBlock } from '../types';

/**
 * Parses raw SRT subtitle content into a structured, deterministic array of SRTBlock objects.
 * 
 * Strict RegEx is utilized to isolate the start and end timestamp boundaries exactly as requested:
 * /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
 * 
 * Future Desktop integration note: In a native Tauri or Electron app, this file-parse process
 * will be called immediately after resolving standard system file paths sent from the 
 * native OS file stream reader.
 * 
 * @param srtContent Raw SRT content string
 * @returns Array of parsed and normalized SRT blocks
 */
export function parseSRT(srtContent: string): SRTBlock[] {
  if (!srtContent || srtContent.trim() === '') {
    return [];
  }

  // Normalize line endings to standard Unix line endings (\n)
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split the file based on double newlines or similar double spacing
  // Using a negative-lookbehind or simpler splitting
  const rawBlocks = normalized.split(/\n\s*\n/);
  
  const parsedBlocks: SRTBlock[] = [];
  const timestampRegex = /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/;

  let fallbackIndex = 1;

  for (const block of rawBlocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

    const lines = trimmedBlock.split('\n').map(line => line.trim());
    
    // Find the line that matches the strict timestamp format
    let timestampLineIndex = -1;
    let match: RegExpExecArray | null = null;

    for (let i = 0; i < lines.length; i++) {
      const matchCheck = timestampRegex.exec(lines[i]);
      if (matchCheck) {
        timestampLineIndex = i;
        match = matchCheck;
        break;
      }
    }

    // If no timestamp regex is matched, this block is malformed or empty, skip or treat carefully
    if (timestampLineIndex === -1 || !match) {
      continue;
    }

    // The index line is usually right before the timestamp line, we parse it or use fallback
    let indexValue = fallbackIndex;
    if (timestampLineIndex > 0) {
      const possibleIndex = parseInt(lines[timestampLineIndex - 1], 10);
      if (!isNaN(possibleIndex)) {
        indexValue = possibleIndex;
      }
    }

    // The timestamp string is reconstructed exactly or we preserve the raw timestamp line
    const timestamp = lines[timestampLineIndex];

    // Subtitle text lines are all lines following the timestamp line
    const textLines = lines.slice(timestampLineIndex + 1).filter(l => l !== '');

    parsedBlocks.push({
      index: indexValue,
      timestamp,
      text: textLines
    });

    fallbackIndex = indexValue + 1;
  }

  return parsedBlocks;
}

/**
 * Reconstructs a valid .srt formatted string from original structures and translated mappings.
 * 
 * To guarantee the SRT structure is beautifully synchronized and perfectly preserves spacing,
 * this function stitches original absolute sequence mapping numbers and timestamps with either
 * translated text or fallback original text if translations failed or are incomplete in localStorage.
 * 
 * @param originalBlocks The original parsed subtitle blocks
 * @param translationsState Current translation state dictionary or array mapping by index ID
 * @returns Reassembled SRT string
 */
export function stringifySRT(
  originalBlocks: SRTBlock[],
  translationsState: Record<number, string[]>
): string {
  const outputBlocks: string[] = [];

  for (const block of originalBlocks) {
    const blockIndex = block.index;
    
    // Fetch translated lines or fallback to original text if missing
    const contentLines = translationsState[blockIndex] !== undefined && translationsState[blockIndex].length > 0
      ? translationsState[blockIndex]
      : block.text;

    const blockStr = `${blockIndex}\n${block.timestamp}\n${contentLines.join('\n')}`;
    outputBlocks.push(blockStr);
  }

  // Join blocks with double native Unix linebreaks to enforce proper standard file format
  return outputBlocks.join('\n\n');
}
