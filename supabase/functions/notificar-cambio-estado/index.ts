// Edge Function: notificar-cambio-estado
// Se llama desde el panel admin cuando cambia el estado de un pedido
// (Pendiente -> Enviado -> Entregado). Manda un correo al cliente avisándole.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  const headersCORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: headersCORS });
  }

  try {
    const { email, nombre, folio, nuevoEstado } = await req.json();

    const textosPorEstado: Record<string, { titulo: string; mensaje: string; color: string; emoji: string }> = {
      Enviado: {
        titulo: "¡Tu pedido va en camino!",
        mensaje: "Tu pedido salió de nuestras instalaciones y va rumbo a tu domicilio.",
        color: "#2d5f9a",
        emoji: "🚚",
      },
      Entregado: {
        titulo: "¡Tu pedido fue entregado!",
        mensaje: "Tu pedido llegó a su destino. Esperamos que tu perro disfrute mucho sus premios.",
        color: "#2d7a3f",
        emoji: "✅",
      },
    };

    const textos = textosPorEstado[nuevoEstado] || {
      titulo: "Actualización de tu pedido",
      mensaje: `El estado de tu pedido cambió a: ${nuevoEstado}.`,
      color: "#6f4e37",
      emoji: "📦",
    };

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
        subject: `${textos.emoji} ${textos.titulo} - Pedido #${folio}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: auto; background-color: #ffffff;">
            <div style="background-color: #6f4e37; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">🐾 Patitas El Rey</h1>
              <p style="color: #f5efe6; margin: 5px 0 0; font-size: 13px;">Premios 100% naturales</p>
            </div>

            <div style="padding: 30px 25px; background-color: #ffffff;">
              <p style="font-size: 16px; color: #333;">¡Hola <strong>${nombre}</strong>!</p>

              <div style="background-color: ${textos.color}15; border-left: 4px solid ${textos.color}; border-radius: 8px; padding: 16px 18px; margin: 15px 0;">
                <p style="margin: 0; color: ${textos.color}; font-size: 17px; font-weight: 700;">${textos.emoji} ${textos.titulo}</p>
                <p style="margin: 6px 0 0; color: #555; font-size: 14px;">${textos.mensaje}</p>
              </div>

              <div style="background-color: #f5efe6; border-radius: 10px; padding: 14px 18px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; color: #6f4e37; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">NÚMERO DE PEDIDO</p>
                <p style="margin: 4px 0 0; color: #4a3323; font-size: 20px; font-weight: 700;">#${folio}</p>
              </div>

              <p style="font-size: 13px; color: #888; line-height: 1.5;">
                Puedes revisar el detalle completo de tu pedido en tu perfil dentro de nuestro sitio.
              </p>
            </div>

            <div style="background-color: #4a3323; padding: 18px 20px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="color: #f5efe6; margin: 0; font-size: 12px;">Patitas El Rey · Premios 100% naturales</p>
            </div>
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