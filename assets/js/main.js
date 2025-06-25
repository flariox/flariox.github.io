document.addEventListener('DOMContentLoaded', function () {
    // Control del sidebar
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

        // Bloquear scroll cuando el sidebar está abierto
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    // Abrir/Cerrar desde el botón de hamburguesa
    toggleBtn?.addEventListener('click', toggleSidebar);

    // Cerrar al hacer clic en el overlay
    overlay?.addEventListener('click', toggleSidebar);

    // Cerrar desde el botón de cierre
    closeBtn?.addEventListener('click', toggleSidebar);

    // Cerrar al hacer clic en cualquier enlace del sidebar
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', toggleSidebar);
    });

    // Cerrar con la tecla ESC
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    });

    // Cerrar automáticamente al cambiar tamaño de ventana a escritorio
    window.addEventListener('resize', function () {
        if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    });


    //Cartel de aceptación de cookies
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


    // Abre el modal correspondiente
function abrirModal(id) {
  document.getElementById(`modal-${id}`).classList.add('show');
  document.getElementById(`overlay-${id}`).classList.add('show');
}

// Cierra el modal correspondiente
function cerrarModal(id) {
  document.getElementById(`modal-${id}`).classList.remove('show');
  document.getElementById(`overlay-${id}`).classList.remove('show');
}

// Listeners de los enlaces del footer
document.querySelector('.footer-legal a[href*="Licencia"]')?.addEventListener('click', e => {
  e.preventDefault();
  abrirModal('licencia');
});

document.querySelector('.footer-legal a[href*="Política"]')?.addEventListener('click', e => {
  e.preventDefault();
  abrirModal('privacidad');
});

document.querySelector('.footer-legal a[href*="Términos"]')?.addEventListener('click', e => {
  e.preventDefault();
  abrirModal('terminos');
});

document.querySelector('.footer-legal a[href*="Código"]')?.addEventListener('click', e => {
  e.preventDefault();
  abrirModal('conducta');
});

// Cerrar modales al hacer clic en el botón de cierre o el overlay
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => cerrarModal(btn.dataset.target));
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', () => {
    const id = overlay.id.replace('overlay-', '');
    cerrarModal(id);
  });
});


    // Año dinámico en el footer
    const yearEl = document.getElementById('current-year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    // Mostrar botón de WhatsApp después de 5 segundos
    setTimeout(() => {
        const whatsappBtn = document.querySelector('.whatsapp-float');
        if (whatsappBtn) {
            whatsappBtn.style.display = 'flex';
        }
    }, 5000);
});
