import { test, expect } from '@playwright/test';

const articleTitles = [
  'Cómo escribir artículos para el blog de Flariox',
  '¿Qué es Flariox?',
  'Bienvenidos a Flariox',
];

const translateMock = `
  window.google = { translate: {} };
  window.google.translate.TranslateElement = function (options, target) {
    window.__translateWidget = { options, target };
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Idioma');
    for (const language of options.includedLanguages.split(',')) {
      const option = document.createElement('option');
      option.value = language;
      option.textContent = language;
      select.append(option);
    }
    document.getElementById(target).append(select);
  };
  window.google.translate.TranslateElement.InlineLayout = { SIMPLE: 'simple' };
  window.googleTranslateElementInit();
`;

test.beforeEach(async ({ page }) => {
  // Keep the suite deterministic and prevent tests from contacting external services.
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'translate.google.com' && url.pathname === '/translate_a/element.js') {
      return route.fulfill({ contentType: 'application/javascript', body: translateMock });
    }
    if (url.origin === 'http://127.0.0.1:4173') return route.continue();
    return route.abort();
  });
});

async function expectArticleList(page, count = 3) {
  await expect(page.locator('#blog-cards')).toBeVisible();
  await expect(page.locator('#blog-cards .blog-card')).toHaveCount(count);
}

async function mockArticle(page, markdown) {
  await page.route('**/articles/index.json', route => route.fulfill({
    json: ['security-probe.md'],
  }));
  await page.route('**/articles/security-probe.md', route => route.fulfill({
    contentType: 'text/markdown; charset=utf-8', body: markdown,
  }));
}

test('blog loads all published local articles in newest-first order', async ({ page }) => {
  const externalArticleRequests = [];
  page.on('request', request => {
    if (/raw\.githubusercontent\.com/.test(request.url())) externalArticleRequests.push(request.url());
  });
  await page.goto('/blog.html');
  await expectArticleList(page);
  await expect(page.locator('#blog-cards .blog-card h3')).toHaveText(articleTitles);
  expect(externalArticleRequests).toEqual([]);
  for (const title of articleTitles) {
    await page.locator('.blog-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
      .getByRole('link', { name: /Leer más/ }).click();
    await expect(page.locator('#blog-content .article-markdown h1')).toContainText(title);
    await page.getByRole('link', { name: /Volver al blog/ }).click();
    await expectArticleList(page);
  }
});

test('search respects title, description, author, date and disabled filters', async ({ page }) => {
  await page.goto('/blog.html');
  await expectArticleList(page);
  const search = page.getByRole('searchbox', { name: 'Buscar artículos' });
  await search.fill('práctica');
  await expectArticleList(page, 1);
  await page.getByLabel('Descripción', { exact: true }).uncheck();
  await expect(page.getByText('No se encontraron artículos que coincidan con tu búsqueda')).toBeVisible();
  await search.fill('Bienvenidos');
  await expectArticleList(page, 1);
  await page.getByLabel('Título', { exact: true }).uncheck();
  await page.getByLabel('Autor', { exact: true }).check();
  await search.fill('Williams');
  await expect(page.locator('.blog-card h3')).toHaveText(['Bienvenidos a Flariox']);
  await page.getByLabel('Autor', { exact: true }).uncheck();
  await page.getByLabel('Fecha', { exact: true }).check();
  await search.fill('2025-06');
  await expectArticleList(page, 2);
  await page.getByLabel('Fecha', { exact: true }).uncheck();
  await expectArticleList(page, 0);
  await search.clear();
  await expectArticleList(page);
});

test('article URLs survive reload and browser back/forward preserves list search', async ({ page }) => {
  await page.goto('/blog.html');
  await expectArticleList(page);
  await page.getByRole('searchbox', { name: 'Buscar artículos' }).fill('Bienvenidos');
  await page.locator('.blog-card').getByRole('link', { name: /Leer más/ }).click();
  await expect(page).toHaveURL(/#article=bienvenidos-a-flariox\.md$/);
  await expect(page.locator('#blog-content .article-markdown h1')).toContainText('Bienvenidos a Flariox');
  await page.goBack();
  await expectArticleList(page, 1);
  await expect(page.getByRole('searchbox', { name: 'Buscar artículos' })).toHaveValue('Bienvenidos');
  await page.goForward();
  await expect(page.locator('#blog-content .article-markdown h1')).toContainText('Bienvenidos a Flariox');
  await page.reload();
  await expect(page.locator('#blog-content .article-markdown h1')).toContainText('Bienvenidos a Flariox');
});

test('manifest failure is visible and retry recovers without invented articles', async ({ page }) => {
  let fail = true;
  await page.route('**/articles/index.json', route => fail
    ? route.fulfill({ status: 503, body: 'Unavailable' })
    : route.continue());
  await page.goto('/blog.html');
  await expect(page.getByRole('button', { name: /Reintentar/ })).toBeVisible();
  await expect(page.locator('.blog-card')).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: /Reintentar/ }).click();
  await expectArticleList(page);
});

test('invalid manifest JSON can recover to an intentionally empty publication list', async ({ page }) => {
  let broken = true;
  await page.route('**/articles/index.json', route => broken
    ? route.fulfill({ contentType: 'application/json', body: '{' })
    : route.fulfill({ json: [] }));
  await page.goto('/blog.html');
  await expect(page.getByRole('button', { name: /Reintentar/ })).toBeVisible();
  await expect(page.locator('.blog-card')).toHaveCount(0);
  broken = false;
  await page.getByRole('button', { name: /Reintentar/ }).click();
  await expect(page.getByText('No hay artículos publicados.', { exact: true })).toBeVisible();
  await expectArticleList(page, 0);
});

test('a partially unavailable article list stays usable and can recover', async ({ page }) => {
  let fail = true;
  await page.route('**/articles/bienvenidos-a-flariox.md', route => fail
    ? route.fulfill({ status: 503, body: 'Unavailable' })
    : route.continue());
  await page.goto('/blog.html');
  await expectArticleList(page, 2);
  await expect(page.getByRole('heading', { name: 'No se pudieron cargar algunos artículos' })).toBeVisible();
  await expect(page.locator('.blog-card h3')).toHaveText(articleTitles.slice(0, 2));
  fail = false;
  await page.getByRole('button', { name: /Reintentar/ }).click();
  await expectArticleList(page);
  await expect(page.locator('.error-message')).toHaveCount(0);
});

test('leaving a loading article cancels its request and preserves the next selection', async ({ page }) => {
  let delayArticle = false;
  let releaseResponse;
  let finishResponse;
  const delayedResponse = new Promise(resolve => { releaseResponse = resolve; });
  const responseFinished = new Promise(resolve => { finishResponse = resolve; });
  await page.route('**/articles/bienvenidos-a-flariox.md', async route => {
    if (!delayArticle) return route.continue();
    await delayedResponse;
    try {
      await route.fulfill({ contentType: 'text/markdown', body: '# Stale article response' });
    } finally {
      finishResponse();
    }
  });
  await page.goto('/blog.html');
  await expectArticleList(page);
  delayArticle = true;
  await page.locator('.blog-card').filter({ hasText: 'Bienvenidos a Flariox' })
    .getByRole('link', { name: /Leer más/ }).click();
  await expect(page.getByText('Cargando artículo...', { exact: true })).toBeVisible();
  const cancelled = page.waitForEvent('requestfailed', {
    predicate: request => request.url().endsWith('/articles/bienvenidos-a-flariox.md'),
  });
  await page.getByRole('link', { name: /Volver al blog/ }).click();
  await cancelled;
  await expectArticleList(page);
  await page.locator('.blog-card').filter({ has: page.getByRole('heading', { name: articleTitles[0], exact: true }) })
    .getByRole('link', { name: /Leer más/ }).click();
  await expect(page.locator('.article-markdown h1')).toHaveText(articleTitles[0]);
  releaseResponse();
  await responseFinished;
  await expect(page.locator('.article-markdown h1')).toHaveText(articleTitles[0]);
  await expect(page).toHaveURL(/#article=como-escribir-articulos\.md$/);
});

test('article failure has a working retry and return-to-list action', async ({ page }) => {
  let articleRequests = 0;
  let fail = false;
  await page.route('**/articles/bienvenidos-a-flariox.md', route => {
    articleRequests += 1;
    return fail ? route.fulfill({ status: 503, body: 'Unavailable' }) : route.continue();
  });
  await page.goto('/blog.html');
  await expectArticleList(page);
  fail = true;
  await page.locator('.blog-card').filter({ hasText: 'Bienvenidos a Flariox' })
    .getByRole('link', { name: /Leer más/ }).click();
  await expect(page.locator('#blog-content').getByRole('button', { name: /Reintentar/ })).toBeVisible();
  fail = false;
  await page.locator('#blog-content').getByRole('button', { name: /Reintentar/ }).click();
  await expect(page.locator('#blog-content .article-markdown h1')).toContainText('Bienvenidos a Flariox');
  expect(articleRequests).toBeGreaterThanOrEqual(3);
  await page.getByRole('link', { name: /Volver al blog/ }).click();
  await expectArticleList(page);
});

for (const filename of ['../index.html', 'https://evil.example/probe.md', '%2e%2e/probe.md', "probe');alert(1);//.md"]) {
  test(`unsafe manifest filename is rejected before any article fetch: ${filename}`, async ({ page }) => {
    const articleRequests = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (request.resourceType() === 'fetch' && !url.pathname.endsWith('/articles/index.json')) {
        articleRequests.push(request.url());
      }
    });
    await page.route('**/articles/index.json', route => route.fulfill({ json: [filename] }));
    await page.goto('/blog.html');
    await expect(page.getByRole('button', { name: /Reintentar/ })).toBeVisible();
    await expect(page.locator('.blog-card')).toHaveCount(0);
    expect(articleRequests).toEqual([]);
  });
}

test('an article URL outside the manifest cannot fetch arbitrary files', async ({ page }) => {
  const forbiddenRequests = [];
  page.on('request', request => {
    if (request.url().includes('unlisted.md')) forbiddenRequests.push(request.url());
  });
  await page.goto('/blog.html#article=unlisted.md');
  await expect(page.locator('.article-markdown')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Volver al blog/ })).toBeVisible();
  expect(forbiddenRequests).toEqual([]);
});

test('metadata is text and Markdown removes executable HTML while preserving formatting', async ({ page }) => {
  await mockArticle(page, `---
title: '<img src=x onerror=window.__metadataXss=true> Article'
description: '<svg onload=window.__metadataXss=true> Description'
date: '2026-01-01'
author: '<img src=x onerror=window.__metadataXss=true> Author'
---
# Safe heading

**Useful formatting**

<img src="x" onerror="window.__markdownXss=true">
<svg onload="window.__markdownXss=true"></svg>
<script>window.__markdownXss=true</script>
<a href="javascript:window.__markdownXss=true">Dangerous link</a>
`);
  await page.goto('/blog.html');
  await expectArticleList(page, 1);
  await expect(page.locator('.blog-card h3')).toContainText('<img src=x onerror=');
  await expect(page.locator('.blog-card img, .blog-card svg')).toHaveCount(0);
  await page.getByRole('link', { name: /Leer más/ }).click();
  const article = page.locator('.article-markdown');
  await expect(article.getByRole('heading', { name: 'Safe heading' })).toBeVisible();
  await expect(article.locator('strong')).toHaveText('Useful formatting');
  await expect(article.locator('script, [onerror], [onload], a[href^="javascript:"]')).toHaveCount(0);
  expect(await page.evaluate(() => Boolean(window.__metadataXss || window.__markdownXss))).toBe(false);
});

for (const dependency of ['marked', 'dompurify']) {
  test(`article rendering fails safely and retry recovers when ${dependency} cannot load`, async ({ page }) => {
    let unavailable = true;
    await page.route(`**/assets/vendor/${dependency}/**`, route => unavailable
      ? route.abort()
      : route.continue());
    await page.goto('/blog.html#article=bienvenidos-a-flariox.md');
    await expect(page.locator('.article-markdown')).toHaveCount(0);
    await expect(page.getByText(/no se pudo|no está disponible|no se puede|no están disponibles|error/i).first()).toBeVisible();
    unavailable = false;
    await page.getByRole('button', { name: /Reintentar/ }).click();
    await expect(page.locator('.article-markdown h1')).toContainText('Bienvenidos a Flariox');
    await expect(page).toHaveURL(/#article=bienvenidos-a-flariox\.md$/);
  });
}

test('desktop pages, FAQ details and installation navigation remain usable', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/index.html');
  await expect(page.getByRole('heading', { name: 'Flariox OS', level: 1, exact: true })).toBeVisible();
  await page.locator('.nav-list').getByRole('link', { name: /Blog$/ }).click();
  await expectArticleList(page);
  await page.locator('.nav-list').getByRole('link', { name: /FAQ$/ }).click();
  await expect(page.getByRole('heading', { name: 'Preguntas frecuentes', exact: true })).toBeVisible();
  const firstQuestion = page.locator('details').first();
  await expect(firstQuestion.locator('p')).toBeHidden();
  await firstQuestion.locator('summary').click();
  await expect(firstQuestion.locator('p')).toBeVisible();
  await page.getByRole('link', { name: 'Guía avanzada de Arch base', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Guía avanzada de Arch base', exact: true })).toBeVisible();
  await page.locator('.nav-list').getByRole('link', { name: /Inicio$/ }).click();
  await expect(page.getByRole('heading', { name: 'Flariox OS', level: 1, exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile navigation opens, closes on Escape, and follows page links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html');
  const toggle = page.locator('.sidebar-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#sidebar')).toHaveAttribute('aria-hidden', 'false');
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await page.locator('#sidebar').getByRole('link', { name: /Blog$/ }).click();
  await expectArticleList(page);
  await page.locator('.sidebar-toggle').click();
  await page.locator('#sidebar').getByRole('link', { name: /FAQ$/ }).click();
  await expect(page.getByRole('heading', { name: 'Preguntas frecuentes', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('unfinished homepage sections and their links stay hidden', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('#screenshots')).toBeHidden();
  await expect(page.locator('.newsletter-form')).toBeHidden();
  for (const name of ['Capturas', 'Documentación', 'Roadmap']) {
    await expect(page.getByRole('link', { name, exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole('link', { name: 'Próximamente', exact: true })).toHaveCount(0);
});

test('homepage translation widget preserves configured language selection', async ({ page }) => {
  await page.goto('/index.html');
  const select = page.getByRole('combobox', { name: 'Idioma' });
  await expect(select).toBeVisible();
  expect(await page.evaluate(() => window.__translateWidget)).toEqual({
    options: { pageLanguage: 'es', includedLanguages: 'en,fr,pt,it,de', layout: 'simple' },
    target: 'google_translate_element',
  });
  await expect(select.locator('option')).toHaveText(['en', 'fr', 'pt', 'it', 'de']);
  await select.selectOption('en');
  await expect(select).toHaveValue('en');
});

test('legal dialogs open and close from each published page that offers them', async ({ page }) => {
  for (const path of ['/index.html', '/blog.html']) {
    await page.goto(path);
    for (const [name, id] of [
      ['Licencia', 'licencia'],
      ['Política de privacidad', 'privacidad'],
      ['Términos de uso', 'terminos'],
      ['Código de conducta', 'conducta'],
    ]) {
      await page.locator('.footer-legal').getByRole('button', { name, exact: true }).click();
      await expect(page.locator(`#modal-${id}`)).toHaveCSS('opacity', '1');
      await page.locator(`#modal-${id} .modal-close`).click();
      await expect(page.locator(`#modal-${id}`)).toHaveCSS('opacity', '0');
    }
  }
});

test('static server does not expose the removed PHP endpoint or development files', async ({ request }) => {
  for (const path of ['/contact.php', '/.git/config', '/node_modules/@playwright/test/package.json', '/tests/site.spec.mjs']) {
    expect((await request.get(path)).status()).toBe(404);
  }
});
