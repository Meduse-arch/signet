import { create } from 'zustand';
import { Skill, skillsService } from '../services/skills.service';
import { setupStoreSync, emitStoreSync } from './utils/storeSync';

interface SkillsState {
  skills: Skill[];
  setSkills: (skills: Skill[]) => void;
  initialize: (sessionId: string) => Promise<void>;
  addSkill: (sessionId: string, skill: Skill, skipSync?: boolean) => Promise<void>;
  removeSkill: (sessionId: string, id: string, skipSync?: boolean) => Promise<void>;
}

export const useSkillsStore = create<SkillsState>((set, get) => ({
  skills: [],
  setSkills: (skills) => set({ skills }),
  
  initialize: async (sessionId: string) => {
    set({ skills: [] });
    const skills = await skillsService.getSkills(sessionId);
    set({ skills });

    setupStoreSync('skills', sessionId, async (type, payload) => {
      if (type === 'SKILLS_UPDATE_INTERNAL') {
        const freshSkills = await skillsService.getSkills(sessionId);
        set({ skills: freshSkills });
      }
    });
  },

  addSkill: async (sessionId, skill, skipSync = false) => {
    const success = await skillsService.addSkill(sessionId, skill);
    if (success) {
      const state = get();
      const existing = state.skills.find(s => s.id === skill.id);
      let newSkills;
      if (existing) {
        newSkills = state.skills.map(s => s.id === skill.id ? skill : s);
        
        // --- MISE À JOUR SYNCHRONE DES PERSONNAGES ---
        const { useCharactersStore } = await import('./characters');
        const charStore = useCharactersStore.getState();
        const affectedChars = charStore.characters.filter(c => 
          c.custom_skills?.some((s: any) => s.id === skill.id)
        );

        if (affectedChars.length > 0) {
          affectedChars.forEach(char => {
            const updatedCustomSkills = char.custom_skills?.map((s: any) => 
              s.id === skill.id ? { ...skill, is_active: s.is_active, instanceId: s.instanceId } : s
            );
            const updatedChar = { ...char, custom_skills: updatedCustomSkills };
            charStore.addOrUpdateCharacter(updatedChar);
            
            if ((window as any).electronAPI) {
              (window as any).electronAPI.updateCharacter(
                sessionId, updatedChar.id, updatedChar.name, updatedChar.stats, 
                updatedChar.skills, updatedChar.bars, updatedChar.image_url, 
                updatedChar.inventory, updatedChar.custom_skills, updatedChar.type, 
                updatedChar.is_template, updatedChar.quests
              ).catch(console.error);
            }
          });
        }
      } else {
        newSkills = [...state.skills, skill];
      }
      set({ skills: newSkills });

      if (!skipSync) {
        emitStoreSync('skills', sessionId, 'SKILLS_UPDATE_INTERNAL', skill);
      }
    }
  },

  removeSkill: async (sessionId, id, skipSync = false) => {
    const success = await skillsService.removeSkill(sessionId, id);
    if (success) {
      const state = get();
      set({ skills: state.skills.filter(s => s.id !== id) });

      if (!skipSync) {
        emitStoreSync('skills', sessionId, 'SKILLS_UPDATE_INTERNAL', { id, deleted: true });
      }
    }
  }
}));
