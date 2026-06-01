const fs = require('fs');
const path = require('path');

const filesToPatch = [
    'src/components/SignetInterface/CharacterSheetContent.tsx',
    'src/components/SignetInterface/GiveItemModal.tsx',
    'src/components/SignetInterface/InventoryWindowContent.tsx',
    'src/components/SignetInterface/ItemCreationModal.tsx',
    'src/components/SignetInterface/ManageCharacterModal.tsx',
    'src/components/SignetInterface/PlayerWindowContent.tsx',
    'src/components/SignetInterface/QuestDetailContent.tsx',
    'src/components/SignetInterface/QuestsWindowContent.tsx',
    'src/components/SignetInterface/SelectCharacterModal.tsx',
    'src/components/SignetInterface/SkillDetailContent.tsx',
    'src/components/SignetInterface/SkillsWindowContent.tsx',
    'src/components/SignetInterface/ItemDetailContent.tsx',
    'src/components/PlayerHUD/index.tsx',
    'src/components/CharacterHUD/index.tsx'
];

const basePath = 'c:/Users/Etudiant/Desktop/projet/sigil-app/sigil-vtt';

for (const file of filesToPatch) {
    const filePath = path.join(basePath, file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if we need to patch
    if (content.includes('<img src={')) {
        // Add import if not exists
        if (!content.includes('import { AssetImage }')) {
            // Calculate relative path to src/components/AssetImage.tsx
            const fileDir = path.dirname(filePath);
            let relativePath = path.relative(fileDir, path.join(basePath, 'src/components/AssetImage'));
            relativePath = relativePath.replace(/\\/g, '/');
            if (!relativePath.startsWith('.')) relativePath = './' + relativePath;

            // insert import at top
            const importStmt = `import { AssetImage } from '${relativePath}';\n`;
            
            // Find last import
            const lastImportIndex = content.lastIndexOf('import ');
            if (lastImportIndex !== -1) {
                const endOfLine = content.indexOf('\n', lastImportIndex);
                content = content.slice(0, endOfLine + 1) + importStmt + content.slice(endOfLine + 1);
            } else {
                content = importStmt + content;
            }
        }

        // Replace <img src={...} /> with <AssetImage src={...} />
        content = content.replace(/<img src=\{([^}]+)\}/g, '<AssetImage src={$1}');
        
        fs.writeFileSync(filePath, content);
        console.log(`Patched ${file}`);
    }
}
