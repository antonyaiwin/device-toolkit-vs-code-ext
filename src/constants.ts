/** Global extension constants for Device Toolkit */
export const EXTENSION_ID = 'device-toolkit';
export const EXTENSION_NAME = 'Device Toolkit';
export const CONFIG_NAMESPACE = 'device-toolkit';
export const CATEGORY_NAME = 'Device Toolkit';

/** View & Container IDs */
export const VIEW_CONTAINER_ID = 'mobileDeviceToolkitContainer';
export const VIEW_ID = 'mobileDeviceToolkit';

/** Command Identifiers */
export const COMMANDS = {
  OPEN_CONTROLS: `${EXTENSION_ID}.openControls`,
  SELECT_DEVICE: `${EXTENSION_ID}.selectDevice`,
  REFRESH_DEVICES: `${EXTENSION_ID}.refreshDevices`,
  START_RECORDING: `${EXTENSION_ID}.startRecording`,
  STOP_RECORDING: `${EXTENSION_ID}.stopRecording`,
  AVD_REFRESH: `${EXTENSION_ID}.avd.refresh`,
  TOGGLE_DARK_MODE: `${EXTENSION_ID}.toolbarToggleDarkMode`,
  SET_NAV_MODE: `${EXTENSION_ID}.toolbarSetNavMode`,
  TOGGLE_TALKBACK: `${EXTENSION_ID}.toolbarToggleTalkBack`,
  TOGGLE_SELECT_TO_SPEAK: `${EXTENSION_ID}.toolbarToggleSelectToSpeak`,
  SET_FONT_SIZE: `${EXTENSION_ID}.toolbarSetFontSize`,
  SET_DISPLAY_SIZE: `${EXTENSION_ID}.toolbarSetDisplaySize`,
  TOGGLE_LAYOUT_BOUNDS: `${EXTENSION_ID}.toolbarToggleLayoutBounds`,
  TOGGLE_WIFI: `${EXTENSION_ID}.toolbarToggleWifi`,
  TOGGLE_MOBILE_DATA: `${EXTENSION_ID}.toolbarToggleMobileData`,
  TOGGLE_AIRPLANE_MODE: `${EXTENSION_ID}.toolbarToggleAirplaneMode`,
} as const;

/** Context Key Identifiers for VS Code UI visibility */
export const CONTEXT_KEYS = {
  HAS_DEVICES: `${EXTENSION_ID}.hasDevices`,
  SHOW_OPEN_CONTROLS: `${EXTENSION_ID}.showOpenControls`,
  SHOW_DARK_MODE: `${EXTENSION_ID}.showDarkMode`,
  SHOW_NAV_MODE: `${EXTENSION_ID}.showNavMode`,
  SHOW_TALKBACK: `${EXTENSION_ID}.showTalkBack`,
  SHOW_SELECT_TO_SPEAK: `${EXTENSION_ID}.showSelectToSpeak`,
  SHOW_FONT_SIZE: `${EXTENSION_ID}.showFontSize`,
  SHOW_DISPLAY_SIZE: `${EXTENSION_ID}.showDisplaySize`,
  SHOW_LAYOUT_BOUNDS: `${EXTENSION_ID}.showLayoutBounds`,
  SHOW_RECORD: `${EXTENSION_ID}.showRecord`,
  IS_RECORDING: `${EXTENSION_ID}.isRecording`,
  SHOW_WIFI: `${EXTENSION_ID}.showWifi`,
  SHOW_MOBILE_DATA: `${EXTENSION_ID}.showMobileData`,
  SHOW_AIRPLANE_MODE: `${EXTENSION_ID}.showAirplaneMode`,
} as const;
