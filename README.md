# Device Toolkit

> **Android Studio-style mobile & emulator developer controls inside VS Code's debug toolbar and sidebar.** Easily manage Dark Mode, Navigation Mode, Connectivity (Wi-Fi, Mobile Data & Airplane Mode), Accessibility (TalkBack & Select to Speak), Display & Font Scaling, Layout Bounds, and Screen Recording directly from your editor.

---

## Screenshots

<br>

<img src="assets/docs/screenshot_1.gif" width="100%" alt="Device Toolkit Overview Demo">
<br/>
<br/>
<img src="assets/docs/screenshot_2.gif" width="100%" alt="Device Toolkit Interactive Controls Demo">

<br>

---

## What the Extension Does

When developing mobile applications with **Flutter**, **React Native**, or **Android Native** in VS Code, toggling device settings (like dark mode, font scale, or layout bounds) normally requires opening Android Studio's Extended Controls, digging through Android OS Settings menus, or executing manual ADB CLI commands.

**Device Toolkit** brings these essential controls right into VS Code:

- A dedicated **Sidebar Panel** in the Activity Bar for visual management.
- Quick-action buttons integrated into VS Code's **Debug Toolbar**.
- Command Palette integration for keyboard shortcuts.

---

## Features & Demos

| Feature                    | Details                                                                                                              | Preview                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sidebar Control Panel**  | Full control webview interface in the Activity Bar. Click on the device name bar at the top to switch active devices | <img src="assets/docs/sidebar-preview.png" width="350" alt="Sidebar Control Panel">                                                             |
| **Debug Toolbar Actions**  | Configurable quick-action icons directly on the debug bar                                                            | <img src="assets/docs/toolbar-preview.png" width="350" alt="Debug Toolbar">                                                                     |
| **Dark Mode Toggle**       | Toggle system-wide Light and Dark themes instantly                                                                   | <img src="assets/docs/dark-mode.png" width="350" alt="Dark Mode">                                                                               |
| **Navigation Mode**        | Switch between Gesture, 2-Button, and 3-Button navigation styles                                                     | <img src="assets/docs/navigation-mode.png" width="350" alt="Navigation Mode">                                                                   |
| **Font & Display Scaling** | Adjust font sizes (Small to Largest) and display density (280–560 DPI)                                               | <img src="assets/docs/font-scaling.png" width="350" alt="Font Scaling"> <img src="assets/docs/display-size.png" width="350" alt="Display Size"> |
| **Accessibility Tools**    | Toggle TalkBack screen reader and Select to Speak accessibility services                                             | <img src="assets/docs/talkback.png" width="350" alt="TalkBack"> <img src="assets/docs/select-to-speak.png" width="350" alt="Select to Speak">   |
| **Layout Bounds**          | Show or hide view boundary borders for pixel-perfect UI debugging                                                    | <img src="assets/docs/layout-bounds.png" width="350" alt="Layout Bounds">                                                                       |
| **Network & Connectivity** | Toggle Wi-Fi, Mobile Data, and Airplane Mode instantly without opening Android system settings                       | <img src="assets/docs/network-controls.png" width="350" alt="Network Controls">                                                                 |
| **Screen Recording**       | Record device screen (up to 3 minutes) with optional auto-open in editor                                             | <img src="assets/docs/screen-recording.png" width="350" alt="Screen Recording">                                                                 |
| **Multi-Device Support**   | Auto-detect multiple devices; click the device name header at the top of the sidebar view to switch instantly        | <img src="assets/docs/device-switcher.png" width="350" alt="Device Switcher">                                                                   |

---

## Installation Instructions

### Prerequisites

1. **VS Code** 1.90.0 or higher.
2. **Android SDK Platform-Tools** (`adb` must be installed and added to your system `PATH`).
   - Test by running `adb version` in your terminal.

### Installing from VS Code Marketplace

1. Open VS Code.
2. Go to **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Search for **Device Toolkit**.
4. Click **Install**.

### Installing from VSIX Package

```bash
code --install-extension device-toolkit-0.0.1.vsix
```

---

## Usage Examples

### 1. Activity Bar Sidebar

1. Click the **Device Toolkit** icon on the VS Code Activity Bar (left sidebar).
2. Connected Android emulators/devices will automatically appear.
3. Click on the device name header (e.g. `Pixel 7 Pro (emulator-5554)`) at the top of the sidebar view anytime to change the active device.
4. Use the toggle buttons, dropdowns, and screen recording controls to manage the device in real-time.

### 2. Debug Toolbar Quick Actions

When you start a debug session (e.g., `Flutter: Run & Debug` or `React Native`):

1. The **Device Toolkit** icon appears on the floating Debug Toolbar.
2. Click it to bring focus to the device controls.
3. Enable additional quick-action icons (e.g., Dark Mode, Record Screen) via settings to customize your debug toolbar.

### 3. Command Palette

Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and type **Device Toolkit**:

- `Select Android Device`
- `Refresh Device List`
- `Toggle Dark Mode`
- `Navigation Mode…`
- `Toggle TalkBack`
- `Toggle Select to Speak`
- `Font Size…`
- `Display Size…`
- `Toggle Layout Bounds`
- `Toggle Wi-Fi`
- `Toggle Mobile Data`
- `Toggle Airplane Mode`
- `Record Screen`

---

## Configuration Options

Customize settings in **Settings** (`Ctrl+,` / `Cmd+,`) under **Device Toolkit** (`device-toolkit.*`).

| Setting                   | Type      | Default | Description                                                                                  |
| ------------------------- | --------- | ------- | -------------------------------------------------------------------------------------------- |
| `autoDetectDevices`       | `boolean` | `true`  | Automatically detect and monitor connected Android devices via ADB polling.                  |
| `showOpenControlsButton`  | `boolean` | `true`  | Show the Open Device Controls button on the debug toolbar when a device is connected.        |
| `showDarkModeButton`      | `boolean` | `false` | Show a Dark Mode toggle button directly on the debug toolbar.                                |
| `showNavModeButton`       | `boolean` | `false` | Show a Navigation Mode (Gesture vs 3-Button) picker button on the debug toolbar.             |
| `showTalkBackButton`      | `boolean` | `false` | Show a TalkBack accessibility toggle button on the debug toolbar.                            |
| `showSelectToSpeakButton` | `boolean` | `false` | Show a Select to Speak accessibility toggle button on the debug toolbar.                     |
| `showFontSizeButton`      | `boolean` | `false` | Show a Font Size picker button on the debug toolbar.                                         |
| `showDisplaySizeButton`   | `boolean` | `false` | Show a Display Size picker button on the debug toolbar.                                      |
| `showLayoutBoundsButton`  | `boolean` | `false` | Show a Layout Bounds toggle button on the debug toolbar.                                     |
| `showWifiButton`          | `boolean` | `false` | Show a Wi-Fi toggle button on the debug toolbar.                                             |
| `showMobileDataButton`    | `boolean` | `false` | Show a Mobile Data toggle button on the debug toolbar.                                       |
| `showAirplaneModeButton`  | `boolean` | `false` | Show an Airplane Mode toggle button on the debug toolbar.                                    |
| `showRecordButton`        | `boolean` | `false` | Show a Screen Recording button on the debug toolbar.                                         |
| `openRecordingAfterSave`  | `boolean` | `true`  | Automatically open saved screen recordings in the VS Code media viewer.                      |
| `outputDirectory`         | `string`  | `""`    | Directory to save screen recordings. Defaults to `emulator-captures/` in the workspace root. |

### Example `settings.json`

```json
{
  "device-toolkit.autoDetectDevices": true,
  "device-toolkit.showOpenControlsButton": true,
  "device-toolkit.showDarkModeButton": true,
  "device-toolkit.showNavModeButton": true,
  "device-toolkit.showLayoutBoundsButton": true,
  "device-toolkit.showRecordButton": true,
  "device-toolkit.openRecordingAfterSave": true,
  "device-toolkit.outputDirectory": "captures/"
}
```

---

## Known Issues & Troubleshooting

- **"ADB command failed" / "ADB not found"**:  
  Ensure `adb` is added to your environment variables (`PATH`). On Windows, verify `%ANDROID_HOME%\platform-tools` is in System Environment Variables.
- **Screen Recording limit**:  
  Android OS restricts `screenrecord` commands to a maximum duration of 3 minutes per recording.

---

## Contribution Guidelines

Contributions, bug reports, and feature requests are welcome!

### Local Development Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/antonyaiwin/device-toolkit-vs-code-ext.git
   cd device-toolkit-vs-code-ext
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start Watch Mode**:

   ```bash
   npm run watch
   ```

4. **Launch Extension in Debugger**:
   - Press `F5` in VS Code to open an **Extension Development Host** window.

## License

This project is licensed under the [MIT License](LICENSE).
