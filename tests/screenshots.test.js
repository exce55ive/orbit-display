// @ts-check
const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');

const appPath = path.join(__dirname, '..');

function getConfigDir() {
  if (process.platform === 'win32') return path.join(process.env.APPDATA || '', 'orbit');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'orbit');
  return path.join(os.homedir(), '.config', 'orbit');
}

const CONFIG_PATH = path.join(getConfigDir(), 'orbit-config.json');

let backupConfig = null;

test.beforeAll(() => {
  if (fs.existsSync(CONFIG_PATH)) {
    backupConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
  }
});

test.afterAll(() => {
  if (backupConfig !== null) {
    fs.writeFileSync(CONFIG_PATH, backupConfig);
  } else if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
  }
});

test.describe('Dashboard screenshots', () => {
  test('captures demo mode screenshot', async () => {
    const demoCfg = {
      demoMode: true,
      firstRunComplete: true,
      theme: { accentColor: '#00d9ff', themeId: 'midnight' },
      prefs: { tempUnit: 'C', timeFormat: '24h' },
      integrations: {},
      panels: {},
      pages: [
        { id: 'demo1', name: 'Overview', panels: [
          { type: 'clock', col: 1, width: 1 },
          { type: 'nowplaying', col: 2, width: 1 },
          { type: 'sonarr', col: 3, width: 1 },
          { type: 'nzbget', col: 4, width: 1 },
          { type: 'system', col: 5, width: 1 },
          { type: 'services', col: 6, width: 1 }
        ]}
      ]
    };
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(demoCfg, null, 2));

    const screenshotDir = path.join(appPath, 'screenshots');
    fs.mkdirSync(screenshotDir, { recursive: true });

    const app = await electron.launch({ args: [appPath] });
    try {
      const window = await app.firstWindow();

      // Wait for panels to render
      await window.waitForTimeout(3000);

      await window.screenshot({
        path: path.join(screenshotDir, 'orbit-dashboard.png'),
        fullPage: false
      });

      // Verify screenshot was created
      expect(fs.existsSync(path.join(screenshotDir, 'orbit-dashboard.png'))).toBe(true);
    } finally {
      await app.close();
    }
  });
});
