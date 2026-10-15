# Changelog

All notable changes to **Device Toolkit** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.0.2]

### Added

- **Network & Connectivity Controls**:
  - **Wi-Fi Toggle**: Toggle Wi-Fi state instantly on connected Android emulators and devices.
  - **Mobile Data Toggle**: Enable or disable cellular mobile data.
  - **Airplane Mode Toggle**: Toggle system-wide Airplane Mode.
  - **Activity Bar Sidebar Webview**: Dedicated **Network & Connectivity** section with live status indicators and checkboxes for Wi-Fi, Mobile Data, and Airplane Mode.
  - **Debug Toolbar Quick Actions**: Optional toolbar buttons for Wi-Fi (`showWifiButton`), Mobile Data (`showMobileDataButton`), and Airplane Mode (`showAirplaneModeButton`) with custom Material Symbols icons.
  - **Command Palette Commands**: `Device Toolkit: Toggle Wi-Fi`, `Device Toolkit: Toggle Mobile Data`, and `Device Toolkit: Toggle Airplane Mode`.

---

## [0.0.1] - Initial Release

### Features & Capabilities

- **Activity Bar Sidebar Control Panel**:

  - Full control webview interface in the VS Code Activity Bar.
  - Interactive toggles for Dark Theme and Layout Bounds.
  - Dropdown selectors for Navigation Mode (Gesture, 2-Button, 3-Button), Font Scale (Small to Largest), and Display Density (280–560 DPI).
  - Accessibility service toggles for TalkBack screen reader and Select to Speak.
  - Clickable device name header (`📱 Device Name`) to switch active devices instantly.
  - Integrated Screen Recording controls with real-time status and stop & save actions.

- **Cross-Platform Android SDK & ADB Path Detection (`SdkManager`)**:

  - Automatic, cross-platform Android SDK detection supporting Windows (`win32`), macOS (`darwin`), and Linux (`linux`).
  - 3-step sequential fallback strategy: 1) `device-toolkit.androidSdkPath` setting, 2) Environment variables (`ANDROID_HOME`, `ANDROID_SDK_ROOT`), 3) Default OS install paths (`%LOCALAPPDATA%\Android\Sdk`, `~/Library/Android/sdk`, `~/Android/Sdk`, etc.).
  - Flexible path resolution for SDK root directories, `platform-tools` subfolders, or direct `adb` executable paths with automatic quote stripping.

- **Activity Bar ADB Missing Notice & Settings Shortcut**:

  - Interactive **ADB Not Found** notice state inside the Activity Bar sidebar view (`DeviceControlsView`) when `adb` is missing or unconfigured.
  - **Configure SDK Path** button that opens VS Code Settings targeted directly at `device-toolkit.androidSdkPath`.

- **Debug Toolbar Quick Actions**:

  - Primary **Open Device Controls** toolbar button enabled by default (`showOpenControlsButton`).
  - Configurable quick-action toolbar icons for Dark Mode, Navigation Mode, TalkBack, Select to Speak, Font Size, Display Size, Layout Bounds, and Screen Recording.

- **Screen Recording & Auto-Save Handling**:

  - Screen recording (up to 3 minutes) with automatic resolution scaling and H.264 compatibility.
  - Dedicated Recording Panel webview tab with elapsed timer and auto-closing upon save completion.
  - Automatic detection and retrieval of 3-minute recordings when Android's OS time limit is reached.
  - Optional `openRecordingAfterSave` setting to automatically view recorded MP4 files in VS Code's media viewer.
  - Customizable `outputDirectory` setting for saved capture files.

- **Device Detection & Management**:

  - Auto-detection and 4-second polling for connected emulators and physical devices via ADB.
  - Multi-device selector for switching active devices during sessions.

- **CI/CD GitHub Actions Publishing & Release Workflow**:

  - Included GitHub Actions workflow (`.github/workflows/publish.yml`) to automatically build, package, publish to the VS Code Marketplace, and attach `.vsix` binaries to GitHub Releases on tag pushes (`v*.*.*` or `V*.*.*`).

- **Configuration & UX**:
  - Settings namespace under `device-toolkit.*`.
  - Command Palette integration for all commands under the `Device Toolkit` category.
