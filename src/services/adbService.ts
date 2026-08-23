import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import type { ChildProcess } from 'child_process';
import { TALKBACK_SERVICE, SELECT_TO_SPEAK_SERVICE, SELECT_TO_SPEAK_SERVICE_AOSP } from '../models/device';

const execAsync = promisify(exec);

/**
 * AdbService – thin wrapper around the `adb` CLI.
 * Handles all ADB communication, state reads, and recording lifecycle.
 */
export class AdbService {
  private adbPath = 'adb';

  /** Active screenrecord process (null when not recording) */
  private _recordingProcess: ChildProcess | null = null;
  /** Remote path of the current recording on the device */
  private _currentRemotePath: string | null = null;
  /** Serial of the active recording device */
  private _recordingSerial: string | null = null;

  get isRecording(): boolean { return this._recordingProcess !== null || this._currentRemotePath !== null; }
  get currentRemotePath(): string | null { return this._currentRemotePath; }
  get recordingSerial(): string | null { return this._recordingSerial; }

  /** Get current resolved ADB executable path */
  getAdbPath(): string { return this.adbPath; }

  /** Dynamically set ADB executable path */
  setAdbPath(path: string): void {
    if (path && path.trim()) {
      this.adbPath = path.trim();
    }
  }

  /** Helper to safely format ADB path for CLI execution */
  private getExecPath(): string {
    const trimmed = this.adbPath.trim();
    return trimmed.includes(' ') && !trimmed.startsWith('"')
      ? `"${trimmed}"`
      : trimmed;
  }

  /** Fires `true` when recording starts, `false` when it stops. */
  private readonly _onRecordingChanged = new vscode.EventEmitter<boolean>();
  readonly onRecordingChanged = this._onRecordingChanged.event;

  /** Fires when recording process auto-ends (e.g. 3-minute Android limit reached). */
  private readonly _onRecordingAutoEnded = new vscode.EventEmitter<{ serial: string; remotePath: string }>();
  readonly onRecordingAutoEnded = this._onRecordingAutoEnded.event;

  // ── Availability ────────────────────────────────────────────────────────────

  async isAdbAvailable(): Promise<boolean> {
    try { await execAsync(`${this.getExecPath()} version`); return true; }
    catch { return false; }
  }

  // ── Device listing ──────────────────────────────────────────────────────────

  async getRawDeviceList(): Promise<string> {
    const { stdout } = await execAsync(`${this.getExecPath()} devices -l`);
    return stdout;
  }

  async getDeviceModel(serial: string): Promise<string> {
    try {
      if (serial.startsWith('emulator-')) {
        // `adb emu avd name` talks to the emulator console and returns:
        //   Pixel_7
        //   OK
        // This is the most reliable source for the user-visible AVD name.
        const { stdout } = await execAsync(`${this.getExecPath()} -s ${serial} emu avd name`);
        const firstLine = stdout.split('\n')[0].trim();
        if (firstLine && firstLine !== 'OK' && firstLine !== '') {
          return firstLine.replace(/_/g, ' ');
        }
        // Fallback: system property (not available on all API levels)
        const avdProp = await this.runShellCommand(serial, 'getprop ro.kernel.qemu.avd_name');
        if (avdProp && avdProp !== 'null' && avdProp.trim() !== '') {
          return avdProp.trim().replace(/_/g, ' ');
        }
      }
      return (await this.runShellCommand(serial, 'getprop ro.product.model')) || serial;
    } catch { return serial; }
  }

  // ── Shell / raw commands ────────────────────────────────────────────────────

  async runShellCommand(serial: string, command: string): Promise<string> {
    const { stdout } = await execAsync(`${this.getExecPath()} -s ${serial} shell ${command}`);
    return stdout.trim();
  }

  async runRawCommand(serial: string, args: string[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const { execFile } = require('child_process') as typeof import('child_process');
      const chunks: Buffer[] = [];
      const proc = execFile(this.adbPath, ['-s', serial, ...args]);
      proc.stdout?.on('data', (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      proc.on('error', reject);
      proc.on('close', (code) =>
        code !== 0
          ? reject(new Error(`ADB exited ${code}: adb -s ${serial} ${args.join(' ')}`))
          : resolve(Buffer.concat(chunks))
      );
    });
  }

  // ── Dark Theme ──────────────────────────────────────────────────────────────

  async getDarkMode(serial: string): Promise<boolean> {
    try {
      const r = await this.runShellCommand(serial, 'cmd uimode night');
      return r.toLowerCase().includes('yes');
    } catch { return false; }
  }

  async setDarkMode(serial: string, enable: boolean): Promise<void> {
    await this.runShellCommand(serial, `cmd uimode night ${enable ? 'yes' : 'no'}`);
  }

  // ── Navigation Mode ─────────────────────────────────────────────────────────

  async getNavigationMode(serial: string): Promise<string> {
    try {
      const r = await this.runShellCommand(serial, 'settings get secure navigation_mode');
      return ['0', '1', '2'].includes(r) ? r : '2';
    } catch { return '2'; }
  }

  async setNavigationMode(serial: string, mode: string): Promise<void> {
    // Set the secure setting so it persists across reboots
    await this.runShellCommand(serial, `settings put secure navigation_mode ${mode}`);
    // Apply the matching overlay so SystemUI picks up the change immediately
    // without requiring a restart. Ignore failures on older API levels.
    const overlayPackage: Record<string, string> = {
      '0': 'com.android.internal.systemui.navbar.threebutton',
      '1': 'com.android.internal.systemui.navbar.twobutton',
      '2': 'com.android.internal.systemui.navbar.gestural',
    };
    const pkg = overlayPackage[mode];
    if (pkg) {
      try {
        await this.runShellCommand(serial, `cmd overlay enable-exclusive --category ${pkg}`);
      } catch { /* Older Android versions don't support overlay command */ }
    }
  }

  // ── Accessibility Services ──────────────────────────────────────────────────

  /**
   * Checks whether the given full component ID (e.g. "pkg/class") is in the
   * colon-separated enabled_accessibility_services list. Supports one AOSP
   * fallback for Select to Speak on devices that don't use the marvin package.
   */
  async getAccessibilityServiceEnabled(serial: string, serviceId: string): Promise<boolean> {
    try {
      const raw = await this.runShellCommand(serial, 'settings get secure enabled_accessibility_services');
      if (!raw || raw.trim() === 'null') { return false; }
      const services = raw.trim().split(':').filter(Boolean);
      if (services.includes(serviceId)) { return true; }
      // Also accept the AOSP fallback component for Select to Speak
      if (serviceId === SELECT_TO_SPEAK_SERVICE && services.includes(SELECT_TO_SPEAK_SERVICE_AOSP)) {
        return true;
      }
      return false;
    } catch { return false; }
  }

  async setAccessibilityService(serial: string, serviceId: string, enable: boolean): Promise<void> {
    const raw = await this.runShellCommand(serial, 'settings get secure enabled_accessibility_services');
    const current = (raw === 'null' || !raw) ? '' : raw.trim();

    // Build the canonical list, stripping both the primary and AOSP fallback variants
    let list = current ? current.split(':').filter(Boolean) : [];

    if (enable) {
      // Remove any stale AOSP fallback entry before adding the canonical one
      list = list.filter((s) => s !== SELECT_TO_SPEAK_SERVICE_AOSP);
      if (!list.includes(serviceId)) {
        list.push(serviceId);
      }
    } else {
      // Remove both the canonical and any AOSP fallback form
      list = list.filter((s) => s !== serviceId && s !== SELECT_TO_SPEAK_SERVICE_AOSP);
    }

    if (list.length === 0) {
      // `settings put ... ""` is rejected by Android – delete the key instead.
      await this.runShellCommand(serial, 'settings delete secure enabled_accessibility_services');
      await this.runShellCommand(serial, 'settings put secure accessibility_enabled 0');
    } else {
      await this.runShellCommand(serial, `settings put secure enabled_accessibility_services ${list.join(':')}`);
      await this.runShellCommand(serial, 'settings put secure accessibility_enabled 1');
    }

    // Select to Speak also requires accessibility_button_targets to be kept in sync
    if (serviceId === SELECT_TO_SPEAK_SERVICE || serviceId === SELECT_TO_SPEAK_SERVICE_AOSP) {
      try {
        const btnRaw = await this.runShellCommand(serial, 'settings get secure accessibility_button_targets');
        const btnCurrent = (!btnRaw || btnRaw.trim() === 'null') ? '' : btnRaw.trim();
        let btnList = btnCurrent ? btnCurrent.split(':').filter(Boolean) : [];

        if (enable) {
          btnList = btnList.filter((s) => s !== SELECT_TO_SPEAK_SERVICE_AOSP);
          if (!btnList.includes(SELECT_TO_SPEAK_SERVICE)) {
            btnList.push(SELECT_TO_SPEAK_SERVICE);
          }
        } else {
          btnList = btnList.filter((s) => s !== SELECT_TO_SPEAK_SERVICE && s !== SELECT_TO_SPEAK_SERVICE_AOSP);
        }

        if (btnList.length === 0) {
          await this.runShellCommand(serial, 'settings delete secure accessibility_button_targets');
        } else {
          await this.runShellCommand(serial, `settings put secure accessibility_button_targets ${btnList.join(':')}`);
        }
      } catch { /* non-critical – older API levels may not have accessibility_button_targets */ }
    }
  }

  // ── Font Size ───────────────────────────────────────────────────────────────

  async getFontScale(serial: string): Promise<string> {
    try {
      const r = await this.runShellCommand(serial, 'settings get system font_scale');
      const n = parseFloat(r);
      if (isNaN(n)) { return '1.0'; }
      if (n <= 0.9) { return '0.85'; }
      if (n <= 1.05) { return '1.0'; }
      if (n <= 1.2) { return '1.15'; }
      return '1.3';
    } catch { return '1.0'; }
  }

  async setFontScale(serial: string, scale: string): Promise<void> {
    await this.runShellCommand(serial, `settings put system font_scale ${scale}`);
  }

  // ── Display Size ────────────────────────────────────────────────────────────

  async getDisplayDensity(serial: string): Promise<string> {
    try {
      const r = await this.runShellCommand(serial, 'wm density');
      const override = r.match(/Override density:\s*(\d+)/);
      return override ? override[1] : 'default';
    } catch { return 'default'; }
  }

  async setDisplayDensity(serial: string, density: string): Promise<void> {
    if (density === 'default') {
      await this.runShellCommand(serial, 'wm density reset');
    } else {
      await this.runShellCommand(serial, `wm density ${density}`);
    }
  }

  // ── Layout Bounds ───────────────────────────────────────────────────────────

  async getLayoutBounds(serial: string): Promise<boolean> {
    try {
      return (await this.runShellCommand(serial, 'getprop debug.layout')).trim() === 'true';
    } catch { return false; }
  }

  async setLayoutBounds(serial: string, enable: boolean): Promise<void> {
    await this.runShellCommand(serial, `setprop debug.layout ${enable}`);
    // `service call activity 1599295570` triggers a display-layer refresh
    // so every visible View re-reads debug.layout on its next draw pass.
    // The magic constant is the ASCII int for "dspl" (display). Non-critical.
    try {
      await this.runShellCommand(serial, 'service call activity 1599295570');
    } catch { /* ignore on API levels where this isn't available */ }
  }

  // ── Screen Recording ────────────────────────────────────────────────────────

  /**
   * Start screenrecord on the device. Returns the remote path of the recording.
   *
   * Explicitly sets --bit-rate and --size to avoid the two most common
   * encoding/playback problems with the default screenrecord output:
   *  - Default 20 Mbps is too high for many players → use 4 Mbps
   *  - Native resolution may have odd dimensions (H.264 requires even) or be
   *    very large → scale to ≤1280 on the longer side with even numbers
   */
  async startScreenRecord(serial: string): Promise<string> {
    if (this._recordingProcess || this._currentRemotePath) {
      throw new Error('A recording is already in progress.');
    }
    this._recordingSerial = serial;
    this._currentRemotePath = '/sdcard/emulator_recording.mp4';

    const size = await this._getCompatibleRecordingSize(serial);

    const cmdArgs = [
      '-s', serial, 'shell', 'screenrecord',
      '--bit-rate', '4000000',
      ...(size ? ['--size', size] : []),
      '--time-limit', '180',
      this._currentRemotePath,
    ];

    const proc = spawn(this.adbPath, cmdArgs);
    this._recordingProcess = proc;

    proc.on('exit', () => {
      if (this._recordingProcess === proc) {
        this._recordingProcess = null;
      }
      if (this._currentRemotePath) {
        const remote = this._currentRemotePath;
        const recSerial = this._recordingSerial ?? serial;
        this._onRecordingAutoEnded.fire({ serial: recSerial, remotePath: remote });
      }
    });

    this._onRecordingChanged.fire(true);
    return this._currentRemotePath;
  }

  /**
   * Query the device's physical display size and return a recording size that:
   *  - Scales down (only) so the shorter side is at most 1080 px (Full HD)
   *  - Rounds both dimensions to the nearest even number (H.264 requirement)
   */
  private async _getCompatibleRecordingSize(serial: string): Promise<string | undefined> {
    try {
      const output = await this.runShellCommand(serial, 'wm size');
      // Prefer "Physical size" over "Override size"
      const match = output.match(/Physical size:\s*(\d+)x(\d+)/) ??
                    output.match(/(\d+)x(\d+)/);
      if (!match) { return undefined; }

      let w = parseInt(match[1], 10);
      let h = parseInt(match[2], 10);

      // Scale down only if the shorter side exceeds 1080 (Full HD target).
      // Devices already at 1080 on the short side (e.g. Pixel 7: 1080×2340)
      // pass through with their native resolution.
      const targetShort = 1080;
      const shorter = Math.min(w, h);
      if (shorter > targetShort) {
        const scale = targetShort / shorter;
        w = Math.round(w * scale / 2) * 2;
        h = Math.round(h * scale / 2) * 2;
      } else {
        // Enforce even dimensions even when not scaling
        w = w % 2 === 0 ? w : w - 1;
        h = h % 2 === 0 ? h : h - 1;
      }

      return `${w}x${h}`;
    } catch { return undefined; }
  }

  /**
   * Stop the active screenrecord by sending SIGINT to the device process,
   * waiting for it to exit cleanly (so the MP4 moov atom is written), then pulling.
   *
   * ⚠️ Order matters:
   *  1. SIGINT the device process            → triggers clean MP4 finalisation
   *  2. Poll until the device process exits  → moov atom is now on disk
   *  3. Kill the local adb pipe              → safe to disconnect
   *  4. Pull the finished file
   */
  async stopScreenRecord(serial: string, remotePath: string, localPath: string): Promise<void> {
    try {
      // 1. Send SIGINT so screenrecord writes the MP4 header and exits cleanly
      try {
        const pid = await this.runShellCommand(serial, 'pidof screenrecord');
        if (pid.trim()) {
          await this.runShellCommand(serial, `kill -2 ${pid.trim()}`);
        }
      } catch { /* process may have already exited */ }

      // 2. Poll until the device process exits (up to 12 s).
      //    Pulling before this produces a truncated/corrupt file because the
      //    MP4 moov atom hasn't been written yet.
      const deadline = Date.now() + 12_000;
      while (Date.now() < deadline) {
        await new Promise<void>((r) => setTimeout(r, 600));
        try {
          const pid = await this.runShellCommand(serial, 'pidof screenrecord');
          if (!pid.trim()) { break; }
        } catch { break; }
      }

      // 3. Kill the local adb child process (device side is done, safe to do now)
      if (this._recordingProcess) {
        try { this._recordingProcess.kill(); } catch { /* process may already be dead */ }
        this._recordingProcess = null;
      }

      // 4. Short sdcard flush pause, then pull
      await new Promise<void>((r) => setTimeout(r, 500));
      await execAsync(`${this.getExecPath()} -s ${serial} pull ${remotePath} "${localPath}"`);
      await execAsync(`${this.getExecPath()} -s ${serial} shell rm -f ${remotePath}`);
    } finally {
      this._recordingProcess = null;
      this._currentRemotePath = null;
      this._recordingSerial = null;
      // Notify all listeners that recording has stopped
      this._onRecordingChanged.fire(false);
    }
  }


  async pullFile(serial: string, remote: string, local: string): Promise<void> {
    await execAsync(`${this.getExecPath()} -s ${serial} pull ${remote} "${local}"`);
  }

  async removeRemoteFile(serial: string, remote: string): Promise<void> {
    await execAsync(`${this.getExecPath()} -s ${serial} shell rm -f ${remote}`);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  static notifyAdbNotFound(): void {
    vscode.window.showErrorMessage(
      'ADB not found. Install Android SDK Platform Tools and add `adb` to your PATH.',
      'Learn More'
    ).then((s) => {
      if (s === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://developer.android.com/tools/releases/platform-tools'));
      }
    });
  }

  /** Read ALL device settings in one parallel batch. */
  async readDeviceState(serial: string, isRecording: boolean) {
    const [darkTheme, navigationMode, talkBack, selectToSpeak, fontSize, displaySize, layoutBounds] =
      await Promise.all([
        this.getDarkMode(serial),
        this.getNavigationMode(serial),
        this.getAccessibilityServiceEnabled(serial, TALKBACK_SERVICE),
        this.getAccessibilityServiceEnabled(serial, SELECT_TO_SPEAK_SERVICE),
        this.getFontScale(serial),
        this.getDisplayDensity(serial),
        this.getLayoutBounds(serial),
      ]);
    return { darkTheme, navigationMode, talkBack, selectToSpeak, fontSize, displaySize, layoutBounds, isRecording };
  }
}
