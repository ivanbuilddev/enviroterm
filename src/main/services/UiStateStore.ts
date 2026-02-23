import { JsonStore } from './JsonStore';

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

export interface AppState {
  activeWorkspaceId?: string;
  isSidebarVisible?: boolean;
  isExplorerVisible?: boolean;
  editorWidth?: number;
  activeFilePath?: string | null;
  isBottomPanelVisible?: boolean;
  isBrowserPanelVisible?: boolean;
  // potentially add openFiles array later if needed
}

interface UiState {
  window: WindowState;
  app: AppState;
}

const defaultState: UiState = {
  window: {
    width: 1200,
    height: 800,
    isMaximized: false
  },
  app: {
    isSidebarVisible: true,
    isExplorerVisible: false,
    editorWidth: 600,
    activeFilePath: null,
    isBottomPanelVisible: false,
    isBrowserPanelVisible: false
  }
};

class UiStateStoreClass extends JsonStore<UiState> {
  constructor() {
    super('ui_state.json', defaultState);
  }

  getWindowState(): WindowState {
    return this.get('window');
  }

  setWindowState(state: Partial<WindowState>): void {
    const current = this.get('window');
    this.set('window', { ...current, ...state });
  }

  getAppState(): AppState {
    return this.get('app');
  }

  setAppState(state: Partial<AppState>): void {
    const current = this.get('app');
    this.set('app', { ...current, ...state });
  }
}

export const UiStateStore = new UiStateStoreClass();
