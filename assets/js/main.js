document.addEventListener('DOMContentLoaded', function() {
    // Control del sidebar
    const toggleBtn = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const body = document.body;
    
    // Función para alternar el sidebar
    function toggleSidebar() {
        const isOpen = sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        body.classList.toggle('sidebar-open');
        toggleBtn.setAttribute('aria-expanded', isOpen);
        
        // Bloquear scroll cuando el sidebar está abierto
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
    
    // Event listeners
    toggleBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);
    
    // Cerrar al hacer clic en enlaces del sidebar
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', toggleSidebar);
    });
    
    // Cerrar con la tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    });
    
    // Cerrar sidebar al redimensionar si se vuelve a vista de escritorio
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    });
    
    // Año actual
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Mostrar botón WhatsApp después de 5 segundos
    setTimeout(() => {
        const whatsappBtn = document.querySelector('.whatsapp-float');
        if (whatsappBtn) {
            whatsappBtn.style.display = 'flex';
        }
    }, 5000);
});
