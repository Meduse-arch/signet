export interface StatDefinition {
  id: string;
  name: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
}

export interface BarDefinition {
  id: string;
  name: string;
  color: string;
  formula: string;
}

export const DEFAULT_STATS: StatDefinition[] = [
  { id: 'force', name: 'Force' },
  { id: 'dexterity', name: 'Dextérité' },
  { id: 'constitution', name: 'Constitution' },
  { id: 'intelligence', name: 'Intelligence' },
  { id: 'wisdom', name: 'Sagesse' },
  { id: 'charisma', name: 'Charisme' },
  { id: 'perception', name: 'Perception' },
];

export const DEFAULT_SKILLS: SkillDefinition[] = [];

export const DEFAULT_BARS: BarDefinition[] = [
  { id: 'hp', name: 'Vitalité', color: '#ef4444', formula: 'constitution * 4' },
  { id: 'mana', name: 'Ether', color: '#3b82f6', formula: '(intelligence + wisdom) / 2 * 10' },
  { id: 'stam', name: 'Endurance', color: '#22c55e', formula: '(force + dexterity + constitution) / 3 * 10' },
];

export const DEFAULT_SEAL_SETTINGS = {
  sheetMode: 'roll' as const,
  manualPoints: 60,
  rollFormula: { diceCount: 4, diceSides: 5, rerolls: 6 },
  stats: DEFAULT_STATS,
  skills: DEFAULT_SKILLS,
  bars: DEFAULT_BARS,
  rerollAllAllowed: true,
};
