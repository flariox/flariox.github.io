(() => {
  'use strict';

  const cards = document.getElementById('blog-cards');
  const content = document.getElementById('blog-content');
  const search = document.getElementById('search-input');
  const filters = ['title', 'description', 'date', 'author'].map(field => ({
    field,
    input: document.getElementById(`filter-${field}`)
  }));
  const filenamePattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.md$/;
  const articlesURL = new URL('./articles/', window.location.href);
  let articles = [];
  let publishedFiles = new Set();
  let failedFiles = 0;
  let loadStatus = 'loading';
  let loadError = '';
  let loadVersion = 0;
  let viewVersion = 0;
  let loadController;
  let articleController;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(className) {
    const node = element('i', className);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function retryButton(retry) {
    const button = element('button', 'retry-button cta-button', 'Reintentar');
    button.type = 'button';
    button.prepend(icon('fas fa-sync-alt'));
    button.addEventListener('click', retry);
    return button;
  }

  function backLink() {
    const link = element('a', 'back-button cta-button secondary', 'Volver al blog');
    link.href = `${window.location.pathname}${window.location.search}`;
    link.prepend(icon('fas fa-arrow-left'));
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      window.location.hash = '';
    });
    return link;
  }

  function loading(message) {
    const node = element('div', 'loading-spinner', message);
    node.prepend(icon('fas fa-spinner fa-spin'));
    return node;
  }

  function errorMessage(title, message, retry) {
    const node = element('div', 'error-message');
    node.append(element('h3', '', title), element('p', '', message));
    if (retry) node.append(retryButton(retry));
    return node;
  }

  function showList(...nodes) {
    content.replaceChildren();
    content.style.display = 'none';
    content.setAttribute('aria-busy', 'false');
    cards.style.display = 'grid';
    cards.replaceChildren(...nodes);
    cards.setAttribute('aria-busy', String(loadStatus === 'loading'));
  }

  function showArticle(...nodes) {
    cards.style.display = 'none';
    cards.setAttribute('aria-busy', 'false');
    content.style.display = 'block';
    content.replaceChildren(backLink(), ...nodes);
  }

  function parseArticle(rawContent) {
    const normalized = rawContent.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
    const metadata = Object.create(null);
    if (match) {
      for (const line of match[1].split('\n')) {
        const separator = line.indexOf(':');
        if (separator < 0) continue;
        const key = line.slice(0, separator).trim();
        if (!['title', 'description', 'date', 'author'].includes(key)) continue;
        let value = line.slice(separator + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        metadata[key] = value;
      }
    }
    return { metadata, body: match ? normalized.slice(match[0].length) : normalized };
  }

  async function fetchResponse(url, signal) {
    const response = await fetch(url, { signal, redirect: 'error' });
    if (!response.ok) throw new Error(`No se pudo cargar el contenido (HTTP ${response.status}).`);
    return response;
  }

  function currentRoute() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (!params.has('article')) return { article: false };
    const names = params.getAll('article');
    return {
      article: true,
      filename: names[0],
      valid: names.length === 1 && validFilename(names[0])
    };
  }

  function validFilename(filename) {
    return typeof filename === 'string' && filename === filename.trim() && filenamePattern.test(filename);
  }

  function stopArticleRequest() {
    viewVersion += 1;
    articleController?.abort();
  }

  function dateValue(value) {
    const date = Date.parse(value);
    return Number.isFinite(date) ? date : 0;
  }

  function renderList() {
    const term = search.value.toLocaleLowerCase('es');
    const selected = filters.filter(filter => filter.input.checked);
    const matches = articles.filter(article => !term || selected.some(filter =>
      article[filter.field].toLocaleLowerCase('es').includes(term)
    ));
    const nodes = [];
    if (failedFiles) {
      nodes.push(errorMessage('No se pudieron cargar algunos artículos',
        'Puedes volver a intentarlo para actualizar la lista.', loadArticles));
    }
    if (matches.length === 0) {
      nodes.push(element('div', 'no-results', articles.length === 0 && !failedFiles
        ? 'No hay artículos publicados.'
        : 'No se encontraron artículos que coincidan con tu búsqueda'));
    }
    for (const article of matches) {
      const card = element('div', 'blog-card');
      const meta = element('div', 'article-meta');
      const date = element('span', 'date', article.date);
      date.prepend(icon('far fa-calendar-alt'));
      const author = element('span', 'author', article.author);
      author.prepend(icon('fas fa-user'));
      meta.append(date, author);
      const link = element('a', 'read-more cta-button secondary', 'Leer más');
      link.href = `#article=${encodeURIComponent(article.file)}`;
      link.append(icon('fas fa-arrow-right'));
      card.append(element('h3', '', article.title),
        element('p', 'article-excerpt', article.description), meta, link);
      card.addEventListener('click', event => {
        if (event.target.closest('a, button') || window.getSelection()?.toString()) return;
        window.location.hash = `article=${encodeURIComponent(article.file)}`;
      });
      nodes.push(card);
    }
    showList(...nodes);
  }

  async function renderArticle(filename, version) {
    articleController = new AbortController();
    content.setAttribute('aria-busy', 'true');
    showArticle(loading('Cargando artículo...'));
    const dependenciesAvailable = typeof window.marked?.parse === 'function' &&
      typeof window.DOMPurify?.sanitize === 'function' && window.DOMPurify.isSupported !== false;
    try {
      if (!dependenciesAvailable) {
        throw new Error('No se puede mostrar el artículo de forma segura. No se pudieron cargar las dependencias del blog.');
      }
      const response = await fetchResponse(new URL(filename, articlesURL), articleController.signal);
      const rawContent = await response.text();
      if (version !== viewVersion) return;
      const html = window.marked.parse(parseArticle(rawContent).body);
      if (typeof html !== 'string') throw new Error('No se pudo procesar el artículo de forma segura.');
      const sanitized = window.DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        SANITIZE_NAMED_PROPS: true,
        RETURN_DOM_FRAGMENT: true
      });
      if (!(sanitized instanceof DocumentFragment)) {
        throw new Error('No se pudo procesar el artículo de forma segura.');
      }
      if (version !== viewVersion) return;
      const article = element('div', 'article-markdown');
      article.append(sanitized);
      showArticle(article);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (version !== viewVersion || error.name === 'AbortError') return;
      showArticle(errorMessage('Error al cargar el artículo', error.message,
        dependenciesAvailable ? renderRoute : () => window.location.reload()));
    } finally {
      if (version === viewVersion) content.setAttribute('aria-busy', 'false');
    }
  }

  function renderRoute() {
    stopArticleRequest();
    if (loadStatus === 'loading') {
      showList(loading('Cargando artículos...'));
      return;
    }
    if (loadStatus === 'error') {
      showList(errorMessage('Error al cargar los artículos', loadError, loadArticles));
      return;
    }
    const route = currentRoute();
    if (!route.article) {
      renderList();
    } else if (!route.valid || !publishedFiles.has(route.filename)) {
      content.setAttribute('aria-busy', 'false');
      showArticle(errorMessage('Artículo no disponible',
        'El enlace no corresponde a un artículo publicado en este sitio.'));
    } else {
      renderArticle(route.filename, viewVersion);
    }
  }

  async function loadArticles() {
    const version = ++loadVersion;
    loadController?.abort();
    loadController = new AbortController();
    const signal = loadController.signal;
    loadStatus = 'loading';
    publishedFiles = new Set();
    renderRoute();
    try {
      const response = await fetchResponse(new URL('index.json', articlesURL), signal);
      const manifest = await response.json();
      // Validate the entire manifest before requesting any article.
      if (!Array.isArray(manifest) || manifest.some(filename => !validFilename(filename))) {
        throw new Error('El índice de artículos no es válido.');
      }
      const filenames = [...new Set(manifest)];
      const results = await Promise.allSettled(filenames.map(async filename => {
        const articleResponse = await fetchResponse(new URL(filename, articlesURL), signal);
        const { metadata } = parseArticle(await articleResponse.text());
        return {
          file: filename,
          title: metadata.title || filename.slice(0, -3),
          description: metadata.description || 'Sin descripción',
          date: metadata.date || 'Sin fecha',
          author: metadata.author || 'Equipo Flariox'
        };
      }));
      if (version !== loadVersion) return;
      publishedFiles = new Set(filenames);
      articles = results.filter(result => result.status === 'fulfilled').map(result => result.value);
      failedFiles = results.length - articles.length;
      articles.sort((a, b) => dateValue(b.date) - dateValue(a.date));
      loadStatus = 'ready';
      renderRoute();
    } catch (error) {
      if (version !== loadVersion || error.name === 'AbortError') return;
      loadError = error.message;
      loadStatus = 'error';
      renderRoute();
    }
  }

  function updateSearch() {
    if (loadStatus === 'ready' && !currentRoute().article) renderList();
  }

  search.addEventListener('input', updateSearch);
  for (const filter of filters) filter.input.addEventListener('change', updateSearch);
  window.addEventListener('hashchange', renderRoute);
  loadArticles();
})();
