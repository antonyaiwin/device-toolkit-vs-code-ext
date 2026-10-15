/** Typed extension settings */
export interface ExtensionSettings {
  autoDetectDevices: boolean;
  /** Individual toolbar quick-action buttons */
  showDarkModeButton: boolean;
  showOpenControlsButton: boolean;
  showNavModeButton: boolean;
  showTalkBackButton: boolean;
  showSelectToSpeakButton: boolean;
  showFontSizeButton: boolean;
  showDisplaySizeButton: boolean;
  showLayoutBoundsButton: boolean;
  showRecordButton: boolean;
  showWifiButton: boolean;
  showMobileDataButton: boolean;
  showAirplaneModeButton: boolean;
  outputDirectory: string;
  androidSdkPath?: string;
}
