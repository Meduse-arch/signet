const fs = require('fs');

let content = fs.readFileSync('src/components/SignetInterface/ManageCharacterModal.tsx', 'utf8');

const brokenTarget = `          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gold-dim hover:text-gold-bright transition-colors">
            <X size={24} />
              >
                <tab.icon size={14} />`;

const fixedReplacement = `          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gold-dim hover:text-gold-bright transition-colors">
            <X size={24} />
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-48 border-r border-white/5 bg-black/20 p-4 flex flex-col gap-1 shrink-0">
            {[
              { id: 'profil', label: 'PROFIL', icon: User },
              { id: 'stats', label: 'ATTRIBUTS', icon: Sword },
              { id: 'ressources', label: 'RESSOURCES', icon: Heart },
              { id: 'inventaire', label: 'INVENTAIRE', icon: Package },
              ...(isMJ ? [
                { id: 'competences', label: 'SKILLS', icon: Zap },
                { id: 'quetes', label: 'QUÊTES', icon: Target }
              ] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as Tab); setShowForge(false); setShowSkillArchive(false); setShowQuestArchive(false); }}
                className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-cinzel text-xs font-black tracking-widest transition-all \${activeTab === tab.id ? 'bg-gold-DEFAULT text-black shadow-lg translate-x-1' : 'text-white/60 hover:text-white/60 hover:bg-white/5'}\`}
              >
                <tab.icon size={14} />`;

content = content.replace(brokenTarget, fixedReplacement);
fs.writeFileSync('src/components/SignetInterface/ManageCharacterModal.tsx', content);
console.log("File repaired and tabs added!");
