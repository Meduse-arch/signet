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
