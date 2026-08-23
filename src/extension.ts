import * as vscode from 'vscode';
import { COMMANDS, EXTENSION_ID, EXTENSION_NAME } from './constants';
import { AdbService } from './services/adbService';
import { DeviceService } from './services/deviceService';
import { SettingsService } from './services/settingsService';
import { ToolbarService } from './services/toolbarService';
import { QuickPickService } from './ui/quickPickService';
import { DeviceControlsView } from './ui/activityBar/deviceControlsView';
import { RecordingPanel } from './ui/webview/recordingPanel';
import { registerDeviceCommands } from './commands/deviceCommands';
import { registerCaptureCommands } from './commands/captureCommands';
import { registerToolbarCommands } from './commands/toolbarCommands';

import { SdkManager } from './services/sdkManager';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log(`[${EXTENSION_ID}] Activating…`);

  const adbService       = new AdbService();
  const sdkManager       = new SdkManager();
  const settingsService  = new SettingsService();

  // Detect Android SDK and set ADB path
  const initialSdkInfo = await sdkManager.detect();
  if (initialSdkInfo?.adbPath) {
    adbService.setAdbPath(initialSdkInfo.adbPath);
  }

  const deviceService    = new DeviceService(adbService);
  const toolbarService   = new ToolbarService(deviceService, settingsService);
  const quickPickService = new QuickPickService(deviceService);

  context.subscriptions.push(deviceService, settingsService);
  toolbarService.initialize();

  // ── Activity Bar sidebar webview ────────────────────────────────────────
  const controlsView = new DeviceControlsView(
    context, adbService, deviceService, quickPickService, context.subscriptions
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(DeviceControlsView.viewType, controlsView, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // Refresh command wired to view/title $(refresh) button
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.AVD_REFRESH, async () => {
      await deviceService.refresh();
      controlsView.refresh();
    })
  );

  // ── Other commands ──────────────────────────────────────────────────────
  registerDeviceCommands(context, adbService, deviceService, quickPickService);
  registerCaptureCommands(context, adbService, deviceService, quickPickService);
  registerToolbarCommands(context, adbService, deviceService, quickPickService);

  // ── Handle 3-minute recording timeout auto-save ──────────────────────────
  adbService.onRecordingAutoEnded(async ({ serial }) => {
    await RecordingPanel.stopCurrent(context, adbService, serial);
  });

  // ── Polling & Settings Changes ───────────────────────────────────────────
  const settings = settingsService.getSettings();
  deviceService.startPolling(settings.autoDetectDevices);

  settingsService.onDidChangeSettings(async (s) => {
    const updatedSdkInfo = await sdkManager.detect();
    if (updatedSdkInfo?.adbPath) {
      adbService.setAdbPath(updatedSdkInfo.adbPath);
    }
    deviceService.stopPolling();
    deviceService.startPolling(s.autoDetectDevices);
    toolbarService.refresh();
  });

  const adbAvailable = await adbService.isAdbAvailable();
  if (!adbAvailable) {
    vscode.window.showWarningMessage(
      `${EXTENSION_NAME}: ADB not found in PATH.`, 'Learn More'
    ).then((s) => {
      if (s === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://developer.android.com/tools/releases/platform-tools'));
      }
    });
  }

  console.log(`[${EXTENSION_ID}] Activated.`);
}

export function deactivate(): void {
  console.log(`[${EXTENSION_ID}] Deactivated.`);
}
