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
}

interface WorkspaceSettings {
  overrides: Record<string, Partial<GlobalSettings>>;
}

const globalStore = new JsonStore<GlobalSettings>('global_settings.json', {
  initialCommand: 'claude',
  keyboardShortcuts: []
});

const workspaceStore = new JsonStore<WorkspaceSettings>('workspace_settings.json', {
  overrides: {}
});

export const SettingsStore = {
  getAll(directoryId?: string): GlobalSettings & { workspaceOverrides?: Record<string, Partial<GlobalSettings>> } {
    const global = globalStore.getAll();
    const overrides = workspaceStore.get('overrides');

    if (!directoryId) {
      return {
        ...global,
        workspaceOverrides: overrides
      };
    }

    const workspaceOverride = overrides[directoryId] || {};

    // Initial command: follow workspace override if defined, else global
    const initialCommand = workspaceOverride.initialCommand !== undefined
      ? workspaceOverride.initialCommand
      : global.initialCommand;

    // Shortcuts: follow workspace override if its list is NOT empty, else global
    const keyboardShortcuts = (workspaceOverride.keyboardShortcuts && workspaceOverride.keyboardShortcuts.length > 0)
      ? workspaceOverride.keyboardShortcuts
      : global.keyboardShortcuts;

    return {
      initialCommand,
      keyboardShortcuts,
      workspaceOverrides: overrides
    };
  },

  setAll(settings: Partial<GlobalSettings>, directoryId?: string): void {
    if (!directoryId) {
      if (settings.initialCommand !== undefined) {
        globalStore.set('initialCommand', settings.initialCommand);
      }
      if (settings.keyboardShortcuts !== undefined) {
        globalStore.set('keyboardShortcuts', settings.keyboardShortcuts);
      }
    } else {
      const overrides = workspaceStore.get('overrides');
      const currentOverride = overrides[directoryId] || {};

      overrides[directoryId] = {
        ...currentOverride,
        ...(settings.initialCommand !== undefined && { initialCommand: settings.initialCommand }),
        ...(settings.keyboardShortcuts !== undefined && { keyboardShortcuts: settings.keyboardShortcuts })
      };

      workspaceStore.set('overrides', overrides);
    }
  },

  deleteForWorkspace(directoryId: string): void {
    const overrides = workspaceStore.get('overrides');
    if (overrides[directoryId]) {
      delete overrides[directoryId];
      workspaceStore.set('overrides', overrides);
    }
  },

  getInitialCommand(directoryId?: string): string {
    if (directoryId) {
      const overrides = workspaceStore.get('overrides');
      if (overrides[directoryId]?.initialCommand !== undefined) {
        return overrides[directoryId].initialCommand!;
      }
    }
    return globalStore.get('initialCommand');
  },

  getKeyboardShortcuts(directoryId?: string): KeyboardShortcut[] {
    const globalShortcuts = globalStore.get('keyboardShortcuts') || [];
    if (directoryId) {
      const overrides = workspaceStore.get('overrides');
      const workspaceShortcuts = overrides[directoryId]?.keyboardShortcuts;
      if (workspaceShortcuts && workspaceShortcuts.length > 0) {
        return workspaceShortcuts;
      }
    }
    return globalShortcuts;
  },

  addKeyboardShortcut(shortcut: Omit<KeyboardShortcut, 'id'>, directoryId?: string): KeyboardShortcut {
    const newShortcut: KeyboardShortcut = {
      ...shortcut,
      id: randomUUID()
    };

    if (!directoryId) {
      const shortcuts = globalStore.get('keyboardShortcuts');
      shortcuts.push(newShortcut);
      globalStore.set('keyboardShortcuts', shortcuts);
    } else {
      const overrides = workspaceStore.get('overrides');
      const currentOverride = overrides[directoryId] || {};
      const shortcuts = currentOverride.keyboardShortcuts || [...globalStore.get('keyboardShortcuts')];

      shortcuts.push(newShortcut);
      overrides[directoryId] = { ...currentOverride, keyboardShortcuts: shortcuts };
      workspaceStore.set('overrides', overrides);
    }
    return newShortcut;
  }
};
