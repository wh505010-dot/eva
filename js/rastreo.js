/* ============================================
   PATITAS EL REY - rastreo.js
   Línea de tiempo visual del estatus de un pedido
   ============================================ */
document.addEventListener("DOMContentLoaded", () => {
    const btnBuscar = document.getElementById("btn-buscar-folio");
    if (!btnBuscar) return; // no estamos en rastreo.html

    btnBuscar.addEventListener("click", buscarPedidoPorFolio);

    document.getElementById("input-folio").addEventListener("keypress", (e) => {
        if (e.key === "Enter") buscarPedidoPorFolio();
    });

    // si venimos del botón "Rastrear" en Mis Pedidos, buscamos automático
    const folioGuardado = localStorage.getItem("folioBusquedaRapida");
    if (folioGuardado) {
        document.getElementById("input-folio").value = folioGuardado;
        localStorage.removeItem("folioBusquedaRapida");
        buscarPedidoPorFolio();
    }
});

  

async function buscarPedidoPorFolio() {
    const input = document.getElementById("input-folio");
    const alertaError = document.getElementById("alerta-rastreo-error");
    const resultado = document.getElementById("resultado-rastreo");

    const folio = input.value.trim().toUpperCase().replace("#", "");

    if (!folio) {
        alertaError.textContent = "Ingresa un número de folio.";
        alertaError.classList.remove("d-none");
        resultado.classList.add("d-none");
        return;
    }

    const { data, error } = await supabaseClient
        .from("pedidos")
        .select("*")
        .eq("folio", folio)
        .single();

    if (error || !data) {
        alertaError.textContent = "No encontramos ningún pedido con ese folio. Revisa que esté bien escrito.";
        alertaError.classList.remove("d-none");
        resultado.classList.add("d-none");
        return;
    }

    alertaError.classList.add("d-none");
    resultado.classList.remove("d-none");

    document.getElementById("rastreo-folio").textContent = `#${data.folio}`;
    document.getElementById("rastreo-fecha").textContent = new Date(data.created_at).toLocaleDateString("es-MX", {
        year: "numeric", month: "long", day: "numeric"
    });

    document.getElementById("rastreo-productos").innerHTML = data.productos
        .map(p => `<li>${p.cantidad}x ${p.nombre}</li>`)
        .join("");
    document.getElementById("rastreo-total").textContent = `Total: $${Number(data.total).toFixed(2)} MXN`;

    actualizarTimeline(data.estado);
}

/**
 * Marca visualmente hasta qué paso llegó el pedido según su estado real.
 * "Pendiente" = confirmado + en preparación
 * "Enviado" = + en camino
 * "Entregado" = + entregado
 */
function actualizarTimeline(estado) {
    console.log("VERSION NUEVA - estado recibido:", estado);
    const pasos = ["paso-confirmado", "paso-preparacion", "paso-enviado", "paso-entregado"];

    pasos.forEach(id => {
        document.getElementById(id).classList.remove("timeline-activo", "timeline-completado");
    });

    // ahora cada estado real corresponde exactamente a un paso de la línea de tiempo
    const ordenEstados = ["Pendiente", "En preparación", "Enviado", "Entregado"];
    const indiceActual = ordenEstados.indexOf(estado);
    const pasosCompletados = indiceActual + 1; // +1 porque "Pendiente" ya cubre "confirmado"

    pasos.forEach((id, index) => {
        const elemento = document.getElementById(id);

        if (estado === "Entregado") {
            elemento.classList.add("timeline-completado");
        } else if (index < pasosCompletados - 1) {
            elemento.classList.add("timeline-completado");
        } else if (index === pasosCompletados - 1) {
            elemento.classList.add("timeline-activo");
        }
    });
}