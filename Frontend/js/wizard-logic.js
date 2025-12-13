document.addEventListener('DOMContentLoaded', () => {
    // --- Configuración Global ---
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');
    
    // Estado del Wizard
    let currentStep = 1;
    const totalSteps = 3;
    let uploadedFiles = []; 
    
    // Estado del Mapa
    let map = null;
    let marker = null;
    let currentLat = -36.8201; // Concepción Centro por defecto
    let currentLng = -73.0443; 

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
    cargarRegionesWizard();
    setupDynamicFields();      // Lógica Precio y Altura
    setupAddressAutocomplete(); // Buscador de direcciones

    // --- NAVEGACIÓN VISTAS ---
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
        views.list.style.display = showWizard ? 'none' : 'block';
        views.wizard.style.display = showWizard ? 'block' : 'none';
        window.scrollTo(0,0);
    }

    // --- CAMPOS DINÁMICOS (Precio y Altura) ---
    function setupDynamicFields() {
        // 1. Formato Precio en Tiempo Real
        const priceInput = document.getElementById('pPrecio');
        if(priceInput) {
            priceInput.addEventListener('input', (e) => {
                // Eliminar todo lo que no sea número
                let raw = e.target.value.replace(/\D/g, '');
                if (raw) {
                    // Formatear a pesos chilenos
                    e.target.value = new Intl.NumberFormat('es-CL').format(raw);
                } else {
                    e.target.value = '';
                }
            });
        }

        // 2. Lógica Altura (Solo habilitada si NO es Aire Libre)
        // ADAPTADO PARA RADIO BUTTONS
        const altInput = document.getElementById('pAltura');
        const radiosCobertura = document.getElementsByName('cobertura');

        radiosCobertura.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const val = e.target.value;
                // Si es Aire Libre -> DESHABILITAR
                if (val === 'Aire Libre') {
                    altInput.disabled = true;
                    altInput.value = '';
                    altInput.placeholder = 'No aplica';
                } else {
                    // Si es Techado o Subterráneo -> HABILITAR
                    altInput.disabled = false;
                    altInput.placeholder = 'Ej: 2.1';
                }
            });
        });
    }

    // --- NAVEGACIÓN PASOS (Wizard) ---
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
        // 1. Steppers Visuales
        for (let i = 1; i <= totalSteps; i++) {
            const el = document.getElementById(`stepIndicator${i}`);
            el.classList.remove('active', 'completed');
            if (i < currentStep) el.classList.add('completed');
            if (i === currentStep) el.classList.add('active');
        }

        // 2. Mostrar Contenido
        document.querySelectorAll('.step-content').forEach(sc => sc.classList.remove('active'));
        document.getElementById(`step${currentStep}`).classList.add('active');

        // 3. Botones
        buttons.prev.style.visibility = currentStep === 1 ? 'hidden' : 'visible';

        if (currentStep === totalSteps) {
            // Estamos en el último paso (Mapa)
            buttons.next.style.display = 'none';
            buttons.submit.style.display = 'inline-block';
            
            // Inicializar mapa si no existe o redimensionar
            setTimeout(() => {
                if(!map) initLeafletMap();
                else map.invalidateSize();
            }, 200);
        } else {
            buttons.next.style.display = 'inline-block';
            buttons.submit.style.display = 'none';
            
            // Texto dinámico
            buttons.next.innerHTML = currentStep === 1 
                ? 'Siguiente <i class="fa-solid fa-arrow-right"></i>' 
                : 'Siguiente <i class="fa-solid fa-arrow-right"></i>';
        }
    }

    function validateStep(step) {
        const container = document.getElementById(`step${step}`);
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

        // Validaciones Específicas
        if (step === 2 && uploadedFiles.length === 0) {
            document.getElementById('noPhotosFeedback').style.display = 'block';
            isValid = false;
        }

        if (!isValid) {
            // Pequeño shake visual o alerta
            Swal.fire({
                icon: 'error',
                title: 'Faltan datos',
                text: 'Por favor completa los campos obligatorios para continuar.',
                toast: true, position: 'top-end', timer: 3000, showConfirmButton: false
            });
        }
        return isValid;
    }

    // --- MAPA LEAFLET & BUSCADOR ---
    function initLeafletMap() {
        if (map) return;
        
        map = L.map('leafletMap').setView([currentLat, currentLng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        marker = L.marker([currentLat, currentLng], { draggable: true }).addTo(map);

        // Al mover el marcador manualmente
        marker.on('dragend', function (e) {
            const pos = marker.getLatLng();
            currentLat = pos.lat;
            currentLng = pos.lng;
            console.log("Nueva coord manual:", currentLat, currentLng);
        });

        // Al hacer click en el mapa
        map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            currentLat = e.latlng.lat;
            currentLng = e.latlng.lng;
        });
    }

    function setupAddressAutocomplete() {
        const input = document.getElementById('pDireccionTexto');
        const list = document.getElementById('addressSuggestions');
        const spinner = document.getElementById('searchSpinner');
        let timer;

        if(!input) return;

        input.addEventListener('input', function() {
            clearTimeout(timer);
            const query = this.value;
            
            if (query.length < 4) {
                list.innerHTML = '';
                spinner.style.display = 'none';
                return;
            }

            spinner.style.display = 'block'; // Mostrar carga

            timer = setTimeout(async () => {
                // Nominatim API: Limitada a Chile (cl) y buscando direcciones
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=cl&addressdetails=1&limit=5`;
                
                try {
                    const res = await fetch(url);
                    const data = await res.json();
                    
                    list.innerHTML = ''; // Limpiar anteriores
                    spinner.style.display = 'none';

                    if (data.length === 0) {
                        list.innerHTML = '<div class="autocomplete-item" style="cursor:default; color:#999;">No se encontraron resultados</div>';
                        return;
                    }

                    data.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'autocomplete-item';
                        // Formato amigable: Calle, Ciudad, Región
                        const display = `${item.address.road || item.address.pedestrian || ''} ${item.address.house_number || ''}, ${item.address.city || item.address.town || item.address.village || ''}`;
                        div.textContent = display.length > 5 ? display : item.display_name; // Fallback al nombre completo si falla el formato
                        
                        div.onclick = () => {
                            input.value = div.textContent; // Poner texto limpio
                            list.innerHTML = '';
                            
                            // Actualizar Mapa
                            currentLat = parseFloat(item.lat);
                            currentLng = parseFloat(item.lon);
                            
                            if (map) {
                                map.setView([currentLat, currentLng], 16);
                                marker.setLatLng([currentLat, currentLng]);
                            }
                        };
                        list.appendChild(div);
                    });

                } catch (err) {
                    console.error(err);
                    spinner.style.display = 'none';
                }
            }, 600); // Debounce de 600ms
        });

        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (e.target !== input && e.target !== list) {
                list.innerHTML = '';
            }
        });
    }

    // --- FOTOS (Drag & Drop) ---
    // NOTA: Se mantuvo la lógica original de drag and drop nativo
    const fileInput = document.getElementById('pInputFotos');
    const photoGrid = document.getElementById('photoSortableGrid');

    if(fileInput) {
        fileInput.onchange = (e) => {
            const newFiles = Array.from(e.target.files);
            uploadedFiles = uploadedFiles.concat(newFiles);
            renderGallery();
            document.getElementById('noPhotosFeedback').style.display = 'none';
        };
    }

    function renderGallery() {
        photoGrid.innerHTML = '';
        uploadedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const item = document.createElement('div');
                item.className = 'photo-draggable-item';
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
                    renderGallery();
                };

                addDragHandlers(item);
                photoGrid.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }

    // Lógica Drag & Drop Nativo
    let dragStartIndex;
    function addDragHandlers(item) {
        item.addEventListener('dragstart', function() {
            dragStartIndex = +this.dataset.index;
            this.classList.add('dragging');
        });
        item.addEventListener('dragover', (e) => e.preventDefault());
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


    // --- ENVIAR FORMULARIO ---
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = buttons.submit;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publicando...';
            btn.disabled = true;

            const formData = new FormData();
            
            // Datos Texto
            formData.append('titulo', document.getElementById('pTitulo').value);
            formData.append('descripcion', document.getElementById('pDesc').value);
            
            // Limpiar puntos del precio antes de enviar
            const cleanPrice = document.getElementById('pPrecio').value.replace(/\./g, '');
            formData.append('precio', cleanPrice);
            
            formData.append('es_24_horas', document.getElementById('pHorario').value);
            
            // Ubicación
            formData.append('id_comuna', document.getElementById('pComuna').value || 1); // Fallback
            formData.append('calle', document.getElementById('pDireccionTexto').value);
            formData.append('numero', 'S/N'); // Backend requiere este campo
            formData.append('latitud', currentLat);
            formData.append('longitud', currentLng);

            // Características
            formData.append('largo', document.getElementById('pLargo').value || 0);
            formData.append('ancho', document.getElementById('pAncho').value || 0);
            
            const alt = document.getElementById('pAltura');
            formData.append('altura', (!alt.disabled && alt.value) ? alt.value : 0);
            
            // ** ADAPTADO: OBTENER VALORES DE RADIO BUTTONS **
            const coberturaVal = document.querySelector('input[name="cobertura"]:checked').value;
            const seguridadVal = document.querySelector('input[name="seguridad"]:checked').value;
            
            formData.append('cobertura', coberturaVal);
            formData.append('seguridad', seguridadVal);

            // Foto Principal (La primera tras el reordenamiento)
            if (uploadedFiles.length > 0) {
                formData.append('imagen', uploadedFiles[0]);
            }

            try {
                const res = await fetch(`${API_URL}/parkings/create`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData // No poner Content-Type, fetch lo pone solo con el boundary
                });

                if (res.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Publicado con éxito!',
                        text: 'Tu estacionamiento ya está visible para los conductores.',
                        confirmButtonColor: '#003B73'
                    }).then(() => {
                        toggleView(false);
                        loadMyParkings();
                        resetWizard();
                    });
                } else {
                    const data = await res.json();
                    throw new Error(data.error || 'Error desconocido');
                }
            } catch (err) {
                Swal.fire('Error', err.message || 'No se pudo conectar al servidor', 'error');
            } finally {
                btn.innerHTML = 'Publicar Estacionamiento';
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
        // Reset manual
        document.getElementById('pAltura').disabled = true;
    }

    // --- CARGAR LISTA (Vista Principal) ---
    async function loadMyParkings() {
        const container = document.getElementById('parkingsContainer');
        const empty = document.getElementById('parkingsEmptyState');
        
        try {
            const res = await fetch(`${API_URL}/parkings/mine`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            const data = await res.json();
            
            container.innerHTML = '';
            
            if (data.length === 0) {
                container.style.display = 'none';
                empty.style.display = 'block';
            } else {
                container.style.display = 'grid';
                empty.style.display = 'none';
                
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
                                <i class="fa-solid fa-location-dot"></i> ${p.calle}
                            </div>
                            <div style="margin-top:auto; padding-top:15px; border-top:1px solid #eee; display:flex; gap:10px;">
                                <button class="btn-secondary" style="font-size:0.8rem; padding:8px 15px; flex:1;" onclick="window.location.href='detalle.html?id=${p.id_publicacion}'">
                                    <i class="fa-solid fa-eye"></i> Ver
                                </button>
                                
                                <button class="btn-delete" style="background:#FEE2E2; color:#DC2626; border:none; border-radius:8px; padding:10px; cursor:pointer;" onclick="deleteParking(${p.id_publicacion})">
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
    
    // Función global para eliminar (requerido por onclick inline)
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

    function cargarRegionesWizard() {
        const regionSelect = document.getElementById('pRegion');
        const comunaSelect = document.getElementById('pComuna');
        const datosChile = {
            1: { nom: "Arica y Parinacota", comunas: {1: "Arica"} },
            7: { nom: "Metropolitana", comunas: {30: "Santiago", 31: "Providencia"} },
            11: { nom: "Biobío", comunas: {45: "Concepción", 46: "Talcahuano", 47: "San Pedro de la Paz"} }
        };
        regionSelect.innerHTML = '<option value="">Selecciona Región</option>';
        Object.keys(datosChile).forEach(id => {
            regionSelect.innerHTML += `<option value="${id}">${datosChile[id].nom}</option>`;
        });
        regionSelect.onchange = (e) => {
            const idReg = e.target.value;
            comunaSelect.innerHTML = '<option value="">Selecciona Comuna</option>';
            if(idReg && datosChile[idReg]) {
                comunaSelect.disabled = false;
                Object.entries(datosChile[idReg].comunas).forEach(([idCom, nomCom]) => {
                    comunaSelect.innerHTML += `<option value="${idCom}">${nomCom}</option>`;
                });
            } else { comunaSelect.disabled = true; }
        };
    }
});