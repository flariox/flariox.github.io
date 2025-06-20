// Control del sidebar - versión optimizada
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const closeBtn = document.querySelector('.close-sidebar');
    const body = document.body;
    
    // Función para abrir el sidebar
    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        body.classList.add('sidebar-open');
    }
    
    // Función para cerrar el sidebar
    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        body.classList.remove('sidebar-open');
    }
    
    // Event listeners
    toggleBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
    
    // Cerrar al hacer clic en enlaces del sidebar
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', closeSidebar);
    });
    
    // Cerrar con la tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });
    
    // Asegurar que se cierre al redimensionar (opcional)
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });
});
// Año actual
document.getElementById('current-year').textContent = new Date().getFullYear();

// Mostrar botón WhatsApp después de 5 segundos
setTimeout(() => {
    document.querySelector('.whatsapp-float').style.display = 'flex';
}, 5000);
