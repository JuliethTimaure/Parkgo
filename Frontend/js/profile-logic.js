document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');

    // Referencias
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
            password: document.getElementById('dashPassword')
        }
    };

    // Datos Geográficos (Resumidos para ejemplo)
    const datosChile = {
        1: { nombre: "Arica y Parinacota", comunas: { "Arica": 1 } },
        7: { nombre: "Metropolitana", comunas: { "Santiago": 30, "Providencia": 31 } },
        11: { nombre: "Biobío", comunas: { "Concepción": 45, "Talcahuano": 46, "San Pedro": 47 } }
    };

    // Llenar Selects
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
            opt.value = id; opt.textContent = name;
            if(selectedComunaId && id == selectedComunaId) opt.selected = true;
            elements.inputs.comuna.appendChild(opt);
        });
    };
    elements.inputs.region.addEventListener('change', (e) => updateComunas(e.target.value));

    // Cargar Datos
    try {
        const res = await fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        const user = await res.json();
        
        if (user.url_foto_perfil) elements.profileMainImg.src = user.url_foto_perfil;
        
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
    } catch(err) { console.error(err); }

    // Toggle Password
    document.getElementById('toggleDashPassword').onclick = (e) => {
        const input = elements.inputs.password;
        input.type = input.type === 'password' ? 'text' : 'password';
        e.target.classList.toggle('fa-eye'); e.target.classList.toggle('fa-eye-slash');
    };

    // Guardar Perfil
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
                // Actualizar header (common.js lo recarga al refrescar, pero podemos forzar el texto aquí)
                document.getElementById('headerName').textContent = data.nombre;
            } else throw new Error();
        } catch(err) { Swal.fire('Error', 'Fallo al guardar', 'error'); }
        finally { btn.disabled = false; btn.textContent = 'Guardar Cambios'; }
    };

    // Lógica Foto (Modal)
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
        
        try {
            const res = await fetch(`${API_URL}/auth/upload-avatar`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
            });
            const result = await res.json();
            if(res.ok) {
                elements.profileMainImg.src = result.url;
                document.getElementById('headerImg').src = result.url;
                photoModal.style.display = 'none';
                Swal.fire({ icon: 'success', title: 'Foto actualizada', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
            } else throw new Error(result.error);
        } catch (err) { Swal.fire('Error', 'Error al subir imagen', 'error'); }
    };
});