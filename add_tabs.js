const fs = require('fs');

let content = fs.readFileSync('src/components/SignetInterface/ManageCharacterModal.tsx', 'utf8');

const targetStr = `              { id: 'ressources', label: 'RESSOURCES', icon: Heart },
              { id: 'inventaire', label: 'INVENTAIRE', icon: Package },
            ].map(tab => (`;

const newStr = `              { id: 'ressources', label: 'RESSOURCES', icon: Heart },
              { id: 'inventaire', label: 'INVENTAIRE', icon: Package },
              ...(isMJ ? [
                { id: 'competences', label: 'SKILLS', icon: Zap },
                { id: 'quetes', label: 'QUÊTES', icon: Target }
              ] : [])
            ].map(tab => (`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/SignetInterface/ManageCharacterModal.tsx', content);
console.log('Sidebar tabs added successfully!');
