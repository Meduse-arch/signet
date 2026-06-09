import { itemsService } from './items.service';

export interface SkillModifier {
  target: 'stat' | 'bar';
  targetId: string;
  targetProperty?: 'value' | 'max';
  mode: 'flat' | 'percent' | 'dice';
  value: number;
  formula?: string;
  description?: string;
}

export interface SkillEffect {
  id: string;
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'utility';
  target: 'self' | 'target' | 'area';
  cible_jauge?: string;
  valeur: number;
  mode: 'flat' | 'percent' | 'dice';
  formula?: string;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'active' | 'passive_auto' | 'passive_toggle';
  image_url?: string;
  tags: string[];
  modifiers: SkillModifier[];
  effects: SkillEffect[];
  cost?: {
    value: number;
    barId: string;
  };
  costs?: {
    id: string;
    mode: 'fixed' | 'percent' | 'dice';
    value: number;
    formula?: string;
    barId: string;
  }[];
  condition_type?: 'item' | 'skill' | 'les_deux' | null;
  condition_tags?: string[];
}

export const skillsService = {
  getSkills: async (sessionId: string): Promise<Skill[]> => {
    if (!window.electronAPI) return [];
    // Nous allons utiliser la même approche que itemsService pour l'instant
    // et enrichir electronAPI plus tard si nécessaire
    return window.electronAPI.getSkills ? window.electronAPI.getSkills(sessionId) : [];
  },

  addSkill: async (sessionId: string, skill: Skill): Promise<boolean> => {
    if (!window.electronAPI) return false;
    return window.electronAPI.addSkill ? window.electronAPI.addSkill(sessionId, skill) : false;
  },

  removeSkill: async (sessionId: string, id: string): Promise<boolean> => {
    if (!window.electronAPI) return false;
    return window.electronAPI.removeSkill ? window.electronAPI.removeSkill(sessionId, id) : false;
  }
};
