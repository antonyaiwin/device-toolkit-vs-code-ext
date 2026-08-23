import * as vscode from 'vscode';
import { AdbService } from '../../services/adbService';
import { DeviceService } from '../../services/deviceService';
import { QuickPickService } from '../quickPickService';
import { RecordingPanel } from '../webview/recordingPanel';
import { VIEW_ID } from '../../constants';
import {
  FONT_SCALE_OPTIONS, DISPLAY_DENSITY_OPTIONS,
  TALKBACK_SERVICE, SELECT_TO_SPEAK_SERVICE,
} from '../../models/device';

type InMsg =
  | { type: 'ready' }
  | { type: 'selectDevice' }
  | { type: 'openSettings' }
  | { type: 'setDarkTheme'; value: boolean }
  | { type: 'setNavigationMode'; value: string }
  | { type: 'setTalkBack'; value: boolean }
  | { type: 'setSelectToSpeak'; value: boolean }
  | { type: 'setFontSize'; value: string }
  | { type: 'setDisplaySize'; value: string }
  | { type: 'setLayoutBounds'; value: boolean }
  | { type: 'toggleRecording' }
  | { type: 'refresh' };

/**
 * DeviceControlsView – WebviewViewProvider for the Activity Bar sidebar.
 * Renders the same settings as DeviceSettingsPanel in a compact sidebar layout.
 */
export class DeviceControlsView implements vscode.WebviewViewProvider {
  static readonly viewType = VIEW_ID;

  private _view?: vscode.WebviewView;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly adb: AdbService,
    private readonly deviceService: DeviceService,
    private readonly qp: QuickPickService,
    disposables: vscode.Disposable[]
  ) {
    deviceService.onDevicesChanged(() => this._refresh(), null, disposables);
    deviceService.onSelectedDeviceChanged(() => this._refresh(), null, disposables);
    adb.onRecordingChanged((isRecording) => {
      this._post({ type: 'recordingState', isRecording });
    }, null, disposables);
    // Immediately show "Stopping & Saving…" in the sidebar when a stop is initiated
    // from any source (RecordingPanel button, tab close, or sidebar itself).
    RecordingPanel.onStopRequested(() => {
      this._post({ type: 'recordingState', isRecording: true, stopping: true });
    }, null, disposables);
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this._view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = this._html();

    view.webview.onDidReceiveMessage((msg: InMsg) => this._handle(msg));
    view.onDidChangeVisibility(() => { if (view.visible) { this._refresh(); } });
    this._refresh();
  }

  /** Called by the avd.refresh command (view/title button). */
  refresh(): void { this._refresh(); }

  // ── State ─────────────────────────────────────────────────────────────────

  private async _refresh(): Promise<void> {
    if (!this._view?.visible) { return; }
    const isAdbAvailable = await this.adb.isAdbAvailable();
    if (!isAdbAvailable) {
      this._post({ type: 'adbMissing' });
      return;
    }

    const device = this.deviceService.selectedDevice;
    if (!device) { this._post({ type: 'noDevice' }); return; }
    try {
      const state = await this.adb.readDeviceState(device.serial, this.adb.isRecording);
      this._post({ type: 'setState', state, deviceName: device.displayName });
    } catch (err) {
      this._post({ type: 'error', message: (err as Error).message });
    }
  }

  // ── Message handler ───────────────────────────────────────────────────────

  private async _handle(msg: InMsg): Promise<void> {
    if (msg.type === 'ready' || msg.type === 'refresh') { await this._refresh(); return; }

    if (msg.type === 'openSettings') {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'device-toolkit.androidSdkPath');
      return;
    }

    if (msg.type === 'selectDevice') {
      await this.deviceService.refresh();
      if (this.deviceService.devices.length > 0) {
        await this.qp.showDeviceSelector(this.deviceService.devices);
      }
      await this._refresh();
      return;
    }

    const device = this.deviceService.selectedDevice;
    if (!device) { vscode.window.showWarningMessage('No device selected.'); return; }
    const serial = device.serial;

    try {
      switch (msg.type) {
        case 'setDarkTheme':    await this.adb.setDarkMode(serial, msg.value); break;
        case 'setNavigationMode': await this.adb.setNavigationMode(serial, msg.value); break;
        case 'setTalkBack':    await this.adb.setAccessibilityService(serial, TALKBACK_SERVICE, msg.value); break;
        case 'setSelectToSpeak': await this.adb.setAccessibilityService(serial, SELECT_TO_SPEAK_SERVICE, msg.value); break;
        case 'setFontSize':    await this.adb.setFontScale(serial, msg.value); break;
        case 'setDisplaySize': await this.adb.setDisplayDensity(serial, msg.value); break;
        case 'setLayoutBounds': await this.adb.setLayoutBounds(serial, msg.value); break;
        case 'toggleRecording':
          if (!this.adb.isRecording) {
            // Start: launch recording + open dedicated panel
            await RecordingPanel.startRecording(this.context, this.adb, serial, device.displayName);
          } else {
            // Stop: delegate to the centralized stop logic in RecordingPanel
            await RecordingPanel.stopCurrent(this.context, this.adb, serial);
          }
          await this._refresh();
          return;
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Command failed: ${(err as Error).message}`);
      await this._refresh();
    }
  }

  private _post(msg: Record<string, unknown>): void {
    try { this._view?.webview.postMessage(msg); } catch { /* view may be hidden */ }
  }


  // ── HTML ──────────────────────────────────────────────────────────────────

  private _html(): string {
    const fontOpts = FONT_SCALE_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    const densOpts = DISPLAY_DENSITY_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('');

    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<title>Device Controls</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: transparent;
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size, 13px);
    padding: 0 0 12px;
  }

  /* ── Device bar ── */
  .device-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--vscode-sideBarSectionHeader-background, rgba(128,128,128,.1));
    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, transparent);
    cursor: pointer;
  }
  .device-bar:hover { background: var(--vscode-list-hoverBackground); }
  .device-icon { font-size: 14px; flex-shrink: 0; }
  .device-name {
    flex: 1;
    font-size: 12px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--vscode-foreground);
  }
  .device-type {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    flex-shrink: 0;
  }

  /* ── States ── */
  .state-msg {
    padding: 16px 12px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    text-align: center;
    display: none;
  }
  .state-msg.visible { display: block; }

  /* ── Settings list ── */
  .settings { display: none; }
  .settings.visible { display: block; }

  .section-label {
    padding: 8px 12px 3px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--vscode-descriptionForeground);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 12px;
    gap: 8px;
    min-height: 28px;
  }
  .row:hover { background: var(--vscode-list-hoverBackground); }

  .row-label {
    font-size: 12px;
    color: var(--vscode-foreground);
    flex: 1;
    min-width: 0;
  }

  /* Checkbox */
  input[type="checkbox"] {
    appearance: none; -webkit-appearance: none;
    width: 14px; height: 14px;
    border: 1.5px solid var(--vscode-checkbox-border, #666);
    border-radius: 2px;
    background: var(--vscode-checkbox-background, #2a2a2c);
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
    transition: background .1s, border-color .1s;
  }
  input[type="checkbox"]:checked {
    background: var(--vscode-checkbox-selectBackground, #0078d4);
    border-color: var(--vscode-checkbox-selectBackground, #0078d4);
  }
  input[type="checkbox"]:checked::after {
    content: '';
    position: absolute;
    left: 2px; top: 0px;
    width: 6px; height: 9px;
    border: 2px solid #fff;
    border-top: none; border-left: none;
    transform: rotate(45deg);
  }
  input[type="checkbox"]:disabled { opacity: 0.4; cursor: default; }

  /* Select */
  select {
    background: var(--vscode-dropdown-background, #2d2d30);
    color: var(--vscode-dropdown-foreground, #ccc);
    border: 1px solid var(--vscode-dropdown-border, #555);
    border-radius: 2px;
    padding: 2px 4px;
    font-size: 11px;
    cursor: pointer;
    outline: none;
    max-width: 110px;
  }
  select:focus { border-color: var(--vscode-focusBorder, #0078d4); }
  select:disabled { opacity: 0.4; cursor: default; }

  /* Divider */
  .divider {
    height: 1px;
    background: var(--vscode-sideBarSectionHeader-border, rgba(128,128,128,.2));
    margin: 6px 0;
  }

  /* ── Record buttons ── */
  .rec-area {
    display: none;
    flex-direction: column;
    gap: 6px;
    width: calc(100% - 24px);
    margin: 6px 12px 0;
  }
  .rec-area.visible { display: flex; }

  .btn-rec, .btn-stop {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 6px 12px;
    border: none;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background .15s, opacity .15s;
  }
  .btn-rec  { background: #b91c1c; color: #fff; }
  .btn-rec:hover:not(:disabled)  { background: #dc2626; }
  .btn-stop { background: #374151; color: #f9fafb; border: 1px solid #6b7280; }
  .btn-stop:hover:not(:disabled) { background: #4b5563; }
  .btn-stop:disabled { opacity: 0.5; cursor: wait; }
  .rec-dot  { width:8px; height:8px; background:#ef4444; border-radius:50%; flex-shrink:0;
              animation: blink 1.2s ease-in-out infinite; }
  .stop-sq  { width:8px; height:8px; background:currentColor; border-radius:1px; flex-shrink:0; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }

  .btn-config {
    margin-top: 10px;
    padding: 6px 12px;
    background: var(--vscode-button-background, #0078d4);
    color: var(--vscode-button-foreground, #fff);
    border: none;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: background .15s;
  }
  .btn-config:hover {
    background: var(--vscode-button-hoverBackground, #026ec1);
  }
</style>
</head>
<body>

<!-- Device bar -->
<div class="device-bar" id="deviceBar" title="Click to change device" style="display:none">
  <span class="device-icon">📱</span>
  <span class="device-name" id="deviceName">—</span>
  <span class="device-type" id="deviceType"></span>
</div>

<div class="state-msg" id="loadingMsg">Loading…</div>
<div class="state-msg" id="noDeviceMsg">No device connected.<br>Connect an Android device or start an emulator.</div>
<div class="state-msg" id="adbMissingMsg">
  <div style="font-size: 20px; margin-bottom: 6px;">⚠️</div>
  <strong>ADB Not Found</strong><br>
  <span style="font-size: 11px; opacity: 0.85; display: inline-block; margin-top: 4px; line-height: 1.4;">
    Android SDK Platform Tools (adb) could not be located.
  </span>
  <br>
  <button class="btn-config" id="openSdkSettingsBtn">Configure SDK Path</button>
</div>
<div class="state-msg" id="errorMsg"></div>

<div class="settings" id="settings">
  <div class="section-label">Display</div>

  <div class="row">
    <span class="row-label">Dark Theme</span>
    <input type="checkbox" id="darkTheme">
  </div>
  <div class="row">
    <span class="row-label">Navigation Mode</span>
    <select id="navigationMode">
      <option value="2">Gesture</option>
      <option value="1">2-Button</option>
      <option value="0">3-Button</option>
    </select>
  </div>
  <div class="row">
    <span class="row-label">Font Size</span>
    <select id="fontSize">${fontOpts}</select>
  </div>
  <div class="row">
    <span class="row-label">Display Size</span>
    <select id="displaySize">${densOpts}</select>
  </div>
  <div class="row">
    <span class="row-label">Layout Bounds</span>
    <input type="checkbox" id="layoutBounds">
  </div>

  <div class="divider"></div>
  <div class="section-label">Accessibility</div>

  <div class="row">
    <span class="row-label">TalkBack</span>
    <input type="checkbox" id="talkBack">
  </div>
  <div class="row">
    <span class="row-label">Select to Speak</span>
    <input type="checkbox" id="selectToSpeak">
  </div>

  <div class="divider"></div>
  <div class="rec-area" id="recArea">
    <!-- Shown when NOT recording -->
    <button class="btn-rec" id="startRecBtn">
      <span class="stop-sq" style="background:#ef4444;border-radius:50%"></span>
      Record Screen
    </button>
    <!-- Shown when recording is active -->
    <button class="btn-stop" id="stopRecBtn" style="display:none">
      <span class="rec-dot"></span>
      <span id="stopLabel">Stop &amp; Save</span>
    </button>
  </div>
</div>

<script>
  const vscode = acquireVsCodeApi();
  const $ = id => document.getElementById(id);

  // ── Wire controls ─────────────────────────────────────────────────────────
  $('deviceBar').addEventListener('click', () => vscode.postMessage({ type: 'selectDevice' }));
  $('openSdkSettingsBtn').addEventListener('click', () => vscode.postMessage({ type: 'openSettings' }));
  $('darkTheme').addEventListener('change', e => vscode.postMessage({ type: 'setDarkTheme', value: e.target.checked }));
  $('navigationMode').addEventListener('change', e => vscode.postMessage({ type: 'setNavigationMode', value: e.target.value }));
  $('talkBack').addEventListener('change', e => vscode.postMessage({ type: 'setTalkBack', value: e.target.checked }));
  $('selectToSpeak').addEventListener('change', e => vscode.postMessage({ type: 'setSelectToSpeak', value: e.target.checked }));
  $('fontSize').addEventListener('change', e => vscode.postMessage({ type: 'setFontSize', value: e.target.value }));
  $('displaySize').addEventListener('change', e => vscode.postMessage({ type: 'setDisplaySize', value: e.target.value }));
  $('layoutBounds').addEventListener('change', e => vscode.postMessage({ type: 'setLayoutBounds', value: e.target.checked }));
  $('startRecBtn').addEventListener('click', () => vscode.postMessage({ type: 'toggleRecording' }));
  $('stopRecBtn').addEventListener('click', () => {
    if (!$('stopRecBtn').disabled) vscode.postMessage({ type: 'toggleRecording' });
  });

  // ── Handle messages ───────────────────────────────────────────────────────
  window.addEventListener('message', ({ data: msg }) => {
    if (msg.type === 'adbMissing') {
      $('deviceBar').style.display = 'none';
      $('settings').classList.remove('visible');
      $('recArea').classList.remove('visible');
      $('loadingMsg').classList.remove('visible');
      $('noDeviceMsg').classList.remove('visible');
      $('errorMsg').classList.remove('visible');
      $('adbMissingMsg').classList.add('visible');
      return;
    }
    if (msg.type === 'setState') {
      const s = msg.state;
      $('deviceBar').style.display = 'flex';
      $('deviceName').textContent = msg.deviceName;
      $('loadingMsg').classList.remove('visible');
      $('noDeviceMsg').classList.remove('visible');
      $('adbMissingMsg').classList.remove('visible');
      $('errorMsg').classList.remove('visible');
      $('settings').classList.add('visible');
      $('recArea').classList.add('visible');

      $('darkTheme').checked = s.darkTheme;
      $('navigationMode').value = s.navigationMode;
      $('talkBack').checked = s.talkBack;
      $('selectToSpeak').checked = s.selectToSpeak;
      $('fontSize').value = s.fontSize;
      $('displaySize').value = s.displaySize;
      $('layoutBounds').checked = s.layoutBounds;
      setRecording(s.isRecording, false);
      setDisabled(false);
      return;
    }
    if (msg.type === 'noDevice') {
      $('deviceBar').style.display = 'none';
      $('settings').classList.remove('visible');
      $('recArea').classList.remove('visible');
      $('loadingMsg').classList.remove('visible');
      $('adbMissingMsg').classList.remove('visible');
      $('noDeviceMsg').classList.add('visible');
      return;
    }
    if (msg.type === 'recordingState') {
      setRecording(msg.isRecording, msg.stopping || false);
    }
    if (msg.type === 'error') {
      $('errorMsg').textContent = 'Error: ' + msg.message;
      $('errorMsg').classList.add('visible');
    }
  });

  function setRecording(active, stopping) {
    $('startRecBtn').style.display = active ? 'none' : 'flex';
    $('stopRecBtn').style.display  = active ? 'flex'  : 'none';
    $('stopRecBtn').disabled = stopping;
    $('stopLabel').textContent = stopping ? 'Stopping & Saving…' : 'Stop & Save';
  }

  function setDisabled(v) {
    ['darkTheme','navigationMode','talkBack','selectToSpeak','fontSize','displaySize','layoutBounds']
      .forEach(id => $(id).disabled = v);
  }

  // ── Show loading, then signal ready ──────────────────────────────────────
  $('loadingMsg').classList.add('visible');
  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
  }
}
