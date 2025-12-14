/* */
document.addEventListener('DOMContentLoaded', async () => {
    
    // === 1. CONFIGURACIÓN INICIAL ===
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');

    // Verificar si hay token (Si no, mandar al Login)
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // === 2. LÓGICA DEL SIDEBAR (Menú Lateral) ===
    
    // A) Marcar Activo Automáticamente
    const currentPage = window.location.pathname.split('/').pop();
    const sidebarLinks = document.querySelectorAll('.sidebar-item');

    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage || (currentPage === '' && linkPage === 'dashboard.html')) {
            link.classList.add('active');
        }
    });

    // B) Toggle para Móviles (Abrir/Cerrar)
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    
    if(toggleBtn && sidebar) {
        toggleBtn.onclick = (e) => {
            e.stopPropagation(); // Evitar que el clic se propague
            sidebar.classList.toggle('active');
        };

        // Cerrar al hacer clic fuera del sidebar (en móviles)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                e.target !== toggleBtn) {
                sidebar.classList.remove('active');
            }
        });
    }

    // === 3. LÓGICA DE USUARIO (Header) ===
    const headerName = document.getElementById('headerName');
    const headerInitial = document.getElementById('headerInitial');
    const headerImg = document.getElementById('headerImg');

    if (headerName) {
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const user = await res.json();
                
                // Poner nombre
                headerName.textContent = user.nombre;
                
                // Poner Foto o Inicial
                if (headerImg && headerInitial) {
                    if (user.url_foto_perfil) {
                        headerImg.src = user.url_foto_perfil;
                        headerImg.style.display = 'block';
                        headerInitial.style.display = 'none';
                    } else {
                        headerInitial.textContent = user.nombre.charAt(0).toUpperCase();
                        headerImg.style.display = 'none';
                        headerInitial.style.display = 'flex';
                    }
                }

                // === NUEVO: DETECCIÓN DE ADMIN (ROL 3) ===
                if (user.id_rol === 3) {
                    const menu = document.querySelector('.sidebar-menu');
                    // Verificar que no exista ya para no duplicarlo
                    if (menu && !document.getElementById('adminLinkItem')) {
                        const adminLi = document.createElement('li');
                        const isActive = currentPage === 'admin-panel.html' ? 'active' : '';
                        
                        adminLi.innerHTML = `
                            <a href="admin-panel.html" id="adminLinkItem" class="sidebar-item ${isActive}" style="color:#003B73; background:#EFF6FF; border:1px solid #DBEAFE; margin-top:10px;">
                                <i class="fa-solid fa-user-shield"></i> Administración
                            </a>`;
                        
                        // Insertar al final del menú
                        menu.appendChild(adminLi);
                    }
                }
                // === FIN NUEVO ===

            } else {
                // Si el token es inválido (ej: expiró), cerrar sesión
                console.warn('Sesión expirada');
                localStorage.clear();
                window.location.href = 'index.html';
            }
        } catch (err) {
            console.error("Error cargando sesión header", err);
        }
    }

    // === 4. CERRAR SESIÓN ===
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            Swal.fire({
                title: '¿Cerrar sesión?',
                text: "Tendrás que ingresar nuevamente.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#FF6600', // Naranja corporativo
                cancelButtonColor: '#94a3b8',  // Gris
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.clear();
                    window.location.href = 'index.html';
                }
            });
        };
    }
});