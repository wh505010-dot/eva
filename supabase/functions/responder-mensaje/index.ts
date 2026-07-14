// Edge Function: responder-mensaje
// El admin la llama desde admin-mensajes.html para responder
// por correo a alguien que escribió por el formulario de contacto.

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
    const { emailDestino, nombreDestino, mensajeOriginal, respuesta } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const respuestaResend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Patitas El Rey <onboarding@resend.dev>",
        to: [emailDestino],
        subject: "Respuesta a tu mensaje - Patitas El Rey",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
            <h2 style="color: #6f4e37;">Hola ${nombreDestino},</h2>
            <p>Gracias por contactarnos. Aquí está nuestra respuesta a tu mensaje:</p>
            <div style="background: #f5efe6; padding: 15px; border-radius: 10px; margin: 15px 0;">
              ${respuesta.replace(/\n/g, "<br>")}
            </div>
            <p style="color: #888; font-size: 0.85em;">Tu mensaje original: "${mensajeOriginal}"</p>
            <p style="color: #888; font-size: 0.85em; margin-top: 20px;">Patitas El Rey - Premios 100% naturales</p>
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