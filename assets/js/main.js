// Control del sidebar - versión optimizada
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const closeBtn = document.querySelector('.close-sidebar');
    
    // Función para abrir el sidebar
    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        toggleBtn.setAttribute('aria-expanded', 'true');
        sidebar.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Previene el scroll del body
    }
    
    // Función para cerrar el sidebar
    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
        sidebar.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = ''; // Restaura el scroll del body
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
});
// Año actual
document.getElementById('current-year').textContent = new Date().getFullYear();

// Mostrar botón WhatsApp después de 5 segundos
setTimeout(() => {
    document.querySelector('.whatsapp-float').style.display = 'flex';
}, 5000);
