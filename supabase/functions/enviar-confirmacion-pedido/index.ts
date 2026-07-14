// Edge Function: enviar-confirmacion-pedido
// Se llama desde el sitio justo cuando el cliente confirma su compra.
// Manda un correo con el resumen del pedido usando la API de Resend.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  // Permitir que el navegador (desde otro origen) pueda llamar esta función
  const headersCORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // El navegador manda una petición "preflight" antes de la real, hay que responderla
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: headersCORS });
  }

  try {
    const { email, nombre, folio, productos, total } = await req.json();

    // Armamos la lista de productos en HTML simple
    const listaProductosHTML = productos
      .map((p: any) => `<li>${p.cantidad}x ${p.nombre} - $${(p.precio * p.cantidad).toFixed(2)} MXN</li>`)
      .join("");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const respuestaResend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Patitas El Rey <onboarding@resend.dev>",
        to: [email],
        subject: `Confirmación de tu pedido #${folio} - Patitas El Rey`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
            <h2 style="color: #6f4e37;">¡Gracias por tu compra, ${nombre}!</h2>
            <p>Tu pedido <strong>#${folio}</strong> fue registrado correctamente.</p>
            <h3>Resumen de tu pedido:</h3>
            <ul>${listaProductosHTML}</ul>
            <p style="font-size: 1.2em;"><strong>Total: $${Number(total).toFixed(2)} MXN</strong></p>
            <p style="color: #888; font-size: 0.9em;">Nos pondremos en contacto contigo para confirmar tu envío.</p>
            <p style="color: #888; font-size: 0.85em;">Patitas El Rey - Premios 100% naturales</p>
          </div>
        `,
      }),
    });

    const data = await respuestaResend.json();

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...headersCORS, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...headersCORS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});