document.addEventListener('DOMContentLoaded', () => {
    // --- REFERENCIAS ---
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');

    // Inputs
    const rutInput = document.getElementById('regRut');
    const rutFeedback = document.getElementById('rutFeedback');
    const phoneInput = document.getElementById('regTelefono');
    const nameInput = document.getElementById('regNombre');
    const lastNameInput = document.getElementById('regApellido');
    const streetNumInput = document.getElementById('regNumero');
    
    // Referencias de Ubicación
    const selectRegion = document.getElementById('regRegion');
    const selectComuna = document.getElementById('regComuna');

    // --- CONFIGURACIÓN API ---
    const API_URL = 'http://localhost:3000/api'; 

    // --- CONFIGURACIÓN DE ALERTAS MODERNAS (TOAST) ---
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#ffffff',
        color: '#1e293b',
        iconColor: '#FF6600',
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

    // --- VALIDACIONES EN TIEMPO REAL ---
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

    // --- DATOS GEOGRÁFICOS CHILE ---
    const datosChile = {
        1: { nombre: "Arica y Parinacota", comunas: { "Arica": "Arica", "Putre": "Putre" } },
        2: { nombre: "Tarapacá", comunas: { "Iquique": "Iquique", "Alto Hospicio": "Alto Hospicio" } },
        3: { nombre: "Antofagasta", comunas: { "Antofagasta": "Antofagasta", "Calama": "Calama" } },
        4: { nombre: "Atacama", comunas: { "Copiapó": "Copiapó", "Vallenar": "Vallenar" } },
        5: { nombre: "Coquimbo", comunas: { "La Serena": "La Serena", "Coquimbo": "Coquimbo" } },
        6: { nombre: "Valparaíso", comunas: { "Valparaíso": "Valparaíso", "Viña del Mar": "Viña del Mar" } },
        7: { nombre: "Metropolitana", comunas: { "Santiago": "Santiago", "Providencia": "Providencia", "Las Condes": "Las Condes", "Maipú": "Maipú" } },
        8: { nombre: "O'Higgins", comunas: { "Rancagua": "Rancagua", "San Fernando": "San Fernando" } },
        9: { nombre: "Maule", comunas: { "Talca": "Talca", "Curicó": "Curicó" } },
        10: { nombre: "Ñuble", comunas: { "Chillán": "Chillán", "San Carlos": "San Carlos" } },
        11: { nombre: "Biobío", comunas: { "Concepción": "Concepción", "Talcahuano": "Talcahuano", "San Pedro de la Paz": "San Pedro de la Paz", "Chiguayante": "Chiguayante", "Hualpén": "Hualpén", "Coronel": "Coronel", "Lota": "Lota", "Tomé": "Tomé", "Penco": "Penco" } },
        12: { nombre: "La Araucanía", comunas: { "Temuco": "Temuco", "Villarrica": "Villarrica" } },
        13: { nombre: "Los Ríos", comunas: { "Valdivia": "Valdivia" } },
        14: { nombre: "Los Lagos", comunas: { "Puerto Montt": "Puerto Montt" } },
        15: { nombre: "Aysén", comunas: { "Coyhaique": "Coyhaique" } },
        16: { nombre: "Magallanes", comunas: { "Punta Arenas": "Punta Arenas" } }
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
                const comunas = datosChile[regionId].comunas;
                let dummyId = 1; 
                Object.keys(comunas).forEach((nombreComuna) => {
                    const option = document.createElement('option');
                    option.textContent = comunas[nombreComuna]; 
                    if(nombreComuna === 'Concepción') option.value = 51;
                    else option.value = dummyId++; 
                    selectComuna.appendChild(option);
                });
            } else {
                selectComuna.disabled = true;
            }
        });
    }

    // --- MANEJO DE MODALES ---
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
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
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
                rutInput.style.borderColor = '#10B981';
                rutFeedback.style.display = 'none';
            } else {
                rutInput.style.borderColor = '#EF4444';
                rutFeedback.textContent = 'RUT inválido';
                rutFeedback.style.display = 'block';
            }
        });
    }

    if(mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            } else {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });
    }

    // --- REGISTRO SUBMIT ---
    const registerForm = document.getElementById('registerForm');
    if(registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            
            if (!validarRutModulo11(rutInput.value)) {
                Toast.fire({ icon: 'error', title: 'RUT inválido, verifica los datos.' });
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
                id_comuna: selectComuna.value || 1, 
                calle: document.getElementById('regCalle').value,
                numero: streetNumInput.value
            };

            const submitBtn = document.querySelector('#registerForm .btn-modal-submit');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Procesando...';

            try {
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();

                if (res.ok) {
                    Toast.fire({ icon: 'success', title: '¡Cuenta Creada!' });
                    close(registerModal); 
                    open(loginModal); 
                    registerForm.reset();
                } else {
                    Toast.fire({ icon: 'warning', title: result.error });
                }
            } catch (err) {
                console.error(err);
                Toast.fire({ icon: 'error', title: 'Error de conexión.' });
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Registrarse';
            }
        };
    }

    // --- LOGIN SUBMIT (MODIFICADO PARA DASHBOARD) ---
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
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();

                if (res.ok) {
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('usuario', result.usuario);
                    
                    Toast.fire({ icon: 'success', title: `Bienvenido, ${result.usuario}` });
                    close(loginModal);
                    
                    // REDIRECCIÓN AL DASHBOARD
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);

                } else {
                    Toast.fire({ icon: 'error', title: result.error });
                }
            } catch (err) {
                console.error(err);
                Toast.fire({ icon: 'error', title: 'Fallo al iniciar sesión.' });
            }
        };
    }
});