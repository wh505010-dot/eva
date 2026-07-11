/* ============================================
   PATITAS EL REY - script.js
   Data de productos + renderizado + buscador
   ============================================ */

// Estos son los productos de fábrica. Solo se usan la primera vez que
// se abre el sitio en un navegador nuevo, para "sembrar" el catálogo inicial.
// A partir de ahí, el admin puede editarlos y viven en localStorage.
const PRODUCTOS_INICIALES = [
    {
        id: 1,
        nombre: "Alitas Deshidratadas Chica (100g)",
        descripcion: "Bolsa de 100g ideal para perros pequeños o cachorros.",
        precio: 79,
        imagen: "img/producto-chica.jpg"
    },
    {
        id: 2,
        nombre: "Alitas Deshidratadas Mediana (250g)",
        descripcion: "Bolsa de 250g, la opción más popular para uso diario.",
        precio: 159,
        imagen: "img/producto-mediana.jpg",
        destacado: true
    },
    {
        id: 3,
        nombre: "Alitas Deshidratadas Grande (500g)",
        descripcion: "Bolsa de 500g, perfecta para perros grandes o varias mascotas.",
        precio: 289,
        imagen: "img/producto-grande.jpg"
    },
    {
        id: 4,
        nombre: "Combo Mix Premios (3 bolsas chicas)",
        descripcion: "Set de 3 bolsas chicas para probar y compartir.",
        precio: 219,
        imagen: "img/producto-combo.jpg"
    }
];

const CLAVE_PRODUCTOS = "patitasElRey_productos";

// crea el catálogo en localStorage la primera vez, si todavía no existe
function sembrarProductosIniciales() {
    const existentes = localStorage.getItem(CLAVE_PRODUCTOS);
    if (existentes) return; // ya hay productos guardados, no los pisamos
    localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(PRODUCTOS_INICIALES));
}

// de aquí en adelante, todo el sitio debe leer productos con esta función
function obtenerProductos() {
    const datos = localStorage.getItem(CLAVE_PRODUCTOS);
    return datos ? JSON.parse(datos) : PRODUCTOS_INICIALES;
}

function guardarProductos(productos) {
    localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(productos));
}

/**
 * Genera el HTML de una tarjeta de producto
 */
function crearTarjetaProducto(producto) {
    return `
        <div class="col-lg-3 col-md-6" data-nombre="${producto.nombre.toLowerCase()}">
            <div class="card producto-card">
        <div class="producto-img-wrap">
            <img src="${producto.imagen}" alt="${producto.nombre}">
        </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${producto.nombre}</h5>
                    <p class="card-text text-muted small flex-grow-1">${producto.descripcion}</p>
                    <p class="producto-precio mb-2">$${producto.precio.toFixed(2)} MXN</p>
                    <button class="btn btn-brand w-100" onclick="agregarAlCarrito(${producto.id})">
                        <i class="bi bi-cart-plus"></i> Agregar al carrito
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza todos los productos en un contenedor dado
 */
function renderizarProductos(contenedorId, listaProductos) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    if (listaProductos.length === 0) {
        contenedor.innerHTML = "";
        return;
    }
    contenedor.innerHTML = listaProductos.map(crearTarjetaProducto).join("");
}

/**
 * Lógica del buscador de productos (solo existe en productos.html)
 */
function inicializarBuscador() {
    const input = document.getElementById("buscador-productos");
    const sinResultados = document.getElementById("sin-resultados");
    if (!input) return; // No estamos en productos.html

    input.addEventListener("input", () => {
        const termino = input.value.trim().toLowerCase();
        const filtrados = obtenerProductos().filter(p =>
            p.nombre.toLowerCase().includes(termino)
        );
        renderizarProductos("contenedor-productos", filtrados);
        sinResultados.classList.toggle("d-none", filtrados.length > 0);
    });
}
/**
 * Al cargar cualquier página, decide qué renderizar según el contenedor presente
 */
document.addEventListener("DOMContentLoaded", () => {
    sembrarProductosIniciales();

    // Catálogo completo (productos.html)
    if (document.getElementById("contenedor-productos")) {
        renderizarProductos("contenedor-productos", obtenerProductos());
        inicializarBuscador();
    }

    // Destacados en home (index.html) - solo los primeros 4
    if (document.getElementById("contenedor-productos-home")) {
        renderizarProductos("contenedor-productos-home", obtenerProductos().slice(0, 4));
    }
});

/* ============================================
   VALIDACIÓN DEL FORMULARIO DE CONTACTO
   (contacto.html) - Sin envío a servidor
   ============================================ */

function inicializarFormularioContacto() {
    const form = document.getElementById("form-contacto");
    if (!form) return; // No estamos en contacto.html

    const campoNombre = document.getElementById("nombre");
    const campoEmail = document.getElementById("email");
    const campoTelefono = document.getElementById("telefono");
    const campoMensaje = document.getElementById("mensaje");
    const alertaExito = document.getElementById("alerta-exito");

    /**
     * Marca un campo como inválido y muestra su mensaje de error
     */
    function marcarInvalido(campo, mensaje) {
        campo.classList.add("is-invalid");
        campo.classList.remove("is-valid");
        document.getElementById(`error-${campo.id}`).textContent = mensaje;
    }

    /**
     * Marca un campo como válido
     */
    function marcarValido(campo) {
        campo.classList.remove("is-invalid");
        campo.classList.add("is-valid");
    }

    function validarNombre() {
        const valor = campoNombre.value.trim();
        if (valor.length < 3) {
            marcarInvalido(campoNombre, "El nombre debe tener al menos 3 caracteres.");
            return false;
        }
        // Solo letras y espacios (incluye acentos y ñ)
        const soloLetras = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
        if (!soloLetras.test(valor)) {
            marcarInvalido(campoNombre, "El nombre solo debe contener letras.");
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

    function validarTelefono() {
        const valor = campoTelefono.value.trim();
        const regexTelefono = /^\d{10}$/;
        if (!regexTelefono.test(valor)) {
            marcarInvalido(campoTelefono, "Ingresa un teléfono válido de 10 dígitos.");
            return false;
        }
        marcarValido(campoTelefono);
        return true;
    }

    function validarMensaje() {
        const valor = campoMensaje.value.trim();
        if (valor.length < 10) {
            marcarInvalido(campoMensaje, "El mensaje debe tener al menos 10 caracteres.");
            return false;
        }
        marcarValido(campoMensaje);
        return true;
    }

    // Validación en tiempo real mientras el usuario escribe
    campoNombre.addEventListener("input", validarNombre);
    campoEmail.addEventListener("input", validarEmail);
    campoTelefono.addEventListener("input", validarTelefono);
    campoMensaje.addEventListener("input", validarMensaje);

    // Validación al enviar el formulario
    form.addEventListener("submit", function (e) {
        e.preventDefault(); // Nunca se envía a ningún servidor

        const nombreValido = validarNombre();
        const emailValido = validarEmail();
        const telefonoValido = validarTelefono();
        const mensajeValido = validarMensaje();

        if (nombreValido && emailValido && telefonoValido && mensajeValido) {
            // Simulamos envío exitoso
            alertaExito.classList.remove("d-none");
            form.reset();
            // Quita las clases de validación visual después de resetear
            [campoNombre, campoEmail, campoTelefono, campoMensaje].forEach(campo => {
                campo.classList.remove("is-valid", "is-invalid");
            });

            // Oculta la alerta después de unos segundos
            setTimeout(() => alertaExito.classList.add("d-none"), 5000);
            alertaExito.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    });
}

// Se agrega esta llamada al DOMContentLoaded que ya existe (buscará el listener existente)
document.addEventListener("DOMContentLoaded", inicializarFormularioContacto);