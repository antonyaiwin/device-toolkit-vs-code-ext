/**
 * Android SDK detection details and executable binary paths.
 */
export interface SdkInfo {
  /** Root Android SDK path */
  path: string;
  /** Path to `adb` executable */
  adbPath: string;
  /** Path to `emulator` executable */
  emulatorPath: string;
  /** Path to `avdmanager` executable (checking cmdline-tools/latest/bin and tools/bin) */
  avdmanagerPath: string;
  /** Path to `sdkmanager` executable (checking cmdline-tools/latest/bin and tools/bin) */
  sdkmanagerPath: string;
  /** Boolean flag indicating if required tools (`adb` and `emulator`) exist on disk */
  valid: boolean;
}
