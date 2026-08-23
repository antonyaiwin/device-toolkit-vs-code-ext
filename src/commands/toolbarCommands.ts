import * as vscode from 'vscode';
import { COMMANDS } from '../constants';
import { AdbService } from '../services/adbService';
import { DeviceService } from '../services/deviceService';
import { QuickPickService } from '../ui/quickPickService';
import {
  TALKBACK_SERVICE,
  SELECT_TO_SPEAK_SERVICE,
  FONT_SCALE_OPTIONS,
  DISPLAY_DENSITY_OPTIONS,
} from '../models/device';

/**
 * Register individual toolbar quick-action commands.
 *
 * Behaviour:
 *  - Boolean settings (dark mode, TalkBack, Select to Speak, layout bounds)
 *    → read current state, toggle it, show informational notification.
 *  - Multi-value settings (navigation mode, font size, display size)
 *    → open a Quick Pick with all options; the currently active option is
 *      marked with $(check) so the user can see what is selected.
 *  - All commands show a device picker first if multiple devices are connected.
 */
export function registerToolbarCommands(
  context: vscode.ExtensionContext,
  adb: AdbService,
  deviceService: DeviceService,
  qp: QuickPickService
): void {

  // ── Shared helper: device picker + action ──────────────────────────────────
  async function withDevice(
    action: (serial: string, name: string) => Promise<void>
  ): Promise<void> {
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
    await action(device.serial, device.displayName);
  }

  // ── Toggle Dark Mode ───────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.TOGGLE_DARK_MODE, () =>
      withDevice(async (serial, name) => {
        const isEnabled = await adb.getDarkMode(serial);
        await adb.setDarkMode(serial, !isEnabled);
        vscode.window.showInformationMessage(
          `${!isEnabled ? '🌙 Dark mode enabled' : '☀️ Dark mode disabled'} on ${name}`
        );
      })
    )
  );

  // ── Navigation Mode (Quick Pick) ───────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.SET_NAV_MODE, () =>
      withDevice(async (serial, name) => {
        const current = await adb.getNavigationMode(serial);
        const options: Array<{ label: string; description: string; value: string }> = [
          { label: current === '2' ? '$(check)  Gesture Navigation' : '   Gesture Navigation', description: 'Swipe-based, no buttons', value: '2' },
          { label: current === '1' ? '$(check)  2-Button Navigation' : '   2-Button Navigation', description: 'Back + Home', value: '1' },
          { label: current === '0' ? '$(check)  3-Button Navigation' : '   3-Button Navigation', description: 'Back, Home, Recents', value: '0' },
        ];

        const picked = await vscode.window.showQuickPick(options, {
          title: `Navigation Mode  ·  ${name}`,
          placeHolder: 'Select navigation style…',
          matchOnDescription: true,
        });
        if (!picked) { return; }
        await adb.setNavigationMode(serial, picked.value);
        vscode.window.showInformationMessage(
          `Navigation set to ${picked.label.replace(/^\s*\$\(check\)\s*/, '').trim()} on ${name}`
        );
      })
    )
  );

  // ── Toggle TalkBack ────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.TOGGLE_TALKBACK, () =>
      withDevice(async (serial, name) => {
        const isEnabled = await adb.getAccessibilityServiceEnabled(serial, TALKBACK_SERVICE);
        await adb.setAccessibilityService(serial, TALKBACK_SERVICE, !isEnabled);
        vscode.window.showInformationMessage(
          `${!isEnabled ? '🔊 TalkBack enabled' : '🔇 TalkBack disabled'} on ${name}`
        );
      })
    )
  );

  // ── Toggle Select to Speak ─────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.TOGGLE_SELECT_TO_SPEAK, () =>
      withDevice(async (serial, name) => {
        const isEnabled = await adb.getAccessibilityServiceEnabled(serial, SELECT_TO_SPEAK_SERVICE);
        await adb.setAccessibilityService(serial, SELECT_TO_SPEAK_SERVICE, !isEnabled);
        vscode.window.showInformationMessage(
          `${!isEnabled ? '💬 Select to Speak enabled' : '💬 Select to Speak disabled'} on ${name}`
        );
      })
    )
  );

  // ── Font Size (Quick Pick) ─────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.SET_FONT_SIZE, () =>
      withDevice(async (serial, name) => {
        const current = await adb.getFontScale(serial);
        const options = FONT_SCALE_OPTIONS.map((o) => ({
          label: o.value === current ? `$(check)  ${o.label}` : `   ${o.label}`,
          description: `scale: ${o.value}`,
          value: o.value,
        }));

        const picked = await vscode.window.showQuickPick(options, {
          title: `Font Size  ·  ${name}`,
          placeHolder: 'Select font scale…',
        });
        if (!picked) { return; }
        await adb.setFontScale(serial, picked.value);
        vscode.window.showInformationMessage(
          `Font size set to ${picked.label.replace(/^\s*\$\(check\)\s*/, '').trim()} on ${name}`
        );
      })
    )
  );

  // ── Display Size (Quick Pick) ──────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.SET_DISPLAY_SIZE, () =>
      withDevice(async (serial, name) => {
        const current = await adb.getDisplayDensity(serial);
        const options = DISPLAY_DENSITY_OPTIONS.map((o) => ({
          label: o.value === current ? `$(check)  ${o.label}` : `   ${o.label}`,
          description: o.value === 'default' ? 'reset to device default' : `${o.value} dpi`,
          value: o.value,
        }));

        const picked = await vscode.window.showQuickPick(options, {
          title: `Display Size  ·  ${name}`,
          placeHolder: 'Select display density…',
        });
        if (!picked) { return; }
        await adb.setDisplayDensity(serial, picked.value);
        vscode.window.showInformationMessage(
          `Display size set to ${picked.label.replace(/^\s*\$\(check\)\s*/, '').trim()} on ${name}`
        );
      })
    )
  );

  // ── Toggle Layout Bounds ───────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.TOGGLE_LAYOUT_BOUNDS, () =>
      withDevice(async (serial, name) => {
        const isEnabled = await adb.getLayoutBounds(serial);
        await adb.setLayoutBounds(serial, !isEnabled);
        vscode.window.showInformationMessage(
          `${!isEnabled ? '🏗️ Layout bounds shown' : '🏗️ Layout bounds hidden'} on ${name}`
        );
      })
    )
  );
}
