# steel

**ST**andup wh**EEL** - A browser extension for randomly selecting team members during standups.

Steel displays a colorful spinning wheel overlay on Jira board pages. Spin the wheel to randomly pick a team member, and it automatically clicks their filter button on the board.

## Features

- Spinning wheel with vibrant colors and smooth animation
- Automatically clicks Jira quick filter buttons for the selected person
- Per-board name storage (each Jira board has its own team list)
- Quick toggle to enable/disable team members without removing them
- Keyboard shortcut support (`Alt+Shift+W`)
- Works with both Jira Cloud and Jira Server
- Cross-browser support (Firefox, Chrome, and Chromium-based browsers)

## Installation

### Firefox / Zen Browser

1. Open `about:debugging` in the address bar
2. Click **"This Firefox"** on the left sidebar
3. Click **"Load Temporary Add-on..."**
4. Navigate to the `steel` directory and select `manifest.json`

### Chrome / Chromium-based browsers

1. Open `chrome://extensions` in the address bar
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `steel` directory

## Usage

### Initial Setup

1. Navigate to your Jira board
2. Click the **Steel icon** in your browser toolbar
3. Enter your team member names (one per line) in the popup
4. Click **Save**

### Using the Wheel

1. On a Jira board, click the small **trigger button** (bottom-right corner) or press `Alt+Shift+W`
2. The wheel appears in the bottom-left corner
3. Click **Spin** or click directly on the wheel
4. The wheel spins and lands on a random team member
5. The selected person's Jira filter is automatically clicked
6. The person is removed from the wheel for the current session

### Controls

| Button    | Action                                                     |
| --------- | ---------------------------------------------------------- |
| **Spin**  | Spin the wheel to pick someone                             |
| **Reset** | Restore all team members to the wheel                      |
| **Edit**  | Toggle team members on/off (click names to enable/disable) |
| **Close** | Close the wheel overlay                                    |

### Quick Edit

Click **Edit** to see all team members. Click on a name to toggle it:

- **Normal text** = included in the wheel
- **~~Strikethrough~~** = excluded from the wheel

This is useful when someone is absent and you want to skip them without removing them from the master list.

### Master List

The master list of team members is managed in the extension popup (click the Steel icon in the toolbar). This is where you add or remove team members permanently.

## Keyboard Shortcuts

| Shortcut      | Action                   |
| ------------- | ------------------------ |
| `Alt+Shift+W` | Toggle the wheel overlay |
| `Escape`      | Close the wheel overlay  |

## Supported Jira URLs

- `*.atlassian.net/jira/software/projects/*/boards/*` (Jira Cloud)
- `*/secure/RapidBoard.jspa*` (Jira Server)

## Project Structure

```
steel/
├── manifest.json           # Extension manifest (MV3)
├── background.js           # Service worker for commands
├── browser-polyfill.min.js # Cross-browser compatibility
├── content/
│   ├── content.js          # Main content script
│   ├── content.css         # Overlay styles
│   ├── wheel.js            # Spinning wheel component
│   └── overlay.js          # Overlay UI and controls
├── popup/
│   ├── popup.html          # Extension popup
│   ├── popup.js            # Popup logic
│   └── popup.css           # Popup styles
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## License

MIT
