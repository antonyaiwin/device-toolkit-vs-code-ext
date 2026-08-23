import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CONFIG_NAMESPACE } from '../../constants';
import { AdbService } from '../../services/adbService';

/**
 * RecordingPanel – a dedicated webview panel for screen recording.
 *
 * Responsibilities:
 *  - Start a screen recording on the selected device (if not already running)
 *  - Show elapsed time + stop button
 *  - Auto-stop and save when the panel tab is closed by the user
 */
export class RecordingPanel {
  private static _instance: RecordingPanel | undefined;

  /** Fires the moment a stop+save is initiated from any source. */
  private static readonly _onStopRequested = new vscode.EventEmitter<void>();
  static readonly onStopRequested: vscode.Event<void> = RecordingPanel._onStopRequested.event;

  static get isOpen(): boolean { return !!RecordingPanel._instance; }

  // ── Static API ──────────────────────────────────────────────────────────────

  /**
   * Start a recording and show the panel.
   * If already recording, just reveal the existing panel.
   */
  static async startRecording(
    context: vscode.ExtensionContext,
    adb: AdbService,
    serial: string,
    deviceName: string
  ): Promise<void> {
    // Reveal existing panel if open
    if (RecordingPanel._instance) {
      RecordingPanel._instance._panel.reveal(vscode.ViewColumn.Beside, true);
      return;
    }

    // Start the ADB recording if not already running
    if (!adb.isRecording) {
      try { await adb.startScreenRecord(serial); }
      catch (err) {
        vscode.window.showErrorMessage(`Could not start recording: ${(err as Error).message}`);
        return;
      }
    }

    new RecordingPanel(context, adb, serial, deviceName);
  }


  /** Notify the open RecordingPanel immediately that saving is in progress. */
  static notifyStopping(): void {
    try { RecordingPanel._instance?._panel.webview.postMessage({ type: 'saving' }); }
    catch { /* panel may be disposed */ }
  }

  /** Reveal an existing RecordingPanel (no-op if none exists). */
  static reveal(): void {
    RecordingPanel._instance?._panel.reveal(vscode.ViewColumn.Beside, true);
  }

  // ── Instance ────────────────────────────────────────────────────────────────

  private readonly _panel: vscode.WebviewPanel;
  private readonly _disposables: vscode.Disposable[] = [];
  /** Guard against double-stop (stop button + onDidDispose both firing) */
  private _stopped = false;

  private constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly adb: AdbService,
    private readonly serial: string,
    private readonly deviceName: string
  ) {
    this._panel = vscode.window.createWebviewPanel(
      'emulatorRecording',
      '● Recording',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true }
    );
    RecordingPanel._instance = this;

    this._panel.webview.html = this._buildHtml();

    // Handle messages from the webview (stop button)
    this._panel.webview.onDidReceiveMessage(async (msg: { type: string }) => {
      if (msg.type === 'stop') {
        await this._stopAndSave();
      }
    }, null, this._disposables);

    // When recording is stopped externally, show "Saving…" in the panel
    adb.onRecordingChanged((isRecording) => {
      if (!isRecording && !this._stopped) {
        this._stopped = true;
        try { this._panel.webview.postMessage({ type: 'saving' }); } catch { /* */ }
      }
    }, null, this._disposables);

    // Auto-save when 3-minute Android timeout is reached
    adb.onRecordingAutoEnded(async () => {
      if (!this._stopped) {
        await this._stopAndSave();
      }
    }, null, this._disposables);

    // Closing the tab stops and saves the recording.
    // The _stopped guard prevents double-stop if the sidebar already stopped it.
    this._panel.onDidDispose(async () => {
      await this._stopAndSave();
      this._cleanup();
    }, null, this._disposables);
  }

  // ── Stop & save (centralized) ────────────────────────────────────────────────

  private static _isStopping = false;

  /**
   * The single source of truth for stopping a recording and saving it.
   * Called from both the RecordingPanel stop button and the activity bar sidebar.
   */
  static async stopCurrent(
    context: vscode.ExtensionContext,
    adb: AdbService,
    serial: string
  ): Promise<void> {
    if (RecordingPanel._isStopping) { return; }
    if (!adb.isRecording && !adb.currentRemotePath) { return; }

    RecordingPanel._isStopping = true;
    try {
      // Fire immediately so ALL subscribers (sidebar, etc.) can show "stopping" state
      RecordingPanel._onStopRequested.fire();

      // Immediately update the panel UI (if open)
      RecordingPanel.notifyStopping();

      const remotePath = adb.currentRemotePath ?? '/sdcard/emulator_recording.mp4';
      const outputDir  = RecordingPanel._resolveOutputDir(context);
      const ts         = new Date().toISOString().replace(/[:.]/g, '-');
      const filename   = `recording_${ts}.mp4`;
      const localPath  = path.join(outputDir, filename);

      await adb.stopScreenRecord(serial, remotePath, localPath);
      vscode.window.showInformationMessage(`Recording saved: ${filename}`, 'Open').then(async (btn) => {
        if (btn === 'Open') {
          await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(localPath));
        }
      });
      const cfg = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
      if (cfg.get<boolean>('openRecordingAfterSave', false)) {
        await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(localPath));
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to save recording: ${(err as Error).message}`);
    } finally {
      RecordingPanel._isStopping = false;
      // Close the recording panel tab if open
      if (RecordingPanel._instance) {
        const instance = RecordingPanel._instance;
        RecordingPanel._instance = undefined;
        try { instance._panel.dispose(); } catch { /* panel may already be disposed */ }
      }
    }
  }

  /** Instance wrapper — guards against double-stop, then delegates to the static method. */
  private async _stopAndSave(): Promise<void> {
    if (this._stopped) { return; }
    this._stopped = true;
    await RecordingPanel.stopCurrent(this.context, this.adb, this.serial);
  }

  // ── HTML ────────────────────────────────────────────────────────────────────

  private _buildHtml(): string {
    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<title>Screen Recording</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #1c1c1e;
    color: #e2e2e2;
    font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 20px;
    padding: 24px;
    text-align: center;
  }

  .indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 600;
  }

  .dot {
    width: 14px;
    height: 14px;
    background: #ef4444;
    border-radius: 50%;
    animation: pulse 1.2s ease-in-out infinite;
    flex-shrink: 0;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.85); }
  }

  .device { color: #888; font-size: 12px; }

  .timer {
    font-size: 32px;
    font-weight: 300;
    font-variant-numeric: tabular-nums;
    color: #f5f5f5;
    letter-spacing: 2px;
  }

  .hint { font-size: 11px; color: #555; max-width: 240px; line-height: 1.5; }

  .stop-btn {
    background: #b91c1c;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 10px 28px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .stop-btn:hover { background: #dc2626; }
  .stop-btn:disabled { background: #444; cursor: wait; }
  .stop-btn .square { width: 10px; height: 10px; background: #fff; border-radius: 1px; flex-shrink: 0; }

  .saving { color: #888; font-size: 12px; display: none; }
  .saving.visible { display: block; }
</style>
</head>
<body>
  <div class="indicator">
    <span class="dot"></span>
    <span>Recording</span>
  </div>

  <div class="device" id="device">${this.deviceName}</div>

  <div class="timer" id="timer">00:00</div>

  <button class="stop-btn" id="stopBtn">
    <span class="square"></span>
    Stop &amp; Save
  </button>

  <div class="saving" id="saving">Stopping and saving…</div>

  <div class="hint">Closing this panel will automatically stop and save the recording.</div>

<script>
  const vscode = acquireVsCodeApi();
  let elapsed = 0;
  const timerEl = document.getElementById('timer');
  const stopBtn  = document.getElementById('stopBtn');
  const savingEl = document.getElementById('saving');

  // Count up
  const interval = setInterval(() => {
    elapsed++;
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    timerEl.textContent = m + ':' + s;
  }, 1000);

  stopBtn.addEventListener('click', () => {
    clearInterval(interval);
    stopBtn.disabled = true;
    savingEl.classList.add('visible');
    vscode.postMessage({ type: 'stop' });
  });

  window.addEventListener('message', (e) => {
    if (e.data.type === 'saving') {
      clearInterval(interval);
      stopBtn.disabled = true;
      savingEl.classList.add('visible');
    }
  });
</script>
</body>
</html>`;
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  private static _resolveOutputDir(context: vscode.ExtensionContext): string {
    const cfg = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    const userDir = cfg.get<string>('outputDirectory', '');
    if (userDir) { fs.mkdirSync(userDir, { recursive: true }); return userDir; }
    const folders = vscode.workspace.workspaceFolders;
    const dir = folders
      ? path.join(folders[0].uri.fsPath, 'emulator-captures')
      : path.join(context.globalStorageUri.fsPath, 'captures');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private _cleanup(): void {
    RecordingPanel._instance = undefined;
    this._disposables.forEach((d) => d.dispose());
  }
}
