const fs = require('fs');
let content = fs.readFileSync('src/components/SignetInterface/ManageCharacterModal.tsx', 'utf8');

const targetArray1 = `            {[
              { id: 'profil', label: 'PROFIL', icon: User },
              { id: 'stats', label: 'ATTRIBUTS', icon: Sword },
              { id: 'ressources', label: 'VITALITÉS', icon: Heart },
              { id: 'inventaire', label: 'INVENTAIRE', icon: Package },
            ].map(tab => (`;

const newArray1 = `            {[
              { id: 'profil', label: 'PROFIL', icon: User },
              { id: 'stats', label: 'ATTRIBUTS', icon: Sword },
              { id: 'ressources', label: 'VITALITÉS', icon: Heart },
              { id: 'inventaire', label: 'INVENTAIRE', icon: Package },
              ...(isMJ ? [
                { id: 'competences', label: 'MAÎTRISES', icon: Zap },
                { id: 'quetes', label: 'QUÊTES', icon: Target }
              ] : [])
            ].map(tab => (`;

const targetArray2 = `            {[
              { id: 'profil', label: 'PROFIL', icon: User },
              { id: 'stats', label: 'ATTRIBUTS', icon: Sword },
              { id: 'ressources', label: 'RESSOURCES', icon: Heart },
              { id: 'inventaire', label: 'INVENTAIRE', icon: Package },
            ].map(tab => (`;

const newArray2 = `            {[
              { id: 'profil', label: 'PROFIL', icon: User },
              { id: 'stats', label: 'ATTRIBUTS', icon: Sword },
              { id: 'ressources', label: 'RESSOURCES', icon: Heart },
              { id: 'inventaire', label: 'INVENTAIRE', icon: Package },
              ...(isMJ ? [
                { id: 'competences', label: 'SKILLS', icon: Zap },
                { id: 'quetes', label: 'QUÊTES', icon: Target }
              ] : [])
            ].map(tab => (`;


if (content.includes(targetArray1)) {
    content = content.replace(targetArray1, newArray1);
    console.log("Matched un-renamed array");
} else if (content.includes(targetArray2)) {
    content = content.replace(targetArray2, newArray2);
    console.log("Matched renamed array");
} else {
    console.log("NO MATCH FOUND FOR ARRAY");
}

fs.writeFileSync('src/components/SignetInterface/ManageCharacterModal.tsx', content);
