document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');

    // Validación de seguridad frontend
    if (!token) window.location.href = 'index.html';

    async function loadStats() {
        try {
            const res = await fetch(`${API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('No autorizado');
            const stats = await res.json();
            document.getElementById('statUsers').textContent = stats.usuarios;
            document.getElementById('statParks').textContent = stats.estacionamientos;
            document.getElementById('statRents').textContent = stats.arriendos_activos;
        } catch(e) { 
            console.warn("No eres admin o error de conexión"); 
            // Opcional: Redirigir si falla la carga por permisos
            // window.location.href = 'dashboard.html'; 
        }
    }

    async function loadUsers() {
        const tbody = document.getElementById('usersTableBody');
        try {
            const res = await fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
            const users = await res.json();
            
            tbody.innerHTML = '';
            users.forEach(u => {
                const isSuspended = u.estado_cuenta === 'SUSPENDIDO';
                
                // === LÓGICA DE ROLES ACTUALIZADA (SEGÚN TU IMAGEN) ===
                let roleBadge = '';
                if (u.id_rol === 3) roleBadge = '<span class="role-tag role-admin" style="background:#E0E7FF; color:#3730A3;">Super Admin</span>';
                else if (u.id_rol === 2) roleBadge = '<span class="role-tag" style="background:#FEF3C7; color:#92400E;">Dueño</span>';
                else roleBadge = '<span class="role-tag role-user">Usuario</span>';

                const statusBadge = isSuspended ? '<span class="status-tag st-suspended">Suspendido</span>' : '<span class="status-tag st-active">Activo</span>';
                
                const btnAction = isSuspended 
                    ? `<button class="btn-unban" onclick="toggleStatus(${u.id_usuario}, 'ACTIVO')"><i class="fa-solid fa-check"></i> Activar</button>`
                    : `<button class="btn-ban" onclick="toggleStatus(${u.id_usuario}, 'SUSPENDIDO')"><i class="fa-solid fa-ban"></i> Banear</button>`;

                // Protegemos a los Super Admins (Rol 3) para no banearse entre sí por error
                const actions = u.id_rol === 3 ? '<span style="color:#CBD5E1; font-size:0.85rem;"><i class="fa-solid fa-shield-cat"></i> Protegido</span>' : btnAction;

                const row = `
                    <tr>
                        <td>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <img src="${u.url_foto_perfil || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;">
                                <div>
                                    <div style="font-weight:600; color:#1E293B;">${u.nombre} ${u.apellido}</div>
                                    <div style="font-size:0.8rem; color:#64748B;">RUT: ${u.rut}</div>
                                </div>
                            </div>
                        </td>
                        <td>${u.correo}</td>
                        <td>${roleBadge}</td>
                        <td>${statusBadge}</td>
                        <td>${actions}</td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        } catch(e) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error al cargar usuarios.</td></tr>'; }
    }

    window.toggleStatus = async (id, nuevoEstado) => {
        const action = nuevoEstado === 'SUSPENDIDO' ? 'Banear' : 'Activar';
        const color = nuevoEstado === 'SUSPENDIDO' ? '#EF4444' : '#10B981';

        Swal.fire({
            title: `¿${action} usuario?`,
            text: "Cambiarás el acceso de este usuario a la plataforma.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: color,
            confirmButtonText: `Sí, ${action}`
        }).then(async (r) => {
            if (r.isConfirmed) {
                try {
                    const res = await fetch(`${API_URL}/admin/users/${id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ nuevo_estado: nuevoEstado })
                    });
                    if (res.ok) {
                        Swal.fire('Actualizado', `Usuario ${nuevoEstado.toLowerCase()}.`, 'success');
                        loadUsers();
                    } else {
                        const d = await res.json();
                        Swal.fire('Error', d.error, 'error');
                    }
                } catch(e) { Swal.fire('Error', 'Fallo de conexión', 'error'); }
            }
        });
    };

    loadStats();
    loadUsers();
});