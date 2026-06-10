import { SealSettingsModal } from '../../components/CreateSessionModal/SealSettingsModal';
import { SealCharacterSheet } from './components/SealCharacterSheet';
import { DEFAULT_SEAL_SETTINGS } from './constants';
import type { GameSystem } from '../core/types';

/**
 * Seal Engine – the default game system shipped with Signet.
 * Implements the GameSystem interface so it can be loaded by CoreEngine / SystemRouter.
 */
export const SealSystem: GameSystem = {
  id: 'seal',
  name: 'Seal Engine',
  defaultSettings: DEFAULT_SEAL_SETTINGS,
  components: {
    SettingsModal: SealSettingsModal,
    CharacterSheet: SealCharacterSheet,
  },
};

export default SealSystem;
