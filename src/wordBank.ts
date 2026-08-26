import type { WordLengthProfile } from './types';
import { TRANSLATIONS } from './translations';

export interface WordBankData {
  letters: string[];
  short: string[];
  medium: string[];
  long: string[];
}

const DEFAULT_BANK: WordBankData = {
  letters: 'abcdefghijklmnopqrstuvwxyz'.split(''),
  short: [
    'cat', 'dog', 'run', 'big', 'fox', 'cup', 'hat', 'map', 'sun', 'top',
    'box', 'jam', 'pen', 'red', 'zip', 'ace', 'bag', 'cab', 'dip', 'elk',
    'fun', 'gem', 'hit', 'ice', 'jab', 'key', 'lip', 'mix', 'nap', 'oak',
  ],
  medium: [
    'apple', 'brave', 'cloud', 'dance', 'eagle', 'flame', 'globe', 'happy',
    'index', 'jolly', 'knock', 'lemon', 'magic', 'night', 'ocean', 'piano',
    'queen', 'river', 'storm', 'tiger', 'ultra', 'vivid', 'witch', 'xenon',
    'yield', 'zebra', 'blaze', 'crisp', 'drown', 'erupt',
  ],
  long: [
    'abandon', 'cabinet', 'diamond', 'example', 'factory', 'gravity',
    'habitat', 'imagine', 'justice', 'kitchen', 'language', 'machine',
    'network', 'obvious', 'package', 'quality', 'rainbow', 'science',
    'thunder', 'umbrella', 'vampire', 'whisper', 'xylophone', 'youthful',
    'absolute', 'bacteria', 'calendar', 'daughter', 'electric', 'frontier',
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let _bank: WordBankData = { ...DEFAULT_BANK };

function getWord(profile: WordLengthProfile): string {
  switch (profile) {
    case 'letters':
      return pick(_bank.letters);
    case 'short': {
      const pool = [..._bank.letters, ..._bank.letters, ..._bank.short, ..._bank.short, ..._bank.short];
      return pick(pool);
    }
    case 'medium': {
      const pool = [..._bank.short, ..._bank.medium, ..._bank.medium];
      return pick(pool);
    }
    case 'mixed': {
      const pool = [..._bank.short, ..._bank.medium, ..._bank.long];
      return pick(pool);
    }
  }
}

function loadCustomBank(override: Partial<WordBankData>): void {
  _bank = {
    letters: override.letters ?? DEFAULT_BANK.letters,
    short:   override.short   ?? DEFAULT_BANK.short,
    medium:  override.medium  ?? DEFAULT_BANK.medium,
    long:    override.long    ?? DEFAULT_BANK.long,
  };
}

function resetBank(): void {
  _bank = { ...DEFAULT_BANK };
}

function getTranslation(word: string): string[] {
  return TRANSLATIONS[word.toLowerCase()] ?? [word];
}

export const wordBank = { getWord, loadCustomBank, resetBank, getTranslation };
