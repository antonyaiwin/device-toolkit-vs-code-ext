import * as vscode from 'vscode';
import { CONTEXT_KEYS } from '../constants';
import { DeviceService } from './deviceService';
import { SettingsService } from './settingsService';

/**
 * ToolbarService – manages VS Code context keys that control toolbar button visibility.
 *
 * Pattern: context key = true  →  button appears in debug/toolBar
 *          context key = false →  button hidden
 */
export class ToolbarService {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly settingsService: SettingsService
  ) {}

  initialize(): void {
    this.updateContextKeys();
    this.deviceService.onDevicesChanged(() => this.updateContextKeys());
    this.settingsService.onDidChangeSettings(() => this.updateContextKeys());
  }

  refresh(): void { this.updateContextKeys(); }

  private updateContextKeys(): void {
    const has = this.deviceService.hasDevices;
    const s   = this.settingsService.getSettings();

    const set = (key: string, val: boolean) =>
      void vscode.commands.executeCommand('setContext', key, val);

    // Primary icon – visible when a device is connected AND enabled in settings
    set(CONTEXT_KEYS.HAS_DEVICES,        has);
    set(CONTEXT_KEYS.SHOW_OPEN_CONTROLS,  has && s.showOpenControlsButton);

    // Optional quick-action buttons – visible only when: device connected AND user enabled them
    set(CONTEXT_KEYS.SHOW_DARK_MODE,      has && s.showDarkModeButton);
    set(CONTEXT_KEYS.SHOW_NAV_MODE,       has && s.showNavModeButton);
    set(CONTEXT_KEYS.SHOW_TALKBACK,      has && s.showTalkBackButton);
    set(CONTEXT_KEYS.SHOW_SELECT_TO_SPEAK, has && s.showSelectToSpeakButton);
    set(CONTEXT_KEYS.SHOW_FONT_SIZE,      has && s.showFontSizeButton);
    set(CONTEXT_KEYS.SHOW_DISPLAY_SIZE,   has && s.showDisplaySizeButton);
    set(CONTEXT_KEYS.SHOW_LAYOUT_BOUNDS,  has && s.showLayoutBoundsButton);
    set(CONTEXT_KEYS.SHOW_RECORD,        has && s.showRecordButton);
  }
}
