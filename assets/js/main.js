document.addEventListener('DOMContentLoaded', function() {
    // Control del sidebar
    const toggleBtn = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const body = document.body;
    
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Alternar clase en el body
        body.classList.toggle('sidebar-open');
        
        // Bloquear scroll cuando el sidebar está abierto
        if (sidebar.classList.contains('active')) {
            body.style.overflow = 'hidden';
        } else {
            body.style.overflow = '';
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
    
    // Inicializar partículas (si es necesario)
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            /* configuración de partículas */
        });
    }
});
// Año actual
document.getElementById('current-year').textContent = new Date().getFullYear();

// Mostrar botón WhatsApp después de 5 segundos
setTimeout(() => {
    document.querySelector('.whatsapp-float').style.display = 'flex';
}, 5000);
