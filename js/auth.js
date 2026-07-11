/* ============================================
   PATITAS EL REY - auth.js
   Simulación de registro / login con LocalStorage
   ============================================*/


const CLAVE_USUARIOS = "patitasElRey_usuarios";
const CLAVE_SESION = "patitasElRey_sesion";

/**
 * Ofuscación MUY simple del password (NO es un hash criptográfico real).
 * Solo evita que se vea el texto plano a simple vista en LocalStorage.
 */
function ofuscarPassword(password) {
    return btoa(unescape(encodeURIComponent(password)));
}

/**
 * Obtiene el arreglo de usuarios registrados
 */
function obtenerUsuarios() {
    const datos = localStorage.getItem(CLAVE_USUARIOS);
    return datos ? JSON.parse(datos) : [];
}

/**
 * Guarda el arreglo completo de usuarios
 */
function guardarUsuarios(usuarios) {
    localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuarios));
}

/**
 * Registra un nuevo usuario. Devuelve { exito: bool, mensaje: string }
 */

function registrarUsuario(nombre, email, password) {
    const usuarios = obtenerUsuarios();
    const emailNormalizado = email.trim().toLowerCase();

    const yaExiste = usuarios.some(u => u.email === emailNormalizado);
    if (yaExiste) {
        return { exito: false, mensaje: "Ya existe una cuenta registrada con ese correo." };
    }

    usuarios.push({
        nombre: nombre.trim(),
        email: emailNormalizado,
        password: ofuscarPassword(password),
        rol: "cliente",
        fechaRegistro: new Date().toISOString()
    });

    guardarUsuarios(usuarios);
    return { exito: true, mensaje: "Cuenta creada correctamente." };
}


/**
 * Inicia sesión. Devuelve { exito: bool, mensaje: string }
 */

function iniciarSesion(email, password) {
    const usuarios = obtenerUsuarios();
    const emailNormalizado = email.trim().toLowerCase();
    const passwordOfuscado = ofuscarPassword(password);

    const usuario = usuarios.find(
        u => u.email === emailNormalizado && u.password === passwordOfuscado
    );

    if (!usuario) {
        return { exito: false, mensaje: "Correo o contraseña incorrectos." };
    }

    localStorage.setItem(CLAVE_SESION, JSON.stringify({
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol || "cliente"
    }));

    return { exito: true, mensaje: "Sesión iniciada correctamente." };
}

/**
 * Cierra la sesión actual
 */
function cerrarSesion() {
    localStorage.removeItem(CLAVE_SESION);
    window.location.href = "index.html";
}

/**
 * Devuelve el usuario en sesión, o null si no hay nadie logueado
 */
function obtenerSesion() {
    const datos = localStorage.getItem(CLAVE_SESION);
    return datos ? JSON.parse(datos) : null;
}

/**
 * Protege una página: si no hay sesión activa, redirige a login.html
 * Se llama al inicio de perfil.html
 */
function protegerPagina() {
    if (!obtenerSesion()) {
        window.location.href = "login.html";
    }
}

/**
 * Actualiza el navbar en TODAS las páginas para mostrar
 * "Iniciar sesión" o el nombre del usuario logueado + menú
 */
function actualizarNavbarAuth() {
    const contenedor = document.getElementById("nav-auth");
    if (!contenedor) return;

    const sesion = obtenerSesion();

    if (sesion) {
        contenedor.innerHTML = `
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle d-flex align-items-center gap-1" href="#" role="button" data-bs-toggle="dropdown">
                    <i class="bi bi-person-circle"></i> ${sesion.nombre.split(" ")[0]}
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="perfil.html"><i class="bi bi-person"></i> Mi perfil</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="cerrarSesion(); return false;"><i class="bi bi-box-arrow-right"></i> Cerrar sesión</a></li>
                </ul>
            </li>
        `;
    } else {
        contenedor.innerHTML = `
            <li class="nav-item">
                <a class="nav-link" href="login.html"><i class="bi bi-box-arrow-in-right"></i> Iniciar sesión</a>
            </li>
        `;
    }
}

document.addEventListener("DOMContentLoaded", actualizarNavbarAuth);

/* ============================================
   LÓGICA DE LA PÁGINA registro.html
   ============================================ */

function inicializarFormularioRegistro() {
    const form = document.getElementById("form-registro");
    if (!form) return; // No estamos en registro.html

    const campoNombre = document.getElementById("reg-nombre");
    const campoEmail = document.getElementById("reg-email");
    const campoPassword = document.getElementById("reg-password");
    const campoPassword2 = document.getElementById("reg-password2");
    const campoTerminos = document.getElementById("reg-terminos");
    const alertaError = document.getElementById("alerta-registro-error");
    const alertaExito = document.getElementById("alerta-registro-exito");
    const togglePassword = document.getElementById("toggle-reg-password");

    function marcarInvalido(campo, mensaje) {
        campo.classList.add("is-invalid");
        campo.classList.remove("is-valid");
        const errorEl = document.getElementById(`error-${campo.id}`);
        if (errorEl) errorEl.textContent = mensaje;
    }

    function marcarValido(campo) {
        campo.classList.remove("is-invalid");
        campo.classList.add("is-valid");
    }

    // Mostrar/ocultar contraseña
    togglePassword.addEventListener("click", () => {
        const esPassword = campoPassword.type === "password";
        campoPassword.type = esPassword ? "text" : "password";
        togglePassword.innerHTML = esPassword
            ? '<i class="bi bi-eye-slash"></i>'
            : '<i class="bi bi-eye"></i>';
    });

    // Requisitos de contraseña en tiempo real (efecto visual de "seguridad")
    campoPassword.addEventListener("input", () => {
        const valor = campoPassword.value;
        const tieneLongitud = valor.length >= 8;
        const tieneMayuscula = /[A-Z]/.test(valor);
        const tieneNumero = /[0-9]/.test(valor);

        actualizarRequisito("longitud", tieneLongitud);
        actualizarRequisito("mayuscula", tieneMayuscula);
        actualizarRequisito("numero", tieneNumero);
    });

    function actualizarRequisito(tipo, cumple) {
        const item = document.querySelector(`.req-item[data-req="${tipo}"]`);
        if (!item) return;
        const icono = item.querySelector("i");
        if (cumple) {
            item.classList.add("req-cumplido");
            icono.className = "bi bi-check-circle-fill";
        } else {
            item.classList.remove("req-cumplido");
            icono.className = "bi bi-circle";
        }
    }

    function validarNombre() {
        const valor = campoNombre.value.trim();
        if (valor.length < 3) {
            marcarInvalido(campoNombre, "Ingresa tu nombre completo.");
            return false;
        }
        marcarValido(campoNombre);
        return true;
    }

    function validarEmail() {
        const valor = campoEmail.value.trim();
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexEmail.test(valor)) {
            marcarInvalido(campoEmail, "Ingresa un correo electrónico válido.");
            return false;
        }
        marcarValido(campoEmail);
        return true;
    }

    function validarPassword() {
        const valor = campoPassword.value;
        const cumpleTodo = valor.length >= 8 && /[A-Z]/.test(valor) && /[0-9]/.test(valor);
        if (!cumpleTodo) {
            marcarInvalido(campoPassword, "La contraseña no cumple los requisitos mínimos.");
            return false;
        }
        marcarValido(campoPassword);
        return true;
    }

    function validarPassword2() {
        if (campoPassword2.value !== campoPassword.value || campoPassword2.value === "") {
            marcarInvalido(campoPassword2, "Las contraseñas no coinciden.");
            return false;
        }
        marcarValido(campoPassword2);
        return true;
    }

    function validarTerminos() {
        if (!campoTerminos.checked) {
            campoTerminos.classList.add("is-invalid");
            document.getElementById("error-reg-terminos").textContent = "Debes aceptar el aviso de privacidad para continuar.";
            return false;
        }
        campoTerminos.classList.remove("is-invalid");
        return true;
    }

    campoNombre.addEventListener("input", validarNombre);
    campoEmail.addEventListener("input", validarEmail);
    campoPassword2.addEventListener("input", validarPassword2);
    campoTerminos.addEventListener("change", validarTerminos);

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        alertaError.classList.add("d-none");

        const nombreValido = validarNombre();
        const emailValido = validarEmail();
        const passwordValido = validarPassword();
        const password2Valido = validarPassword2();
        const terminosValidos = validarTerminos();

        if (!(nombreValido && emailValido && passwordValido && password2Valido && terminosValidos)) {
            return;
        }

        const resultado = registrarUsuario(campoNombre.value, campoEmail.value, campoPassword.value);

        if (!resultado.exito) {
            alertaError.textContent = resultado.mensaje;
            alertaError.classList.remove("d-none");
            return;
        }

        alertaExito.classList.remove("d-none");
        form.reset();
        form.classList.add("d-none");

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1800);
    });
}

document.addEventListener("DOMContentLoaded", inicializarFormularioRegistro);
/* ============================================
   LÓGICA DE LA PÁGINA login.html
   ============================================ */

function inicializarFormularioLogin() {
    const form = document.getElementById("form-login");
    if (!form) return; // No estamos en login.html

    const campoEmail = document.getElementById("login-email");
    const campoPassword = document.getElementById("login-password");
    const alertaError = document.getElementById("alerta-login-error");
    const togglePassword = document.getElementById("toggle-login-password");
    const btnRecuperar = document.getElementById("btn-enviar-recuperacion");

    function marcarInvalido(campo, mensaje) {
        campo.classList.add("is-invalid");
        campo.classList.remove("is-valid");
        const errorEl = document.getElementById(`error-${campo.id}`);
        if (errorEl) errorEl.textContent = mensaje;
    }

    function marcarValido(campo) {
        campo.classList.remove("is-invalid");
        campo.classList.add("is-valid");
    }

    togglePassword.addEventListener("click", () => {
        const esPassword = campoPassword.type === "password";
        campoPassword.type = esPassword ? "text" : "password";
        togglePassword.innerHTML = esPassword
            ? '<i class="bi bi-eye-slash"></i>'
            : '<i class="bi bi-eye"></i>';
    });

    function validarEmail() {
        const valor = campoEmail.value.trim();
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexEmail.test(valor)) {
            marcarInvalido(campoEmail, "Ingresa un correo electrónico válido.");
            return false;
        }
        marcarValido(campoEmail);
        return true;
    }

    function validarPassword() {
        if (campoPassword.value.trim() === "") {
            marcarInvalido(campoPassword, "Ingresa tu contraseña.");
            return false;
        }
        marcarValido(campoPassword);
        return true;
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        alertaError.classList.add("d-none");

        const emailValido = validarEmail();
        const passwordValido = validarPassword();
        if (!(emailValido && passwordValido)) return;

    const resultado = iniciarSesion(campoEmail.value, campoPassword.value);

        if (!resultado.exito) {
            alertaError.textContent = resultado.mensaje;
            alertaError.classList.remove("d-none");
            return;
        }

        const sesion = obtenerSesion();
        if (sesion && sesion.rol === "admin") {
            window.location.href = "admin.html";
        } else {
            window.location.href = "perfil.html";
        }   
    });

    // Simulación de "recuperar contraseña" (no manda correo real)
    if (btnRecuperar) {
        btnRecuperar.addEventListener("click", () => {
            const email = document.getElementById("recuperar-email").value.trim();
            const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!regexEmail.test(email)) {
                alert("Ingresa un correo válido.");
                return;
            }
            alert(`Si existe una cuenta con ${email}, recibirás instrucciones para recuperar tu contraseña.`);
            const modalEl = document.getElementById("modalRecuperar");
            bootstrap.Modal.getInstance(modalEl)?.hide();
        });
    }
}

document.addEventListener("DOMContentLoaded", inicializarFormularioLogin);

/* ============================================
   LÓGICA DE LA PÁGINA perfil.html
   ============================================ */

function inicializarPaginaPerfil() {
    const nombreEl = document.getElementById("perfil-nombre");
    if (!nombreEl) return; // No estamos en perfil.html

    protegerPagina(); // Redirige a login.html si no hay sesión

    const usuarios = obtenerUsuarios();
    const sesion = obtenerSesion();
    if (!sesion) return; // protegerPagina ya está redirigiendo

    const usuarioCompleto = usuarios.find(u => u.email === sesion.email);

    nombreEl.textContent = sesion.nombre;
    document.getElementById("perfil-email").textContent = sesion.email;

    if (usuarioCompleto) {
        const fecha = new Date(usuarioCompleto.fechaRegistro);
        document.getElementById("perfil-fecha").textContent = fecha.toLocaleDateString("es-MX", {
            year: "numeric", month: "long", day: "numeric"
        });
    }

    // aquí inicializamos las 4 pestañas nuevas del perfil
    cargarDatosPersonales(usuarioCompleto);
    inicializarFormularioDatos();
    inicializarFormularioPassword();
    inicializarDirecciones();
    renderizarPedidos();
}


document.addEventListener("DOMContentLoaded", inicializarPaginaPerfil);

/* ============================================
   PESTAÑA: MIS DATOS
   ============================================ */

function cargarDatosPersonales(usuario) {
    if (!usuario) return;
    document.getElementById("datos-nombre").value = usuario.nombre;
    document.getElementById("datos-email").value = usuario.email;
    document.getElementById("datos-telefono").value = usuario.telefono || "";
}

function inicializarFormularioDatos() {
    const form = document.getElementById("form-datos");
    if (!form) return;

    const campoNombre = document.getElementById("datos-nombre");
    const campoTelefono = document.getElementById("datos-telefono");
    const alertaExito = document.getElementById("alerta-datos-exito");

    function marcarInvalido(campo, mensaje) {
        campo.classList.add("is-invalid");
        campo.classList.remove("is-valid");
        document.getElementById(`error-${campo.id}`).textContent = mensaje;
    }
    function marcarValido(campo) {
        campo.classList.remove("is-invalid");
        campo.classList.add("is-valid");
    }

    function validarNombre() {
        if (campoNombre.value.trim().length < 3) {
            marcarInvalido(campoNombre, "Ingresa tu nombre completo.");
            return false;
        }
        marcarValido(campoNombre);
        return true;
    }

    // el teléfono aquí es opcional, pero si el usuario escribe algo, sí lo validamos
    function validarTelefono() {
        const valor = campoTelefono.value.trim();
        if (valor === "") {
            campoTelefono.classList.remove("is-invalid", "is-valid");
            return true;
        }
        if (!/^\d{10}$/.test(valor)) {
            marcarInvalido(campoTelefono, "El teléfono debe tener 10 dígitos.");
            return false;
        }
        marcarValido(campoTelefono);
        return true;
    }

    campoNombre.addEventListener("input", validarNombre);
    campoTelefono.addEventListener("input", validarTelefono);

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!(validarNombre() && validarTelefono())) return;

        const sesion = obtenerSesion();
        const usuarios = obtenerUsuarios();
        const usuario = usuarios.find(u => u.email === sesion.email);
        if (!usuario) return;

        usuario.nombre = campoNombre.value.trim();
        usuario.telefono = campoTelefono.value.trim();
        guardarUsuarios(usuarios);

        // actualizamos también la sesión activa, para que el navbar refleje el nombre nuevo
        localStorage.setItem(CLAVE_SESION, JSON.stringify({ nombre: usuario.nombre, email: usuario.email }));
        document.getElementById("perfil-nombre").textContent = usuario.nombre;
        actualizarNavbarAuth();

        alertaExito.classList.remove("d-none");
        setTimeout(() => alertaExito.classList.add("d-none"), 3500);
    });
}

/* ============================================
   PESTAÑA: CAMBIAR CONTRASEÑA
   ============================================ */

function inicializarFormularioPassword() {
    const form = document.getElementById("form-password");
    if (!form) return;

    const campoActual = document.getElementById("pass-actual");
    const campoNueva = document.getElementById("pass-nueva");
    const campoConfirmar = document.getElementById("pass-confirmar");
    const alertaError = document.getElementById("alerta-password-error");
    const alertaExito = document.getElementById("alerta-password-exito");

    function marcarInvalido(campo, mensaje) {
        campo.classList.add("is-invalid");
        campo.classList.remove("is-valid");
        document.getElementById(`error-${campo.id}`).textContent = mensaje;
    }
    function marcarValido(campo) {
        campo.classList.remove("is-invalid");
        campo.classList.add("is-valid");
    }

    // mismos requisitos visuales que usamos en registro.html, aquí con data-req-perfil
    campoNueva.addEventListener("input", () => {
        const valor = campoNueva.value;
        actualizarRequisitoPerfil("longitud", valor.length >= 8);
        actualizarRequisitoPerfil("mayuscula", /[A-Z]/.test(valor));
        actualizarRequisitoPerfil("numero", /[0-9]/.test(valor));
    });

    function actualizarRequisitoPerfil(tipo, cumple) {
        const item = document.querySelector(`.req-item[data-req-perfil="${tipo}"]`);
        if (!item) return;
        const icono = item.querySelector("i");
        if (cumple) {
            item.classList.add("req-cumplido");
            icono.className = "bi bi-check-circle-fill";
        } else {
            item.classList.remove("req-cumplido");
            icono.className = "bi bi-circle";
        }
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        alertaError.classList.add("d-none");

        const sesion = obtenerSesion();
        const usuarios = obtenerUsuarios();
        const usuario = usuarios.find(u => u.email === sesion.email);
        if (!usuario) return;

        let valido = true;

        if (ofuscarPassword(campoActual.value) !== usuario.password) {
            marcarInvalido(campoActual, "La contraseña actual no es correcta.");
            valido = false;
        } else {
            marcarValido(campoActual);
        }

        const nuevaValida = campoNueva.value.length >= 8 && /[A-Z]/.test(campoNueva.value) && /[0-9]/.test(campoNueva.value);
        if (!nuevaValida) {
            marcarInvalido(campoNueva, "La nueva contraseña no cumple los requisitos.");
            valido = false;
        } else {
            marcarValido(campoNueva);
        }

        if (campoConfirmar.value !== campoNueva.value || campoConfirmar.value === "") {
            marcarInvalido(campoConfirmar, "Las contraseñas no coinciden.");
            valido = false;
        } else {
            marcarValido(campoConfirmar);
        }

        if (!valido) return;

        usuario.password = ofuscarPassword(campoNueva.value);
        guardarUsuarios(usuarios);

        form.reset();
        [campoActual, campoNueva, campoConfirmar].forEach(c => c.classList.remove("is-valid", "is-invalid"));
        document.querySelectorAll(".req-item").forEach(item => {
            item.classList.remove("req-cumplido");
            item.querySelector("i").className = "bi bi-circle";
        });

        alertaExito.classList.remove("d-none");
        setTimeout(() => alertaExito.classList.add("d-none"), 3500);
    });
}

/* ============================================
   PESTAÑA: DIRECCIONES
   Se guardan todas juntas en LocalStorage, cada una
   con el correo del dueño para poder filtrarlas.
   ============================================ */

const CLAVE_DIRECCIONES = "patitasElRey_direcciones";

/**
 * Busca la ciudad/estado a partir de un código postal mexicano,
 * usando la API pública y gratuita de Zippopotam (sin necesidad de backend propio).
 * Rellena automáticamente el campo de ciudad indicado.
 */
async function buscarCiudadPorCP(cp, inputCiudadId, elementoEstadoId = null) {
    const inputCiudad = document.getElementById(inputCiudadId);
    if (!inputCiudad) return;

    try {
        const respuesta = await fetch(`https://api.zippopotam.us/mx/${cp}`);
        if (!respuesta.ok) {
            throw new Error("C.P. no encontrado");
        }
        const datos = await respuesta.json();
        const lugar = datos.places[0];

        inputCiudad.value = lugar["place name"];
        inputCiudad.classList.remove("is-invalid");
        inputCiudad.classList.add("is-valid");

        if (elementoEstadoId) {
            const elementoEstado = document.getElementById(elementoEstadoId);
            if (elementoEstado) {
                elementoEstado.textContent = lugar["state"];
                elementoEstado.classList.remove("d-none");
            }
        }
    } catch (error) {
        // si el C.P. no existe o falla la conexión, dejamos que el usuario escriba manual
        inputCiudad.classList.remove("is-valid");
    }
}

function obtenerTodasLasDirecciones() {
    const datos = localStorage.getItem(CLAVE_DIRECCIONES);
    return datos ? JSON.parse(datos) : [];
}

function guardarTodasLasDirecciones(direcciones) {
    localStorage.setItem(CLAVE_DIRECCIONES, JSON.stringify(direcciones));
}

function inicializarDirecciones() {
    const contenedor = document.getElementById("contenedor-direcciones");
    if (!contenedor) return;

    renderizarDirecciones();

    // autocompletar ciudad al escribir el C.P. en el modal de nueva dirección
    const inputCpDireccion = document.getElementById("dir-cp");
    if (inputCpDireccion) {
        inputCpDireccion.addEventListener("input", () => {
            const valor = inputCpDireccion.value.trim();
            if (valor.length === 5) {
                buscarCiudadPorCP(valor, "dir-ciudad");
            }
        });
    }

    const btnGuardar = document.getElementById("btn-guardar-direccion");
    btnGuardar.addEventListener("click", () => {
        const etiqueta = document.getElementById("dir-etiqueta").value;
        const calle = document.getElementById("dir-calle");
        const colonia = document.getElementById("dir-colonia");
        const ciudad = document.getElementById("dir-ciudad");
        const cp = document.getElementById("dir-cp");
        const alertaError = document.getElementById("alerta-direccion-error");

        let valido = true;
        [calle, colonia, ciudad].forEach(campo => {
            if (campo.value.trim() === "") {
                campo.classList.add("is-invalid");
                document.getElementById(`error-${campo.id}`).textContent = "Este campo es obligatorio.";
                valido = false;
            } else {
                campo.classList.remove("is-invalid");
            }
        });

        if (!/^\d{5}$/.test(cp.value.trim())) {
            cp.classList.add("is-invalid");
            document.getElementById("error-dir-cp").textContent = "El código postal debe tener 5 dígitos.";
            valido = false;
        } else {
            cp.classList.remove("is-invalid");
        }

        if (!valido) {
            alertaError.textContent = "Revisa los campos marcados en rojo.";
            alertaError.classList.remove("d-none");
            return;
        }
        alertaError.classList.add("d-none");

        const sesion = obtenerSesion();
        const direcciones = obtenerTodasLasDirecciones();
        direcciones.push({
            id: Date.now(),
            email: sesion.email,
            etiqueta,
            calle: calle.value.trim(),
            colonia: colonia.value.trim(),
            ciudad: ciudad.value.trim(),
            cp: cp.value.trim()
        });
        guardarTodasLasDirecciones(direcciones);
        renderizarDirecciones();

        document.getElementById("form-direccion").reset();
        [calle, colonia, ciudad, cp].forEach(c => c.classList.remove("is-invalid"));

        const modalEl = document.getElementById("modalDireccion");
        bootstrap.Modal.getInstance(modalEl)?.hide();
    });
}

function renderizarDirecciones() {
    const contenedor = document.getElementById("contenedor-direcciones");
    const vacio = document.getElementById("direcciones-vacio");
    if (!contenedor) return;

    const sesion = obtenerSesion();
    const direcciones = obtenerTodasLasDirecciones().filter(d => d.email === sesion.email);

    if (direcciones.length === 0) {
        contenedor.innerHTML = "";
        vacio.classList.remove("d-none");
        return;
    }
    vacio.classList.add("d-none");

    contenedor.innerHTML = direcciones.map(d => `
        <div class="direccion-card">
            <div>
                <span class="direccion-etiqueta">${d.etiqueta}</span>
                <p class="mb-0 fw-semibold">${d.calle}, ${d.colonia}</p>
                <p class="mb-0 text-muted small">${d.ciudad}, C.P. ${d.cp}</p>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="eliminarDireccion(${d.id})">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `).join("");
}

function eliminarDireccion(id) {
    let direcciones = obtenerTodasLasDirecciones();
    direcciones = direcciones.filter(d => d.id !== id);
    guardarTodasLasDirecciones(direcciones);
    renderizarDirecciones();
}
/* ============================================
   PESTAÑA: MIS PEDIDOS
   Lee lo que carrito.js va guardando en patitasElRey_pedidos
   y muestra solo los del usuario en sesión.
   ============================================ */

function renderizarPedidos() {
    const contenedorTab = document.getElementById("tab-pedidos");
    if (!contenedorTab) return;

    const sesion = obtenerSesion();
    const datos = localStorage.getItem("patitasElRey_pedidos");
    const todosLosPedidos = datos ? JSON.parse(datos) : [];
    const misPedidos = todosLosPedidos
        .filter(p => p.email === sesion.email)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // el más reciente primero

    const card = contenedorTab.querySelector(".card");

    if (misPedidos.length === 0) {
        card.innerHTML = `
            <h5 class="fw-bold mb-3"><i class="bi bi-bag-heart text-brand"></i> Mis pedidos</h5>
            <div class="text-center py-4 text-muted">
                <i class="bi bi-inboxes display-4"></i>
                <p class="mt-2 mb-0">Aún no tienes pedidos registrados.</p>
                <a href="productos.html" class="btn btn-brand mt-3">Ir a comprar</a>
            </div>
        `;
        return;
    }

    card.innerHTML = `
        <h5 class="fw-bold mb-4"><i class="bi bi-bag-heart text-brand"></i> Mis pedidos</h5>
        ${misPedidos.map(pedido => `
            <div class="pedido-card">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <p class="mb-0 fw-bold">Pedido #${pedido.folio}</p>
                        <p class="mb-0 text-muted small">${new Date(pedido.fecha).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                    <span class="badge-pedido">Registrado</span>
                </div>
                <ul class="list-unstyled small text-muted mb-2">
                    ${pedido.productos.map(prod => `<li>${prod.cantidad}x ${prod.nombre}</li>`).join("")}
                </ul>
                <p class="mb-0 text-end fw-bold text-brand">$${pedido.total.toFixed(2)} MXN</p>
            </div>
        `).join("")}
    `;
}

/* ============================================
   PANEL DE ADMINISTRADOR (nuevo)
   Todo lo de aquí abajo es aditivo, no modifica
   nada del flujo de clientes normales.
   ============================================ */

/**
 * Crea la cuenta de administrador de ejemplo la primera vez
 * que se carga el sitio, si todavía no existe.
 * Usuario: admin@patitaselrey.com / Contraseña: Admin1234
 */
function sembrarAdminInicial() {
    const usuarios = obtenerUsuarios();
    const existeAdmin = usuarios.some(u => u.email === "admin@patitaselrey.com");
    if (existeAdmin) return;

    usuarios.push({
        nombre: "Administrador",
        email: "admin@patitaselrey.com",
        password: ofuscarPassword("Admin1234"),
        rol: "admin",
        fechaRegistro: new Date().toISOString()
    });
    guardarUsuarios(usuarios);
}
document.addEventListener("DOMContentLoaded", sembrarAdminInicial);

/**
 * Protege admin.html: si no hay sesión o el usuario no es admin,
 * lo regresamos al inicio. Un cliente normal jamás debe poder
 * quedarse aquí aunque escriba la URL directo.
 */
function protegerPaginaAdmin() {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== "admin") {
        window.location.href = "index.html";
    }
}

/**
 * Calcula las métricas del dashboard leyendo lo que ya existe
 * en localStorage (usuarios y pedidos), sin tocar esas claves.
 */
function inicializarDashboardAdmin() {
    const contenedor = document.getElementById("admin-dashboard");
    if (!contenedor) return; // no estamos en admin.html

    protegerPaginaAdmin();
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== "admin") return;

    document.getElementById("admin-nombre").textContent = sesion.nombre;

    const usuarios = obtenerUsuarios();
    const pedidos = JSON.parse(localStorage.getItem("patitasElRey_pedidos") || "[]");

    const totalVentas = pedidos.reduce((sum, p) => sum + p.total, 0);
    const totalClientes = usuarios.filter(u => u.rol !== "admin").length;

    // contamos cuántas piezas se han vendido de cada producto para saber el más popular
    const conteoProductos = {};
    pedidos.forEach(pedido => {
        pedido.productos.forEach(prod => {
            conteoProductos[prod.nombre] = (conteoProductos[prod.nombre] || 0) + prod.cantidad;
        });
    });
    let productoTop = "Sin ventas aún";
    let maxCantidad = 0;
    for (const nombre in conteoProductos) {
        if (conteoProductos[nombre] > maxCantidad) {
            maxCantidad = conteoProductos[nombre];
            productoTop = nombre;
        }
    }

    document.getElementById("admin-total-ventas").textContent = `$${totalVentas.toFixed(2)} MXN`;
    document.getElementById("admin-total-pedidos").textContent = pedidos.length;
    document.getElementById("admin-total-clientes").textContent = totalClientes;
    document.getElementById("admin-producto-top").textContent = productoTop;
}
document.addEventListener("DOMContentLoaded", inicializarDashboardAdmin);

/* ============================================
   ADMIN: GESTIÓN DE PEDIDOS
   Muestra TODOS los pedidos (de todos los clientes),
   a diferencia de perfil.html que solo muestra los
   del usuario en sesión.
   ============================================ */

function inicializarPedidosAdmin() {
    const contenedor = document.getElementById("admin-pedidos-page");
    if (!contenedor) return; // no estamos en admin-pedidos.html

    protegerPaginaAdmin();
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== "admin") return;

    renderizarPedidosAdmin();
}
document.addEventListener("DOMContentLoaded", inicializarPedidosAdmin);

function renderizarPedidosAdmin() {
    const contenedor = document.getElementById("contenedor-pedidos-admin");
    const vacio = document.getElementById("pedidos-admin-vacio");
    if (!contenedor) return;

    const pedidos = JSON.parse(localStorage.getItem("patitasElRey_pedidos") || "[]");
    const usuarios = obtenerUsuarios();

    if (pedidos.length === 0) {
        contenedor.innerHTML = "";
        vacio.classList.remove("d-none");
        return;
    }
    vacio.classList.add("d-none");

    // más reciente primero
    const ordenados = [...pedidos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    contenedor.innerHTML = ordenados.map(pedido => {
        const cliente = usuarios.find(u => u.email === pedido.email);
        const nombreCliente = cliente ? cliente.nombre : pedido.email;
        const estadoActual = pedido.estado || "Pendiente";

        return `
            <div class="pedido-admin-card">
                <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                    <div>
                        <p class="mb-0 fw-bold">Pedido #${pedido.folio}</p>
                        <p class="mb-0 text-muted small">
                            <i class="bi bi-person"></i> ${nombreCliente} &nbsp;•&nbsp;
                            ${new Date(pedido.fecha).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                    </div>
                    <span class="badge-estado badge-estado-${estadoActual.toLowerCase()}">${estadoActual}</span>
                </div>

                <ul class="list-unstyled small text-muted mb-2">
                    ${pedido.productos.map(prod => `<li>${prod.cantidad}x ${prod.nombre}</li>`).join("")}
                </ul>

                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <p class="mb-0 fw-bold text-brand">$${pedido.total.toFixed(2)} MXN</p>
                    <select class="form-select form-select-sm w-auto" onchange="cambiarEstadoPedido('${pedido.folio}', this.value)">
                        <option value="Pendiente" ${estadoActual === "Pendiente" ? "selected" : ""}>Pendiente</option>
                        <option value="Enviado" ${estadoActual === "Enviado" ? "selected" : ""}>Enviado</option>
                        <option value="Entregado" ${estadoActual === "Entregado" ? "selected" : ""}>Entregado</option>
                    </select>
                </div>
            </div>
        `;
    }).join("");
}

function cambiarEstadoPedido(folio, nuevoEstado) {
    const pedidos = JSON.parse(localStorage.getItem("patitasElRey_pedidos") || "[]");
    const pedido = pedidos.find(p => p.folio === folio.replace("#", ""));
    if (!pedido) return;

    pedido.estado = nuevoEstado;
    localStorage.setItem("patitasElRey_pedidos", JSON.stringify(pedidos));

    renderizarPedidosAdmin();
    mostrarToast(`Pedido #${folio} actualizado a "${nuevoEstado}"`, "exito");
}

/* ============================================
   ADMIN: GESTIÓN DE PRODUCTOS
   Usa las mismas funciones obtenerProductos() /
   guardarProductos() de script.js, así que cualquier
   cambio aquí se refleja automático en todo el sitio.
   ============================================ */

function inicializarProductosAdmin() {
    const contenedor = document.getElementById("admin-productos-page");
    if (!contenedor) return; // no estamos en admin-productos.html

    protegerPaginaAdmin();
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== "admin") return;

    renderizarProductosAdmin();

    document.getElementById("btn-guardar-producto").addEventListener("click", guardarProductoDesdeModal);
}
document.addEventListener("DOMContentLoaded", inicializarProductosAdmin);

function renderizarProductosAdmin() {
    const contenedor = document.getElementById("contenedor-productos-admin");
    if (!contenedor) return;

    const productos = obtenerProductos();

    contenedor.innerHTML = productos.map(p => `
        <div class="col-lg-3 col-md-6">
            <div class="card producto-card position-relative">
                ${p.destacado ? '<span class="badge-destacado"><i class="bi bi-star-fill"></i> Más vendido</span>' : ""}
                <div class="producto-img-wrap">
                    <img src="${p.imagen}" alt="${p.nombre}">
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${p.nombre}</h5>
                    <p class="card-text text-muted small flex-grow-1">${p.descripcion}</p>
                    <p class="producto-precio mb-3">$${p.precio.toFixed(2)} MXN</p>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-brand flex-grow-1" onclick="abrirModalEditarProducto(${p.id})">
                            <i class="bi bi-pencil"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarProductoAdmin(${p.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join("");
}

function abrirModalNuevoProducto() {
    document.getElementById("modalProductoTitulo").innerHTML = '<i class="bi bi-box-seam text-brand"></i> Nuevo producto';
    document.getElementById("form-producto").reset();
    document.getElementById("prod-id").value = "";
    document.querySelectorAll("#form-producto .is-invalid").forEach(c => c.classList.remove("is-invalid"));
}

function abrirModalEditarProducto(id) {
    const producto = obtenerProductos().find(p => p.id === id);
    if (!producto) return;

    document.getElementById("modalProductoTitulo").innerHTML = '<i class="bi bi-pencil text-brand"></i> Editar producto';
    document.getElementById("prod-id").value = producto.id;
    document.getElementById("prod-nombre").value = producto.nombre;
    document.getElementById("prod-descripcion").value = producto.descripcion;
    document.getElementById("prod-precio").value = producto.precio;
    document.getElementById("prod-imagen").value = producto.imagen;
    document.getElementById("prod-destacado").checked = !!producto.destacado;

    const modal = new bootstrap.Modal(document.getElementById("modalProducto"));
    modal.show();
}

function guardarProductoDesdeModal() {
    const idEl = document.getElementById("prod-id");
    const nombreEl = document.getElementById("prod-nombre");
    const descripcionEl = document.getElementById("prod-descripcion");
    const precioEl = document.getElementById("prod-precio");
    const imagenEl = document.getElementById("prod-imagen");
    const destacadoEl = document.getElementById("prod-destacado");
    const alertaError = document.getElementById("alerta-producto-error");

    let valido = true;
    [nombreEl, descripcionEl, imagenEl].forEach(campo => {
        if (campo.value.trim() === "") {
            campo.classList.add("is-invalid");
            document.getElementById(`error-${campo.id}`).textContent = "Este campo es obligatorio.";
            valido = false;
        } else {
            campo.classList.remove("is-invalid");
        }
    });
    if (!precioEl.value || Number(precioEl.value) <= 0) {
        precioEl.classList.add("is-invalid");
        document.getElementById("error-prod-precio").textContent = "Ingresa un precio válido.";
        valido = false;
    } else {
        precioEl.classList.remove("is-invalid");
    }

    if (!valido) {
        alertaError.textContent = "Revisa los campos marcados en rojo.";
        alertaError.classList.remove("d-none");
        return;
    }
    alertaError.classList.add("d-none");

    const productos = obtenerProductos();

    if (idEl.value) {
        // edición de uno que ya existía
        const producto = productos.find(p => p.id === Number(idEl.value));
        producto.nombre = nombreEl.value.trim();
        producto.descripcion = descripcionEl.value.trim();
        producto.precio = Number(precioEl.value);
        producto.imagen = imagenEl.value.trim();
        producto.destacado = destacadoEl.checked;
    } else {
        // producto nuevo
        productos.push({
            id: Date.now(),
            nombre: nombreEl.value.trim(),
            descripcion: descripcionEl.value.trim(),
            precio: Number(precioEl.value),
            imagen: imagenEl.value.trim(),
            destacado: destacadoEl.checked
        });
    }

    guardarProductos(productos);
    renderizarProductosAdmin();

    const modalEl = document.getElementById("modalProducto");
    bootstrap.Modal.getInstance(modalEl)?.hide();
    mostrarToast("Producto guardado correctamente", "exito");
}

function eliminarProductoAdmin(id) {
    if (!confirm("¿Seguro que quieres eliminar este producto? Esta acción no se puede deshacer.")) return;

    let productos = obtenerProductos();
    productos = productos.filter(p => p.id !== id);
    guardarProductos(productos);
    renderizarProductosAdmin();
    mostrarToast("Producto eliminado", "info");
}
