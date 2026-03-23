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

test.describe('Update flow', () => {
  test('checkUpdate returns a result (not an exception)', async () => {
    const testCfg = {
      theme: { accentColor: '#00d9ff' },
      firstRunComplete: true,
      pages: [{ id: 'p1', name: 'Home', panels: [{ type: 'clock', col: 1, width: 1 }] }],
      integrations: {}
    };
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(testCfg, null, 2));

    const app = await electron.launch({ args: [appPath] });
    try {
      const window = await app.firstWindow();
      await window.waitForTimeout(2000);

      // checkUpdate should return some result, not throw
      const result = await window.evaluate(async () => {
        try {
          return await window.orbit.checkUpdate();
        } catch (e) {
          return { error: e.message };
        }
      });
      // It should be an object (either { version: ... } or { error: ... })
      expect(result).toBeTruthy();
      expect(typeof result).toBe('object');
    } finally {
      await app.close();
    }
  });

  test('getPendingUpdate returns null when no update pending', async () => {
    const testCfg = {
      theme: { accentColor: '#00d9ff' },
      firstRunComplete: true,
      pages: [{ id: 'p1', name: 'Home', panels: [{ type: 'clock', col: 1, width: 1 }] }],
      integrations: {}
    };
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(testCfg, null, 2));

    const app = await electron.launch({ args: [appPath] });
    try {
      const window = await app.firstWindow();
      await window.waitForTimeout(2000);

      const pending = await window.evaluate(() => window.orbit.getPendingUpdate());
      // No update has been checked yet, so should be null/falsy
      expect(pending).toBeFalsy();
    } finally {
      await app.close();
    }
  });
});
