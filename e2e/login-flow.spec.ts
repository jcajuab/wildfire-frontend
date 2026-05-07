import { test, expect } from '@playwright/test';

interface RequestTiming {
  url: string;
  method: string;
  startTime: number;
  duration: number;
  status: number;
}

interface LoginMetrics {
  type: 'cold' | 'warm';
  loginPageLoadMs: number;
  loginApiMs: number;
  refreshApiCalls: number;
  refreshApiTotalMs: number;
  totalLoginToDashboardMs: number;
  fcp: number | null;
  lcp: number | null;
  ttfb: number | null;
  allRequests: RequestTiming[];
}

function createRequestTracker(page: any) {
  const requests: RequestTiming[] = [];
  const pending = new Map<string, { url: string; method: string; startTime: number }>();

  page.on('request', (req: any) => {
    const key = `${req.method()}:${req.url()}`;
    pending.set(key, {
      url: req.url(),
      method: req.method(),
      startTime: Date.now(),
    });
  });

  page.on('response', (res: any) => {
    const req = res.request();
    const key = `${req.method()}:${req.url()}`;
    const entry = pending.get(key);
    if (entry) {
      requests.push({
        ...entry,
        duration: Date.now() - entry.startTime,
        status: res.status(),
      });
      pending.delete(key);
    }
  });

  return {
    getAll: () => [...requests],
    clear: () => { requests.length = 0; pending.clear(); },
    getByPattern: (pattern: string) => requests.filter(r => r.url.includes(pattern)),
  };
}

/** Wait for the dashboard to be visually ready: sidebar region + a main heading. */
async function waitForDashboard(page: any) {
  await page.waitForSelector('region[aria-label="Sidebar"], [role="region"][aria-label="Sidebar"], aside, nav[aria-label="Main navigation"]', {
    state: 'visible',
    timeout: 30000,
  });
  // Also wait for the main content heading to confirm the page rendered
  await page.waitForSelector('main h1, main h2', { state: 'visible', timeout: 30000 });
}

test.describe('Login Performance', () => {
  test('Cold start login — fresh browser, no cookies', async ({ page }) => {
    const tracker = createRequestTracker(page);

    // Navigate to login page — use domcontentloaded to avoid networkidle stall on production
    const loginPageStart = Date.now();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const loginPageLoadMs = Date.now() - loginPageStart;

    // Wait for login form to be visible
    await page.waitForSelector('input[name="username"]', { state: 'visible', timeout: 30000 });

    // Fill credentials
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', '7EKWCWL4eBip0THX');

    // Clear tracker to isolate login-specific requests
    tracker.clear();
    const loginStart = Date.now();

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for URL to change to /admin
    await page.waitForURL(/\/admin/, { timeout: 30000 });

    // Wait for dashboard content to be visible (sidebar + main heading)
    await waitForDashboard(page);

    const totalLoginToDashboardMs = Date.now() - loginStart;

    // Collect performance metrics
    const perfMetrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('paint');
      const fcp = entries.find((e: PerformanceEntry) => e.name === 'first-contentful-paint');
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const nav = navEntries[0];
      return {
        fcp: fcp ? fcp.startTime : null,
        ttfb: nav ? nav.responseStart - nav.requestStart : null,
      };
    });

    // Collect LCP
    const lcp = await page.evaluate(() => {
      return new Promise<number | null>((resolve) => {
        let lcpValue: number | null = null;
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            lcpValue = entries[entries.length - 1].startTime;
          }
        });
        try {
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(lcpValue);
          }, 1000);
        } catch {
          resolve(null);
        }
      });
    });

    // Analyze auth-specific requests
    const loginApiRequests = tracker.getByPattern('/auth/login');
    const refreshApiRequests = tracker.getByPattern('/auth/refresh');

    const loginApiMs = loginApiRequests.length > 0 ? loginApiRequests[0].duration : 0;
    const refreshApiTotalMs = refreshApiRequests.reduce((sum, r) => sum + r.duration, 0);

    const metrics: LoginMetrics = {
      type: 'cold',
      loginPageLoadMs,
      loginApiMs,
      refreshApiCalls: refreshApiRequests.length,
      refreshApiTotalMs,
      totalLoginToDashboardMs,
      fcp: perfMetrics.fcp,
      lcp,
      ttfb: perfMetrics.ttfb,
      allRequests: tracker.getAll(),
    };

    console.log('\n=== COLD START LOGIN METRICS ===');
    console.log(`Login page load: ${loginPageLoadMs}ms`);
    console.log(`POST /auth/login: ${loginApiMs}ms`);
    console.log(`POST /auth/refresh calls: ${refreshApiRequests.length}`);
    console.log(`POST /auth/refresh total: ${refreshApiTotalMs}ms`);
    console.log(`Total login → dashboard: ${totalLoginToDashboardMs}ms`);
    console.log(`FCP: ${perfMetrics.fcp}ms`);
    console.log(`LCP: ${lcp}ms`);
    console.log(`TTFB: ${perfMetrics.ttfb}ms`);
    console.log(`Total requests: ${tracker.getAll().length}`);
    console.log('================================\n');

    // Attach metrics as test artifact
    await test.info().attach('cold-start-metrics', {
      body: JSON.stringify(metrics, null, 2),
      contentType: 'application/json',
    });

    // Save to file
    const fs = await import('fs');
    const path = await import('path');
    const resultsDir = path.join(process.cwd(), 'perf-results');
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
    fs.writeFileSync(
      path.join(resultsDir, 'baseline-e2e-cold.json'),
      JSON.stringify(metrics, null, 2),
    );
  });

  test('Warm start login — after logout, session hint exists', async ({ page }) => {
    const tracker = createRequestTracker(page);

    // First: do an initial login to establish session storage hints
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="username"]', { state: 'visible', timeout: 30000 });
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', '7EKWCWL4eBip0THX');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 30000 });
    await waitForDashboard(page);

    // Simulate logout by clearing cookies so the next visit to /login is unauthenticated
    // but localStorage/sessionStorage hints (e.g. last-used-username) are preserved for "warm" feel
    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="username"]', { state: 'visible', timeout: 30000 });

    // Clear tracker for warm start measurement
    tracker.clear();
    const warmStart = Date.now();

    // Second login (warm start)
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', '7EKWCWL4eBip0THX');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/admin/, { timeout: 30000 });
    await waitForDashboard(page);

    const totalLoginToDashboardMs = Date.now() - warmStart;

    const loginApiRequests = tracker.getByPattern('/auth/login');
    const refreshApiRequests = tracker.getByPattern('/auth/refresh');
    const loginApiMs = loginApiRequests.length > 0 ? loginApiRequests[0].duration : 0;
    const refreshApiTotalMs = refreshApiRequests.reduce((sum, r) => sum + r.duration, 0);

    const metrics: LoginMetrics = {
      type: 'warm',
      loginPageLoadMs: 0, // Already on login page
      loginApiMs,
      refreshApiCalls: refreshApiRequests.length,
      refreshApiTotalMs,
      totalLoginToDashboardMs,
      fcp: null,
      lcp: null,
      ttfb: null,
      allRequests: tracker.getAll(),
    };

    console.log('\n=== WARM START LOGIN METRICS ===');
    console.log(`POST /auth/login: ${loginApiMs}ms`);
    console.log(`POST /auth/refresh calls: ${refreshApiRequests.length}`);
    console.log(`POST /auth/refresh total: ${refreshApiTotalMs}ms`);
    console.log(`Total login → dashboard: ${totalLoginToDashboardMs}ms`);
    console.log(`Total requests: ${tracker.getAll().length}`);
    console.log('================================\n');

    await test.info().attach('warm-start-metrics', {
      body: JSON.stringify(metrics, null, 2),
      contentType: 'application/json',
    });

    const fs = await import('fs');
    const path = await import('path');
    const resultsDir = path.join(process.cwd(), 'perf-results');
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
    fs.writeFileSync(
      path.join(resultsDir, 'baseline-e2e-warm.json'),
      JSON.stringify(metrics, null, 2),
    );
  });
});
