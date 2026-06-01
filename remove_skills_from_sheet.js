const fs = require('fs');
let content = fs.readFileSync('src/components/SignetInterface/CharacterSheetContent.tsx', 'utf8');

// We just remove the SnapColumn rendering Skills
content = content.replace(/<SnapColumn items=\{reactiveSkills\} itemsPerPage=\{itemsPerPage\} renderItem=\{renderSkill\} label="Skills" variant="popup" \/>/g, '');
content = content.replace(/<SnapColumn items=\{reactiveSkills\} itemsPerPage=\{itemsPerPage\} renderItem=\{renderSkill\} label="Skills" variant="window" \/>/g, '');

fs.writeFileSync('src/components/SignetInterface/CharacterSheetContent.tsx', content);
console.log('Removed skills from CharacterSheetContent');
