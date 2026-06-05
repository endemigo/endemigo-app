const { chromium } = require('playwright');
const path = require('path');

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set a good viewport size
  await page.setViewportSize({ width: 1280, height: 1200 });

  // Listen for console logs
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  
  const artifactDir = '/Users/fatihkartal/.gemini/antigravity/brain/3d1eb5b6-455b-4f1d-aa2b-c1f43a3e0b00';
  
  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:5174/login');
    await page.waitForTimeout(1000);

    console.log('Filling login form...');
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('admin@endemigo.test');
    
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('Secret123!');
    
    console.log('Submitting login...');
    await passwordInput.press('Enter');
    
    console.log('Waiting for URL redirect...');
    await page.waitForURL('http://localhost:5174/', { timeout: 10000 });
    console.log('Successfully logged in!');

    console.log('Navigating to categories list...');
    await page.goto('http://localhost:5174/categories');
    await page.waitForTimeout(2000);
    
    console.log('Hovering over Antika Mobilya row...');
    const row = page.locator('.admin-table tbody tr:has-text("Antika Mobilya")');
    await row.hover();
    await page.waitForTimeout(500);
    
    console.log('Opening edit drawer...');
    const editBtn = row.locator('button:has(.pi-pencil)');
    await editBtn.click();
    await page.waitForTimeout(2000);
    
    // Take screenshot of open drawer
    await page.screenshot({ path: path.join(artifactDir, 'drawer_open_mobilya_localized.png') });
    console.log('Drawer opened. Saved localized template editor screenshot.');
  } catch (err) {
    console.error('Debug script failed:', err);
    try {
      await page.screenshot({ path: path.join(artifactDir, 'error_page.png') });
      console.log('Saved error page screenshot.');
    } catch (ssErr) {
      console.error('Failed to take error screenshot:', ssErr);
    }
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
