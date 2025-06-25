document.addEventListener('DOMContentLoaded', function () {
  // Sidebar
  const toggleBtn = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const closeBtn = document.querySelector('.close-sidebar');
  const body = document.body;

  function toggleSidebar() {
    const isOpen = sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    body.classList.toggle('sidebar-open');
    toggleBtn.setAttribute('aria-expanded', isOpen);
    sidebar.setAttribute('aria-hidden', !isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  toggleBtn?.addEventListener('click', toggleSidebar);
  overlay?.addEventListener('click', toggleSidebar);
  closeBtn?.addEventListener('click', toggleSidebar);

  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', toggleSidebar);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sidebar.classList.contains('active')) {
      toggleSidebar();
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
      toggleSidebar();
    }
  });

  // Banner de cookies
  const cookieBanner = document.getElementById('cookie-banner');
  const acceptCookiesBtn = document.getElementById('accept-cookies');

  if (!localStorage.getItem('cookiesAccepted')) {
    cookieBanner.classList.add('show');
    cookieBanner.setAttribute('aria-hidden', 'false');
  }

  acceptCookiesBtn?.addEventListener('click', () => {
    localStorage.setItem('cookiesAccepted', 'true');
    cookieBanner.classList.remove('show');
    cookieBanner.setAttribute('aria-hidden', 'true');
  });

  // Modales legales
  function abrirModal(id) {
    document.getElementById(`modal-${id}`)?.classList.add('show');
    document.getElementById(`overlay-${id}`)?.classList.add('show');
  }

  function cerrarModal(id) {
    document.getElementById(`modal-${id}`)?.classList.remove('show');
    document.getElementById(`overlay-${id}`)?.classList.remove('show');
  }

  document.querySelectorAll('.footer-legal a[data-modal]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      abrirModal(link.dataset.modal);
    });
  });

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => cerrarModal(btn.dataset.target));
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
      const id = overlay.id.replace('overlay-', '');
      cerrarModal(id);
    });
  });

  // Año dinámico
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Botón de WhatsApp
  setTimeout(() => {
    const whatsappBtn = document.querySelector('.whatsapp-float');
    if (whatsappBtn) {
      whatsappBtn.style.display = 'flex';
    }
  }, 5000);
});

