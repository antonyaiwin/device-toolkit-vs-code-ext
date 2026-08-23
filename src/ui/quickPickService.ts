import * as vscode from 'vscode';
import { AndroidDevice } from '../models/device';
import { DeviceService } from '../services/deviceService';

/**
 * QuickPickService – now only responsible for the device selector.
 * The main settings UI lives in the webview panel (DeviceSettingsPanel).
 */
export class QuickPickService {
  constructor(private readonly deviceService: DeviceService) {}

  /**
   * Show a Quick Pick listing all connected devices.
   * @returns true if the user selected a device; false if dismissed.
   */
  async showDeviceSelector(devices: AndroidDevice[]): Promise<boolean> {
    const currentDevice = this.deviceService.selectedDevice;
    const qp = vscode.window.createQuickPick<vscode.QuickPickItem & { serial: string }>();
    qp.title = 'Select Android Device';
    qp.placeholder = 'Choose a device to control…';
    qp.matchOnDescription = true;

    qp.items = devices.map((d) => ({
      label: `$(device-mobile) ${d.displayName}`,
      description: d.type === 'emulator' ? 'Emulator' : 'Physical Device',
      detail: d.serial === currentDevice?.serial ? '$(check) Currently selected' : undefined,
      serial: d.serial,
    }));

    return new Promise((resolve) => {
      let accepted = false;
      qp.onDidAccept(() => {
        const sel = qp.selectedItems[0];
        if (sel?.serial) {
          this.deviceService.selectDevice(sel.serial);
          accepted = true;
        }
        qp.dispose();
        resolve(accepted);
      });
      qp.onDidHide(() => { qp.dispose(); resolve(accepted); });
      qp.show();
    });
  }
}
