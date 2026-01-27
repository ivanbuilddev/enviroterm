import { randomUUID } from 'crypto';
import { JsonStore } from './JsonStore';

export interface KeyboardShortcut {
  id: string;
  name: string;
  keys: string[];
  action?: string;
}

interface GlobalSettings {
  initialCommand: string;
  keyboardShortcuts: KeyboardShortcut[];
  imageShortcut: string[];
}

interface WorkspaceSettings {
  overrides: Record<string, Partial<GlobalSettings>>;
}

const globalStore = new JsonStore<GlobalSettings>('global_settings.json', {
  initialCommand: 'claude',
  keyboardShortcuts: [],
  imageShortcut: ['Alt', 'V']
});

const workspaceStore = new JsonStore<WorkspaceSettings>('workspace_settings.json', {
  overrides: {}
});

export const SettingsStore = {
  getAll(workspaceId?: string): GlobalSettings & { workspaceOverrides?: Record<string, Partial<GlobalSettings>> } {
    const global = globalStore.getAll();
    const overrides = workspaceStore.get('overrides');

    if (!workspaceId) {
      return {
        ...global,
        workspaceOverrides: overrides
      };
    }

    const workspaceOverride = overrides[workspaceId] || {};

    // Initial command: follow workspace override if defined, else global
    const initialCommand = workspaceOverride.initialCommand !== undefined
      ? workspaceOverride.initialCommand
      : global.initialCommand;

    // Shortcuts: follow workspace override if its list is NOT empty, else global
    const keyboardShortcuts = (workspaceOverride.keyboardShortcuts && workspaceOverride.keyboardShortcuts.length > 0)
      ? workspaceOverride.keyboardShortcuts
      : global.keyboardShortcuts;

    // Image shortcut: follow workspace override if defined, else global
    const imageShortcut = workspaceOverride.imageShortcut !== undefined
      ? workspaceOverride.imageShortcut
      : (global.imageShortcut || ['Alt', 'V']);

    return {
      initialCommand,
      keyboardShortcuts,
      imageShortcut,
      workspaceOverrides: overrides
    };
  },

  setAll(settings: Partial<GlobalSettings>, workspaceId?: string): void {
    if (!workspaceId) {
      if (settings.initialCommand !== undefined) {
        globalStore.set('initialCommand', settings.initialCommand);
      }
      if (settings.keyboardShortcuts !== undefined) {
        globalStore.set('keyboardShortcuts', settings.keyboardShortcuts);
      }
      if (settings.imageShortcut !== undefined) {
        globalStore.set('imageShortcut', settings.imageShortcut);
      }
    } else {
      const overrides = workspaceStore.get('overrides');
      const currentOverride = overrides[workspaceId] || {};

      overrides[workspaceId] = {
        ...currentOverride,
        ...(settings.initialCommand !== undefined && { initialCommand: settings.initialCommand }),
        ...(settings.keyboardShortcuts !== undefined && { keyboardShortcuts: settings.keyboardShortcuts }),
        ...(settings.imageShortcut !== undefined && { imageShortcut: settings.imageShortcut })
      };

      workspaceStore.set('overrides', overrides);
    }
  },

  deleteForWorkspace(workspaceId: string): void {
    const overrides = workspaceStore.get('overrides');
    if (overrides[workspaceId]) {
      delete overrides[workspaceId];
      workspaceStore.set('overrides', overrides);
    }
  },

  getInitialCommand(workspaceId?: string): string {
    if (workspaceId) {
      const overrides = workspaceStore.get('overrides');
      if (overrides[workspaceId]?.initialCommand !== undefined) {
        return overrides[workspaceId].initialCommand!;
      }
    }
    return globalStore.get('initialCommand');
  },

  getKeyboardShortcuts(workspaceId?: string): KeyboardShortcut[] {
    const globalShortcuts = globalStore.get('keyboardShortcuts') || [];
    if (workspaceId) {
      const overrides = workspaceStore.get('overrides');
      const workspaceShortcuts = overrides[workspaceId]?.keyboardShortcuts;
      if (workspaceShortcuts && workspaceShortcuts.length > 0) {
        return workspaceShortcuts;
      }
    }
    return globalShortcuts;
  },

  addKeyboardShortcut(shortcut: Omit<KeyboardShortcut, 'id'>, workspaceId?: string): KeyboardShortcut {
    const newShortcut: KeyboardShortcut = {
      ...shortcut,
      id: randomUUID()
    };

    if (!workspaceId) {
      const shortcuts = globalStore.get('keyboardShortcuts');
      shortcuts.push(newShortcut);
      globalStore.set('keyboardShortcuts', shortcuts);
    } else {
      const overrides = workspaceStore.get('overrides');
      const currentOverride = overrides[workspaceId] || {};
      const shortcuts = currentOverride.keyboardShortcuts || [...globalStore.get('keyboardShortcuts')];

      shortcuts.push(newShortcut);
      overrides[workspaceId] = { ...currentOverride, keyboardShortcuts: shortcuts };
      workspaceStore.set('overrides', overrides);
    }
    return newShortcut;
  }
};
