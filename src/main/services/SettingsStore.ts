import Store from 'electron-store';
import { randomUUID } from 'crypto';

export interface KeyboardShortcut {
  id: string;
  name: string;
  keys: string[];
  action?: string;
}

interface SettingsSchema {
  initialCommand: string;
  keyboardShortcuts: KeyboardShortcut[];
  workspaceOverrides: Record<string, Partial<SettingsSchema>>;
}

const store = new Store<SettingsSchema>({
  name: 'settings',
  defaults: {
    initialCommand: 'claude',
    keyboardShortcuts: [],
    workspaceOverrides: {}
  }
});

export const SettingsStore = {
  getAll(directoryId?: string): SettingsSchema {
    const global: SettingsSchema = {
      initialCommand: store.get('initialCommand'),
      keyboardShortcuts: store.get('keyboardShortcuts'),
      workspaceOverrides: store.get('workspaceOverrides') || {}
    };

    if (!directoryId) return global;

    const overrides = global.workspaceOverrides[directoryId] || {};
    return {
      initialCommand: overrides.initialCommand ?? global.initialCommand,
      keyboardShortcuts: overrides.keyboardShortcuts ?? global.keyboardShortcuts,
      workspaceOverrides: global.workspaceOverrides
    };
  },

  setAll(settings: Partial<SettingsSchema>, directoryId?: string): void {
    if (!directoryId) {
      if (settings.initialCommand !== undefined) {
        store.set('initialCommand', settings.initialCommand);
      }
      if (settings.keyboardShortcuts !== undefined) {
        store.set('keyboardShortcuts', settings.keyboardShortcuts);
      }
    } else {
      const overrides = store.get('workspaceOverrides') || {};
      const currentOverride = overrides[directoryId] || {};

      overrides[directoryId] = {
        ...currentOverride,
        ...(settings.initialCommand !== undefined && { initialCommand: settings.initialCommand }),
        ...(settings.keyboardShortcuts !== undefined && { keyboardShortcuts: settings.keyboardShortcuts })
      };

      store.set('workspaceOverrides', overrides);
    }
  },

  deleteForWorkspace(directoryId: string): void {
    const overrides = store.get('workspaceOverrides') || {};
    if (overrides[directoryId]) {
      delete overrides[directoryId];
      store.set('workspaceOverrides', overrides);
    }
  },

  getInitialCommand(directoryId?: string): string {
    if (directoryId) {
      const overrides = store.get('workspaceOverrides') || {};
      if (overrides[directoryId]?.initialCommand !== undefined) {
        return overrides[directoryId].initialCommand!;
      }
    }
    return store.get('initialCommand');
  },

  setInitialCommand(command: string, directoryId?: string): void {
    if (!directoryId) {
      store.set('initialCommand', command);
    } else {
      const overrides = store.get('workspaceOverrides') || {};
      overrides[directoryId] = { ...(overrides[directoryId] || {}), initialCommand: command };
      store.set('workspaceOverrides', overrides);
    }
  },

  getKeyboardShortcuts(directoryId?: string): KeyboardShortcut[] {
    if (directoryId) {
      const overrides = store.get('workspaceOverrides') || {};
      if (overrides[directoryId]?.keyboardShortcuts !== undefined) {
        return overrides[directoryId].keyboardShortcuts!;
      }
    }
    return store.get('keyboardShortcuts');
  },

  addKeyboardShortcut(shortcut: Omit<KeyboardShortcut, 'id'>, directoryId?: string): KeyboardShortcut {
    const newShortcut: KeyboardShortcut = {
      ...shortcut,
      id: randomUUID()
    };

    if (!directoryId) {
      const shortcuts = store.get('keyboardShortcuts');
      shortcuts.push(newShortcut);
      store.set('keyboardShortcuts', shortcuts);
    } else {
      const overrides = store.get('workspaceOverrides') || {};
      const shortcuts = overrides[directoryId]?.keyboardShortcuts || [...store.get('keyboardShortcuts')];
      shortcuts.push(newShortcut);
      overrides[directoryId] = { ...(overrides[directoryId] || {}), keyboardShortcuts: shortcuts };
      store.set('workspaceOverrides', overrides);
    }
    return newShortcut;
  }
};
