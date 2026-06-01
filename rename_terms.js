const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/Etudiant/Desktop/projet/sigil-app/sigil-vtt/src';

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walk(dirPath, callback);
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            callback(dirPath);
        }
    });
}

walk(dir, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/MAÎTRISES/g, 'SKILLS');
    content = content.replace(/Maîtrises/g, 'Skills');
    content = content.replace(/MAÎTRISE/g, 'SKILL');
    content = content.replace(/Maîtrise/g, 'Skill');
    content = content.replace(/maîtrise/g, 'skill');
    content = content.replace(/maîtrises/g, 'skills');

    content = content.replace(/VITALITÉS/g, 'RESSOURCES');
    content = content.replace(/Vitalités/g, 'Ressources');
    content = content.replace(/VITALITÉ/g, 'RESSOURCE');
    content = content.replace(/Vitalité/g, 'Ressource');
    content = content.replace(/vitalité/g, 'ressource');
    content = content.replace(/vitalités/g, 'ressources');

    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log('Patched', filePath);
    }
});
