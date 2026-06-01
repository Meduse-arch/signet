const fs = require('fs');
const filePath = 'src/components/CharacterHUD/index.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `if (!myCharacter) {
  if (user?.role && user.role >= SecurityLevel.MJ) {
     return (`

const replacement = `if (!myCharacter) {
  if (user?.role && user.role >= SecurityLevel.MJ) {
     if (!controlledCharacterId) return null;
     return (`

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content);
    console.log("HUD patched");
} else {
    console.log("Target not found");
}
