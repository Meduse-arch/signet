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
  groups?: RollGroup[];
}

export interface RollGroup {
  nb: number;
  faces: number;
  label?: string;
  rolls: number[];
}

export function parseAndRoll(formula: string): { rolls: number[], total: number, groups: RollGroup[] } {
  const allRolls: number[] = [];
  const groups: RollGroup[] = [];
  try {
    // 1. Gérer les jets de dés (ex: 2d10 ou 1d(Force=12) ou 1d 20 ou 1 d strength)
    // On normalise en minuscules pour la recherche mais on garde l'affichage propre via les labels
    let processedFormula = formula.replace(/(\d+)?\s*d\s*(?:\(?([^=)]+)=?(\d+)?\)?|(\d+))/gi, (match, nb, label, facesWithLabel, facesOnly) => {
      const count = parseInt(nb) || 1;
      const faces = parseInt(facesOnly || facesWithLabel) || 6;
      const finalLabel = label || `D${faces}`;
      
      let subTotal = 0;
      const currentRolls: number[] = [];
      for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * faces) + 1;
        allRolls.push(roll);
        currentRolls.push(roll);
        subTotal += roll;
      }
      
      groups.push({
        nb: count,
        faces: faces,
        label: finalLabel,
        rolls: currentRolls
      });
      
      return subTotal.toString();
    });

    // 1.5 Convertir les (Nom=Valeur) isolés en simple valeur (ex: bonus de stats purs sans dés)
    processedFormula = processedFormula.replace(/\([^=)]+=(\d+)\)/g, "$1");

    // 2. Nettoyer la formule pour ne garder que les caractères autorisés (sécurité)
    processedFormula = processedFormula.replace(/[^-+*/().\d\s]/g, '');

    // 3. Évaluer la formule mathématique restante
    const finalTotal = Number(new Function(`return ${processedFormula}`)());
    return { rolls: allRolls, total: finalTotal, groups };
  } catch (e) {
    console.error("Error parsing formula:", formula, e);
    return { rolls: [], total: 0, groups: [] };
  }
}
