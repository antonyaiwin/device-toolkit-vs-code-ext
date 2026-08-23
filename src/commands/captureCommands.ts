import * as vscode from 'vscode';
import { COMMANDS } from '../constants';
import { AdbService } from '../services/adbService';
import { DeviceService } from '../services/deviceService';
import { QuickPickService } from '../ui/quickPickService';
import { RecordingPanel } from '../ui/webview/recordingPanel';

/**
 * Register the screen-record toolbar quick-action command.
 *
 * Behaviour:
 *  - If recording is already in progress → reveal the RecordingPanel.
 *  - If multiple devices are connected → show device picker first.
 *  - Otherwise → start recording and open a dedicated RecordingPanel.
 */
export function registerCaptureCommands(
  context: vscode.ExtensionContext,
  adb: AdbService,
  deviceService: DeviceService,
  qp: QuickPickService
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.START_RECORDING, async () => {
      // If already recording, just surface the existing panel
      if (adb.isRecording) {
        RecordingPanel.reveal();
        return;
      }

      const available = await adb.isAdbAvailable();
      if (!available) { AdbService.notifyAdbNotFound(); return; }

      await deviceService.refresh();
      const devices = deviceService.devices;

      if (devices.length === 0) {
        vscode.window.showWarningMessage('No Android devices connected. Connect a device or start an emulator.');
        return;
      }

      // Show device picker when more than one device is connected
      if (devices.length > 1) {
        const picked = await qp.showDeviceSelector(devices);
        if (!picked) { return; }
      }

      const device = deviceService.selectedDevice;
      if (!device) { return; }

      await RecordingPanel.startRecording(context, adb, device.serial, device.displayName);
    })
  );
}
