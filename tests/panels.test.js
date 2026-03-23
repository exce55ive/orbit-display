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

test.describe('Panel visibility', () => {
  test('main window loads without JS errors', async () => {
    const testCfg = {
      theme: { accentColor: '#00d9ff', themeId: 'midnight' },
      firstRunComplete: true,
      pages: [{ id: 'p1', name: 'Home', panels: [
        { type: 'clock', col: 1, width: 1 },
        { type: 'system', col: 2, width: 1 }
      ]}],
      integrations: {},
      panels: {}
    };
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(testCfg, null, 2));

    const errors = [];
    const app = await electron.launch({ args: [appPath] });
    try {
      const window = await app.firstWindow();
      window.on('pageerror', (err) => errors.push(err.message));

      // Wait for the app to render
      await window.waitForTimeout(3000);
      expect(errors.length).toBe(0);
    } finally {
      await app.close();
    }
  });

  test('hidden panel is not rendered in the DOM', async () => {
    const testCfg = {
      theme: { accentColor: '#00d9ff', themeId: 'midnight' },
      firstRunComplete: true,
      pages: [{ id: 'p1', name: 'Home', panels: [
        { type: 'clock', col: 1, width: 1 },
        { type: 'system', col: 2, width: 1 }
      ]}],
      integrations: {},
      panels: { system: false }  // hide system panel
    };
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(testCfg, null, 2));

    const app = await electron.launch({ args: [appPath] });
    try {
      const window = await app.firstWindow();
      await window.waitForTimeout(3000);

      // The grid should only have 1 column (clock), not 2
      const colCount = await window.evaluate(() => {
        const appEl = document.getElementById('app');
        if (!appEl) return 0;
        return appEl.style.getPropertyValue('--panel-cols');
      });
      expect(String(colCount)).toBe('1');
    } finally {
      await app.close();
    }
  });
});
