document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = 'http://localhost:3000/api';
    
    // Obtener ID de la URL
    const params = new URLSearchParams(window.location.search);
    const parkingId = params.get('id');

    if (!parkingId) {
        Swal.fire('Error', 'No se especificó un estacionamiento', 'error')
            .then(() => window.location.href = 'dashboard.html');
        return;
    }

    try {
        // Fetch Data
        const res = await fetch(`${API_URL}/parkings/${parkingId}`);
        if (!res.ok) throw new Error('No encontrado');
        const p = await res.json();

        // --- 1. Rellenar Datos Básicos ---
        document.title = `${p.titulo} - Park Go`;
        document.getElementById('detTitulo').textContent = p.titulo;
        document.getElementById('detPrecio').textContent = `$${parseInt(p.precio).toLocaleString('es-CL')}`;
        document.getElementById('detDescripcion').textContent = p.descripcion;
        
        // Dirección y Breadcrumb
        const fullAddress = `${p.calle} #${p.n_estacionamiento}, ${p.nombre_comuna}`;
        document.getElementById('detDireccion').textContent = fullAddress;
        document.getElementById('breadcrumb').innerHTML = 
            `Inicio > ${p.nombre_region} > ${p.nombre_comuna} > <b>${p.titulo}</b>`;

        // Imagen
        const img = p.ruta_imagen || 'https://via.placeholder.com/800x400?text=Sin+Imagen+Disponible';
        document.getElementById('mainImage').src = img;

        // --- 2. Características (Iconos) ---
        // Dimensiones
        const dims = (p.largo && p.ancho) ? `${p.largo}m x ${p.ancho}m` : 'N/A';
        document.getElementById('detDims').textContent = dims;
        
        // Cobertura
        document.getElementById('detCobertura').textContent = p.tipo_cobertura || 'No esp.';
        
        // Seguridad
        document.getElementById('detSeguridad').textContent = p.seguridad || 'Estándar';
        
        // Horario
        document.getElementById('detHorario').textContent = p.es_24_horas ? '24/7 Libre' : 'Restringido';

        // --- 3. Perfil Dueño ---
        document.getElementById('ownerName').textContent = `${p.nombre_dueno} ${p.apellido_dueno}`;
        if(p.url_foto_perfil) document.getElementById('ownerImg').src = p.url_foto_perfil;

        // Botón WhatsApp (Genera link dinámico)
        const btnWsp = document.getElementById('btnWhatsapp');
        if(p.telefono_dueno) {
            const phoneClean = p.telefono_dueno.replace(/\D/g, ''); // Solo números
            const msg = encodeURIComponent(`Hola ${p.nombre_dueno}, vi tu estacionamiento "${p.titulo}" en Park Go y me interesa.`);
            btnWsp.onclick = () => window.open(`https://wa.me/${phoneClean}?text=${msg}`, '_blank');
        } else {
            btnWsp.disabled = true;
            btnWsp.innerHTML = '<i class="fa-solid fa-ban"></i> Sin teléfono';
            btnWsp.style.background = '#94a3b8';
        }

        // --- 4. Mapa (Leaflet) ---
        if (p.latitud && p.longitud) {
            const lat = parseFloat(p.latitud);
            const lng = parseFloat(p.longitud);
            
            const map = L.map('detailMap').setView([lat, lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(map);

            // Círculo para no dar la ubicación EXACTA exacta por seguridad antes de reservar
            L.circle([lat, lng], {
                color: '#003B73',
                fillColor: '#003B73',
                fillOpacity: 0.2,
                radius: 100 // Metros
            }).addTo(map);
        } else {
            document.getElementById('detailMap').innerHTML = '<p style="text-align:center; padding-top:40px; color:#64748B;">Ubicación referencial no disponible.</p>';
        }

    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'No pudimos cargar la información.', 'error');
    }
});