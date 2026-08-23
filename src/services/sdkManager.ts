import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { CONFIG_NAMESPACE } from '../constants';
import { SdkInfo } from '../models/sdk';

/**
 * Service for cross-platform Android SDK detection, path validation, and setting persistence.
 */
export class SdkManager {

  /**
   * Resolve platform-specific tool binary names.
   */
  private getBinaryNames() {
    const isWindows = process.platform === 'win32';
    return {
      adb: isWindows ? 'adb.exe' : 'adb',
      emulator: isWindows ? 'emulator.exe' : 'emulator',
      avdmanager: isWindows ? 'avdmanager.bat' : 'avdmanager',
      sdkmanager: isWindows ? 'sdkmanager.bat' : 'sdkmanager',
    };
  }

  /**
   * Validate a candidate Android SDK root path.
   * Checks if required tools (platform-tools/adb and emulator/emulator) exist on disk.
   *
   * @param sdkPath Root directory of the Android SDK candidate.
   * @returns `SdkInfo` if valid (required tools exist), otherwise `undefined`.
   */
  validatePath(sdkPath: string): SdkInfo | undefined {
    if (!sdkPath || typeof sdkPath !== 'string' || !sdkPath.trim()) {
      return undefined;
    }

    const normalizedPath = path.normalize(sdkPath.trim());
    if (!fs.existsSync(normalizedPath)) {
      return undefined;
    }

    const binaries = this.getBinaryNames();

    const adbPath = path.join(normalizedPath, 'platform-tools', binaries.adb);
    const emulatorPath = path.join(normalizedPath, 'emulator', binaries.emulator);

    const hasAdb = fs.existsSync(adbPath);
    const hasEmulator = fs.existsSync(emulatorPath);
    const isValid = hasAdb && hasEmulator;

    if (!isValid) {
      return undefined;
    }

    // Resolve avdmanager path (cmdline-tools/latest/bin primary, tools/bin fallback)
    const cmdlineAvdManager = path.join(normalizedPath, 'cmdline-tools', 'latest', 'bin', binaries.avdmanager);
    const toolsAvdManager = path.join(normalizedPath, 'tools', 'bin', binaries.avdmanager);
    const avdmanagerPath = fs.existsSync(cmdlineAvdManager)
      ? cmdlineAvdManager
      : fs.existsSync(toolsAvdManager)
        ? toolsAvdManager
        : cmdlineAvdManager;

    // Resolve sdkmanager path (cmdline-tools/latest/bin primary, tools/bin fallback)
    const cmdlineSdkManager = path.join(normalizedPath, 'cmdline-tools', 'latest', 'bin', binaries.sdkmanager);
    const toolsSdkManager = path.join(normalizedPath, 'tools', 'bin', binaries.sdkmanager);
    const sdkmanagerPath = fs.existsSync(cmdlineSdkManager)
      ? cmdlineSdkManager
      : fs.existsSync(toolsSdkManager)
        ? toolsSdkManager
        : cmdlineSdkManager;

    return {
      path: normalizedPath,
      adbPath,
      emulatorPath,
      avdmanagerPath,
      sdkmanagerPath,
      valid: true,
    };
  }

  /**
   * Detect Android SDK using a 3-step sequential fallback strategy:
   *  1. VS Code Configuration (`CONFIG_NAMESPACE.androidSdkPath`)
   *  2. Environment Variables (`ANDROID_HOME`, `ANDROID_SDK_ROOT`)
   *  3. Default OS Install Locations (Windows, macOS, Linux)
   *
   * @returns First valid `SdkInfo` found, or `undefined` if no SDK is detected.
   */
  async detect(): Promise<SdkInfo | undefined> {
    // ── Step 1: VS Code Config ────────────────────────────────────────────────
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    const configPath = config.get<string>('androidSdkPath');
    if (configPath) {
      const info = this.validatePath(configPath);
      if (info) {
        return info;
      }
    }

    // ── Step 2: Environment Variables ─────────────────────────────────────────
    const envVars = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT];
    for (const envPath of envVars) {
      if (envPath) {
        const info = this.validatePath(envPath);
        if (info) {
          return info;
        }
      }
    }

    // ── Step 3: Default OS Install Locations ──────────────────────────────────
    const candidatePaths = this.getDefaultOsInstallLocations();
    for (const candidate of candidatePaths) {
      const info = this.validatePath(candidate);
      if (info) {
        return info;
      }
    }

    return undefined;
  }

  /**
   * Get standard OS installation directories according to `process.platform`.
   */
  private getDefaultOsInstallLocations(): string[] {
    const locations: string[] = [];
    const home = process.env.HOME || process.env.USERPROFILE || '';

    switch (process.platform) {
      case 'win32': {
        const localAppData = process.env.LOCALAPPDATA;
        if (localAppData) {
          locations.push(path.join(localAppData, 'Android', 'Sdk'));
        }
        if (home) {
          locations.push(path.join(home, 'AppData', 'Local', 'Android', 'Sdk'));
        }
        locations.push('C:\\Android\\sdk');
        break;
      }
      case 'darwin': {
        if (home) {
          locations.push(path.join(home, 'Library', 'Android', 'sdk'));
        }
        locations.push('/usr/local/share/android-sdk');
        break;
      }
      case 'linux': {
        if (home) {
          locations.push(path.join(home, 'Android', 'Sdk'));
        }
        locations.push('/usr/local/android-sdk');
        locations.push('/opt/android-sdk');
        break;
      }
    }

    return locations;
  }

  /**
   * Persist user-specified SDK path to VS Code global configuration.
   *
   * @param sdkPath Root Android SDK path to save.
   */
  async saveSdkPath(sdkPath: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    await config.update('androidSdkPath', sdkPath, vscode.ConfigurationTarget.Global);
  }
}
