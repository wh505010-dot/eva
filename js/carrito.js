/* ============================================
   PATITAS EL REY - carrito.js
   Carrito de compras funcional con LocalStorage
   ============================================ */
const CLAVE_CARRITO = "patitasElRey_carrito";

// Reglas de negocio del carrito (definidas aquí para poder ajustarlas fácil)
const TASA_IVA = 0.16;          // 16% como en México
const COSTO_ENVIO = 99;         // envío estándar
const MINIMO_ENVIO_GRATIS = 300; // arriba de este monto el envío ya no se cobra

/**
 * Obtiene el carrito guardado en LocalStorage (o un arreglo vacío si no hay nada)
 */
function obtenerCarrito() {
    const datos = localStorage.getItem(CLAVE_CARRITO);
    return datos ? JSON.parse(datos) : [];
}

/**
 * Guarda el carrito completo en LocalStorage
 */
function guardarCarrito(carrito) {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    actualizarContadorCarrito();
}

/**
 * Agrega un producto al carrito (o suma cantidad si ya existe)
 * Requiere que PRODUCTOS (definido en script.js) esté cargado en la página
 */
async function agregarAlCarrito(idProducto) {
    const productos = await obtenerProductos();
    const producto = productos.find(p => p.id === idProducto);
    if (!producto) return;
    const carrito = obtenerCarrito();
    const itemExistente = carrito.find(item => item.id === idProducto);

    if (itemExistente) {
        itemExistente.cantidad += 1;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen: producto.imagen,
            cantidad: 1
        });
    }

    guardarCarrito(carrito);
    mostrarNotificacionCarrito(producto.nombre);
}

/**
 * Elimina un producto del carrito por completo
 */
function eliminarDelCarrito(idProducto) {
    let carrito = obtenerCarrito();
    carrito = carrito.filter(item => item.id !== idProducto);
    guardarCarrito(carrito);
    renderizarCarrito();
}

/**
 * Cambia la cantidad de un producto (no deja bajar de 1)
 */
function cambiarCantidad(idProducto, delta) {
    const carrito = obtenerCarrito();
    const item = carrito.find(item => item.id === idProducto);
    if (!item) return;

    item.cantidad += delta;
    if (item.cantidad < 1) item.cantidad = 1;

    guardarCarrito(carrito);
    renderizarCarrito();
}

/**
 * Vacía el carrito completo
 */
function vaciarCarrito() {
    if (!confirm("¿Seguro que quieres vaciar tu carrito?")) return;
    localStorage.removeItem(CLAVE_CARRITO);
    actualizarContadorCarrito();
    renderizarCarrito();
}

/**
 * Actualiza el número que aparece en el badge del carrito (navbar), en TODAS las páginas
 */
function actualizarContadorCarrito() {
    const carrito = obtenerCarrito();
    const totalItems = carrito.reduce((total, item) => total + item.cantidad, 0);
    const badge = document.getElementById("contador-carrito");
    if (badge) {
        badge.textContent = totalItems;
    }
}

/**
 * Pequeña notificación tipo "toast" cuando agregas un producto
 */
function mostrarNotificacionCarrito(nombreProducto) {
    const toastExistente = document.getElementById("toast-carrito");
    if (toastExistente) toastExistente.remove();

    const toast = document.createElement("div");
    toast.id = "toast-carrito";
    toast.className = "toast-carrito-custom";
    toast.innerHTML = `<i class="bi bi-check-circle-fill"></i> "${nombreProducto}" agregado al carrito`;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("mostrar"), 10);
    setTimeout(() => {
        toast.classList.remove("mostrar");
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}


/**
 * Renderiza la tabla completa del carrito (solo se usa en carrito.html)
 */
function renderizarCarrito() {
    const contenedor = document.getElementById("contenedor-carrito");
    if (!contenedor) return; // No estamos en carrito.html

    const carrito = obtenerCarrito();
    const carritoVacio = document.getElementById("carrito-vacio");
    const carritoConItems = document.getElementById("carrito-con-items");

    if (carrito.length === 0) {
        carritoVacio.classList.remove("d-none");
        carritoConItems.classList.add("d-none");
        return;
    }

    carritoVacio.classList.add("d-none");
    carritoConItems.classList.remove("d-none");

    contenedor.innerHTML = carrito.map(item => `
        <div class="carrito-item d-flex align-items-center gap-3 py-3 border-bottom">
            <img src="${item.imagen}" alt="${item.nombre}" class="carrito-item-img">
            <div class="flex-grow-1">
                <h6 class="mb-1">${item.nombre}</h6>
                <p class="text-muted small mb-0">$${item.precio.toFixed(2)} MXN c/u</p>
            </div>
            <div class="d-flex align-items-center gap-2">
                <button class="btn btn-sm btn-outline-brand" onclick="cambiarCantidad(${item.id}, -1)">
                    <i class="bi bi-dash"></i>
                </button>
                <span class="fw-semibold">${item.cantidad}</span>
                <button class="btn btn-sm btn-outline-brand" onclick="cambiarCantidad(${item.id}, 1)">
                    <i class="bi bi-plus"></i>
                </button>
            </div>
            <div class="text-end" style="min-width: 90px;">
                <strong>$${(item.precio * item.cantidad).toFixed(2)}</strong>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="eliminarDelCarrito(${item.id})">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `).join("");

    calcularTotales(carrito);
}

/**
 * Calcula subtotal, IVA, envío y total, y los pinta en el resumen del pedido.
 * El envío se vuelve gratis pasando el mínimo definido arriba (MINIMO_ENVIO_GRATIS),
 * es una regla simple pero le da sentido de negocio real al cálculo.
 */
function calcularTotales(carrito) {
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const iva = subtotal * TASA_IVA;
    const envioGratis = subtotal >= MINIMO_ENVIO_GRATIS;
    const envio = envioGratis ? 0 : COSTO_ENVIO;
    const total = subtotal + iva + envio;

    document.getElementById("carrito-subtotal").textContent = `$${subtotal.toFixed(2)} MXN`;
    document.getElementById("carrito-iva").textContent = `$${iva.toFixed(2)} MXN`;
    document.getElementById("carrito-envio").textContent = envioGratis
        ? "Gratis"
        : `$${envio.toFixed(2)} MXN`;
    document.getElementById("carrito-total").textContent = `$${total.toFixed(2)} MXN`;

    // Mensaje motivacional si le falta poco para el envío gratis
    const avisoEnvio = document.getElementById("aviso-envio-gratis");
    if (avisoEnvio) {
        const faltante = MINIMO_ENVIO_GRATIS - subtotal;
        if (!envioGratis && faltante > 0 && faltante <= 150) {
            avisoEnvio.innerHTML = `<i class="bi bi-truck"></i> Agrega $${faltante.toFixed(2)} MXN más y tu envío es gratis`;
            avisoEnvio.classList.remove("d-none");
        } else {
            avisoEnvio.classList.add("d-none");
        }
    }
}



/**
 * Se ejecuta al dar clic en "Finalizar compra".
 * Exige sesión activa (así el pedido queda ligado a un usuario real
 * y puede aparecer después en la pestaña "Mis pedidos" del perfil).
 * Guarda el pedido completo en LocalStorage, muestra el modal de éxito
 * y vacía el carrito.
 */

async function finalizarCompra(datosPago = {}) {
    
    const carrito = obtenerCarrito();
    if (carrito.length === 0) return;

    const sesion = await obtenerSesion();
    if (!sesion) {
        mostrarNotificacionCarrito("Inicia sesión para finalizar tu compra");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1200);
        return;
    }

    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const iva = subtotal * TASA_IVA;
    const envioGratis = subtotal >= MINIMO_ENVIO_GRATIS;
    const envio = envioGratis ? 0 : COSTO_ENVIO;
    const total = subtotal + iva + envio;

    const folio = "PER-" + Date.now().toString().slice(-6);

    
    let metodoPagoCompleto = datosPago.metodoPago || "";
    if (datosPago.referenciaOxxo) {
        metodoPagoCompleto += ` - Referencia: ${datosPago.referenciaOxxo}`;
    }

    const { error } = await supabaseClient.from("pedidos").insert([{
        folio,
        user_id: sesion.id,
        productos: carrito,
        subtotal,
        iva,
        envio,
        total,
        estado: "Pendiente",
        direccion: datosPago.direccion || "",
        metodo_pago: metodoPagoCompleto
    }]);

    if (error) {
        console.error("Error al guardar el pedido:", error.message);
        mostrarToast("Ocurrió un error al registrar tu pedido. Intenta de nuevo.", "error");
        return;
    }
    if (error) {
        console.error("Error al guardar el pedido:", error.message);
        mostrarToast("Ocurrió un error al registrar tu pedido. Intenta de nuevo.", "error");
        return;
    }

    // disparamos el correo de confirmación (no bloqueamos la compra si esto falla)
    enviarCorreoConfirmacion(sesion, folio, carrito, total);

    document.getElementById("folio-compra").textContent = `#${folio}`;
   // pintamos el resumen de dirección/pago en el modal de éxito
    const resumenFinal = document.getElementById("checkout-resumen-final");
    if (resumenFinal) {
        let metodoTexto = datosPago.metodoPago || "";
        if (datosPago.tarjeta) metodoTexto += ` (terminación ${datosPago.tarjeta.ultimos4})`;

        let bloqueOxxo = "";
        if (datosPago.referenciaOxxo) {
            metodoTexto = `${metodoTexto} - Referencia: ${datosPago.referenciaOxxo}`;
            bloqueOxxo = `
                <p class="mb-0 small mt-2"><i class="bi bi-upc-scan text-brand"></i> <strong>Referencia OXXO:</strong> ${datosPago.referenciaOxxo}</p>
                <p class="mb-0 small text-muted">Tienes 48 horas para pagar en cualquier tienda OXXO.</p>
            `;
        }

        resumenFinal.innerHTML = `
            <p class="mb-1 small"><i class="bi bi-geo-alt text-brand"></i> <strong>Envío a:</strong> ${datosPago.direccion || "No especificada"}</p>
            <p class="mb-0 small"><i class="bi bi-wallet2 text-brand"></i> <strong>Pago:</strong> ${metodoTexto || "No especificado"}</p>
            ${bloqueOxxo}
        `;
    }

    const modal = new bootstrap.Modal(document.getElementById("modalCompraExitosa"));
    modal.show();

    localStorage.removeItem(CLAVE_CARRITO);
    actualizarContadorCarrito();
}
/**
 * Al cargar cualquier página:
 * - Actualiza el contador del navbar
 * - Si estamos en carrito.html, renderiza la tabla completa
 */
document.addEventListener("DOMContentLoaded", () => {
    actualizarContadorCarrito();
    renderizarCarrito();
});

/* ============================================
   CHECKOUT SIMULADO
   Recolecta dirección + método de pago antes de
   completar la compra. No procesa ningún cobro real,
   solo se ve y se siente como un checkout de verdad.
   ============================================ */

async function abrirCheckout() {
    const carrito = obtenerCarrito();
    if (carrito.length === 0) return;

    const sesion = await obtenerSesion();
    if (!sesion) {
        mostrarNotificacionCarrito("Inicia sesión para finalizar tu compra");
        setTimeout(() => { window.location.href = "login.html"; }, 1200);
        return;
    }

    
    // cargamos las direcciones guardadas del usuario (función que ya vive en auth.js)
    const direcciones = await obtenerMisDirecciones();
    const contenedorDirecciones = document.getElementById("checkout-direcciones-guardadas");
    const sinDirecciones = document.getElementById("checkout-sin-direcciones");

    if (direcciones.length > 0) {
        contenedorDirecciones.innerHTML = direcciones.map((d, index) => `
            <label class="checkout-direccion-item">
                <input type="radio" name="checkout-direccion" value="${d.id}" ${index === 0 ? "checked" : ""}>
                <span><strong>${d.etiqueta}</strong> - ${d.calle}, ${d.colonia}, ${d.ciudad}, C.P. ${d.cp}</span>
            </label>
        `).join("") + `
            <label class="checkout-direccion-item">
                <input type="radio" name="checkout-direccion" value="nueva">
                <span>Usar una dirección nueva</span>
            </label>
        `;
        sinDirecciones.classList.add("d-none");

        contenedorDirecciones.querySelectorAll('input[name="checkout-direccion"]').forEach(radio => {
            radio.addEventListener("change", () => {
                sinDirecciones.classList.toggle("d-none", radio.value !== "nueva");
            });
        });
    } else {
        contenedorDirecciones.innerHTML = "";
        sinDirecciones.classList.remove("d-none");
    }

   // reiniciamos el formulario de pago a su estado por default
    document.querySelector('input[name="metodo-pago"][value="Tarjeta"]').checked = true;
    document.getElementById("checkout-datos-oxxo").classList.add("d-none");
    document.getElementById("checkout-datos-tarjeta").classList.remove("d-none");
    document.getElementById("alerta-checkout-error").classList.add("d-none");
    const modal = new bootstrap.Modal(document.getElementById("modalCheckout"));
    modal.show();
}

document.addEventListener("DOMContentLoaded", () => {
    // mostrar/ocultar bloque de datos según el método de pago elegido
    document.querySelectorAll('input[name="metodo-pago"]').forEach(radio => {
        radio.addEventListener("change", () => {
            document.getElementById("checkout-datos-oxxo").classList.toggle("d-none", radio.value !== "Pago en OXXO");
            document.getElementById("checkout-datos-tarjeta").classList.toggle("d-none", radio.value !== "Tarjeta");
        });
    });

   // formato automático del número de tarjeta en grupos de 4 dígitos + detección de marca
    const inputTarjeta = document.getElementById("checkout-tarjeta-numero");
    if (inputTarjeta) {
        inputTarjeta.addEventListener("input", () => {
            const valor = inputTarjeta.value.replace(/\D/g, "").slice(0, 16);
            inputTarjeta.value = valor.replace(/(.{4})/g, "$1 ").trim();
            actualizarIconoMarcaTarjeta(valor);
        });
    }

    // formato automático MM/AA en el vencimiento
    const inputVenc = document.getElementById("checkout-tarjeta-venc");
    if (inputVenc) {
        inputVenc.addEventListener("input", () => {
            let valor = inputVenc.value.replace(/\D/g, "").slice(0, 4);
            if (valor.length >= 3) valor = valor.slice(0, 2) + "/" + valor.slice(2);
            inputVenc.value = valor;
        });
    }

    // el cvv solo acepta números
    const inputCvv = document.getElementById("checkout-tarjeta-cvv");
    if (inputCvv) {
        inputCvv.addEventListener("input", () => {
            inputCvv.value = inputCvv.value.replace(/\D/g, "");
        });
    }
    // autocompletar ciudad al escribir el C.P. en el checkout
    const inputCpCheckout = document.getElementById("checkout-cp");
    if (inputCpCheckout) {
        inputCpCheckout.addEventListener("input", () => {
            const valor = inputCpCheckout.value.trim();
            if (valor.length === 5) {
                buscarCiudadPorCP(valor, "checkout-ciudad");
            }
        });
    }
    const btnConfirmar = document.getElementById("btn-confirmar-checkout");
    if (btnConfirmar) {
        btnConfirmar.addEventListener("click", confirmarCheckout);
    }
});

async function confirmarCheckout() {
    const alertaError = document.getElementById("alerta-checkout-error");
alertaError.classList.add("d-none");

    // ===== validar dirección =====
    const direccionSeleccionada = document.querySelector('input[name="checkout-direccion"]:checked');
    let direccionTexto = "";

    if (!direccionSeleccionada || direccionSeleccionada.value === "nueva") {
        const calle = document.getElementById("checkout-calle").value.trim();
        const colonia = document.getElementById("checkout-colonia").value.trim();
        const ciudad = document.getElementById("checkout-ciudad").value.trim();
        const cp = document.getElementById("checkout-cp").value.trim();

        if (!calle || !colonia || !ciudad || !/^\d{5}$/.test(cp)) {
            document.getElementById("error-checkout-direccion").textContent = "Completa todos los campos (C.P. de 5 dígitos).";
            alertaError.textContent = "Revisa la dirección de envío.";
            alertaError.classList.remove("d-none");
            return;
        }
        direccionTexto = `${calle}, ${colonia}, ${ciudad}, C.P. ${cp}`;
    } else {
        const direcciones = await obtenerMisDirecciones();
        const dir = direcciones.find(d => String(d.id) === direccionSeleccionada.value);
        direccionTexto = `${dir.etiqueta}: ${dir.calle}, ${dir.colonia}, ${dir.ciudad}, C.P. ${dir.cp}`;
    }

   // ===== validar método de pago =====
    const metodoPago = document.querySelector('input[name="metodo-pago"]:checked').value;
    let datosTarjeta = null;
    let referenciaOxxo = null;

    if (metodoPago === "Pago en OXXO") {
        // generamos una referencia numérica simulada, como las que da OXXO Pay
        referenciaOxxo = Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join("");
    }

    if (metodoPago === "Tarjeta") {
        const numero = document.getElementById("checkout-tarjeta-numero").value.replace(/\s/g, "");
        const nombre = document.getElementById("checkout-tarjeta-nombre").value.trim();
        const venc = document.getElementById("checkout-tarjeta-venc").value;
        const cvv = document.getElementById("checkout-tarjeta-cvv").value;

        let valido = true;

        if (numero.length !== 16) {
            document.getElementById("checkout-tarjeta-numero").classList.add("is-invalid");
            document.getElementById("error-checkout-tarjeta-numero").textContent = "El número debe tener 16 dígitos.";
            valido = false;
        } else if (!validarLuhn(numero)) {
            document.getElementById("checkout-tarjeta-numero").classList.add("is-invalid");
            document.getElementById("error-checkout-tarjeta-numero").textContent = "El número de tarjeta no es válido.";
            valido = false;
        } else {
            document.getElementById("checkout-tarjeta-numero").classList.remove("is-invalid");
        }

        if (!nombre) {
            document.getElementById("checkout-tarjeta-nombre").classList.add("is-invalid");
            document.getElementById("error-checkout-tarjeta-nombre").textContent = "Ingresa el nombre en la tarjeta.";
            valido = false;
        } else {
            document.getElementById("checkout-tarjeta-nombre").classList.remove("is-invalid");
        }

        if (!/^\d{2}\/\d{2}$/.test(venc)) {
            document.getElementById("checkout-tarjeta-venc").classList.add("is-invalid");
            document.getElementById("error-checkout-tarjeta-venc").textContent = "Formato MM/AA.";
            valido = false;
        } else {
            document.getElementById("checkout-tarjeta-venc").classList.remove("is-invalid");
        }

        if (cvv.length < 3) {
            document.getElementById("checkout-tarjeta-cvv").classList.add("is-invalid");
            document.getElementById("error-checkout-tarjeta-cvv").textContent = "CVV inválido.";
            valido = false;
        } else {
            document.getElementById("checkout-tarjeta-cvv").classList.remove("is-invalid");
        }

        if (!valido) {
            alertaError.textContent = "Revisa los datos de la tarjeta.";
            alertaError.classList.remove("d-none");
            return;
        }
        datosTarjeta = { ultimos4: numero.slice(-4) };
    }

// todo validado: cerramos el checkout y completamos la compra
   
   // todo validado: cerramos el checkout y completamos la compra
    const modalCheckout = bootstrap.Modal.getInstance(document.getElementById("modalCheckout"));
    modalCheckout.hide();

    finalizarCompra({ direccion: direccionTexto, metodoPago, tarjeta: datosTarjeta, referenciaOxxo });
}
/**
 * Llama a la Edge Function de Supabase para mandar el correo
 * de confirmación de compra. Si falla, solo lo registramos en
 * consola - no debe impedir que la compra se complete.
 */
async function enviarCorreoConfirmacion(sesion, folio, productos, total) {
    try {
        const { error } = await supabaseClient.functions.invoke("enviar-confirmacion-pedido", {
            body: {
                email: sesion.email,
                nombre: sesion.nombre,
                folio,
                productos,
                total
            }
        });

        if (error) {
            console.error("No se pudo enviar el correo de confirmación:", error.message);
        }
    } catch (err) {
        console.error("Error al llamar la función de correo:", err);
    }
}

/**
 * Detecta la marca de la tarjeta según sus primeros dígitos
 * (los mismos rangos que usan los bancos reales) y actualiza el ícono.
 */
function actualizarIconoMarcaTarjeta(numero) {
    const contenedorIcono = document.getElementById("checkout-tarjeta-marca");
    if (!contenedorIcono) return;

    let marca = null;

    if (/^4/.test(numero)) {
        marca = "visa";
    } else if (/^(5[1-5]|22[2-9]|2[3-6]|27[01]|2720)/.test(numero)) {
        marca = "mastercard";
    } else if (/^3[47]/.test(numero)) {
        marca = "amex";
    }

    const iconos = {
        visa: '<i class="bi bi-credit-card-2-front-fill text-primary"></i> <small class="fw-bold text-primary">VISA</small>',
        mastercard: '<i class="bi bi-credit-card-2-front-fill text-danger"></i> <small class="fw-bold text-danger">Mastercard</small>',
        amex: '<i class="bi bi-credit-card-2-front-fill text-info"></i> <small class="fw-bold text-info">Amex</small>'
    };

    contenedorIcono.innerHTML = marca
        ? iconos[marca]
        : '<i class="bi bi-credit-card text-muted"></i>';
}

/**
 * Algoritmo de Luhn: el mismo checksum matemático que usan los bancos
 * para detectar si un número de tarjeta es matemáticamente válido.
 * No confirma que la tarjeta exista o tenga fondos, solo que el
 * número está bien formado según el estándar de la industria.
 */
function validarLuhn(numero) {
    let suma = 0;
    let alternar = false;

    for (let i = numero.length - 1; i >= 0; i--) {
        let digito = parseInt(numero.charAt(i), 10);

        if (alternar) {
            digito *= 2;
            if (digito > 9) digito -= 9;
        }

        suma += digito;
        alternar = !alternar;
    }

    return suma % 10 === 0;
}