import * as vscode from 'vscode';
import { AndroidDevice, DeviceStatus, DeviceType } from '../models/device';
import { AdbService } from './adbService';

/**
 * DeviceService – manages connected Android device state.
 *
 * Responsible for:
 *  - Detecting connected Android devices / emulators via ADB
 *  - Tracking the user-selected device
 *  - Firing events when device state changes
 *  - Polling for device changes at a configurable interval
 */
export class DeviceService {
  /** Emits when the list of connected devices changes */
  private readonly _onDevicesChanged = new vscode.EventEmitter<AndroidDevice[]>();
  readonly onDevicesChanged = this._onDevicesChanged.event;

  /** Emits when the active selected device changes */
  private readonly _onSelectedDeviceChanged = new vscode.EventEmitter<AndroidDevice | undefined>();
  readonly onSelectedDeviceChanged = this._onSelectedDeviceChanged.event;

  /** Currently connected devices (those in 'device' status) */
  private _devices: AndroidDevice[] = [];

  /** The serial of the device the user has explicitly selected */
  private _selectedSerial: string | undefined;

  /** Timer handle for the polling interval */
  private _pollTimer: NodeJS.Timeout | undefined;

  /** Poll interval in milliseconds */
  private static readonly POLL_INTERVAL_MS = 4000;

  constructor(private readonly adb: AdbService) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Start polling ADB for connected devices.
   * @param autoDetect If false, polling will not start.
   */
  startPolling(autoDetect: boolean): void {
    if (!autoDetect) {
      return;
    }
    // Trigger an immediate refresh, then schedule recurring polls
    this.refresh();
    this._pollTimer = setInterval(() => this.refresh(), DeviceService.POLL_INTERVAL_MS);
  }

  /** Stop the polling timer */
  stopPolling(): void {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = undefined;
    }
  }

  /**
   * Force an immediate device list refresh.
   */
  async refresh(): Promise<void> {
    try {
      const available = await this.adb.isAdbAvailable();
      if (!available) {
        if (this._devices.length > 0) {
          this._devices = [];
          this._onDevicesChanged.fire([]);
        }
        return;
      }

      const raw = await this.adb.getRawDeviceList();
      const freshDevices = await this.parseDevices(raw);

      // Detect changes: compare serials
      const freshSerials = freshDevices.map((d) => d.serial).sort().join(',');
      const currentSerials = this._devices.map((d) => d.serial).sort().join(',');

      if (freshSerials !== currentSerials) {
        this._devices = freshDevices;

        // Auto-select single device; clear selection if gone
        this.reconcileSelection();
        this._onDevicesChanged.fire(this._devices);
      }
    } catch (err) {
      // Swallow errors during polling – individual actions report their own errors
      console.error('[DeviceService] Refresh error:', err);
    }
  }

  /** Returns all currently detected online devices */
  get devices(): AndroidDevice[] {
    return this._devices;
  }

  /** Returns true if at least one device is connected */
  get hasDevices(): boolean {
    return this._devices.length > 0;
  }

  /**
   * Returns the currently selected device.
   * Falls back to the first device if no explicit selection was made.
   */
  get selectedDevice(): AndroidDevice | undefined {
    if (this._selectedSerial) {
      return this._devices.find((d) => d.serial === this._selectedSerial);
    }
    return this._devices[0];
  }

  /**
   * Explicitly set the active device by serial.
   * Emits `onSelectedDeviceChanged`.
   */
  selectDevice(serial: string): void {
    this._selectedSerial = serial;
    this._onSelectedDeviceChanged.fire(this.selectedDevice);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Parse `adb devices -l` output into AndroidDevice objects.
   * Skips the header line and any empty lines.
   */
  private async parseDevices(raw: string): Promise<AndroidDevice[]> {
    const lines = raw.split('\n').slice(1); // remove "List of devices attached" header
    const devices: AndroidDevice[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      // Format: <serial>\t<status>[  key:value ...]
      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) {
        continue;
      }

      const serial = parts[0];
      const status = parts[1] as DeviceStatus;

      // Only include devices that are fully online
      if (status !== 'device') {
        continue;
      }

      const type: DeviceType = serial.startsWith('emulator-') ? 'emulator' : 'physical';

      // Attempt to resolve the human-readable model name
      let model: string;
      try {
        model = await this.adb.getDeviceModel(serial);
      } catch {
        model = serial;
      }

      const displayName = `${model} (${serial})`;

      devices.push({ serial, displayName, type, status, model });
    }

    return devices;
  }

  /**
   * After a device list change, ensure the selected serial still refers to a
   * connected device. If not, clear the explicit selection so the fallback
   * (first device) takes over.
   */
  private reconcileSelection(): void {
    if (this._selectedSerial) {
      const stillConnected = this._devices.some((d) => d.serial === this._selectedSerial);
      if (!stillConnected) {
        this._selectedSerial = undefined;
        this._onSelectedDeviceChanged.fire(this.selectedDevice);
      }
    } else if (this._devices.length > 0) {
      // No explicit selection → implicitly "selected" the first device; notify
      this._onSelectedDeviceChanged.fire(this.selectedDevice);
    }
  }

  dispose(): void {
    this.stopPolling();
    this._onDevicesChanged.dispose();
    this._onSelectedDeviceChanged.dispose();
  }
}
