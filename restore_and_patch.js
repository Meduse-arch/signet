const fs = require('fs');
const { execSync } = require('child_process');

try {
  execSync('git checkout HEAD -- src/components/SignetInterface/ManageCharacterModal.tsx');
  console.log('Restored ManageCharacterModal.tsx from git HEAD');
} catch (e) {
  console.error('Git checkout failed', e);
}

// 1. Rename MAÎTRISES -> SKILLS, VITALITÉS -> RESSOURCES
let content = fs.readFileSync('src/components/SignetInterface/ManageCharacterModal.tsx', 'utf8');

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

// 2. Fix the Tabs array
const tabsRegex = /\[\s*\{\s*id:\s*'profil'[\s\S]*?\}\s*\]\.map\(tab => \(/;
const tabsReplacement = `[
              { id: 'profil', label: 'PROFIL', icon: User },
              { id: 'stats', label: 'ATTRIBUTS', icon: Sword },
              { id: 'ressources', label: 'RESSOURCES', icon: Heart },
              { id: 'inventaire', label: 'INVENTAIRE', icon: Package },
              ...(isMJ ? [
                { id: 'competences', label: 'SKILLS', icon: Zap },
                { id: 'quetes', label: 'QUÊTES', icon: Target }
              ] : [])
            ].map(tab => (`

content = content.replace(tabsRegex, tabsReplacement);

// 3. Add Quests store logic
if (!content.includes('useQuestsStore')) {
    content = content.replace("import { useSkillsStore } from '../../store/skills';", "import { useSkillsStore } from '../../store/skills';\nimport { useQuestsStore } from '../../store/quests';");
}
if (!content.includes('const { quests } = useQuestsStore();')) {
    content = content.replace("const { skills } = useSkillsStore();", "const { skills } = useSkillsStore();\n  const { quests } = useQuestsStore();");
}

// 4. Add state variables for Quests
if (!content.includes('const [showQuestArchive, setShowQuestArchive]')) {
    content = content.replace("const [showSkillArchive, setShowSkillArchive] = useState(false);", "const [showSkillArchive, setShowSkillArchive] = useState(false);\n  const [showQuestArchive, setShowQuestArchive] = useState(false);\n  const [searchQuestArchive, setSearchQuestArchive] = useState('');");
}

// 5. Add filteredArchiveQuests memo
if (!content.includes('const filteredArchiveQuests = useMemo')) {
    content = content.replace("const filteredArchiveSkills = useMemo(() => {", `const filteredArchiveQuests = useMemo(() => {
    return quests.filter(quest => 
      quest.title.toLowerCase().includes(searchQuestArchive.toLowerCase()) ||
      quest.description.toLowerCase().includes(searchQuestArchive.toLowerCase())
    );
  }, [quests, searchQuestArchive]);

  const filteredArchiveSkills = useMemo(() => {`);
}

// 6. Add handleRemoveQuest and handleAddQuestFromArchive functions
if (!content.includes('const handleRemoveQuest')) {
    content = content.replace("const handleRemoveSkill = (skillId: string) => {", `const handleAddQuestFromArchive = (quest: any) => {
    const existingQuests = editedChar.quests || [];
    if (!existingQuests.find((q: any) => q.id === quest.id)) {
      setEditedChar((prev: any) => ({
        ...prev,
        quests: [...existingQuests, { ...quest, customId: crypto.randomUUID() }]
      }));
      setHasChanges(true);
      setAddedFeedback(quest.id);
      setTimeout(() => setAddedFeedback(null), 1000);
    }
  };

  const handleRemoveQuest = (questId: string) => {
    setEditedChar((prev: any) => ({
      ...prev,
      quests: (prev.quests || []).filter((q: any) => q.id !== questId)
    }));
    setHasChanges(true);
  };

  const handleRemoveSkill = (skillId: string) => {`);
}

// 7. Reset showQuestArchive when changing tab
content = content.replace("setShowForge(false); setShowSkillArchive(false);", "setShowForge(false); setShowSkillArchive(false); setShowQuestArchive(false);");

// 8. Replace the quests UI placeholder safely
const startToken = "{activeTab === 'quetes' && (";
const endToken = "</main>";
const idxStart = content.indexOf(startToken);
const idxEnd = content.indexOf(endToken, idxStart);

if (idxStart !== -1 && idxEnd !== -1) {
    const questsUI = `{activeTab === 'quetes' && (
              <div className="flex flex-col gap-4">
                {!showQuestArchive ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-widest">Quêtes Assignées</h3>
                      <button 
                        onClick={() => setShowQuestArchive(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all font-cinzel text-xs font-black uppercase tracking-widest group shadow-lg"
                      >
                        <Target size={14} className="group-hover:scale-110 transition-transform" />
                        Ouvrir le Journal
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {(editedChar.quests || []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-40">
                          <Target size={48} className="mb-4 text-gold-DEFAULT" />
                          <span className="font-cinzel text-xs uppercase tracking-widest">AUCUNE QUÊTE</span>
                        </div>
                      ) : (
                        editedChar.quests.map((quest: any) => (
                          <div key={quest.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] group hover:border-gold-DEFAULT/20 transition-all">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                {quest.image_url ? (
                                  <SkillItemImage url={quest.image_url} />
                                ) : (
                                  <Target size={18} className="text-gold-DEFAULT/40" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-cinzel font-black text-xs uppercase tracking-widest text-white/90 truncate">{quest.title}</span>
                                <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest">Quête</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleRemoveQuest(quest.id)}
                              className="p-2 rounded-lg bg-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/20 transition-colors opacity-30 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => setShowQuestArchive(false)}
                        className="flex items-center gap-2 text-white/60 hover:text-gold-bright transition-colors text-xs font-cinzel font-black uppercase tracking-widest"
                      >
                        <ArrowLeft size={14} /> Retour
                      </button>
                      <div className="relative w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gold-DEFAULT/40" />
                        <input 
                          type="text" 
                          value={searchQuestArchive}
                          onChange={e => setSearchQuestArchive(e.target.value)}
                          placeholder="Rechercher..."
                          className="w-full bg-black/60 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white focus:border-gold-DEFAULT/50 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {filteredArchiveQuests.map(quest => (
                        <div key={quest.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] group hover:border-gold-DEFAULT/20 transition-all">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                             <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                {quest.image_url ? (
                                  <SkillItemImage url={quest.image_url} />
                                ) : (
                                  <Target size={18} className="text-gold-DEFAULT/40" />
                                )}
                             </div>
                             <div className="flex flex-col min-w-0">
                                <span className="font-cinzel font-black text-xs uppercase tracking-widest text-white/90 truncate">{quest.title}</span>
                                <span className="text-[11px] font-mono text-white/50 uppercase">Quête {quest.status}</span>
                             </div>
                          </div>

                          <button 
                            onClick={() => handleAddQuestFromArchive(quest)}
                            className={\`p-2 rounded-lg transition-all \${addedFeedback === quest.id ? 'bg-green-500 text-white' : 'bg-gold-DEFAULT text-black hover:scale-105'}\`}
                          >
                            {addedFeedback === quest.id ? <Plus size={14} className="animate-ping" /> : <Plus size={14} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          `;
    content = content.slice(0, idxStart) + questsUI + content.slice(idxEnd);
}

// 9. Add Target import
if (!content.includes('Target')) {
    content = content.replace("MapPin } from 'lucide-react';", "MapPin, Target } from 'lucide-react';");
}

fs.writeFileSync('src/components/SignetInterface/ManageCharacterModal.tsx', content);
console.log('ManageCharacterModal completely patched successfully!');
