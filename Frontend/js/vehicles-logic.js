document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');

    const vehicleModal = document.getElementById('vehicleModal');
    const vehMarcaSelect = document.getElementById('vehMarca');
    const vehModeloSelect = document.getElementById('vehModelo');
    const vehiclesContainer = document.getElementById('vehiclesContainer');
    const vehiclesEmptyState = document.getElementById('vehiclesEmptyState');

    // Modal Events
    document.getElementById('btnOpenVehicleModal').onclick = () => {
        vehicleModal.style.display = 'flex';
        loadBrands();
    };
    const closeVModal = () => { vehicleModal.style.display = 'none'; document.getElementById('vehicleForm').reset(); };
    document.getElementById('closeVehicleModal').onclick = closeVModal;
    document.getElementById('cancelVehicleBtn').onclick = closeVModal;

    // Load Brands
    async function loadBrands() {
        if(vehMarcaSelect.options.length > 1) return;
        try {
            const res = await fetch(`${API_URL}/vehicles/brands`);
            const brands = await res.json();
            brands.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id_marca; opt.textContent = b.nombre_marca;
                vehMarcaSelect.appendChild(opt);
            });
        } catch(err) {}
    }

    // Cascade Models
    vehMarcaSelect.onchange = async (e) => {
        vehModeloSelect.innerHTML = '<option value="">Cargando...</option>'; vehModeloSelect.disabled = true;
        if(!e.target.value) return;
        try {
            const res = await fetch(`${API_URL}/vehicles/models/${e.target.value}`);
            const models = await res.json();
            vehModeloSelect.innerHTML = '<option value="">Selecciona...</option>';
            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id_modelo; opt.textContent = m.nombre_modelo;
                vehModeloSelect.appendChild(opt);
            });
            vehModeloSelect.disabled = false;
        } catch(err) {}
    };

    // Load List
    async function loadMyVehicles() {
        try {
            const res = await fetch(`${API_URL}/vehicles`, { headers: { 'Authorization': `Bearer ${token}` } });
            const vehicles = await res.json();
            vehiclesContainer.innerHTML = '';
            
            if(vehicles.length === 0) {
                vehiclesContainer.style.display = 'none'; vehiclesEmptyState.style.display = 'block';
            } else {
                vehiclesContainer.style.display = 'grid'; vehiclesEmptyState.style.display = 'none';
                vehicles.forEach(v => {
                    const card = document.createElement('div');
                    card.className = 'vehicle-card';
                    card.innerHTML = `
                        <button class="btn-delete-vehicle" data-id="${v.id_vehiculo}"><i class="fa-solid fa-trash"></i></button>
                        <div class="vehicle-icon-wrapper"><i class="fa-solid fa-car"></i></div>
                        <div class="vehicle-info">
                            <h4>${v.nombre_marca} ${v.nombre_modelo}</h4>
                            <p>${v.tipo_vehiculo} - ${v.color}</p>
                            <span class="patente-badge">${v.patente}</span>
                        </div>`;
                    vehiclesContainer.appendChild(card);
                });

                // Attach delete events
                document.querySelectorAll('.btn-delete-vehicle').forEach(btn => {
                    btn.addEventListener('click', () => deleteVehicle(btn.dataset.id));
                });
            }
        } catch(err) {}
    }

    // Create Vehicle
    document.getElementById('vehicleForm').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            patente: document.getElementById('vehPatente').value,
            id_modelo: vehModeloSelect.value,
            tipo_vehiculo: document.getElementById('vehTipo').value,
            color: document.getElementById('vehColor').value
        };
        try {
            const res = await fetch(`${API_URL}/vehicles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            if(res.ok) {
                Swal.fire({ icon: 'success', title: 'Vehículo Agregado', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
                closeVModal(); loadMyVehicles();
            } else {
                const err = await res.json(); Swal.fire('Error', err.error, 'error');
            }
        } catch(err) { Swal.fire('Error', 'No se pudo registrar', 'error'); }
    };

    // Delete Vehicle
    window.deleteVehicle = async (id) => {
        Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Sí' }).then(async (result) => {
            if (result.isConfirmed) {
                await fetch(`${API_URL}/vehicles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                loadMyVehicles();
            }
        });
    };

    loadMyVehicles();
});