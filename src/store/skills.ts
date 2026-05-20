import { create } from 'zustand';
import { Skill, skillsService } from '../services/skills.service';

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
    const skills = await skillsService.getSkills(sessionId);
    set({ skills });

    const syncChannel = new BroadcastChannel(`sigil_skills_store_sync_${sessionId}`);
    syncChannel.onmessage = async (event) => {
      const { type } = event.data;
      if (type === 'SKILLS_UPDATE_INTERNAL') {
        const freshSkills = await skillsService.getSkills(sessionId);
        set({ skills: freshSkills });
      }
    };
  },

  addSkill: async (sessionId, skill, skipSync = false) => {
    const success = await skillsService.addSkill(sessionId, skill);
    if (success) {
      const state = get();
      const existing = state.skills.find(s => s.id === skill.id);
      let newSkills;
      if (existing) {
        newSkills = state.skills.map(s => s.id === skill.id ? skill : s);
      } else {
        newSkills = [...state.skills, skill];
      }
      set({ skills: newSkills });

      if (!skipSync) {
        const syncChannel = new BroadcastChannel(`sigil_skills_store_sync_${sessionId}`);
        syncChannel.postMessage({ type: 'SKILLS_UPDATE_INTERNAL', payload: skill });
      }
    }
  },

  removeSkill: async (sessionId, id, skipSync = false) => {
    const success = await skillsService.removeSkill(sessionId, id);
    if (success) {
      const state = get();
      set({ skills: state.skills.filter(s => s.id !== id) });

      if (!skipSync) {
        const syncChannel = new BroadcastChannel(`sigil_skills_store_sync_${sessionId}`);
        syncChannel.postMessage({ type: 'SKILLS_UPDATE_INTERNAL', payload: { id, deleted: true } });
      }
    }
  }
}));
