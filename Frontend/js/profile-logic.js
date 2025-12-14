document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');

    const elements = {
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
            depto: document.getElementById('dashDepto'),
            password: document.getElementById('dashPassword')
        }
    };

    const datosChile = {
        1: { nombre: "Arica y Parinacota", comunas: { "Arica": 1, "Camarones": 2, "Putre": 3, "General Lagos": 4 } },
        2: { nombre: "Tarapacá", comunas: { "Iquique": 5, "Alto Hospicio": 6, "Pozo Almonte": 7, "Pica": 11 } },
        3: { nombre: "Antofagasta", comunas: { "Antofagasta": 12, "Calama": 16, "San Pedro de Atacama": 18, "Mejillones": 13 } },
        4: { nombre: "Atacama", comunas: { "Copiapó": 21, "Caldera": 22, "Vallenar": 26 } },
        5: { nombre: "Coquimbo", comunas: { "La Serena": 30, "Coquimbo": 31, "Ovalle": 40, "Illapel": 36 } },
        6: { nombre: "Valparaíso", comunas: { "Valparaíso": 45, "Viña del Mar": 51, "Concón": 47, "Quilpué": 79, "San Antonio": 67 } },
        7: { nombre: "Metropolitana", comunas: { "Santiago": 113, "Providencia": 104, "Las Condes": 95, "Maipú": 100, "La Florida": 91, "Ñuñoa": 101, "Puente Alto": 115 } },
        8: { nombre: "O'Higgins", comunas: { "Rancagua": 135, "San Fernando": 158, "Machalí": 142 } },
        9: { nombre: "Maule", comunas: { "Talca": 168, "Curicó": 181, "Linares": 190, "Constitución": 169 } },
        10: { nombre: "Ñuble", comunas: { "Chillán": 198, "Chillán Viejo": 200, "San Carlos": 214, "Quillón": 204 } },
        11: { nombre: "Biobío", comunas: { 
            "Concepción": 219, "Talcahuano": 228, "San Pedro de la Paz": 226, 
            "Chiguayante": 221, "Hualpén": 230, "Coronel": 220, "Lota": 224, 
            "Tomé": 229, "Penco": 225, "Los Ángeles": 238 
        }},
        12: { nombre: "La Araucanía", comunas: { "Temuco": 252, "Villarrica": 271, "Pucón": 266, "Padre Las Casas": 263 } },
        13: { nombre: "Los Ríos", comunas: { "Valdivia": 284, "Corral": 285 } },
        14: { nombre: "Los Lagos", comunas: { "Puerto Montt": 296, "Puerto Varas": 304, "Osorno": 315, "Frutillar": 300 } },
        15: { nombre: "Aysén", comunas: { "Coyhaique": 326, "Aysén": 328 } },
        16: { nombre: "Magallanes", comunas: { "Punta Arenas": 336, "Puerto Natales": 345 } }
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
        
        Object.entries(datosChile[regionId].comunas).forEach(([name, id]) => {
            const opt = document.createElement('option');
            opt.value = id; 
            opt.textContent = name;
            if(selectedComunaId && id == selectedComunaId) opt.selected = true;
            elements.inputs.comuna.appendChild(opt);
        });
    };

    elements.inputs.region.addEventListener('change', (e) => updateComunas(e.target.value));

    // Toggle Password
    const toggleBtn = document.getElementById('toggleDashPassword');
    if(toggleBtn) {
        toggleBtn.onclick = (e) => {
            const input = elements.inputs.password;
            input.type = input.type === 'password' ? 'text' : 'password';
            e.target.classList.toggle('fa-eye'); e.target.classList.toggle('fa-eye-slash');
        };
    }

    // --- CARGAR DATOS ---
    try {
        const res = await fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        const user = await res.json();
        
        if (user.url_foto_perfil) {
            elements.profileMainImg.src = user.url_foto_perfil;
            // Asegurarse de que el header también se actualice si existe
            const headerImg = document.getElementById('headerImg');
            if(headerImg) headerImg.src = user.url_foto_perfil;
        }
        
        elements.inputs.rut.value = user.rut;
        elements.inputs.correo.value = user.correo;
        elements.inputs.nombre.value = user.nombre;
        elements.inputs.apellido.value = user.apellido;
        elements.inputs.calle.value = user.calle || '';
        elements.inputs.numero.value = user.numero || '';
        elements.inputs.depto.value = user.depto_casa || '';

        if(user.telefono) {
            let cleanPhone = user.telefono.replace(/^(\+?56)?\s*/, '').trim();
            elements.inputs.telefono.value = cleanPhone;
        }

        if(user.id_region) {
            elements.inputs.region.value = user.id_region;
            updateComunas(user.id_region, user.id_comuna);
        }

    } catch(err) { console.error(err); }

    // --- GUARDAR PERFIL ---
    const profileForm = document.getElementById('profileForm');
    if(profileForm) {
        profileForm.onsubmit = async (e) => {
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
                depto_casa: elements.inputs.depto.value,
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
                    const headerName = document.getElementById('headerName');
                    if(headerName) headerName.textContent = data.nombre;
                } else throw new Error();
            } catch(err) { Swal.fire('Error', 'Fallo al guardar', 'error'); }
            finally { btn.disabled = false; btn.textContent = 'Guardar Cambios'; }
        };
    }

    // --- LOGICA MODAL FOTO DE PERFIL (CORREGIDO) ---
    const photoModal = document.getElementById('photoModal');
    const photoInput = document.getElementById('photoInput');
    const photoPreview = document.getElementById('photoPreview');
    const btnOpen = document.getElementById('openPhotoModal');
    const btnCancel = document.getElementById('cancelPhoto');
    const btnSave = document.getElementById('savePhotoBtn');
    let selectedFile = null;

    if(btnOpen && photoModal) {
        
        // 1. Abrir Modal y Setear Preview Inicial
        btnOpen.onclick = () => {
            photoModal.style.display = 'flex';
            selectedFile = null;
            photoInput.value = ''; // Reset input file
            
            // CORRECCIÓN: Cargar la imagen actual en el preview al abrir
            if(elements.profileMainImg && elements.profileMainImg.src) {
                photoPreview.src = elements.profileMainImg.src;
            } else {
                photoPreview.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png'; // Fallback
            }
        };

        // 2. Cancelar
        btnCancel.onclick = () => { 
            photoModal.style.display = 'none'; 
            selectedFile = null; 
        };
        
        // 3. Previsualizar al Seleccionar Archivo
        photoInput.onchange = (e) => {
            if(e.target.files && e.target.files[0]) {
                selectedFile = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (ev) => {
                    photoPreview.src = ev.target.result; // Actualiza el src del img
                };
                reader.readAsDataURL(selectedFile);
            }
        };

        // 4. Guardar (Subir)
        btnSave.onclick = async () => {
            if(!selectedFile) return Swal.fire('Atención', 'Selecciona imagen', 'warning');
            
            const formData = new FormData(); 
            formData.append('avatar', selectedFile);
            
            btnSave.textContent = "Subiendo..."; 
            btnSave.disabled = true;

            try {
                const res = await fetch(`${API_URL}/auth/upload-avatar`, {
                    method: 'POST', 
                    headers: { 'Authorization': `Bearer ${token}` }, 
                    body: formData
                });
                const result = await res.json();
                
                if(res.ok) {
                    // Actualizar imagen en el perfil y header inmediatamente
                    elements.profileMainImg.src = result.url;
                    const headerImg = document.getElementById('headerImg');
                    if(headerImg) {
                        headerImg.src = result.url;
                        headerImg.style.display = 'block';
                        const headerInitial = document.getElementById('headerInitial');
                        if(headerInitial) headerInitial.style.display = 'none';
                    }
                    
                    photoModal.style.display = 'none';
                    Swal.fire({ icon: 'success', title: 'Foto actualizada', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
                } else throw new Error(result.error);
            } catch (err) { 
                Swal.fire('Error', 'Error al subir imagen', 'error'); 
            } finally { 
                btnSave.textContent = "Guardar Foto"; 
                btnSave.disabled = false; 
            }
        };
    }
});