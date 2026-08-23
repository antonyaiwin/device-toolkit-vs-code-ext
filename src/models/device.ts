/**
 * Device model and related types.
 */

export type DeviceStatus = 'device' | 'offline' | 'unauthorized' | 'no permissions';
export type DeviceType = 'emulator' | 'physical';

export interface AndroidDevice {
  serial: string;
  displayName: string;
  type: DeviceType;
  status: DeviceStatus;
  model?: string;
}

/** Represents the live settings state read from the device via ADB. */
export interface DeviceSettingsState {
  darkTheme: boolean;
  /** '0' = 3-Button, '1' = 2-Button, '2' = Gesture */
  navigationMode: string;
  talkBack: boolean;
  selectToSpeak: boolean;
  /** font_scale value as string: '0.85' | '1.0' | '1.15' | '1.3' */
  fontSize: string;
  /** density dpi as string, or 'default' */
  displaySize: string;
  layoutBounds: boolean;
  isRecording: boolean;
}

// ── Accessibility service identifiers ───────────────────────────────────────
export const TALKBACK_SERVICE =
  'com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService';

// On Google API emulators/devices, Select to Speak ships inside the same APK as TalkBack.
// The component is under com.google.android.marvin.talkback package but with a different class.
export const SELECT_TO_SPEAK_SERVICE =
  'com.google.android.marvin.talkback/com.google.android.accessibility.selecttospeak.SelectToSpeakService';

// AOSP fallback (used on devices without Google Accessibility Suite)
export const SELECT_TO_SPEAK_SERVICE_AOSP =
  'com.google.android.accessibility.selecttospeak/.SelectToSpeakService';

// ── Navigation mode labels ───────────────────────────────────────────────────
export const NAVIGATION_MODE_LABELS: Record<string, string> = {
  '0': '3-Button Navigation',
  '1': '2-Button Navigation',
  '2': 'Gesture Navigation',
};

// ── Font scale options ───────────────────────────────────────────────────────
export const FONT_SCALE_OPTIONS = [
  { label: 'Small', value: '0.85' },
  { label: 'Default', value: '1.0' },
  { label: 'Large', value: '1.15' },
  { label: 'Largest', value: '1.3' },
];

// ── Display density options ──────────────────────────────────────────────────
export const DISPLAY_DENSITY_OPTIONS = [
  { label: 'Smaller (280)', value: '280' },
  { label: 'Small (360)', value: '360' },
  { label: 'Default', value: 'default' },
  { label: 'Large (480)', value: '480' },
  { label: 'Larger (560)', value: '560' },
];
