document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.querySelector('.sidebar-overlay');
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const closeSidebar = document.querySelector('.close-sidebar');

  // Abrir sidebar
  sidebarToggle.addEventListener('click', function() {
    sidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevenir scroll
  });

  // Cerrar sidebar
  closeSidebar.addEventListener('click', function() {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
  });

  // Cerrar al hacer clic en overlay
  sidebarOverlay.addEventListener('click', function() {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
  });

  // Cerrar al hacer clic en enlaces del sidebar
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', function() {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
});

// Año actual
document.getElementById('current-year').textContent = new Date().getFullYear();

// Mostrar botón WhatsApp después de 5 segundos
setTimeout(() => {
    document.querySelector('.whatsapp-float').style.display = 'flex';
}, 5000);
