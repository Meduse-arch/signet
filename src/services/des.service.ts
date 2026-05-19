export function lancerDes(nb: number, faces: number, mod: number = 0) {
  const rolls: number[] = [];
  for (let i = 0; i < nb; i++) {
    rolls.push(Math.floor(Math.random() * faces) + 1);
  }
  const total = rolls.reduce((a, b) => a + b, 0) + mod;
  return {
    rolls,
    total,
    nb,
    faces,
    mod
  };
}

export interface DiceResult {
  rolls: number[];
  total: number;
  bonus: number;
  diceString: string;
  label: string;
  color: string;
  secret: boolean;
  timestamp: number;
  sender_id?: string;
  sender_name?: string;
}

export function parseAndRoll(formula: string): number {
  try {
    const match = formula.match(/^(\d+)?d(\d+)([\+\-]\d+)?$/i);
    if (!match) return 0;
    
    const nb = parseInt(match[1]) || 1;
    const faces = parseInt(match[2]) || 6;
    const mod = parseInt(match[3]) || 0;
    
    let total = 0;
    for (let i = 0; i < nb; i++) {
      total += Math.floor(Math.random() * faces) + 1;
    }
    return total + mod;
  } catch (e) {
    console.error("Error parsing formula:", formula, e);
    return 0;
  }
}
