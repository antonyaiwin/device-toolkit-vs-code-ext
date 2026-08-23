# Extended AVD Controls - Requirements Document

## 1. Project Overview

### Project Name

Extended AVD Controls

### Project Type

VS Code Extension

### Purpose

Extended AVD Controls is a Visual Studio Code extension that enhances the Android Emulator development experience by providing quick access to commonly used Android emulator and ADB controls directly from the VS Code debug toolbar.

The extension will integrate into VS Code’s native `debug/toolBar` contribution point and provide Android Studio–like emulator settings and controls through a contextual popup interface.

---

# 2. Goals

- Provide quick access to Android Emulator controls inside VS Code
- Reduce dependency on Android Studio for emulator settings
- Improve Flutter and Android development workflow
- Offer a clean, minimal toolbar experience
- Support multiple connected Android devices/emulators
- Allow customizable toolbar buttons through user settings

---

# 3. Core Features

## 3.1 Debug Toolbar Integration

### Description

The extension shall contribute controls to the VS Code `debug/toolBar`.

### Requirements

- Only a single primary icon shall be shown in the debug toolbar by default
- The toolbar item shall only appear when:

  - At least one Android device/emulator is connected
  - A debug session is active

- Toolbar item visibility shall automatically update based on device connection status

### Suggested Toolbar Icon

- Device Mobile Icon
- Android Icon
- Settings/Gear Icon

### Suggested Command ID

```json
device-toolkit.openControls
```

---

# 4. Device Detection

## 4.1 Connected Device Detection

### Description

The extension shall detect Android devices using ADB.

### Requirements

- Detect connected:

  - Android emulators
  - Physical Android devices

- Device list shall refresh automatically
- Device list shall refresh when:

  - Device connects
  - Device disconnects
  - ADB restarts

### Suggested Implementation

```bash
adb devices
```

---

# 5. Context Popup / Quick Pick UI

## 5.1 Popup Behavior

### Description

When the toolbar icon is clicked, a contextual popup menu shall appear using VS Code Quick Pick APIs.

### Suggested APIs

- `vscode.window.createQuickPick()`
- `vscode.window.showQuickPick()`

### Requirements

- Popup shall open from toolbar command
- Popup shall follow VS Code native theming
- Popup shall support:

  - Icons
  - Sections
  - Dynamic content
  - Device selection
  - Action buttons

---

# 6. Device Selector

## 6.1 Multiple Device Support

### Description

If multiple Android devices are connected, the popup shall display a device selector dropdown.

### Requirements

- Device selector shall appear at top of popup
- Currently selected device shall persist during session
- All actions shall execute against selected device
- Device selection shall affect:

  - Popup actions
  - Toolbar buttons
  - ADB commands

### Suggested Device Format

```text
Pixel 8 Pro (emulator-5554)
Samsung S23 (R58M...)
```

---

# 7. Emulator Settings Controls

## 7.1 Appearance Settings

### Dark Theme Toggle

Requirements:

- Enable dark mode
- Disable dark mode
- Reflect current state if possible

Suggested ADB Commands:

```bash
adb shell cmd uimode night yes
adb shell cmd uimode night no
```

---

## 7.2 Accessibility Settings

### Font Size Controls

Requirements:

- Multiple presets:

  - Small
  - Default
  - Large
  - Largest

- Apply instantly to selected device

Suggested Implementation:

```bash
adb shell settings put system font_scale 1.15
```

---

### Display Size Controls

Requirements:

- Multiple display density presets
- Reset option

Suggested Commands:

```bash
adb shell wm density 420
adb shell wm density reset
```

---

# 8. Developer Options Controls

## 8.1 Layout Bounds Toggle

Requirements:

- Enable layout bounds
- Disable layout bounds

Suggested Commands:

```bash
adb shell setprop debug.layout true
adb shell setprop debug.layout false
```

---

## 8.2 Additional Developer Controls

### Suggested Future Controls

- Slow animations
- GPU overdraw
- Pointer location
- Show taps
- RTL layout
- Performance overlay

---

# 9. Screen Capture Controls

## 9.1 Screenshot

Requirements:

- Capture screenshot from selected device
- Save locally
- Show success notification

Suggested Command:

```bash
adb exec-out screencap -p
```

---

## 9.2 Screen Recording

Requirements:

- Start recording
- Stop recording
- Save video locally
- Show recording status

Suggested Command:

```bash
adb shell screenrecord
```

---

# 10. Individual Toolbar Buttons

## 10.1 Optional Quick Action Buttons

### Description

Users shall be able to enable individual quick action buttons directly in the debug toolbar.

### Requirements

- Buttons disabled by default
- Configurable via VS Code settings
- Buttons shall only appear if:

  - User enabled them
  - At least one Android device is connected

### Examples

- Toggle Dark Mode
- Screenshot
- Record Screen
- Layout Bounds
- Rotate Device

---

## 10.2 Device Awareness

### Requirements

All toolbar buttons shall respect:

- Currently selected device
- Active device from popup selector

Example:
If user selects:

```text
Pixel 8 Emulator
```

then:

- Screenshot button
- Record button
- Dark mode button

shall execute on Pixel 8 Emulator only.

---

# 11. Extension Settings

## 11.1 User Configuration

### Suggested Settings Namespace

```json
device-toolkit.*
```

### Example Settings

```json
{
  "device-toolkit.showDarkModeButton": true,
  "device-toolkit.showScreenshotButton": true,
  "device-toolkit.showRecordButton": false,
  "device-toolkit.autoDetectDevices": true
}
```

---

# 12. Visibility Rules

## 12.1 Toolbar Visibility

### Requirements

Toolbar controls shall only appear when:

- Android device connected
- ADB available
- Debug session active

---

## 12.2 Individual Action Visibility

### Requirements

Individual buttons shall:

- Respect user settings
- Respect device availability
- Hide automatically when unavailable

---

# 13. Notifications & Feedback

## 13.1 User Feedback

### Requirements

The extension shall display:

- Success notifications
- Failure notifications
- Device errors
- ADB unavailable errors

### Example

```text
Dark mode enabled on Pixel 8 Emulator
```

---

# 14. Error Handling

## Requirements

The extension shall gracefully handle:

- ADB not installed
- No connected devices
- Unauthorized devices
- Offline devices
- Emulator shutdown
- Command failures

---

# 15. Suggested Architecture

## 15.1 Components

### Device Service

Responsibilities:

- Device detection
- Device selection
- ADB communication

---

### Toolbar Service

Responsibilities:

- Toolbar contributions
- Dynamic visibility
- Quick action registration

---

### Popup UI Service

Responsibilities:

- QuickPick creation
- Settings rendering
- User interactions

---

### ADB Command Service

Responsibilities:

- Execute ADB commands
- Parse responses
- Error handling

---

# 16. Suggested Folder Structure

```text
src/
├── extension.ts
├── services/
│   ├── adbService.ts
│   ├── deviceService.ts
│   ├── toolbarService.ts
│   └── settingsService.ts
├── ui/
│   ├── quickPick/
│   └── webview/
├── commands/
│   ├── deviceCommands.ts
│   └── captureCommands.ts
├── models/
└── utils/
```

---

<!-- # 17. Future Enhancements

## Potential Features

- Device battery controls
- Network throttling
- GPS simulation
- Emulator snapshots
- Flutter-specific controls
- Device mirroring
- Floating mini device panel
- Performance metrics
- DevTools integration

--- -->

# 18. Target Users

- Flutter developers
- Android developers
- QA testers
- UI/UX developers
- Emulator-heavy workflows

---

# 19. Platform Support

## Supported Platforms

- Windows
- macOS
- Linux

## Dependencies

- Android SDK
- ADB
- VS Code
- Flutter/Dart optional

---

# 20. Success Criteria

The extension shall be considered successful if:

- Emulator controls are accessible without Android Studio
- Users can manage devices directly from VS Code
- Toolbar remains minimal and uncluttered
- Multi-device workflows work reliably
- Controls feel native to VS Code
