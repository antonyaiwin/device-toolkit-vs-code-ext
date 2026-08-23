import * as vscode from 'vscode';
import { ExtensionSettings } from '../models/settings';

import { CONFIG_NAMESPACE } from '../constants';

/** Reads extension settings and fires an event on changes. */
export class SettingsService {
  private readonly _onDidChangeSettings = new vscode.EventEmitter<ExtensionSettings>();
  readonly onDidChangeSettings = this._onDidChangeSettings.event;
  private disposable: vscode.Disposable;

  constructor() {
    this.disposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(CONFIG_NAMESPACE)) {
        this._onDidChangeSettings.fire(this.getSettings());
      }
    });
  }

  getSettings(): ExtensionSettings {
    const c = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    return {
      autoDetectDevices:      c.get<boolean>('autoDetectDevices', true),
      showDarkModeButton:     c.get<boolean>('showDarkModeButton', false),
      showOpenControlsButton: c.get<boolean>('showOpenControlsButton', true),
      showNavModeButton:      c.get<boolean>('showNavModeButton', false),
      showTalkBackButton:     c.get<boolean>('showTalkBackButton', false),
      showSelectToSpeakButton: c.get<boolean>('showSelectToSpeakButton', false),
      showFontSizeButton:     c.get<boolean>('showFontSizeButton', false),
      showDisplaySizeButton:  c.get<boolean>('showDisplaySizeButton', false),
      showLayoutBoundsButton: c.get<boolean>('showLayoutBoundsButton', false),
      showRecordButton:       c.get<boolean>('showRecordButton', false),
      outputDirectory:        c.get<string>('outputDirectory', ''),
      androidSdkPath:         c.get<string>('androidSdkPath', ''),
    };
  }

  dispose(): void {
    this.disposable.dispose();
    this._onDidChangeSettings.dispose();
  }
}
