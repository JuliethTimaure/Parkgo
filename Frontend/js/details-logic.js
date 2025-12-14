document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');
    
    // Obtener ID de la URL
    const params = new URLSearchParams(window.location.search);
    const parkingId = params.get('id');

    // Si no hay ID, volver al dashboard
    if (!parkingId) return window.location.href = 'dashboard.html';

    try {
        // --- 1. Obtener Datos del Parking ---
        const resParking = await fetch(`${API_URL}/parkings/${parkingId}`);
        if (!resParking.ok) throw new Error('No encontrado');
        const p = await resParking.json();

        // --- 2. Obtener Usuario Actual (para saber si es dueño) ---
        let currentUser = null;
        if(token) {
            try {
                const resUser = await fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
                if(resUser.ok) currentUser = await resUser.json();
            } catch (e) { console.warn("No se pudo cargar usuario", e); }
        }

        // --- 3. Rellenar Datos en el DOM ---
        document.title = `${p.titulo} - Park Go`;
        
        // === CORRECCIÓN AQUÍ: ACTUALIZAR EL BREADCRUMB ===
        const elBread = document.getElementById('breadcrumb');
        if(elBread) {
            elBread.innerHTML = `
                <a href="dashboard.html" style="color:inherit; text-decoration:none;">Inicio</a> 
                <i class="fa-solid fa-chevron-right" style="font-size:0.7em; margin:0 5px;"></i> 
                ${p.nombre_region || 'Región'} 
                <i class="fa-solid fa-chevron-right" style="font-size:0.7em; margin:0 5px;"></i> 
                ${p.nombre_comuna || 'Comuna'}
            `;
        }

        // Textos principales
        const elTitulo = document.getElementById('detTitulo');
        if(elTitulo) elTitulo.textContent = p.titulo;

        const elPrecio = document.getElementById('detPrecio');
        if(elPrecio) elPrecio.textContent = `$${parseInt(p.precio).toLocaleString('es-CL')}`;

        const elDesc = document.getElementById('detDescripcion');
        if(elDesc) elDesc.textContent = p.descripcion;

        const elDir = document.getElementById('detDireccion');
        if(elDir) elDir.textContent = `${p.calle} #${p.n_estacionamiento || ''}, ${p.nombre_comuna}`;
        
        // Carrusel de Imágenes
        const sliderContainer = document.getElementById('sliderContainer');
        const dotsContainer = document.getElementById('sliderDots');
        const photoCount = document.getElementById('photoCount');
        
        let images = p.imagenes || [];
        if (images.length === 0) images = ['https://via.placeholder.com/800x400?text=Sin+Imagen'];
        
        if(photoCount) photoCount.textContent = images.length;
        if(sliderContainer) sliderContainer.innerHTML = ''; 
        if(dotsContainer) dotsContainer.innerHTML = '';

        if(images.length > 1) {
            if(document.querySelector('.gallery-hero')) document.querySelector('.gallery-hero').classList.remove('single-photo');
            
            images.forEach((src, i) => {
                const img = document.createElement('img'); 
                img.src = src; 
                img.className = i === 0 ? 'slide active' : 'slide'; 
                sliderContainer.appendChild(img);
                
                const dot = document.createElement('div'); 
                dot.className = i === 0 ? 'dot active' : 'dot'; 
                dot.onclick = () => changeSlide(i); 
                dotsContainer.appendChild(dot);
            });
        } else {
            if(document.querySelector('.gallery-hero')) document.querySelector('.gallery-hero').classList.add('single-photo');
            const img = document.createElement('img'); 
            img.src = images[0]; 
            img.className = 'slide active'; 
            sliderContainer.appendChild(img);
        }

        let currentSlide = 0;
        const changeSlide = (n) => {
            const slides = document.querySelectorAll('.slide'); 
            const dots = document.querySelectorAll('.dot');
            if(slides.length === 0) return;
            
            slides[currentSlide].classList.remove('active'); 
            if(dots[currentSlide]) dots[currentSlide].classList.remove('active');
            
            currentSlide = (n + slides.length) % slides.length;
            
            slides[currentSlide].classList.add('active'); 
            if(dots[currentSlide]) dots[currentSlide].classList.add('active');
        };

        const btnNext = document.getElementById('btnNext');
        const btnPrev = document.getElementById('btnPrev');
        if(btnNext) btnNext.onclick = () => changeSlide(currentSlide + 1);
        if(btnPrev) btnPrev.onclick = () => changeSlide(currentSlide - 1);

        // Características y Dueño
        const elDims = document.getElementById('detDims');
        if(elDims) elDims.textContent = `${p.largo || 0}m x ${p.ancho || 0}m`;

        const elCob = document.getElementById('detCobertura');
        if(elCob) elCob.textContent = p.tipo_cobertura || 'No esp.';

        const elSeg = document.getElementById('detSeguridad');
        if(elSeg) elSeg.textContent = p.seguridad || 'Estándar';
        
        // Horario
        const elHorario = document.getElementById('detHorario');
        if(elHorario) {
            if (p.es_24_horas) {
                elHorario.textContent = '24/7 Libre';
            } else {
                const ap = p.hora_apertura ? p.hora_apertura.slice(0,5) : '??';
                const ci = p.hora_cierre ? p.hora_cierre.slice(0,5) : '??';
                elHorario.textContent = `${ap} - ${ci}`;
            }
        }

        const ownerName = document.getElementById('ownerName');
        if(ownerName) ownerName.textContent = `${p.nombre_dueno} ${p.apellido_dueno}`;
        
        const ownerImg = document.getElementById('ownerImg');
        if(ownerImg && p.url_foto_perfil) ownerImg.src = p.url_foto_perfil;

        // === LOGICA BOTONES DE ACCIÓN ===
        const actionContainer = document.querySelector('.action-buttons');
        if(actionContainer) {
            actionContainer.innerHTML = ''; 

            if (currentUser && currentUser.id_usuario === p.id_usuario_propietario) {
                // ES EL DUEÑO
                actionContainer.innerHTML = `
                    <button class="btn-primary" style="background:#0F172A; width:100%; margin-bottom:10px;" onclick="Swal.fire('Info', 'La edición estará disponible pronto', 'info')">
                        <i class="fa-solid fa-pen"></i> Editar Publicación
                    </button>
                    <button class="btn-primary" style="background:#EF4444; width:100%; border:none;" onclick="deleteMyParking(${p.id_publicacion})">
                        <i class="fa-solid fa-trash"></i> Eliminar
                    </button>
                `;
            } else {
                // ES UN CLIENTE (O NO LOGUEADO)
                const phoneClean = p.telefono_dueno ? p.telefono_dueno.replace(/\D/g, '') : '';
                const wsaUrl = `https://wa.me/${phoneClean}?text=Hola, me interesa tu estacionamiento "${p.titulo}"`;
                
                actionContainer.innerHTML = `
                    <a href="${wsaUrl}" target="_blank" class="btn-whatsapp" style="text-decoration:none;">
                        <i class="fa-brands fa-whatsapp"></i> Contactar al Dueño
                    </a>
                    <button class="btn-reserve" onclick="window.location.href='checkout.html?id=${p.id_publicacion}'">
                        Solicitar Reserva
                    </button>
                `;
            }
        }

        // Mapa Leaflet
        if (p.latitud && document.getElementById('detailMap')) {
            if(typeof L !== 'undefined') {
                const map = L.map('detailMap').setView([p.latitud, p.longitud], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                L.circle([p.latitud, p.longitud], { color: '#003B73', radius: 100 }).addTo(map);
            }
        }

        // --- 4. Cargar Reseñas ---
        loadReviews(parkingId);

    } catch (err) { 
        console.error("Error al cargar detalles:", err); 
        Swal.fire('Error', 'No se pudo cargar la información del estacionamiento.', 'error')
            .then(() => window.location.href = 'dashboard.html');
    }
});

// Función para cargar reseñas
async function loadReviews(parkingId) {
    const API_URL = 'http://localhost:3000/api';
    const container = document.getElementById('reviewsContainer');
    const badge = document.getElementById('avgRatingBadge');
    const scoreEl = document.getElementById('avgScore');

    try {
        const res = await fetch(`${API_URL}/ratings/parking/${parkingId}`);
        const data = await res.json();

        // Actualizar promedio
        if (data.stats && data.stats.promedio) {
            badge.style.display = 'inline-block';
            scoreEl.textContent = data.stats.promedio;
        }

        // Listar comentarios
        container.innerHTML = '';
        if (data.reviews.length === 0) {
            container.innerHTML = '<p style="color:#94A3B8; font-style:italic;">Aún no hay opiniones para este estacionamiento.</p>';
            return;
        }

        data.reviews.forEach(r => {
            const avatar = r.url_foto_perfil || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            const date = new Date(r.fecha_calificacion).toLocaleDateString('es-CL', { year: 'numeric', month: 'long' });
            
            // Generar estrellitas HTML
            let starsHtml = '';
            for(let i=0; i<5; i++) {
                starsHtml += i < r.puntuacion ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star" style="color:#CBD5E1;"></i>';
            }

            container.innerHTML += `
                <div class="review-card">
                    <div class="review-header">
                        <img src="${avatar}" class="review-avatar">
                        <div class="review-meta">
                            <h4>${r.nombre} ${r.apellido}</h4>
                            <span>${date}</span>
                        </div>
                    </div>
                    <div class="review-stars">${starsHtml}</div>
                    <p class="review-text">${r.comentario || 'Sin comentario escrito.'}</p>
                </div>
            `;
        });

    } catch (e) { console.error(e); }
}

// Función global para eliminar desde el detalle
window.deleteMyParking = async (id) => {
    if(await Swal.fire({ title: '¿Borrar?', icon: 'warning', showCancelButton:true }).then(r => r.isConfirmed)) {
        const token = localStorage.getItem('token');
        const API_URL = 'http://localhost:3000/api';
        try {
            await fetch(`${API_URL}/parkings/${id}`, { method: 'DELETE', headers: {'Authorization': `Bearer ${token}`} });
            Swal.fire('Eliminado', '', 'success').then(() => window.location.href = 'dashboard.html');
        } catch(e) {
            Swal.fire('Error', 'No se pudo eliminar', 'error');
        }
    }
};