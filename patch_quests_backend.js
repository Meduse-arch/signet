const fs = require('fs');

// 1. electron/preload.ts
let preload = fs.readFileSync('electron/preload.ts', 'utf8');
preload = preload.replace(/custom_skills\?: any\[\];/g, 'custom_skills?: any[];\n  quests?: any[];');
preload = preload.replace(/updateCharacter: \(sessionId: string, id: string, name: string, stats: Record<string, number>, skills: Record<string, number>, bars: Record<string, number>, imageUrl\?: string, inventory\?: any\[\], custom_skills\?: any\[\], type\?: string, is_template\?: boolean\) =>/g, 
'updateCharacter: (sessionId: string, id: string, name: string, stats: Record<string, number>, skills: Record<string, number>, bars: Record<string, number>, imageUrl?: string, inventory?: any[], custom_skills?: any[], type?: string, is_template?: boolean, quests?: any[]) =>');
preload = preload.replace(/ipcRenderer\.invoke\('characters:update', sessionId, id, name, stats, skills, bars, imageUrl, inventory, custom_skills, type, is_template\)/g, 
"ipcRenderer.invoke('characters:update', sessionId, id, name, stats, skills, bars, imageUrl, inventory, custom_skills, type, is_template, quests)");
fs.writeFileSync('electron/preload.ts', preload);

// 2. src/services/characters.service.ts
let charsService = fs.readFileSync('src/services/characters.service.ts', 'utf8');
charsService = charsService.replace(/custom_skills\?: any\[\];/g, 'custom_skills?: any[];\n  quests?: any[];');
charsService = charsService.replace(/updateSessionCharacter\([\s\S]*?\): Promise<void> {/m, (match) => {
    return match.replace(/is_template\?: boolean/, 'is_template?: boolean,\n  quests?: any[]');
});
charsService = charsService.replace(/await window\.electronAPI\.updateCharacter\([\s\S]*?\);/, (match) => {
    return match.replace(/is_template\);/, 'is_template, quests);');
});
fs.writeFileSync('src/services/characters.service.ts', charsService);

// 3. electron/ipc-handlers.ts
let ipc = fs.readFileSync('electron/ipc-handlers.ts', 'utf8');
// Add column in CREATE TABLE
ipc = ipc.replace(/is_template INTEGER DEFAULT 0\n\s*\);/g, 'is_template INTEGER DEFAULT 0,\n          quests TEXT\n        );');
// Add ALTER TABLE dynamically
ipc = ipc.replace(/db\.exec\(\`/g, `try { db.exec("ALTER TABLE characters ADD COLUMN quests TEXT;"); } catch(e) {} \n      db.exec(\``);

// Update getAll
ipc = ipc.replace(/skills: JSON\.parse\(c\.skills \|\| '\{\}'\),/g, "skills: JSON.parse(c.skills || '{}'),\n          quests: JSON.parse(c.quests || '[]'),");

// Update characters:add
ipc = ipc.replace(/ipcMain\.handle\('characters:add', \(_, sessionId, c\) => \{[\s\S]*?db\.prepare\('INSERT INTO characters \(id, user_id, name, stats, skills, bars, image_url, inventory, custom_skills, type, is_template\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)'\)[\s\S]*?\.run\(c\.id, c\.user_id \|\| null, c\.name, JSON\.stringify\(c\.stats\), JSON\.stringify\(c\.skills \|\| \{\}\), JSON\.stringify\(c\.bars\), c\.image_url \|\| null, JSON\.stringify\(c\.inventory \|\| \[\]\), JSON\.stringify\(c\.custom_skills \|\| \[\]\), c\.type \|\| null, c\.is_template \? 1 : 0\);/m, (match) => {
    let m = match.replace(/is_template\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)/, "is_template, quests) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    return m.replace(/c\.is_template \? 1 : 0\);/, "c.is_template ? 1 : 0, JSON.stringify(c.quests || []));");
});

// Update characters:update
ipc = ipc.replace(/ipcMain\.handle\('characters:update', \(_, sessionId, id, name, stats, skills, bars, imageUrl, inventory, custom_skills, type, is_template\) => \{/g, 
"ipcMain.handle('characters:update', (_, sessionId, id, name, stats, skills, bars, imageUrl, inventory, custom_skills, type, is_template, quests) => {");

ipc = ipc.replace(/db\.prepare\('UPDATE characters SET name = \?, stats = \?, skills = \?, bars = \?, image_url = \?, inventory = \?, custom_skills = \?, type = \?, is_template = \? WHERE id = \?'\)[\s\S]*?\.run\(name, JSON\.stringify\(stats\), JSON\.stringify\(skills \|\| \{\}\), JSON\.stringify\(bars\), imageUrl \|\| null, JSON\.stringify\(inventory \|\| \[\]\), JSON\.stringify\(custom_skills \|\| \[\]\), type \|\| null, is_template \? 1 : 0, id\);/, 
`db.prepare('UPDATE characters SET name = ?, stats = ?, skills = ?, bars = ?, image_url = ?, inventory = ?, custom_skills = ?, type = ?, is_template = ?, quests = ? WHERE id = ?')
        .run(name, JSON.stringify(stats), JSON.stringify(skills || {}), JSON.stringify(bars), imageUrl || null, JSON.stringify(inventory || []), JSON.stringify(custom_skills || []), type || null, is_template ? 1 : 0, JSON.stringify(quests || []), id);`);

fs.writeFileSync('electron/ipc-handlers.ts', ipc);
console.log('Backend patched!');
