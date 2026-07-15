/* ============================================
   PATITAS EL REY - auth.js
   Autenticación real con Supabase Auth
   ============================================ */

/**
 * Registra un nuevo usuario usando Supabase Auth.
 * El nombre y el rol se guardan como "metadata" del usuario.
 */
async function registrarUsuario(nombre, email, password) {
    const { data, error } = await supabaseClient.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
            data: { nombre: nombre.trim(), rol: "cliente" }
        }
    });

    if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
            return { exito: false, mensaje: "Ya existe una cuenta registrada con ese correo." };
        }
        return { exito: false, mensaje: error.message };
    }
    return { exito: true, mensaje: "Cuenta creada correctamente." };
}

/**
 * Inicia sesión con Supabase Auth.
 */
async function iniciarSesion(email, password) {
    const { error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
    });

    if (error) {
        return { exito: false, mensaje: "Correo o contraseña incorrectos." };
    }
    return { exito: true, mensaje: "Sesión iniciada correctamente." };
}

/**
 * Cierra la sesión actual
 */
async function cerrarSesion() {
    const sesion = await obtenerSesion();
    const eraAdmin = sesion && sesion.rol === "admin";

    await supabaseClient.auth.signOut();

    window.location.href = eraAdmin ? "admin-login.html" : "index.html";
}

/**
 * Devuelve el usuario en sesión (o null). Es async porque
 * Supabase revisa el token guardado antes de responder.
 */
async function obtenerSesion() {
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) return null;

    const user = data.session.user;
    const meta = user.user_metadata;

    // según cómo entró (correo normal o Google), el nombre viene en un campo distinto
    const nombreReal = meta.nombre || meta.full_name || meta.name || user.email;

    return {
        id: user.id,
        email: user.email,
        nombre: nombreReal,
        telefono: meta.telefono || "",
        rol: meta.rol || "cliente",
        fechaRegistro: user.created_at
    };
}

/**
 * Protege una página: si no hay sesión activa, redirige a login.html
 */
async function protegerPagina() {
    const sesion = await obtenerSesion();
    if (!sesion) {
        window.location.href = "login.html";
    }
    return sesion;
}

/**
 * Protege admin.html y páginas relacionadas
 */
async function protegerPaginaAdmin() {
    const sesion = await obtenerSesion();
    if (!sesion || sesion.rol !== "admin") {
        window.location.href = "index.html";
        return null;
    }
    return sesion;
}

/**
 * Actualiza el navbar mostrando "Iniciar sesión" o el nombre del usuario
 */
async function actualizarNavbarAuth() {
    const contenedor = document.getElementById("nav-auth");
    if (!contenedor) return;

    const sesion = await obtenerSesion();

    if (sesion && sesion.rol === "admin") {
        // el admin navegando el sitio público ve un acceso directo de vuelta a su panel
        contenedor.innerHTML = `
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle d-flex align-items-center gap-1" href="#" role="button" data-bs-toggle="dropdown">
                    <i class="bi bi-shield-check"></i> ${sesion.nombre.split(" ")[0]}
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="admin.html"><i class="bi bi-speedometer2"></i> Volver al panel</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="cerrarSesion(); return false;"><i class="bi bi-box-arrow-right"></i> Cerrar sesión</a></li>
                </ul>
            </li>
        `;
    } else if (sesion) {
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

    form.addEventListener("submit", async function (e) {
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

        const resultado = await registrarUsuario(campoNombre.value, campoEmail.value, campoPassword.value);
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

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        alertaError.classList.add("d-none");

        const emailValido = validarEmail();
        const passwordValido = validarPassword();
        if (!(emailValido && passwordValido)) return;

       const resultado = await iniciarSesion(campoEmail.value, campoPassword.value);

        if (!resultado.exito) {
            alertaError.textContent = resultado.mensaje;
            alertaError.classList.remove("d-none");
            return;
        }

        const sesion = await obtenerSesion();

        // el login normal es exclusivo para clientes; si es admin, lo rechazamos aquí
        if (sesion && sesion.rol === "admin") {
            await cerrarSesionSilenciosa();
            alertaError.textContent = "Este acceso es exclusivo para clientes.";
            alertaError.classList.remove("d-none");
            return;
        }

        window.location.href = "perfil.html";
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
async function inicializarPaginaPerfil() {
    const nombreEl = document.getElementById("perfil-nombre");
    if (!nombreEl) return; // No estamos en perfil.html

    const sesion = await protegerPagina(); // Redirige a login.html si no hay sesión
    if (!sesion) return;

    nombreEl.textContent = sesion.nombre;
    document.getElementById("perfil-email").textContent = sesion.email;

    const fecha = new Date(sesion.fechaRegistro);
    document.getElementById("perfil-fecha").textContent = fecha.toLocaleDateString("es-MX", {
        year: "numeric", month: "long", day: "numeric"
    });

    // aquí inicializamos las 4 pestañas del perfil
    cargarDatosPersonales(sesion);
    inicializarFormularioDatos();
    inicializarFormularioPassword();
    inicializarDirecciones();
    renderizarPedidos();
}

document.addEventListener("DOMContentLoaded", inicializarPaginaPerfil);

/* ============================================
   PESTAÑA: MIS DATOS
   ============================================ */

function cargarDatosPersonales(sesion) {
    if (!sesion) return;
    document.getElementById("datos-nombre").value = sesion.nombre;
    document.getElementById("datos-email").value = sesion.email;
    document.getElementById("datos-telefono").value = sesion.telefono || "";
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

  form.addEventListener("submit", async function (e) {
        e.preventDefault();
        if (!(validarNombre() && validarTelefono())) return;

        const { error } = await supabaseClient.auth.updateUser({
            data: {
                nombre: campoNombre.value.trim(),
                telefono: campoTelefono.value.trim()
            }
        });

        if (error) {
            mostrarToast("No se pudieron actualizar tus datos.", "error");
            return;
        }

        document.getElementById("perfil-nombre").textContent = campoNombre.value.trim();
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

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        alertaError.classList.add("d-none");

        const sesion = await obtenerSesion();
        if (!sesion) return;

        let valido = true;

        // confirmamos la contraseña actual re-autenticando contra Supabase
        const { error: errorReauth } = await supabaseClient.auth.signInWithPassword({
            email: sesion.email,
            password: campoActual.value
        });

        if (errorReauth) {
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

        const { error } = await supabaseClient.auth.updateUser({ password: campoNueva.value });
        if (error) {
            alertaError.textContent = "No se pudo actualizar la contraseña.";
            alertaError.classList.remove("d-none");
            return;
        }

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
   Ahora viven en Supabase, cada una ligada al
   user_id del dueño (protegido con RLS).
   ============================================ */

/**
 * Trae las direcciones del usuario en sesión, directo desde Supabase
 */
async function obtenerMisDirecciones() {
    const sesion = await obtenerSesion();
    if (!sesion) return [];

    const { data, error } = await supabaseClient
        .from("direcciones")
        .select("*")
        .eq("user_id", sesion.id)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error al leer direcciones:", error.message);
        return [];
    }
    return data;
}

/**
 * Busca la ciudad/estado a partir de un código postal mexicano,
 * usando la API pública y gratuita de Zippopotam.
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
        inputCiudad.classList.remove("is-valid");
    }
}

function inicializarDirecciones() {
    const contenedor = document.getElementById("contenedor-direcciones");
    if (!contenedor) return;

    renderizarDirecciones();

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
    btnGuardar.addEventListener("click", async () => {
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

        const sesion = await obtenerSesion();
        if (!sesion) return;

        const { error } = await supabaseClient.from("direcciones").insert([{
            user_id: sesion.id,
            etiqueta,
            calle: calle.value.trim(),
            colonia: colonia.value.trim(),
            ciudad: ciudad.value.trim(),
            cp: cp.value.trim()
        }]);

        if (error) {
            alertaError.textContent = "No se pudo guardar la dirección. Intenta de nuevo.";
            alertaError.classList.remove("d-none");
            return;
        }

        await renderizarDirecciones();

        document.getElementById("form-direccion").reset();
        [calle, colonia, ciudad, cp].forEach(c => c.classList.remove("is-invalid"));

        const modalEl = document.getElementById("modalDireccion");
        bootstrap.Modal.getInstance(modalEl)?.hide();
        mostrarToast("Dirección guardada correctamente", "exito");
    });
}

async function renderizarDirecciones() {
    const contenedor = document.getElementById("contenedor-direcciones");
    const vacio = document.getElementById("direcciones-vacio");
    if (!contenedor) return;

    const direcciones = await obtenerMisDirecciones();

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

async function eliminarDireccion(id) {
    const { error } = await supabaseClient.from("direcciones").delete().eq("id", id);
    if (error) {
        mostrarToast("No se pudo eliminar la dirección.", "error");
        return;
    }
    await renderizarDirecciones();
    mostrarToast("Dirección eliminada", "info");
}
/* ============================================
   PESTAÑA: MIS PEDIDOS
   Lee lo que carrito.js va guardando en patitasElRey_pedidos
   y muestra solo los del usuario en sesión.
   ============================================ */

async function renderizarPedidos() {
    const contenedorTab = document.getElementById("tab-pedidos");
    if (!contenedorTab) return;

    const sesion = await obtenerSesion();
    if (!sesion) return;

    const { data: misPedidos, error } = await supabaseClient
        .from("pedidos")
        .select("*")
        .eq("user_id", sesion.id)
        .order("created_at", { ascending: false });

    const card = contenedorTab.querySelector(".card");

    if (error) {
        console.error("Error al leer pedidos:", error.message);
        card.innerHTML = `<p class="text-danger">No se pudieron cargar tus pedidos.</p>`;
        return;
    }

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
                        <p class="mb-0 text-muted small">${new Date(pedido.created_at).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                    <span class="badge-pedido">${pedido.estado}</span>
                </div>
             <ul class="list-unstyled small text-muted mb-2">
                    ${pedido.productos.map(prod => `<li>${prod.cantidad}x ${prod.nombre}</li>`).join("")}
                </ul>
                <div class="d-flex justify-content-between align-items-center">
                    <a href="rastreo.html" class="btn btn-sm btn-outline-brand" onclick="localStorage.setItem('folioBusquedaRapida', '${pedido.folio}')">
                        <i class="bi bi-truck"></i> Rastrear
                    </a>
                    <p class="mb-0 fw-bold text-brand">$${Number(pedido.total).toFixed(2)} MXN</p>
                </div>
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
 * Calcula las métricas del dashboard leyendo lo que ya existe
 * en localStorage (usuarios y pedidos), sin tocar esas claves.
 */
async function inicializarDashboardAdmin() {
    const contenedor = document.getElementById("admin-dashboard");
    if (!contenedor) return; // no estamos en admin.html

    const sesion = await protegerPaginaAdmin();
    if (!sesion) return;

    document.getElementById("admin-nombre").textContent = sesion.nombre;

    const { data: pedidos, error } = await supabaseClient.from("pedidos").select("*");

    if (error) {
        console.error("Error al leer pedidos:", error.message);
        return;
    }

    const totalVentas = pedidos.reduce((sum, p) => sum + Number(p.total), 0);
    // contamos usuarios distintos que han comprado (proxy de clientes activos)
    const totalClientes = new Set(pedidos.map(p => p.user_id)).size;

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

async function inicializarPedidosAdmin() {
    const contenedor = document.getElementById("admin-pedidos-page");
    if (!contenedor) return; // no estamos en admin-pedidos.html

    const sesion = await protegerPaginaAdmin();
    if (!sesion) return;

    renderizarPedidosAdmin();
}
document.addEventListener("DOMContentLoaded", inicializarPedidosAdmin);

async function renderizarPedidosAdmin() {
    const contenedor = document.getElementById("contenedor-pedidos-admin");
    const vacio = document.getElementById("pedidos-admin-vacio");
    if (!contenedor) return;

    const { data: pedidos, error } = await supabaseClient
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false });

    // guardamos los pedidos en una variable global para poder generar el ticket sin pasar objetos complejos por HTML
    window.pedidosCache = pedidos || [];

    if (error) {
        console.error("Error al leer pedidos:", error.message);
        return;
    }

    if (pedidos.length === 0) {
        contenedor.innerHTML = "";
        vacio.classList.remove("d-none");
        return;
    }
    vacio.classList.add("d-none");

    contenedor.innerHTML = pedidos.map(pedido => {
        const estadoActual = pedido.estado || "Pendiente";

        return `
            <div class="pedido-admin-card">
                <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                    <div>
                        <p class="mb-0 fw-bold">Pedido #${pedido.folio}</p>
                        <p class="mb-0 text-muted small">
                            ${new Date(pedido.created_at).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                    </div>
                    <span class="badge-estado badge-estado-${claseEstado(estadoActual)}">${estadoActual}</span>
                </div>

                <ul class="list-unstyled small text-muted mb-2">
                    ${pedido.productos.map(prod => `<li>${prod.cantidad}x ${prod.nombre}</li>`).join("")}
                </ul>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <p class="mb-0 fw-bold text-brand">$${Number(pedido.total).toFixed(2)} MXN</p>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-brand" onclick="imprimirTicketPedido(${pedido.id})">
                            <i class="bi bi-printer"></i> Ticket
                        </button>
                        <select class="form-select form-select-sm w-auto" onchange="cambiarEstadoPedido(${pedido.id}, this.value)">
                            <option value="Pendiente" ${estadoActual === "Pendiente" ? "selected" : ""}>Pendiente</option>
                            <option value="En preparación" ${estadoActual === "En preparación" ? "selected" : ""}>En preparación</option>
                            <option value="Enviado" ${estadoActual === "Enviado" ? "selected" : ""}>Enviado</option>
                            <option value="Entregado" ${estadoActual === "Entregado" ? "selected" : ""}>Entregado</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}
async function cambiarEstadoPedido(idPedido, nuevoEstado) {
    const { error } = await supabaseClient
        .from("pedidos")
        .update({ estado: nuevoEstado })
        .eq("id", idPedido);

    if (error) {
        mostrarToast("No se pudo actualizar el estado.", "error");
        return;
    }

    // avisamos al cliente por correo solo si el nuevo estado es Enviado o Entregado
    if (nuevoEstado === "Enviado" || nuevoEstado === "Entregado") {
        const pedido = (window.pedidosCache || []).find(p => p.id === idPedido);
        if (pedido && pedido.cliente_email) {
            await supabaseClient.functions.invoke("notificar-cambio-estado", {
                body: {
                    email: pedido.cliente_email,
                    nombre: pedido.cliente_nombre || "cliente",
                    folio: pedido.folio,
                    nuevoEstado
                }
            });
        }
    }

    await renderizarPedidosAdmin();
    mostrarToast(`Pedido actualizado a "${nuevoEstado}"`, "exito");
}

/* ============================================
   ADMIN: GESTIÓN DE PRODUCTOS
   Usa las mismas funciones obtenerProductos() /
   guardarProductos() de script.js, así que cualquier
   cambio aquí se refleja automático en todo el sitio.
   ============================================ */

async function inicializarProductosAdmin() {
    const contenedor = document.getElementById("admin-productos-page");
    if (!contenedor) return; // no estamos en admin-productos.html

    const sesion = await protegerPaginaAdmin();
    if (!sesion) return;

    renderizarProductosAdmin();

    document.getElementById("btn-guardar-producto").addEventListener("click", guardarProductoDesdeModal);
}
document.addEventListener("DOMContentLoaded", inicializarProductosAdmin);

async function renderizarProductosAdmin() {
    const contenedor = document.getElementById("contenedor-productos-admin");
    if (!contenedor) return;

    const productos = await obtenerProductos();

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

async function abrirModalEditarProducto(id) {
    const productos = await obtenerProductos();
    const producto = productos.find(p => p.id === id);
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

async function guardarProductoDesdeModal() {
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

  const datosProducto = {
        nombre: nombreEl.value.trim(),
        descripcion: descripcionEl.value.trim(),
        precio: Number(precioEl.value),
        imagen: imagenEl.value.trim(),
        destacado: destacadoEl.checked
    };

    let resultado;
    if (idEl.value) {
        // edición de uno que ya existía
        resultado = await actualizarProducto(Number(idEl.value), datosProducto);
    } else {
        // producto nuevo
        resultado = await crearProducto(datosProducto);
    }

    if (!resultado.exito) {
        alertaError.textContent = "No se pudo guardar el producto. Intenta de nuevo.";
        alertaError.classList.remove("d-none");
        return;
    }

    await renderizarProductosAdmin();

    const modalEl = document.getElementById("modalProducto");
    bootstrap.Modal.getInstance(modalEl)?.hide();
    mostrarToast("Producto guardado correctamente", "exito");
}

async function eliminarProductoAdmin(id) {
    if (!confirm("¿Seguro que quieres eliminar este producto? Esta acción no se puede deshacer.")) return;

    const resultado = await eliminarProducto(id);
    if (!resultado.exito) {
        mostrarToast("No se pudo eliminar el producto.", "error");
        return;
    }

    await renderizarProductosAdmin();
    mostrarToast("Producto eliminado", "info");
}

/* ============================================
   LOGIN CON GOOGLE (a través de Supabase Auth)
   Supabase se encarga de todo el intercambio con
   Google; nosotros solo disparamos el proceso y
   dejamos que redirija de vuelta a nuestro sitio.
   ============================================ */

async function iniciarSesionConGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: window.location.origin + "/perfil.html",
            queryParams: {
                access_type: "offline",
                prompt: "consent"
            },
            scopes: "profile email"
        }
    });

    if (error) {
        mostrarToast("No se pudo iniciar sesión con Google.", "error");
        console.error("Error con Google Sign-In:", error.message);
    }
    // si no hay error, el navegador redirige automáticamente a Google,
    // no hay nada más que hacer aquí
}
/**
 * Cierra sesión sin redirigir - útil cuando queremos rechazar
 * a alguien silenciosamente y mostrar un mensaje en la misma página.
 */
async function cerrarSesionSilenciosa() {
    await supabaseClient.auth.signOut();
}
/* ============================================
   ADMIN: MENSAJES DE CONTACTO
   ============================================ */

async function inicializarMensajesAdmin() {
    const contenedor = document.getElementById("admin-mensajes-page");
    if (!contenedor) return; // no estamos en admin-mensajes.html

    const sesion = await protegerPaginaAdmin();
    if (!sesion) return;

    renderizarMensajesAdmin();
}
document.addEventListener("DOMContentLoaded", inicializarMensajesAdmin);

async function renderizarMensajesAdmin() {
    const contenedor = document.getElementById("contenedor-mensajes-admin");
    const vacio = document.getElementById("mensajes-admin-vacio");
    if (!contenedor) return;

    const { data: mensajes, error } = await supabaseClient
        .from("mensajes_contacto")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error al leer mensajes:", error.message);
        return;
    }

    window.mensajesCache = mensajes || [];

    if (mensajes.length === 0) {
        contenedor.innerHTML = "";
        vacio.classList.remove("d-none");
        return;
    }
    vacio.classList.add("d-none");

    contenedor.innerHTML = mensajes.map(msg => `
        <div class="mensaje-admin-card ${msg.leido ? "" : "mensaje-no-leido"}">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                <div>
                    <p class="mb-0 fw-bold">${msg.nombre}</p>
                    <p class="mb-0 text-muted small">
                        <i class="bi bi-envelope"></i> ${msg.email} &nbsp;•&nbsp;
                        <i class="bi bi-telephone"></i> ${msg.telefono} &nbsp;•&nbsp;
                        ${new Date(msg.created_at).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                </div>
                ${!msg.leido ? '<span class="badge-nuevo">Nuevo</span>' : ""}
            </div>
            <p class="mb-2 mensaje-texto">${msg.mensaje}</p>
           ${msg.respuesta ? `
                <div class="mensaje-respuesta-previa mb-2">
                    <p class="mb-1 small fw-bold text-brand"><i class="bi bi-reply-fill"></i> Tu respuesta:</p>
                    <p class="mb-0 small">${msg.respuesta}</p>
                </div>
            ` : ""}
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-brand" onclick="abrirModalResponder(${msg.id})">
                    <i class="bi bi-reply-fill"></i> ${msg.respuesta ? "Responder de nuevo" : "Responder"}
                </button>
                ${!msg.leido ? `<button class="btn btn-sm btn-outline-brand" onclick="marcarMensajeLeido(${msg.id})"><i class="bi bi-check2"></i> Marcar como leído</button>` : ""}
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarMensajeAdmin(${msg.id})"><i class="bi bi-trash"></i> Eliminar</button>
            </div>
        </div>
    `).join("");
}

async function marcarMensajeLeido(id) {
    const { error } = await supabaseClient.from("mensajes_contacto").update({ leido: true }).eq("id", id);
    if (error) {
        mostrarToast("No se pudo actualizar el mensaje.", "error");
        return;
    }
    await renderizarMensajesAdmin();
}

async function eliminarMensajeAdmin(id) {
    if (!confirm("¿Seguro que quieres eliminar este mensaje?")) return;

    const { error } = await supabaseClient.from("mensajes_contacto").delete().eq("id", id);
    if (error) {
        mostrarToast("No se pudo eliminar el mensaje.", "error");
        return;
    }
    await renderizarMensajesAdmin();
    mostrarToast("Mensaje eliminado", "info");
}
/**
 * Genera y descarga un ticket en PDF con los datos necesarios
 * para hacer la entrega del pedido (cliente, dirección, productos).
 */
function imprimirTicketPedido(idPedido) {
    const pedido = (window.pedidosCache || []).find(p => p.id === idPedido);
    if (!pedido) return;

    const { jsPDF } = window.jspdf;

    // ===== Paso 1: calculamos cuántas líneas va a ocupar cada sección variable =====
    // usamos un doc temporal solo para medir texto (splitTextToSize necesita un doc creado)
    const docTemporal = new jsPDF({ unit: "mm", format: [80, 150] });
    const anchoUtil = 72;

    docTemporal.setFontSize(6.5);
    const lineasDireccion = docTemporal.splitTextToSize(`Envio: ${pedido.direccion || "No especificada"}`, anchoUtil);

    let lineasProductosTotal = 0;
    pedido.productos.forEach(p => {
        const lineaProducto = `${p.cantidad}x ${p.nombre}`;
        lineasProductosTotal += docTemporal.splitTextToSize(lineaProducto, anchoUtil).length;
    });

    // ===== Paso 2: calculamos la altura total necesaria (en mm) =====
    // cada bloque suma su altura fija + la variable de sus líneas
    const alturaEncabezado = 8;          // logo + eslogan
    const alturaFolioFecha = 8;          // folio + fecha
    const alturaTituloCliente = 3.5;     // "DATOS DEL CLIENTE"
    const alturaNombreTel = 6;           // nombre + telefono
    const alturaDireccion = lineasDireccion.length * 3 + 2;
    const alturaTituloProductos = 3.5;
    const alturaProductos = lineasProductosTotal * 3 + 3;
    const alturaTotal = 4;
    const alturaPagoEstado = 6;
    const margenesYlineas = 25;          // espacio de las 4 líneas divisorias + margenes arriba/abajo

    const alturaCalculada =
        alturaEncabezado + alturaFolioFecha + alturaTituloCliente + alturaNombreTel +
        alturaDireccion + alturaTituloProductos + alturaProductos + alturaTotal +
        alturaPagoEstado + margenesYlineas;

    // mínimo 90mm para que nunca se vea demasiado apretado, sin máximo (crece libremente)
    const alturaFinal = Math.max(alturaCalculada, 90);

    // ===== Paso 3: creamos el PDF real con el tamaño ya calculado =====
    const doc = new jsPDF({ unit: "mm", format: [80, alturaFinal] });

    let y = 8;
    const margen = 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("PATITAS EL REY", 40, y, { align: "center" });
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("Premios 100% naturales", 40, y, { align: "center" });
    y += 4;

    doc.setLineWidth(0.1);
    doc.line(margen, y, 80 - margen, y);
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`Pedido #${pedido.folio}`, margen, y);
    y += 3.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(new Date(pedido.created_at).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }), margen, y);
    y += 4;

    doc.line(margen, y, 80 - margen, y);
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("DATOS DEL CLIENTE", margen, y);
    y += 3.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(`Nombre: ${pedido.cliente_nombre || "No disponible"}`, margen, y);
    y += 3;
    doc.text(`Tel: ${pedido.cliente_telefono || "No registrado"}`, margen, y);
    y += 3.5;

    doc.text(lineasDireccion, margen, y);
    y += lineasDireccion.length * 3 + 2;

    doc.line(margen, y, 80 - margen, y);
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("PRODUCTOS", margen, y);
    y += 3.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    pedido.productos.forEach(p => {
        const lineaProducto = `${p.cantidad}x ${p.nombre}`;
        const lineasSplit = doc.splitTextToSize(lineaProducto, anchoUtil);
        doc.text(lineasSplit, margen, y);
        y += lineasSplit.length * 3;
    });
    y += 3;

    doc.line(margen, y, 80 - margen, y);
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`TOTAL: $${Number(pedido.total).toFixed(2)} MXN`, margen, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(`Pago: ${pedido.metodo_pago || "No especificado"}`, margen, y);
    y += 3;
    doc.text(`Estado: ${pedido.estado}`, margen, y);

    doc.save(`ticket-pedido-${pedido.folio}.pdf`);
}
/**
 * Abre el modal para responder un mensaje de contacto específico.
 */
function abrirModalResponder(idMensaje) {
    const msg = (window.mensajesCache || []).find(m => m.id === idMensaje);
    if (!msg) return;

    document.getElementById("responder-id-mensaje").value = msg.id;
    document.getElementById("responder-destinatario").textContent = `${msg.nombre} (${msg.email})`;
    document.getElementById("responder-mensaje-original").textContent = msg.mensaje;
    document.getElementById("responder-texto").value = msg.respuesta || "";
    document.getElementById("alerta-responder-error").classList.add("d-none");

    const modal = new bootstrap.Modal(document.getElementById("modalResponderMensaje"));
    modal.show();
}

document.addEventListener("DOMContentLoaded", () => {
    const btnEnviarRespuesta = document.getElementById("btn-enviar-respuesta");
    if (!btnEnviarRespuesta) return; // no estamos en admin-mensajes.html

    btnEnviarRespuesta.addEventListener("click", async () => {
        const idMensaje = Number(document.getElementById("responder-id-mensaje").value);
        const respuesta = document.getElementById("responder-texto").value.trim();
        const alertaError = document.getElementById("alerta-responder-error");

        if (respuesta.length < 5) {
            alertaError.textContent = "Escribe una respuesta antes de enviar.";
            alertaError.classList.remove("d-none");
            return;
        }

        const msg = (window.mensajesCache || []).find(m => m.id === idMensaje);
        if (!msg) return;

        btnEnviarRespuesta.disabled = true;
        btnEnviarRespuesta.textContent = "Enviando...";

        const { error: errorCorreo } = await supabaseClient.functions.invoke("responder-mensaje", {
            body: {
                emailDestino: msg.email,
                nombreDestino: msg.nombre,
                mensajeOriginal: msg.mensaje,
                respuesta
            }
        });

        btnEnviarRespuesta.disabled = false;
        btnEnviarRespuesta.innerHTML = '<i class="bi bi-send"></i> Enviar respuesta';

        if (errorCorreo) {
            alertaError.textContent = "No se pudo enviar el correo. Intenta de nuevo.";
            alertaError.classList.remove("d-none");
            return;
        }

        // guardamos la respuesta en la base de datos como historial, y marcamos leído
        const { error: errorGuardar } = await supabaseClient
            .from("mensajes_contacto")
            .update({
                respuesta,
                respondido_en: new Date().toISOString(),
                leido: true
            })
            .eq("id", idMensaje);

        if (errorGuardar) {
            console.error("El correo se envió pero no se pudo guardar el historial:", errorGuardar.message);
        }

        const modalEl = document.getElementById("modalResponderMensaje");
        bootstrap.Modal.getInstance(modalEl)?.hide();

        await renderizarMensajesAdmin();
        mostrarToast("Respuesta enviada y guardada correctamente", "exito");
    });
});
/**
 * Convierte el texto de un estado (ej "En preparación") en una
 * clase CSS válida (ej "en-preparacion"), sin espacios ni acentos.
 */
function claseEstado(estado) {
    return estado
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
        .replace(/\s+/g, "-"); // espacios por guiones
}