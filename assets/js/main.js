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
