const fs = require('fs');
let content = fs.readFileSync('src/components/SignetInterface/ManageCharacterModal.tsx', 'utf8');

const regex = /(\{\s*id:\s*'inventaire',\s*label:\s*'[A-Z]+',\s*icon:\s*Package\s*\},\s*)/;
const replacement = `$1...(isMJ ? [
                { id: 'competences', label: 'SKILLS', icon: Zap },
                { id: 'quetes', label: 'QUÊTES', icon: Target }
              ] : []),
              `;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/SignetInterface/ManageCharacterModal.tsx', content);
    console.log("Successfully inserted tabs via regex!");
} else {
    console.log("REGEX FAILED");
}
