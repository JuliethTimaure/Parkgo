document.addEventListener('DOMContentLoaded', async () => {
    
    // --- API & TOKENS ---
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');
    
    if (!token) { window.location.href = 'index.html'; return; }

    // --- REFERENCIAS DOM ---
    const elements = {
        headerName: document.getElementById('headerName'),
        headerInitial: document.getElementById('headerInitial'),
        headerImg: document.getElementById('headerImg'),
        profileMainImg: document.getElementById('profileMainImg'),
        inputs: {
            rut: document.getElementById('dashRut'),
            correo: document.getElementById('dashCorreo'),
            nombre: document.getElementById('dashNombre'),
            apellido: document.getElementById('dashApellido'),
            telefono: document.getElementById('dashTelefono'),
            region: document.getElementById('dashRegion'),
            comuna: document.getElementById('dashComuna'),
            calle: document.getElementById('dashCalle'),
            numero: document.getElementById('dashNumero'),
            password: document.getElementById('dashPassword')
        }
    };

    // --- DATOS GEOGRÁFICOS ---
    const datosChile = {
        1: { nombre: "Arica y Parinacota", comunas: { "Arica": 1, "Putre": 2 } },
        2: { nombre: "Tarapacá", comunas: { "Iquique": 3, "Alto Hospicio": 4 } },
        7: { nombre: "Metropolitana", comunas: { "Santiago": 30, "Providencia": 31, "Las Condes": 32 } },
        11: { nombre: "Biobío", comunas: { "Concepción": 45, "Talcahuano": 46, "San Pedro": 47 } }
    };

    // Llenar Regiones
    Object.keys(datosChile).forEach(id => {
        const opt = document.createElement('option');
        opt.value = id; opt.textContent = datosChile[id].nombre;
        elements.inputs.region.appendChild(opt);
    });

    const updateComunas = (regionId, selectedComunaId = null) => {
        elements.inputs.comuna.innerHTML = '<option value="">Seleccione...</option>';
        if(!regionId || !datosChile[regionId]) return;
        
        const comunas = datosChile[regionId].comunas;
        Object.entries(comunas).forEach(([name, id]) => {
            const opt = document.createElement('option');
            opt.value = id; opt.textContent = name;
            if(selectedComunaId && id == selectedComunaId) opt.selected = true;
            elements.inputs.comuna.appendChild(opt);
        });
    };

    elements.inputs.region.addEventListener('change', (e) => updateComunas(e.target.value));

    // --- CARGAR DATOS DEL USUARIO ---
    try {
        const res = await fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if(!res.ok) throw new Error();
        const user = await res.json();

        elements.headerName.textContent = user.nombre;
        if (user.url_foto_perfil) {
            elements.headerImg.src = user.url_foto_perfil;
            elements.headerImg.style.display = 'block';
            elements.headerInitial.style.display = 'none';
            elements.profileMainImg.src = user.url_foto_perfil;
        } else {
            elements.headerInitial.textContent = user.nombre.charAt(0).toUpperCase();
        }

        elements.inputs.rut.value = user.rut;
        elements.inputs.correo.value = user.correo;
        elements.inputs.nombre.value = user.nombre;
        elements.inputs.apellido.value = user.apellido;
        if(user.telefono) elements.inputs.telefono.value = user.telefono.replace('+56', '').trim();
        elements.inputs.calle.value = user.calle;
        elements.inputs.numero.value = user.numero;

        if(user.id_region) {
            elements.inputs.region.value = user.id_region;
            updateComunas(user.id_region); 
            setTimeout(() => { if(user.id_comuna) elements.inputs.comuna.value = user.id_comuna; }, 100);
        }
    } catch (err) { console.error(err); }

    // --- TOGGLE PASSWORD ---
    const togglePassBtn = document.getElementById('toggleDashPassword');
    if(togglePassBtn) {
        togglePassBtn.onclick = () => {
            const type = elements.inputs.password.type === 'password' ? 'text' : 'password';
            elements.inputs.password.type = type;
            togglePassBtn.classList.toggle('fa-eye');
            togglePassBtn.classList.toggle('fa-eye-slash');
        };
    }

    // --- GUARDAR PERFIL ---
    document.getElementById('profileForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSaveProfile');
        btn.disabled = true; btn.textContent = 'Guardando...';

        const data = {
            nombre: elements.inputs.nombre.value,
            apellido: elements.inputs.apellido.value,
            telefono: '+56 ' + elements.inputs.telefono.value,
            id_comuna: elements.inputs.comuna.value,
            calle: elements.inputs.calle.value,
            numero: elements.inputs.numero.value,
            password: elements.inputs.password.value
        };

        try {
            const res = await fetch(`${API_URL}/auth/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            if(res.ok) {
                Swal.fire({ icon: 'success', title: 'Perfil actualizado', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
                elements.inputs.password.value = '';
                elements.headerName.textContent = data.nombre;
            } else throw new Error();
        } catch(err) { Swal.fire('Error', 'Fallo de conexión', 'error'); } 
        finally { btn.disabled = false; btn.textContent = 'Guardar Cambios'; }
    };

    // --- FOTO DE PERFIL ---
    const photoModal = document.getElementById('photoModal');
    const photoInput = document.getElementById('photoInput');
    const photoPreview = document.getElementById('photoPreview');
    let selectedFile = null;

    document.getElementById('openPhotoModal').onclick = () => photoModal.style.display = 'flex';
    document.getElementById('cancelPhoto').onclick = () => { photoModal.style.display = 'none'; selectedFile = null; photoPreview.src = elements.profileMainImg.src; };
    photoInput.onchange = (e) => {
        if(e.target.files[0]) {
            selectedFile = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => photoPreview.src = ev.target.result;
            reader.readAsDataURL(selectedFile);
        }
    };
    document.getElementById('savePhotoBtn').onclick = async () => {
        if(!selectedFile) return Swal.fire('Atención', 'Selecciona imagen', 'warning');
        const formData = new FormData(); formData.append('avatar', selectedFile);
        const btn = document.getElementById('savePhotoBtn'); btn.textContent = 'Subiendo...'; btn.disabled = true;

        try {
            const res = await fetch(`${API_URL}/auth/upload-avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const result = await res.json();
            if(res.ok) {
                elements.headerImg.src = result.url;
                elements.headerImg.style.display = 'block';
                elements.headerInitial.style.display = 'none';
                elements.profileMainImg.src = result.url;
                photoModal.style.display = 'none';
                Swal.fire({ icon: 'success', title: 'Foto actualizada', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
            } else throw new Error(result.error);
        } catch (err) { Swal.fire('Error', err.message, 'error'); } 
        finally { btn.textContent = 'Guardar Foto'; btn.disabled = false; }
    };

    // --- LÓGICA DE VEHÍCULOS ---
    const vehicleModal = document.getElementById('vehicleModal');
    const vehMarcaSelect = document.getElementById('vehMarca');
    const vehModeloSelect = document.getElementById('vehModelo');
    const vehiclesContainer = document.getElementById('vehiclesContainer');
    const vehiclesEmptyState = document.getElementById('vehiclesEmptyState');

    if(document.getElementById('btnOpenVehicleModal')) {
        document.getElementById('btnOpenVehicleModal').onclick = () => { vehicleModal.style.display = 'flex'; loadBrands(); };
    }
    const closeVModal = () => { vehicleModal.style.display = 'none'; document.getElementById('vehicleForm').reset(); };
    if(document.getElementById('closeVehicleModal')) document.getElementById('closeVehicleModal').onclick = closeVModal;
    if(document.getElementById('cancelVehicleBtn')) document.getElementById('cancelVehicleBtn').onclick = closeVModal;

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
                const err = await res.json();
                Swal.fire('Error', err.error, 'error');
            }
        } catch(err) { Swal.fire('Error', 'No se pudo registrar', 'error'); }
    };

    async function loadMyVehicles() {
        if(!vehiclesContainer) return;
        vehiclesContainer.innerHTML = '<p>Cargando...</p>';
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
                        <button class="btn-delete-vehicle" onclick="deleteVehicle(${v.id_vehiculo})"><i class="fa-solid fa-trash"></i></button>
                        <div class="vehicle-icon-wrapper"><i class="fa-solid fa-car"></i></div>
                        <div class="vehicle-info">
                            <h4>${v.nombre_marca} ${v.nombre_modelo}</h4>
                            <p>${v.tipo_vehiculo} - ${v.color}</p>
                            <span class="patente-badge">${v.patente}</span>
                        </div>`;
                    vehiclesContainer.appendChild(card);
                });
            }
        } catch(err) {}
    }

    window.deleteVehicle = async (id) => {
        Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Sí' }).then(async (result) => {
            if (result.isConfirmed) {
                await fetch(`${API_URL}/vehicles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                loadMyVehicles();
            }
        });
    };

    const vehiculosTab = document.querySelector('[data-section="vehiculos"]');
    if(vehiculosTab) vehiculosTab.addEventListener('click', loadMyVehicles);

    // --- SIDEBAR & NAVEGACIÓN ---
    const links = document.querySelectorAll('.sidebar-item[data-section]');
    const sections = document.querySelectorAll('.dash-section');
    const title = document.getElementById('sectionTitle');
    const titlesMap = { 'perfil': 'Mi Perfil', 'vehiculos': 'Mis Vehículos', 'parkings': 'Mis Estacionamientos' };

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const target = link.dataset.section;
            sections.forEach(section => section.style.display = 'none');
            document.getElementById(`${target}Section`).style.display = 'block';
            if(title) title.textContent = titlesMap[target];
        });
    });

    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if(toggleBtn) toggleBtn.onclick = () => sidebar.classList.toggle('active');
});