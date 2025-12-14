document.addEventListener('DOMContentLoaded', () => {
    // --- REFERENCIAS ---
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');

    // Inputs Registro
    const rutInput = document.getElementById('regRut');
    const rutFeedback = document.getElementById('rutFeedback');
    const phoneInput = document.getElementById('regTelefono');
    const nameInput = document.getElementById('regNombre');
    const lastNameInput = document.getElementById('regApellido');
    const streetNumInput = document.getElementById('regNumero');
    const deptoInput = document.getElementById('regDepto');
    const selectRegion = document.getElementById('regRegion');
    const selectComuna = document.getElementById('regComuna');

    // Grid de Preview (Index)
    const homeGrid = document.getElementById('homeParkingGrid');

    const API_URL = 'http://localhost:3000/api'; 

    const Toast = Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
        timerProgressBar: true, background: '#ffffff', color: '#1e293b', iconColor: '#FF6600',
        didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
    });

    // --- CARGAR PREVIEW EN HOME ---
    if (homeGrid) {
        fetch(`${API_URL}/parkings`)
            .then(res => res.json())
            .then(data => {
                homeGrid.innerHTML = '';
                // Mostrar 6 estacionamientos (o menos si no hay tantos)
                const previewData = data.slice(0, 6);
                
                if(previewData.length === 0) {
                    homeGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No hay estacionamientos destacados por ahora.</p>';
                    return;
                }

                previewData.forEach(p => {
                    const img = p.ruta_imagen || 'https://via.placeholder.com/400x300?text=Sin+Imagen';
                    const precioFmt = parseInt(p.precio).toLocaleString('es-CL');
                    const badgeCobertura = p.tipo_cobertura || 'N/A';

                    // Tarjeta más compacta (altura de imagen reducida a 160px)
                    const card = `
                        <div class="parking-card" style="border:1px solid #E2E8F0; border-radius:12px; overflow:hidden; background:white; box-shadow:0 4px 10px rgba(0,0,0,0.04); transition:transform 0.2s;">
                            <div class="parking-img-wrapper" style="height:160px; position:relative;">
                                <img src="${img}" style="width:100%; height:100%; object-fit:cover;">
                                <div class="parking-price-tag" style="position:absolute; bottom:8px; right:8px; background:#FF6600; color:white; padding:4px 10px; border-radius:15px; font-weight:700; font-size:0.85rem;">$${precioFmt}</div>
                            </div>
                            <div class="parking-content" style="padding:15px;">
                                <h4 style="color:#003B73; margin-bottom:4px; font-size:1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.titulo}</h4>
                                <p style="color:#64748B; font-size:0.85rem; margin-bottom:10px;">
                                    <i class="fa-solid fa-location-dot"></i> ${p.nombre_comuna}
                                </p>
                                <div style="display:flex; gap:8px; margin-bottom:15px;">
                                    <span style="background:#F1F5F9; color:#475569; padding:3px 8px; border-radius:4px; font-size:0.75rem;">${badgeCobertura}</span>
                                </div>
                                <button onclick="checkAuth()" style="width:100%; background:#003B73; color:white; border:none; padding:10px; border-radius:6px; font-weight:600; cursor:pointer; font-size:0.9rem; transition:0.2s;">
                                    Ver Detalle
                                </button>
                            </div>
                        </div>`;
                    homeGrid.innerHTML += card;
                });
            })
            .catch(err => {
                console.error(err);
                homeGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Error cargando vista previa.</p>';
            });
    }

    // --- FUNCIÓN GLOBAL DE AUTH CHECK ---
    window.checkAuth = () => {
        const token = localStorage.getItem('token');
        if (token) {
            window.location.href = 'dashboard.html';
        } else {
            Swal.fire({
                title: '¡Inicia Sesión!',
                text: 'Para ver detalles, reservar o buscar, necesitas una cuenta.',
                icon: 'info',
                confirmButtonText: 'Ir a Login',
                confirmButtonColor: '#003B73',
                showCancelButton: true,
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    open(loginModal);
                }
            });
        }
    };

    // --- VALIDACIONES Y RESTO DEL CÓDIGO ---
    const allowOnlyLetters = (e) => { e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ''); };
    const allowOnlyNumbers = (e) => { e.target.value = e.target.value.replace(/\D/g, ''); };

    if(nameInput) nameInput.addEventListener('input', allowOnlyLetters);
    if(lastNameInput) lastNameInput.addEventListener('input', allowOnlyLetters);
    if(streetNumInput) streetNumInput.addEventListener('input', allowOnlyNumbers);

    if(phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let rawValue = e.target.value.replace(/\D/g, ''); 
            if (rawValue.length > 9) rawValue = rawValue.slice(0, 9); 
            let formatted = rawValue;
            if (rawValue.length > 5) formatted = `${rawValue.slice(0, 1)} ${rawValue.slice(1, 5)} ${rawValue.slice(5)}`;
            else if (rawValue.length > 1) formatted = `${rawValue.slice(0, 1)} ${rawValue.slice(1)}`;
            e.target.value = formatted;
        });
    }

    // --- DATOS GEOGRÁFICOS ---
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

    if(selectRegion) {
        Object.keys(datosChile).forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = datosChile[id].nombre;
            selectRegion.appendChild(option);
        });

        selectRegion.addEventListener('change', (e) => {
            const regionId = e.target.value;
            selectComuna.innerHTML = '<option value="">Selecciona una comuna</option>'; 
            
            if (regionId && datosChile[regionId]) {
                selectComuna.disabled = false;
                Object.entries(datosChile[regionId].comunas).forEach(([nombre, id]) => {
                    const opt = document.createElement('option');
                    opt.textContent = nombre;
                    opt.value = id;
                    selectComuna.appendChild(opt);
                });
            } else {
                selectComuna.disabled = true;
            }
        });
    }

    // --- MODALES ---
    const open = (m) => { m.style.display = 'flex'; if(navLinks) navLinks.classList.remove('active'); };
    const close = (m) => m.style.display = 'none';

    if(document.getElementById('openLoginBtn')) document.getElementById('openLoginBtn').onclick = () => open(loginModal);
    if(document.getElementById('openRegisterBtn')) document.getElementById('openRegisterBtn').onclick = () => open(registerModal);
    document.querySelectorAll('.close-btn').forEach(btn => btn.onclick = () => { close(loginModal); close(registerModal); });
    if(document.getElementById('switchToRegister')) document.getElementById('switchToRegister').onclick = (e) => { e.preventDefault(); close(loginModal); open(registerModal); };
    if(document.getElementById('switchToLogin')) document.getElementById('switchToLogin').onclick = (e) => { e.preventDefault(); close(registerModal); open(loginModal); };
    window.onclick = (e) => { if(e.target === loginModal) close(loginModal); if(e.target === registerModal) close(registerModal); };

    // --- OJITO PASS ---
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.onclick = () => {
            const input = document.getElementById(icon.dataset.target);
            input.type = input.type === 'password' ? 'text' : 'password';
            icon.classList.toggle('fa-eye'); icon.classList.toggle('fa-eye-slash');
        };
    });

    // --- RUT FORMATO ---
    const formatearRut = (rut) => {
        let valor = rut.replace(/\./g, '').replace(/-/g, '');
        if (valor.length === 0) return '';
        let cuerpo = valor.slice(0, -1);
        let dv = valor.slice(-1).toUpperCase();
        return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (valor.length > 1 ? "-" + dv : dv);
    };
    const validarRutModulo11 = (rut) => {
        if (!rut || rut.length < 3) return false;
        let valor = rut.replace(/\./g, '').replace(/-/g, '');
        let cuerpo = valor.slice(0, -1);
        let dv = valor.slice(-1).toUpperCase();
        if (!/^[0-9]+$/.test(cuerpo)) return false;
        let suma = 0, multiplo = 2;
        for (let i = 1; i <= cuerpo.length; i++) {
            let index = multiplo * valor.charAt(cuerpo.length - i);
            suma += index;
            multiplo = multiplo < 7 ? multiplo + 1 : 2;
        }
        let dvEsperado = 11 - (suma % 11);
        dvEsperado = (dvEsperado == 11) ? 0 : ((dvEsperado == 10) ? "K" : dvEsperado);
        return dvEsperado.toString() === dv;
    };
    if(rutInput) {
        rutInput.addEventListener('input', (e) => {
            let valor = e.target.value.replace(/[^0-9kK]/g, '');
            e.target.value = formatearRut(valor);
            if (validarRutModulo11(e.target.value)) {
                rutInput.style.borderColor = '#10B981'; rutFeedback.style.display = 'none';
            } else {
                rutInput.style.borderColor = '#EF4444'; rutFeedback.textContent = 'RUT inválido'; rutFeedback.style.display = 'block';
            }
        });
    }

    if(mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            icon.classList.toggle('fa-bars'); icon.classList.toggle('fa-xmark');
        });
    }

    // --- REGISTRO SUBMIT ---
    const registerForm = document.getElementById('registerForm');
    if(registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            
            if (!validarRutModulo11(rutInput.value)) {
                Toast.fire({ icon: 'error', title: 'RUT inválido' });
                return;
            }

            const cleanPhone = phoneInput.value.replace(/\D/g, '');

            const data = {
                rut: rutInput.value,
                nombre: nameInput.value.trim(),
                apellido: lastNameInput.value.trim(),
                telefono: '+56 ' + cleanPhone,
                correo: document.getElementById('regEmail').value,
                contrasena: document.getElementById('regPassword').value,
                id_comuna: selectComuna.value || 219,
                calle: document.getElementById('regCalle').value,
                numero: streetNumInput.value,
                depto_casa: deptoInput ? deptoInput.value : '' 
            };

            const submitBtn = document.querySelector('#registerForm .btn-modal-submit');
            submitBtn.disabled = true; submitBtn.textContent = 'Procesando...';

            try {
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();

                if (res.ok) {
                    Toast.fire({ icon: 'success', title: '¡Cuenta Creada!' });
                    close(registerModal); open(loginModal); registerForm.reset();
                } else {
                    Toast.fire({ icon: 'warning', title: result.error || 'Error al registrar' });
                }
            } catch (err) {
                console.error(err); Toast.fire({ icon: 'error', title: 'Error de conexión' });
            } finally {
                submitBtn.disabled = false; submitBtn.textContent = 'Registrarse';
            }
        };
    }

    // --- LOGIN SUBMIT ---
    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                correo: document.getElementById('loginEmail').value,
                contrasena: document.getElementById('loginPassword').value
            };
            try {
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
                });
                const result = await res.json();
                if (res.ok) {
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('usuario', result.usuario);
                    Toast.fire({ icon: 'success', title: `Bienvenido, ${result.usuario}` });
                    close(loginModal);
                    setTimeout(() => window.location.href = 'dashboard.html', 1000);
                } else {
                    Toast.fire({ icon: 'error', title: result.error });
                }
            } catch (err) { Toast.fire({ icon: 'error', title: 'Fallo al iniciar sesión' }); }
        };
    }
});