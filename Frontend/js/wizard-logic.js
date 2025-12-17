// === CONFIGURACIÓN MAPBOX ===
mapboxgl.accessToken = 'pk.eyJ1IjoianVsaWV0aHRpbWF1cmUiLCJhIjoiY21qNjZqbTZjMDdnYzNncHl6N2dsY3RrYSJ9.XA6FvpuCq-Dq3l1K_Lg6ZQ';

// Variables Globales
let mapboxMap = null;
let mapboxMarker = null;
let mapboxGeocoder = null; // Referencia global al buscador
let currentLat = -36.8201; 
let currentLng = -73.0443; 

// Variables de Estado
let isEditing = false;
let editingId = null;
let uploadedFiles = [];   // Fotos NUEVAS (Files en memoria)
let existingImages = [];  // Fotos YA GUARDADAS (URLs del backend)

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN INICIAL ---
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');
    
    let currentStep = 1;
    const totalSteps = 3;

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
    const fileInput = document.getElementById('pInputFotos');
    const photoGrid = document.getElementById('photoSortableGrid');

    // --- FUNCIONES DE VISTA ---
    function toggleView(showWizard) {
        if(views.list && views.wizard) {
            views.list.style.display = showWizard ? 'none' : 'block';
            views.wizard.style.display = showWizard ? 'block' : 'none';
        }
        window.scrollTo(0,0);
    }

    function resetWizard() {
        form.reset();
        currentStep = 1;
        uploadedFiles = [];
        existingImages = []; // Limpiar fotos viejas
        if(photoGrid) photoGrid.innerHTML = '';
        renderGallery();
        renderStep();
        
        if(document.getElementById('pAltura')) document.getElementById('pAltura').disabled = true;
        if(document.getElementById('timeInputsBox')) document.getElementById('timeInputsBox').style.display = 'none';
        
        // Limpiar el buscador del mapa si existe
        const geocoderInput = document.querySelector('.mapboxgl-ctrl-geocoder--input');
        if(geocoderInput) geocoderInput.value = '';
    }

    // --- LÓGICA DE EDICIÓN (RECUPERADA Y MEJORADA) ---
    window.editParking = async (id) => {
        try {
            const res = await fetch(`${API_URL}/parkings/${id}`);
            if(!res.ok) throw new Error('Error al cargar datos');
            const data = await res.json();

            // Configurar Modo Edición
            isEditing = true;
            editingId = id;
            document.querySelector('#viewWizard h3').textContent = "Editar Publicación";
            buttons.submit.textContent = "Guardar Cambios";

            // Rellenar Campos Básicos
            document.getElementById('pTitulo').value = data.titulo;
            document.getElementById('pPrecio').value = parseInt(data.precio).toLocaleString('es-CL');
            document.getElementById('pDesc').value = data.descripcion;
            
            // Horarios
            const selHorario = document.getElementById('pHorario');
            selHorario.value = data.es_24_horas ? "true" : "false";
            
            if(selHorario.value === "false") {
                document.getElementById('timeInputsBox').style.display = 'grid';
            } else {
                document.getElementById('timeInputsBox').style.display = 'none';
            }
            
            if(!data.es_24_horas) {
                document.getElementById('pHoraApertura').value = data.hora_apertura;
                document.getElementById('pHoraCierre').value = data.hora_cierre;
            }

            // Características
            const radioCob = document.querySelector(`input[name="cobertura"][value="${data.tipo_cobertura}"]`);
            if(radioCob) radioCob.checked = true;

            const segArray = data.seguridad ? data.seguridad.split(', ') : [];
            document.querySelectorAll('input[name="seguridad"]').forEach(chk => {
                chk.checked = segArray.includes(chk.value);
            });

            // Dimensiones
            document.getElementById('pLargo').value = data.largo;
            document.getElementById('pAncho').value = data.ancho;
            document.getElementById('pAltura').value = data.altura_maxima || '';
            if(data.tipo_cobertura !== 'Aire Libre') document.getElementById('pAltura').disabled = false;

            // Ubicación e Inputs
            document.getElementById('pCalle').value = data.calle;
            document.getElementById('pNumeroCalle').value = data.numero_calle;
            document.getElementById('pNumEst').value = data.n_estacionamiento;
            
            // Cargar FOTOS EXISTENTES
            existingImages = data.imagenes || [];
            renderGallery(); // Esto mostrará las fotos guardadas

            // Cargar MAPA Y GEOCODER
            currentLat = parseFloat(data.latitud) || -36.8201;
            currentLng = parseFloat(data.longitud) || -73.0443;

            setTimeout(() => {
                if(mapboxMap) {
                    mapboxMap.resize();
                    mapboxMap.flyTo({ center: [currentLng, currentLat], zoom: 16 });
                    mapboxMarker.setLngLat([currentLng, currentLat]);
                }
                // Pre-llenar visualmente el buscador
                const geocoderInput = document.querySelector('.mapboxgl-ctrl-geocoder--input');
                if(geocoderInput && data.calle) {
                    geocoderInput.value = `${data.calle} ${data.numero_calle || ''}, ${data.nombre_comuna || ''}`;
                }
            }, 500);

            toggleView(true);

        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'No se pudieron cargar los datos.', 'error');
        }
    };

    function checkUrlForEdit() {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        if(editId) {
            window.history.replaceState({}, document.title, window.location.pathname);
            window.editParking(editId);
        }
    }

    // --- NAVEGACIÓN ENTRE VISTAS ---
    if(buttons.start) {
        buttons.start.addEventListener('click', () => {
            isEditing = false;
            document.querySelector('#viewWizard h3').textContent = "Nueva Publicación";
            buttons.submit.textContent = "Publicar Estacionamiento";
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
            }).then((r) => { 
                if (r.isConfirmed) {
                    toggleView(false);
                    resetWizard();
                    isEditing = false;
                } 
            });
        });
    }

    // --- LÓGICA DE REGIONES ---
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

            regionSelect.onchange = async (e) => {
                const idReg = e.target.value;
                comunaSelect.innerHTML = '<option value="">Cargando...</option>';
                comunaSelect.disabled = true;

                if(idReg) {
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
                } else {
                    comunaSelect.innerHTML = '<option value="">Selecciona Región primero</option>';
                }
            };
        } catch (err) { console.error(err); }
    }

    // --- CAMPOS DINÁMICOS ---
    function setupDynamicFields() {
        const priceInput = document.getElementById('pPrecio');
        if(priceInput) {
            priceInput.addEventListener('input', (e) => {
                let raw = e.target.value.replace(/\D/g, '');
                if (raw) e.target.value = new Intl.NumberFormat('es-CL').format(raw);
                else e.target.value = '';
            });
        }
        const selHorario = document.getElementById('pHorario');
        if(selHorario) {
            selHorario.addEventListener('change', (e) => {
                document.getElementById('timeInputsBox').style.display = e.target.value === 'false' ? 'grid' : 'none';
            });
        }
        document.getElementsByName('cobertura').forEach(r => {
            r.addEventListener('change', e => {
                const alt = document.getElementById('pAltura');
                if(e.target.value === 'Aire Libre') { alt.disabled = true; alt.value=''; }
                else alt.disabled = false;
            });
        });
    }

    // --- STEPPER ---
    if(buttons.next) {
        buttons.next.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                if (currentStep < totalSteps) { currentStep++; renderStep(); }
            }
        });
    }
    if(buttons.prev) buttons.prev.addEventListener('click', () => { if (currentStep > 1) { currentStep--; renderStep(); } });

    function renderStep() {
        for (let i = 1; i <= totalSteps; i++) {
            const el = document.getElementById(`stepIndicator${i}`);
            if(el) {
                el.classList.remove('active', 'completed');
                if (i < currentStep) el.classList.add('completed');
                if (i === currentStep) el.classList.add('active');
            }
        }
        document.querySelectorAll('.step-content').forEach(sc => sc.classList.remove('active'));
        const activeStep = document.getElementById(`step${currentStep}`);
        if(activeStep) activeStep.classList.add('active');

        buttons.prev.style.visibility = currentStep === 1 ? 'hidden' : 'visible';

        if (currentStep === totalSteps) {
            buttons.next.style.display = 'none';
            buttons.submit.style.display = 'inline-block';
            setTimeout(initMapbox, 200);
        } else {
            buttons.next.style.display = 'inline-block';
            buttons.submit.style.display = 'none';
        }
    }

    function validateStep(step) {
        const container = document.getElementById(`step${step}`);
        let isValid = true;
        
        const inputs = container.querySelectorAll('input[required]:not([disabled]), select[required]:not([disabled]), textarea[required]');
        inputs.forEach(inp => {
            if (!inp.value.trim()) { isValid = false; inp.style.borderColor = '#EF4444'; } 
            else { inp.style.borderColor = '#E2E8F0'; }
        });

        if (step === 1) {
            const es24 = document.getElementById('pHorario').value === 'true';
            if (!es24) {
                const ha = document.getElementById('pHoraApertura');
                const hc = document.getElementById('pHoraCierre');
                if(!ha.value) { isValid = false; ha.style.borderColor = '#EF4444'; }
                if(!hc.value) { isValid = false; hc.style.borderColor = '#EF4444'; }
            }
        }

        // Validación fotos: Si estamos editando, permitimos pasar sin nuevas fotos si ya hay existentes
        if (step === 2) {
            const totalPhotos = uploadedFiles.length + existingImages.length;
            if (totalPhotos === 0) {
                const fb = document.getElementById('noPhotosFeedback');
                if(fb) fb.style.display = 'block';
                isValid = false;
            }
        }

        if (!isValid) Swal.fire({ icon: 'error', title: 'Faltan datos', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
        return isValid;
    }

    // --- INTEGRACIÓN MAPBOX (MAPA + BUSCADOR GLOBAL) ---
    function initMapbox() {
        // Si ya existe, redimensionar y salir
        if(mapboxMap) {
            mapboxMap.resize();
            mapboxMap.setCenter([currentLng, currentLat]);
            mapboxMarker.setLngLat([currentLng, currentLat]);
            return;
        }

        mapboxMap = new mapboxgl.Map({
            container: 'mapboxMap',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [currentLng, currentLat],
            zoom: 14
        });
        mapboxMap.addControl(new mapboxgl.NavigationControl());

        mapboxMarker = new mapboxgl.Marker({ draggable: true, color: "#FF6600" })
            .setLngLat([currentLng, currentLat]).addTo(mapboxMap);

        mapboxMarker.on('dragend', () => {
            const ll = mapboxMarker.getLngLat();
            currentLng = ll.lng; currentLat = ll.lat;
        });
        mapboxMap.on('click', (e) => {
            mapboxMarker.setLngLat(e.lngLat);
            currentLng = e.lngLat.lng; currentLat = e.lngLat.lat;
        });

        const geocoderContainer = document.getElementById('geocoder');
        if(geocoderContainer) {
            geocoderContainer.innerHTML = ''; 
            mapboxGeocoder = new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
                countries: 'cl', placeholder: 'Buscar dirección...', marker: false
            });
            geocoderContainer.appendChild(mapboxGeocoder.onAdd(mapboxMap));

            mapboxGeocoder.on('result', (e) => {
                const center = e.result.center;
                mapboxMap.flyTo({ center: center, zoom: 16 });
                mapboxMarker.setLngLat(center);
                currentLng = center[0]; currentLat = center[1];
                if(document.getElementById('pCalle')) document.getElementById('pCalle').value = e.result.text || "";
                if(document.getElementById('pNumeroCalle') && e.result.address) document.getElementById('pNumeroCalle').value = e.result.address;
            });
        }
    }

    // =========================================================
    // --- GESTIÓN DE FOTOS: EL CÓDIGO QUE QUERÍAS RECUPERAR ---
    // =========================================================
    
    // 1. Manejo del Input File
    if (fileInput) {
        fileInput.onchange = (e) => {
            const newFiles = Array.from(e.target.files);
            uploadedFiles = uploadedFiles.concat(newFiles);
            
            // Validación con límite total
            const totalCount = uploadedFiles.length + existingImages.length;
            if (totalCount > 5) {
                uploadedFiles = uploadedFiles.slice(0, 5 - existingImages.length);
                Swal.fire('Límite alcanzado', 'Solo puedes tener 5 fotos en total.', 'warning');
            }
            
            renderGallery();
            
            const fb = document.getElementById('noPhotosFeedback');
            if(fb) fb.style.display = 'none';
            fileInput.value = ''; 
        };
    }

    // 2. Renderizar Galería (HÍBRIDA: Existentes + Nuevas)
    function renderGallery() {
        if (!photoGrid) return;
        photoGrid.innerHTML = '';

        // A. FOTOS EXISTENTES (Estáticas)
        existingImages.forEach((url) => {
            const item = document.createElement('div');
            item.className = 'photo-draggable-item';
            // Las existentes no son draggables por limitación del backend actual (no reordena existentes)
            item.innerHTML = `
                <img src="${url}" style="opacity:0.9;">
                <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.6); color:white; font-size:0.7rem; padding:2px; text-align:center;">Guardada</div>
            `;
            photoGrid.appendChild(item);
        });

        // B. FOTOS NUEVAS (Draggables y Voladoras)
        uploadedFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const item = document.createElement('div');
                item.className = 'photo-draggable-item';
                item.draggable = true;
                item.fileReference = file; // Referencia clave

                item.innerHTML = `
                    <img src="${e.target.result}">
                    <button type="button" class="remove-photo-btn">&times;</button>
                    <div style="position:absolute; top:0; left:0; background:#10B981; color:white; font-size:0.6rem; padding:2px 5px; border-radius:0 0 5px 0;">Nueva</div>
                `;

                item.querySelector('.remove-photo-btn').onclick = (ev) => {
                    ev.stopPropagation(); 
                    uploadedFiles = uploadedFiles.filter(f => f !== file);
                    renderGallery();
                };

                addDragEvents(item);
                photoGrid.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }

    // 3. Eventos de Arrastre (TU CÓDIGO ORIGINAL + FIX)
    function addDragEvents(item) {
        item.addEventListener('dragstart', (e) => {
            // El setTimeout permite que el navegador tome la "foto" del elemento antes de aplicar la clase .dragging
            setTimeout(() => {
                item.classList.add('dragging');
            }, 0);
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            updateUploadedFilesOrder(); 
        });
    }

    // 4. Lógica de "Vuelo" y Separación
    if (photoGrid) {
        photoGrid.addEventListener('dragover', e => {
            e.preventDefault(); 
            const afterElement = getDragAfterElement(photoGrid, e.clientX, e.clientY);
            const draggable = document.querySelector('.dragging');
            if (!draggable) return;

            if (afterElement == null) {
                photoGrid.appendChild(draggable);
            } else {
                photoGrid.insertBefore(draggable, afterElement);
            }
        });
    }

    // 5. Cálculo Matemático del Grid
    function getDragAfterElement(container, x, y) {
        const draggableElements = [...container.querySelectorAll('.photo-draggable-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            // Distancia Euclidiana al centro
            const boxCenterX = box.left + box.width / 2;
            const boxCenterY = box.top + box.height / 2;
            const dist = Math.hypot(x - boxCenterX, y - boxCenterY);

            if (dist < closest.offset) {
                return { offset: dist, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.POSITIVE_INFINITY }).element;
    }

    // 6. Actualizar Array
    function updateUploadedFilesOrder() {
        const currentItems = document.querySelectorAll('.photo-draggable-item');
        const newOrder = [];
        currentItems.forEach(item => {
            if (item.fileReference) newOrder.push(item.fileReference);
        });
        uploadedFiles = newOrder;
    }

    // --- ENVIAR FORMULARIO (PUBLISH/UPDATE) ---
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = buttons.submit;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
            btn.disabled = true;

            const formData = new FormData();
            formData.append('titulo', document.getElementById('pTitulo').value);
            formData.append('descripcion', document.getElementById('pDesc').value);
            formData.append('precio', document.getElementById('pPrecio').value.replace(/\./g, ''));
            
            const es24 = document.getElementById('pHorario').value;
            formData.append('es_24_horas', es24);
            if(es24 === 'false') {
                formData.append('hora_apertura', document.getElementById('pHoraApertura').value);
                formData.append('hora_cierre', document.getElementById('pHoraCierre').value);
            }

            formData.append('id_comuna', document.getElementById('pComuna').value || 219);
            formData.append('calle', document.getElementById('pCalle').value);
            formData.append('numero_calle', document.getElementById('pNumeroCalle').value);
            formData.append('n_estacionamiento', document.getElementById('pNumEst').value);
            formData.append('latitud', currentLat);
            formData.append('longitud', currentLng);
            formData.append('largo', document.getElementById('pLargo').value || 0);
            formData.append('ancho', document.getElementById('pAncho').value || 0);
            const alt = document.getElementById('pAltura');
            formData.append('altura', (!alt.disabled && alt.value) ? alt.value : 0);

            const cob = document.querySelector('input[name="cobertura"]:checked');
            if(cob) formData.append('cobertura', cob.value);
            const segEls = document.querySelectorAll('input[name="seguridad"]:checked');
            const segVals = Array.from(segEls).map(el => el.value).join(', ');
            formData.append('seguridad', segVals);

            // Enviar solo las nuevas (las viejas ya están en DB)
            uploadedFiles.forEach(file => formData.append('fotos', file));

            const url = isEditing ? `${API_URL}/parkings/${editingId}` : `${API_URL}/parkings/create`;
            const method = isEditing ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method, headers: { 'Authorization': `Bearer ${token}` }, body: formData
                });

                if (res.ok) {
                    Swal.fire({ icon: 'success', title: isEditing ? 'Actualizado' : 'Publicado', confirmButtonColor: '#003B73' }).then(() => {
                        toggleView(false); loadMyParkings(); resetWizard(); isEditing = false;
                        window.history.replaceState({}, document.title, window.location.pathname);
                    });
                } else {
                    const data = await res.json(); throw new Error(data.error);
                }
            } catch (err) { Swal.fire('Error', err.message, 'error'); } 
            finally { btn.innerHTML = originalText; btn.disabled = false; }
        });
    }

    // --- CARGAR LISTA ---
    async function loadMyParkings() {
        const container = document.getElementById('parkingsContainer');
        const empty = document.getElementById('parkingsEmptyState');
        if(!container) return;
        try {
            const res = await fetch(`${API_URL}/parkings/mine`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            container.innerHTML = '';
            if (data.length === 0) {
                container.style.display = 'none'; if(empty) empty.style.display = 'block';
            } else {
                container.style.display = 'grid'; if(empty) empty.style.display = 'none';
                data.forEach(p => {
                    const img = p.ruta_imagen || 'https://via.placeholder.com/400x300?text=Sin+Foto';
                    const price = parseInt(p.precio).toLocaleString('es-CL');
                    container.innerHTML += `
                        <div class="parking-card">
                            <div class="parking-img-wrapper"><img src="${img}" class="parking-img"><div class="parking-price-tag">$${price}</div></div>
                            <div class="parking-content">
                                <div class="parking-title">${p.titulo}</div>
                                <div class="parking-location"><i class="fa-solid fa-location-dot"></i> ${p.calle} #${p.numero_calle}</div>
                                <div style="margin-top:auto; padding-top:15px; border-top:1px solid #eee; display:flex; gap:10px;">
                                    <button class="btn-secondary" style="font-size:0.8rem; padding:8px 15px; flex:1;" onclick="window.location.href='detalle.html?id=${p.id_publicacion}'"><i class="fa-solid fa-eye"></i> Ver</button>
                                    <button class="btn-secondary" style="font-size:0.8rem; padding:8px 15px; flex:1; background:#EFF6FF; color:#003B73;" onclick="editParking(${p.id_publicacion})"><i class="fa-solid fa-pen"></i> Editar</button>
                                    <button class="btn-delete" type="button" style="background:#FEE2E2; color:#DC2626; border:none; border-radius:8px; padding:10px; cursor:pointer;" onclick="deleteParking(${p.id_publicacion})"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            </div>
                        </div>`;
                });
            }
        } catch (err) { console.error(err); }
    }

    // --- FUNCIÓN DE ELIMINAR CORREGIDA ---
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

                    // IMPORTANTE: Revisamos la respuesta
                    if (res.ok) {
                        const data = await res.json();
                        // Si se eliminó o archivó correctamente
                        Swal.fire('Eliminado', data.message || 'La publicación ha sido eliminada.', 'success');
                        loadMyParkings();
                    } else {
                        // Error (Contrato activo o problema real)
                        const data = await res.json();
                        Swal.fire('Atención', data.error || 'No se pudo eliminar.', 'error');
                    }
                } catch(err) { 
                    console.error(err);
                    Swal.fire('Error', 'Fallo de conexión con el servidor', 'error'); 
                }
            }
        });
    };

    // Inicializaciones
    loadMyParkings();
    cargarRegionesDesdeBD();
    setupDynamicFields();
    checkUrlForEdit();
});