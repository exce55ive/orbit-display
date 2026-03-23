// @ts-check
const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');

const appPath = path.join(__dirname, '..');

// Helpers to get config path depending on platform
function getConfigDir() {
  if (process.platform === 'win32') return path.join(process.env.APPDATA || '', 'orbit');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'orbit');
  return path.join(os.homedir(), '.config', 'orbit');
}

const CONFIG_PATH = path.join(getConfigDir(), 'orbit-config.json');

// Back up and restore config around tests
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

test.describe('Config operations', () => {
  test('loadConfig returns an object', async () => {
    // Write a minimal config to ensure loadConfig returns something
    const testCfg = { theme: { accentColor: '#00d9ff' }, pages: [], integrations: {} };
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(testCfg, null, 2));

    const app = await electron.launch({ args: [appPath] });
    try {
      const window = await app.firstWindow();
      const config = await window.evaluate(() => window.orbit.loadConfig());
      expect(config).toBeTruthy();
      expect(typeof config).toBe('object');
    } finally {
      await app.close();
    }
  });

  test('saveConfig + loadConfig round-trips correctly', async () => {
    const testCfg = { theme: { accentColor: '#ff0000' }, pages: [], integrations: {}, prefs: { tempUnit: 'F', timeFormat: '12h' } };
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(testCfg, null, 2));

    const app = await electron.launch({ args: [appPath] });
    try {
      const window = await app.firstWindow();

      // Save a modified config
      const newCfg = { ...testCfg, prefs: { tempUnit: 'C', timeFormat: '24h' } };
      await window.evaluate((cfg) => window.orbit.saveConfig(cfg), newCfg);

      // Load it back
      const loaded = await window.evaluate(() => window.orbit.loadConfig());
      expect(loaded.prefs.tempUnit).toBe('C');
      expect(loaded.prefs.timeFormat).toBe('24h');
    } finally {
      await app.close();
    }
  });

  test('resetConfig returns defaults', async () => {
    // Write a config so the app launches to the dashboard
    const testCfg = { theme: { accentColor: '#00d9ff' }, pages: [{ id: 'p1', name: 'Home', panels: [{ type: 'clock', col: 1, width: 1 }] }], integrations: {} };
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(testCfg, null, 2));

    const app = await electron.launch({ args: [appPath] });
    try {
      const window = await app.firstWindow();
      const result = await window.evaluate(() => window.orbit.resetConfig());
      expect(result).toBeTruthy();
      expect(result.ok).toBe(true);
    } finally {
      await app.close();
    }
  });
});
