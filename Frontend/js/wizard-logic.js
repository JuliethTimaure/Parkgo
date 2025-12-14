// === CONFIGURACIÓN MAPBOX ===
// Token proporcionado
mapboxgl.accessToken = 'pk.eyJ1IjoianVsaWV0aHRpbWF1cmUiLCJhIjoiY21qNjZqbTZjMDdnYzNncHl6N2dsY3RrYSJ9.XA6FvpuCq-Dq3l1K_Lg6ZQ';

// Variables Globales
let mapboxMap = null;
let mapboxMarker = null;
let currentLat = -36.8201; // Concepción Centro (Default)
let currentLng = -73.0443; 

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN INICIAL ---
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');
    
    // Estado del Wizard
    let currentStep = 1;
    const totalSteps = 3;
    let uploadedFiles = []; // Array para almacenar las fotos en memoria

    // Referencias DOM
    const views = {
        list: document.getElementById('viewParkingList'),
        wizard: document.getElementById('viewWizard')
    };
    const buttons = {
        start: document.getElementById('btnStartWizard'),
        cancel: document.getElementById('btnCancelWizard'),
        next: document.getElementById('btnNextStep'),
        prev: document.getElementById('btnPrevStep'),
        submit: document.getElementById('btnSubmitWizard')
    };
    const form = document.getElementById('wizardForm');

    // --- INICIALIZACIÓN ---
    loadMyParkings();
    cargarRegionesDesdeBD(); // Carga regiones desde el Backend
    setupDynamicFields();     

    // --- NAVEGACIÓN ENTRE VISTAS (LISTA <-> WIZARD) ---
    if(buttons.start) {
        buttons.start.addEventListener('click', () => {
            toggleView(true);
            resetWizard();
        });
    }

    if(buttons.cancel) {
        buttons.cancel.addEventListener('click', () => {
            Swal.fire({
                title: '¿Descartar cambios?',
                text: "Se perderá la información ingresada.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Seguir editando'
            }).then((r) => { if (r.isConfirmed) toggleView(false); });
        });
    }

    function toggleView(showWizard) {
        if(views.list && views.wizard) {
            views.list.style.display = showWizard ? 'none' : 'block';
            views.wizard.style.display = showWizard ? 'block' : 'none';
        }
        window.scrollTo(0,0);
    }

    // --- LÓGICA DE REGIONES Y COMUNAS (DESDE BD) ---
    async function cargarRegionesDesdeBD() {
        const regionSelect = document.getElementById('pRegion');
        const comunaSelect = document.getElementById('pComuna');
        if(!regionSelect) return;

        try {
            const res = await fetch(`${API_URL}/locations/regions`);
            if(!res.ok) throw new Error("Error API");
            const regiones = await res.json();
            
            regionSelect.innerHTML = '<option value="">Selecciona Región</option>';
            regiones.forEach(reg => {
                const opt = document.createElement('option');
                opt.value = reg.id_region;
                opt.textContent = reg.nombre_region;
                regionSelect.appendChild(opt);
            });

            // Evento al cambiar región
            regionSelect.onchange = async (e) => {
                const idReg = e.target.value;
                comunaSelect.innerHTML = '<option value="">Cargando...</option>';
                comunaSelect.disabled = true;

                if(idReg) {
                    try {
                        const resCom = await fetch(`${API_URL}/locations/comunas/${idReg}`);
                        const comunas = await resCom.json();
                        
                        comunaSelect.innerHTML = '<option value="">Selecciona Comuna</option>';
                        comunas.forEach(com => {
                            const opt = document.createElement('option');
                            opt.value = com.id_comuna;
                            opt.textContent = com.nombre_comuna;
                            comunaSelect.appendChild(opt);
                        });
                        comunaSelect.disabled = false;
                    } catch (error) {
                        console.error(error);
                        comunaSelect.innerHTML = '<option value="">Error al cargar</option>';
                    }
                } else {
                    comunaSelect.innerHTML = '<option value="">Selecciona Región primero</option>';
                }
            };
        } catch (err) {
            console.error("Error cargando regiones", err);
            regionSelect.innerHTML = '<option value="">Error de conexión</option>';
        }
    }

    // --- CAMPOS DINÁMICOS (PRECIO, ALTURA Y HORARIOS) ---
    function setupDynamicFields() {
        // Formato de Precio (Miles)
        const priceInput = document.getElementById('pPrecio');
        if(priceInput) {
            priceInput.addEventListener('input', (e) => {
                let raw = e.target.value.replace(/\D/g, '');
                if (raw) {
                    e.target.value = new Intl.NumberFormat('es-CL').format(raw);
                } else {
                    e.target.value = '';
                }
            });
        }

        // Habilitar/Deshabilitar Altura según Cobertura
        const altInput = document.getElementById('pAltura');
        const radiosCobertura = document.getElementsByName('cobertura');

        radiosCobertura.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'Aire Libre') {
                    altInput.disabled = true;
                    altInput.value = '';
                    altInput.placeholder = 'No aplica';
                } else {
                    altInput.disabled = false;
                    altInput.placeholder = 'Ej: 2.1';
                }
            });
        });

        // --- NUEVA LÓGICA: MOSTRAR/OCULTAR HORARIOS ---
        const selHorario = document.getElementById('pHorario');
        const boxHoras = document.getElementById('timeInputsBox');
        
        if(selHorario && boxHoras) {
            selHorario.addEventListener('change', (e) => {
                // "false" es string porque viene del value del option
                if(e.target.value === 'false') { 
                    boxHoras.style.display = 'grid'; 
                } else {
                    boxHoras.style.display = 'none'; 
                }
            });
        }
    }

    // --- NAVEGACIÓN DEL WIZARD (PASOS) ---
    if(buttons.next) {
        buttons.next.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                if (currentStep < totalSteps) {
                    currentStep++;
                    renderStep();
                }
            }
        });
    }

    if(buttons.prev) {
        buttons.prev.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                renderStep();
            }
        });
    }

    function renderStep() {
        // 1. Actualizar Indicadores (Bolitas)
        for (let i = 1; i <= totalSteps; i++) {
            const el = document.getElementById(`stepIndicator${i}`);
            if(el) {
                el.classList.remove('active', 'completed');
                if (i < currentStep) el.classList.add('completed');
                if (i === currentStep) el.classList.add('active');
            }
        }

        // 2. Mostrar Contenido del Paso
        document.querySelectorAll('.step-content').forEach(sc => sc.classList.remove('active'));
        const activeStep = document.getElementById(`step${currentStep}`);
        if(activeStep) activeStep.classList.add('active');

        // 3. Controlar Botones
        buttons.prev.style.visibility = currentStep === 1 ? 'hidden' : 'visible';

        if (currentStep === totalSteps) {
            // Último paso: Mostrar botón Publicar y Mapa
            buttons.next.style.display = 'none';
            buttons.submit.style.display = 'inline-block';
            
            // Inicializar Mapbox con un pequeño delay para asegurar que el div es visible
            setTimeout(initMapbox, 200);
        } else {
            buttons.next.style.display = 'inline-block';
            buttons.submit.style.display = 'none';
            buttons.next.innerHTML = 'Siguiente <i class="fa-solid fa-arrow-right"></i>';
        }
    }

    function validateStep(step) {
        const container = document.getElementById(`step${step}`);
        if(!container) return true;
        
        const inputs = container.querySelectorAll('input[required]:not([disabled]), select[required]:not([disabled]), textarea[required]');
        let isValid = true;

        inputs.forEach(inp => {
            if (!inp.value.trim()) {
                isValid = false;
                inp.style.borderColor = '#EF4444';
            } else {
                inp.style.borderColor = '#E2E8F0';
            }
        });

        // --- NUEVA VALIDACIÓN: HORARIOS ---
        if (step === 1) {
            const es24 = document.getElementById('pHorario').value === 'true';
            if (!es24) { // Si es horario restringido
                const ha = document.getElementById('pHoraApertura');
                const hc = document.getElementById('pHoraCierre');
                
                if(!ha.value) { isValid = false; ha.style.borderColor = '#EF4444'; }
                else { ha.style.borderColor = '#E2E8F0'; }

                if(!hc.value) { isValid = false; hc.style.borderColor = '#EF4444'; }
                else { hc.style.borderColor = '#E2E8F0'; }
            }
        }

        // Validación específica de fotos (Paso 2)
        if (step === 2 && uploadedFiles.length === 0) {
            const fb = document.getElementById('noPhotosFeedback');
            if(fb) fb.style.display = 'block';
            isValid = false;
        }

        if (!isValid) {
            Swal.fire({
                icon: 'error',
                title: 'Faltan datos',
                text: 'Por favor completa los campos obligatorios.',
                toast: true, position: 'top-end', timer: 3000, showConfirmButton: false
            });
        }
        return isValid;
    }

    // --- INTEGRACIÓN MAPBOX (MAPA + BUSCADOR) ---
    function initMapbox() {
        if(mapboxMap) return; // Evitar reinicializar si ya existe

        // 1. Crear el Mapa
        mapboxMap = new mapboxgl.Map({
            container: 'mapboxMap',
            style: 'mapbox://styles/mapbox/streets-v12', // Estilo vectorial moderno
            center: [currentLng, currentLat],
            zoom: 14
        });

        // Controles de zoom y rotación
        mapboxMap.addControl(new mapboxgl.NavigationControl());

        // 2. Crear Marcador (Arrastrable)
        mapboxMarker = new mapboxgl.Marker({ draggable: true, color: "#FF6600" })
            .setLngLat([currentLng, currentLat])
            .addTo(mapboxMap);

        // Evento: Al terminar de arrastrar el marcador
        mapboxMarker.on('dragend', () => {
            const lngLat = mapboxMarker.getLngLat();
            currentLng = lngLat.lng;
            currentLat = lngLat.lat;
            console.log("Nueva posición manual:", currentLat, currentLng);
        });

        // Evento: Clic en el mapa mueve el marcador
        mapboxMap.on('click', (e) => {
            mapboxMarker.setLngLat(e.lngLat);
            currentLng = e.lngLat.lng;
            currentLat = e.lngLat.lat;
        });

        // 3. GEOCODER (Buscador de Direcciones)
        const geocoderContainer = document.getElementById('geocoder');
        if(geocoderContainer) {
            geocoderContainer.innerHTML = ''; // Limpiar si ya existía

            const geocoder = new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
                countries: 'cl', // Restringir búsqueda a Chile
                placeholder: 'Escribe calle y número...',
                marker: false // Usamos nuestro propio marcador
            });

            geocoderContainer.appendChild(geocoder.onAdd(mapboxMap));

            // Evento: Cuando se selecciona una dirección
            geocoder.on('result', (e) => {
                const result = e.result;
                const center = result.center; // [lng, lat]
                
                // Mover mapa y marcador
                mapboxMap.flyTo({ center: center, zoom: 16 });
                mapboxMarker.setLngLat(center);
                currentLng = center[0];
                currentLat = center[1];

                // Autocompletar campos de texto (Parseo inteligente)
                const address = result.text || ""; // Nombre de la calle
                const number = (result.address || "") + ""; // Altura/Número
                
                if(document.getElementById('pCalle')) document.getElementById('pCalle').value = address;
                if(document.getElementById('pNumeroCalle') && number) document.getElementById('pNumeroCalle').value = number;
            });
        }
    }

    // --- GESTIÓN DE FOTOS (DRAG & DROP NATIVO RESTAURADO) ---
    const fileInput = document.getElementById('pInputFotos');
    const photoGrid = document.getElementById('photoSortableGrid');

    if(fileInput) {
        fileInput.onchange = (e) => {
            const newFiles = Array.from(e.target.files);
            // Concatenar archivos nuevos a los ya existentes
            uploadedFiles = uploadedFiles.concat(newFiles);
            // Limitar a 5 fotos (opcional)
            if (uploadedFiles.length > 5) {
                uploadedFiles = uploadedFiles.slice(0, 5);
                Swal.fire('Límite alcanzado', 'Solo puedes subir máximo 5 fotos.', 'warning');
            }
            
            renderGallery();
            
            const fb = document.getElementById('noPhotosFeedback');
            if(fb) fb.style.display = 'none';
        };
    }

    function renderGallery() {
        if(!photoGrid) return;
        photoGrid.innerHTML = '';
        
        uploadedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const item = document.createElement('div');
                item.className = 'photo-draggable-item';
                
                // Habilitar Drag & Drop
                item.draggable = true;
                item.dataset.index = index;
                
                item.innerHTML = `
                    <img src="${e.target.result}">
                    <button type="button" class="remove-photo-btn">&times;</button>
                `;
                
                // Botón Eliminar
                item.querySelector('.remove-photo-btn').onclick = (ev) => {
                    ev.stopPropagation();
                    uploadedFiles.splice(index, 1);
                    renderGallery(); // Re-renderizar
                };

                // Agregar Eventos de Drag
                addDragHandlers(item);
                photoGrid.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }

    // --- LÓGICA DE REORDENAMIENTO (DRAG & DROP) ---
    let dragStartIndex;

    function addDragHandlers(item) {
        item.addEventListener('dragstart', function() {
            dragStartIndex = +this.dataset.index;
            this.classList.add('dragging');
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necesario para permitir el drop
        });

        item.addEventListener('drop', function() {
            const dragEndIndex = +this.dataset.index;
            swapPhotos(dragStartIndex, dragEndIndex);
            this.classList.remove('dragging');
        });

        item.addEventListener('dragend', function() {
            this.classList.remove('dragging');
        });
    }

    function swapPhotos(from, to) {
        const item = uploadedFiles[from];
        uploadedFiles.splice(from, 1);
        uploadedFiles.splice(to, 0, item);
        renderGallery();
    }

    // --- ENVIAR FORMULARIO (PUBLISH) ---
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = buttons.submit;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publicando...';
            btn.disabled = true;

            const formData = new FormData();
            
            // Textos
            formData.append('titulo', document.getElementById('pTitulo').value);
            formData.append('descripcion', document.getElementById('pDesc').value);
            const cleanPrice = document.getElementById('pPrecio').value.replace(/\./g, '');
            formData.append('precio', cleanPrice);
            
            // --- HORARIOS (NUEVO) ---
            const es24 = document.getElementById('pHorario').value;
            formData.append('es_24_horas', es24);
            
            if(es24 === 'false') {
                formData.append('hora_apertura', document.getElementById('pHoraApertura').value);
                formData.append('hora_cierre', document.getElementById('pHoraCierre').value);
            }
            
            // Ubicación (Nuevos campos)
            formData.append('id_comuna', document.getElementById('pComuna').value);
            formData.append('calle', document.getElementById('pCalle').value);
            formData.append('numero_calle', document.getElementById('pNumeroCalle').value);
            formData.append('n_estacionamiento', document.getElementById('pNumEst').value);
            formData.append('latitud', currentLat);
            formData.append('longitud', currentLng);

            // Dimensiones
            formData.append('largo', document.getElementById('pLargo').value || 0);
            formData.append('ancho', document.getElementById('pAncho').value || 0);
            const alt = document.getElementById('pAltura');
            formData.append('altura', (!alt.disabled && alt.value) ? alt.value : 0);
            
            // Radios y Checkboxes
            const cob = document.querySelector('input[name="cobertura"]:checked');
            if(cob) formData.append('cobertura', cob.value);
            
            const segEls = document.querySelectorAll('input[name="seguridad"]:checked');
            const segVals = Array.from(segEls).map(el => el.value).join(', ');
            formData.append('seguridad', segVals);

            // Fotos (Importante: nombre 'fotos' debe coincidir con backend)
            uploadedFiles.forEach(file => {
                formData.append('fotos', file);
            });

            try {
                const res = await fetch(`${API_URL}/parkings/create`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData // Fetch pone el Content-Type multipart/form-data automáticamente
                });

                if (res.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Publicado con éxito!',
                        text: 'Tu estacionamiento ya está visible en el mapa.',
                        confirmButtonColor: '#003B73'
                    }).then(() => {
                        toggleView(false);
                        loadMyParkings(); // Recargar lista
                        resetWizard();
                    });
                } else {
                    const data = await res.json();
                    throw new Error(data.error || 'Error desconocido');
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Error', err.message || 'No se pudo conectar al servidor', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    function resetWizard() {
        form.reset();
        currentStep = 1;
        uploadedFiles = [];
        renderGallery();
        renderStep();
        
        // Reset estados visuales
        if(document.getElementById('pAltura')) document.getElementById('pAltura').disabled = true;
        if(document.getElementById('timeInputsBox')) document.getElementById('timeInputsBox').style.display = 'none';
    }

    // --- CARGAR LISTA DE PUBLICACIONES (DASHBOARD) ---
    async function loadMyParkings() {
        const container = document.getElementById('parkingsContainer');
        const empty = document.getElementById('parkingsEmptyState');
        if(!container) return;
        
        try {
            const res = await fetch(`${API_URL}/parkings/mine`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            const data = await res.json();
            
            container.innerHTML = '';
            
            if (data.length === 0) {
                container.style.display = 'none';
                if(empty) empty.style.display = 'block';
            } else {
                container.style.display = 'grid';
                if(empty) empty.style.display = 'none';
                
                data.forEach(p => {
                    const img = p.ruta_imagen || 'https://via.placeholder.com/400x300?text=Sin+Foto';
                    const price = parseInt(p.precio).toLocaleString('es-CL');
                    
                    const card = document.createElement('div');
                    card.className = 'parking-card';
                    card.innerHTML = `
                        <div class="parking-img-wrapper">
                            <img src="${img}" class="parking-img">
                            <div class="parking-price-tag">$${price}</div>
                        </div>
                        <div class="parking-content">
                            <div class="parking-title">${p.titulo}</div>
                            <div class="parking-location">
                                <i class="fa-solid fa-location-dot"></i> ${p.calle} #${p.numero_calle || ''}
                            </div>
                            <div style="margin-top:auto; padding-top:15px; border-top:1px solid #eee; display:flex; gap:10px;">
                                <button class="btn-secondary" style="font-size:0.8rem; padding:8px 15px; flex:1;" onclick="window.location.href='detalle.html?id=${p.id_publicacion}'">
                                    <i class="fa-solid fa-eye"></i> Ver
                                </button>
                                <button class="btn-delete" type="button" style="background:#FEE2E2; color:#DC2626; border:none; border-radius:8px; padding:10px; cursor:pointer;" onclick="deleteParking(${p.id_publicacion})">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    container.appendChild(card);
                });
            }
        } catch (err) { console.error(err); }
    }
    
    // Función global para eliminar
    window.deleteParking = async (id) => {
        Swal.fire({
            title: '¿Eliminar publicación?',
            text: "No podrás deshacer esta acción.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            confirmButtonText: 'Sí, eliminar'
        }).then(async (r) => {
            if (r.isConfirmed) {
                await fetch(`${API_URL}/parkings/${id}`, { 
                    method: 'DELETE', 
                    headers: { 'Authorization': `Bearer ${token}` } 
                });
                loadMyParkings();
                Swal.fire('Eliminado', '', 'success');
            }
        });
    };
});