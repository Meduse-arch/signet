export interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
}

export const tagsService = {
  getTags: async (sessionId: string): Promise<Tag[]> => {
    if (!window.electronAPI) return [];
    return window.electronAPI.getTags ? window.electronAPI.getTags(sessionId) : [];
  },

  addTag: async (sessionId: string, tag: Tag): Promise<boolean> => {
    if (!window.electronAPI) return false;
    return window.electronAPI.addTag ? window.electronAPI.addTag(sessionId, tag) : false;
  },

  removeTag: async (sessionId: string, id: string): Promise<boolean> => {
    if (!window.electronAPI) return false;
    return window.electronAPI.removeTag ? window.electronAPI.removeTag(sessionId, id) : false;
  }
};
