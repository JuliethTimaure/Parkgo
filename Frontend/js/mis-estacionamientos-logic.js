document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');

    // Referencias DOM
    const parkingModal = document.getElementById('parkingModal');
    const container = document.getElementById('parkingsContainer');
    const emptyState = document.getElementById('parkingsEmptyState');
    const form = document.getElementById('parkingForm');
    
    // Inputs Selects
    const selRegion = document.getElementById('pRegion');
    const selComuna = document.getElementById('pComuna');

    // Imagen
    const inputFile = document.getElementById('pImagen');
    const previewImg = document.getElementById('previewImg');
    const dropZoneIcon = document.querySelector('.preview-box i');

    // --- 1. CARGA DE REGIONES (Reutilizamos la data) ---
    const datosChile = {
        1: { nombre: "Arica y Parinacota", comunas: { "Arica": 1 } },
        7: { nombre: "Metropolitana", comunas: { "Santiago": 30, "Providencia": 31, "Las Condes": 32 } },
        11: { nombre: "Biobío", comunas: { "Concepción": 45, "Talcahuano": 46, "San Pedro": 47 } }
    };

    Object.keys(datosChile).forEach(id => {
        const opt = document.createElement('option');
        opt.value = id; opt.textContent = datosChile[id].nombre;
        selRegion.appendChild(opt);
    });

    selRegion.onchange = (e) => {
        selComuna.innerHTML = '<option value="">Selecciona...</option>';
        selComuna.disabled = true;
        if(e.target.value && datosChile[e.target.value]) {
            selComuna.disabled = false;
            Object.entries(datosChile[e.target.value].comunas).forEach(([name, id]) => {
                const opt = document.createElement('option');
                opt.value = id; opt.textContent = name;
                selComuna.appendChild(opt);
            });
        }
    };

    // --- 2. MANEJO DE IMAGEN (PREVIEW) ---
    inputFile.onchange = (e) => {
        if(e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                previewImg.src = ev.target.result;
                previewImg.style.display = 'block';
                dropZoneIcon.style.display = 'none';
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    // --- 3. ABRIR / CERRAR MODAL ---
    document.getElementById('btnOpenParkingModal').onclick = () => parkingModal.style.display = 'flex';
    
    const closeModal = () => {
        parkingModal.style.display = 'none';
        form.reset();
        previewImg.style.display = 'none';
        dropZoneIcon.style.display = 'block';
    };
    document.getElementById('closeParkingModal').onclick = closeModal;
    document.getElementById('cancelParkingBtn').onclick = closeModal;

    // --- 4. LISTAR MIS PUBLICACIONES ---
    async function loadMyParkings() {
        container.innerHTML = '<p>Cargando...</p>';
        try {
            const res = await fetch(`${API_URL}/parkings/mine`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            container.innerHTML = '';
            if(data.length === 0) {
                container.style.display = 'none';
                emptyState.style.display = 'block';
            } else {
                container.style.display = 'grid';
                emptyState.style.display = 'none';
                
                data.forEach(p => {
                    const img = p.ruta_imagen || 'https://via.placeholder.com/300';
                    const badgeClass = p.estado === 'Disponible' ? 'status-disponible' : 'status-ocupado';
                    
                    const card = document.createElement('div');
                    card.className = 'parking-card';
                    card.innerHTML = `
                        <div class="parking-img-wrapper">
                            <img src="${img}" class="parking-img">
                            <div class="parking-price-tag">$${parseInt(p.precio).toLocaleString()}</div>
                        </div>
                        <div class="parking-content">
                            <div class="parking-title">${p.titulo}</div>
                            <div class="parking-location"><i class="fa-solid fa-location-dot"></i> ${p.calle} #${p.n_estacionamiento}, ${p.nombre_comuna}</div>
                            <div class="parking-features">
                                <span class="status-badge ${badgeClass}">${p.estado}</span>
                            </div>
                            <button class="btn-view-parking" style="background:#EF4444;" onclick="deleteParking(${p.id_publicacion})">Eliminar</button>
                        </div>
                    `;
                    container.appendChild(card);
                });
            }
        } catch(err) { console.error(err); }
    }

    // --- 5. ENVIAR FORMULARIO (CREAR) ---
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('btnSubmitParking');
        btn.disabled = true; btn.textContent = 'Publicando...';

        const formData = new FormData();
        // Datos Publicación
        formData.append('titulo', document.getElementById('pTitulo').value);
        formData.append('descripcion', document.getElementById('pDesc').value);
        formData.append('precio', document.getElementById('pPrecio').value);
        formData.append('es_24_horas', document.getElementById('pHorario').value);
        
        // Datos Estacionamiento
        formData.append('id_comuna', selComuna.value);
        formData.append('calle', document.getElementById('pCalle').value);
        formData.append('numero', document.getElementById('pNumero').value);
        formData.append('largo', document.getElementById('pLargo').value || 0);
        formData.append('ancho', document.getElementById('pAncho').value || 0);
        formData.append('altura', document.getElementById('pAltura').value || 0);
        formData.append('cobertura', document.getElementById('pCobertura').value);
        formData.append('seguridad', document.getElementById('pSeguridad').value);
        
        // Imagen
        formData.append('imagen', inputFile.files[0]);

        try {
            const res = await fetch(`${API_URL}/parkings/create`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData // No poner Content-Type, fetch lo pone solo con el boundary
            });

            if(res.ok) {
                Swal.fire({ icon: 'success', title: '¡Publicado!', text: 'Tu estacionamiento ya está visible.', confirmButtonColor: '#FF6600' });
                closeModal();
                loadMyParkings();
            } else {
                const err = await res.json();
                Swal.fire('Error', err.error || 'No se pudo crear', 'error');
            }
        } catch(err) {
            Swal.fire('Error', 'Fallo de conexión', 'error');
        } finally {
            btn.disabled = false; btn.textContent = 'Publicar Ahora';
        }
    };

    // --- 6. ELIMINAR (CORREGIDO LÓGICA DE ALERTA) ---
    window.deleteParking = async (id) => {
        Swal.fire({
            title: '¿Eliminar publicación?', 
            text: "Esta acción es irreversible.", 
            icon: 'warning',
            showCancelButton: true, 
            confirmButtonColor: '#EF4444', 
            confirmButtonText: 'Sí, borrar'
        }).then(async (result) => {
            if(result.isConfirmed) {
                try {
                    const res = await fetch(`${API_URL}/parkings/${id}`, {
                        method: 'DELETE', 
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    // IMPORTANTE: Aquí revisamos si el servidor dio OK o ERROR
                    if (res.ok) {
                        // Solo si se borró realmente:
                        loadMyParkings();
                        Swal.fire('Eliminado', 'La publicación ha sido eliminada correctamente.', 'success');
                    } else {
                        // Si hay contrato activo, entra aquí:
                        const data = await res.json(); // Leemos el mensaje del backend
                        Swal.fire('Atención', data.error || 'No se pudo eliminar.', 'error');
                    }

                } catch(err) { 
                    console.error(err);
                    Swal.fire('Error', 'Fallo de conexión con el servidor', 'error'); 
                }
            }
        });
    };

    loadMyParkings();
});