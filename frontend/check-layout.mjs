import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',
  args: ['--no-sandbox']
});

const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });

await page.goto('http://127.0.0.1:5177/login', { waitUntil: 'networkidle' });
console.log('Page title:', await page.title());

// Try to login
try {
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'LguIms2026!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('After login URL:', page.url());
} catch (e) {
  console.log('Login attempt error:', e.message);
  await page.screenshot({ path: 'src/login-fallback.png' });
}

await page.screenshot({ path: 'src/dashboard-check.png', fullPage: true });

const heights = await page.evaluate(() => {
  return {
    bodyHeight: document.body.scrollHeight,
    bodyOffsetHeight: document.body.offsetHeight,
    viewportHeight: window.innerHeight,
    drawerContentHeight: document.querySelector('.drawer-content')?.offsetHeight,
    drawerContentCSS: document.querySelector('.drawer-content')?.style?.cssText || 'not found',
    pageContentHeight: document.querySelector('.page-content')?.offsetHeight,
    pageInnerHeight: document.querySelector('.page-inner')?.offsetHeight,
    pageInnerCSS: document.querySelector('.page-inner')?.style?.cssText || 'not found',
    dashboardHeight: document.querySelector('.dashboard')?.offsetHeight,
    footerHeight: document.querySelector('footer')?.offsetHeight,
    footerOffsetTop: document.querySelector('footer')?.offsetTop,
    footerOffsetHeight: document.querySelector('footer')?.offsetHeight,
  };
});
console.log('Layout heights:', JSON.stringify(heights, null, 2));

await browser.close();
