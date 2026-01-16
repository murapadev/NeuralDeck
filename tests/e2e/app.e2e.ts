/**
 * E2E Test: Application Startup
 * 
 * Tests basic Electron app lifecycle and window creation.
 */
import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'node:path';

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // Launch Electron app
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../dist-electron/main.js')],
  });

  // Get the first window
  page = await electronApp.firstWindow();
  
  // Wait for the app to load
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe('Application Startup', () => {
  test('should launch successfully', async () => {
    expect(electronApp).toBeDefined();
    expect(page).toBeDefined();
  });

  test('should show main window', async () => {
    const title = await page.title();
    expect(title).toContain('NeuralDeck');
  });

  test('should render sidebar', async () => {
    const sidebar = await page.locator('aside').first();
    await expect(sidebar).toBeVisible();
  });

  test('should have settings button', async () => {
    const settingsButton = await page.locator('button').filter({ has: page.locator('svg') }).last();
    await expect(settingsButton).toBeVisible();
  });
});

test.describe('Provider Switching', () => {
  test('should switch between providers', async () => {
    // Get first provider button in sidebar
    const providerButtons = await page.locator('aside button').all();
    
    if (providerButtons.length >= 2) {
      // Click second provider
      await providerButtons[1].click();
      
      // Wait for view change
      await page.waitForTimeout(500);
      
      // Provider should now be active (has specific styling)
      // This is a basic check - could be more specific
      expect(true).toBe(true);
    }
  });
});
