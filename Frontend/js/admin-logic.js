document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });

    let globalStats = null; 

    if (!token) window.location.href = 'index.html';

    // 1. CARGAR DATOS
    async function loadStats() {
        try {
            const res = await fetch(`${API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Error al cargar stats');
            globalStats = await res.json();

            // Llenar Tarjetas
            document.getElementById('statUsers').textContent = globalStats.usuarios.total;
            document.getElementById('statPubsTotal').textContent = globalStats.publicaciones.total;
            document.getElementById('statPubsActive').textContent = globalStats.publicaciones.activas;
            document.getElementById('statPubsRented').textContent = globalStats.publicaciones.arrendadas;

            document.getElementById('statMoneyTotal').textContent = clp.format(globalStats.finanzas.total_general);
            document.getElementById('statMoneyFinal').textContent = clp.format(globalStats.finanzas.recaudado);
            document.getElementById('statMoneyActive').textContent = clp.format(globalStats.finanzas.activo);

            // Preparar Reporte IMPRESO (Solo Financiero)
            preparePrintReport(globalStats.finanzas);

        } catch(e) { console.error(e); }
    }

    // 2. PREPARAR REPORTE
    function preparePrintReport(finanzas) {
        document.getElementById('printDate').textContent = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
        
        document.getElementById('printFinalized').textContent = clp.format(finanzas.recaudado);
        document.getElementById('printActive').textContent = clp.format(finanzas.activo);
        document.getElementById('printTotal').textContent = clp.format(finanzas.total_general);
        document.getElementById('printTableTotal').textContent = clp.format(finanzas.total_general);

        const tbody = document.getElementById('printTableBody');
        tbody.innerHTML = '';
        finanzas.detalle.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td>${item.cliente} <br> <small style="color:#666">RUT: ${item.rut || 'N/A'}</small></td>
                    <td>${item.estado_contrato === 'FINALIZADO' ? 'Cobrado' : 'En Curso'}</td>
                    <td style="text-align:right;">${clp.format(item.monto_total_contrato)}</td>
                </tr>
            `;
        });
    }

    // 3. CARGAR TABLA GESTIÓN
    async function loadUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        try {
            const res = await fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
            const users = await res.json();
            
            tbody.innerHTML = '';
            users.forEach(u => {
                const isSuspended = u.estado_cuenta === 'SUSPENDIDO';
                
                let btn = '';
                if(u.id_rol === 3) {
                    btn = '<span style="color:#aaa;">Protegido</span>';
                } else {
                    if(isSuspended) {
                        btn = `<button class="btn-action btn-activate" onclick="toggleStatus(${u.id_usuario}, 'ACTIVO')"><i class="fa-solid fa-check"></i> Activar</button>`;
                    } else {
                        btn = `<button class="btn-action btn-ban" onclick="toggleStatus(${u.id_usuario}, 'SUSPENDIDO')"><i class="fa-solid fa-ban"></i> Banear</button>`;
                    }
                }

                tbody.innerHTML += `
                    <tr>
                        <td>
                            <div style="font-weight:600;">${u.nombre} ${u.apellido}</div>
                            <div style="font-size:0.8rem; color:#666;">${u.correo}</div>
                        </td>
                        <td>${u.correo}</td>
                        <td><span style="font-weight:600; color:${isSuspended ? 'red' : 'green'}">${u.estado_cuenta}</span></td>
                        <td>${btn}</td>
                    </tr>
                `;
            });
        } catch(e) { tbody.innerHTML = '<tr><td colspan="4">Error cargando usuarios</td></tr>'; }
    }

    // 4. FUNCIONES MODALES Y ACCIONES
    window.showUsersModal = () => {
        if (!globalStats) return;
        const modal = document.getElementById('genericModal');
        document.getElementById('modalTitle').textContent = 'Lista de Usuarios';
        const list = document.getElementById('modalList');
        list.innerHTML = '';
        
        globalStats.usuarios.lista.forEach(u => {
            list.innerHTML += `
                <li class="modal-item">
                    <div><b>${u.nombre} ${u.apellido}</b><br><span style="font-size:0.8rem; color:#666;">${u.correo}</span></div>
                    <div>${u.estado_cuenta}</div>
                </li>
            `;
        });
        modal.style.display = 'flex';
    };

    // NUEVO: Modal de Publicaciones
    window.showPubsModal = () => {
        if (!globalStats) return;
        const modal = document.getElementById('genericModal');
        document.getElementById('modalTitle').textContent = 'Detalle de Publicaciones';
        const list = document.getElementById('modalList');
        list.innerHTML = '';

        globalStats.publicaciones.detalle.forEach(p => {
            const color = p.estado === 'Disponible' ? 'green' : 'gray';
            list.innerHTML += `
                <li class="modal-item">
                    <div>
                        <b>${p.titulo}</b><br>
                        <span style="font-size:0.8rem; color:#666;">Dueño: ${p.nombre} ${p.apellido}</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-weight:600; color:${color}">${p.estado}</span><br>
                        <span style="font-size:0.8rem;">${clp.format(p.precio)}</span>
                    </div>
                </li>
            `;
        });
        modal.style.display = 'flex';
    };

    window.showMoneyModal = () => {
        if (!globalStats) return;
        const modal = document.getElementById('genericModal');
        document.getElementById('modalTitle').textContent = 'Ingresos Recientes (Vista Rápida)';
        const list = document.getElementById('modalList');
        list.innerHTML = '';

        globalStats.finanzas.detalle.slice(0, 10).forEach(f => {
            list.innerHTML += `
                <li class="modal-item">
                    <div><b>${f.cliente}</b><br><span style="font-size:0.8rem; color:#666;">${new Date(f.fecha_inicio).toLocaleDateString()}</span></div>
                    <div style="font-weight:bold; color:#1E293B;">${clp.format(f.monto_total_contrato)}</div>
                </li>
            `;
        });
        modal.style.display = 'flex';
    };

    window.printFinancialReport = (event) => {
        if(event) event.stopPropagation(); 
        window.print();
    };

    window.closeModal = () => {
        document.getElementById('genericModal').style.display = 'none';
    };

    window.toggleStatus = async (id, nuevoEstado) => {
        const action = nuevoEstado === 'SUSPENDIDO' ? 'Banear' : 'Activar';
        Swal.fire({
            title: `¿${action}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí',
            confirmButtonColor: nuevoEstado === 'SUSPENDIDO' ? '#d33' : '#3085d6'
        }).then(async (r) => {
            if(r.isConfirmed) {
                try {
                    await fetch(`${API_URL}/admin/users/${id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ nuevo_estado: nuevoEstado })
                    });
                    loadUsersTable();
                    Swal.fire('Listo', `Usuario ${nuevoEstado.toLowerCase()}.`, 'success');
                } catch(e) { Swal.fire('Error', 'Fallo conexión', 'error'); }
            }
        });
    };

    loadStats();
    loadUsersTable();
});