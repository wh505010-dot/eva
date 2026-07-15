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
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: auto; background-color: #ffffff;">
            
            <!-- Encabezado con fondo café -->
            <div style="background-color: #6f4e37; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">🐾 Patitas El Rey</h1>
              <p style="color: #f5efe6; margin: 5px 0 0; font-size: 13px;">Premios 100% naturales</p>
            </div>

            <!-- Cuerpo -->
            <div style="padding: 30px 25px; background-color: #ffffff;">
              <p style="font-size: 16px; color: #333;">¡Hola <strong>${nombre}</strong>!</p>
              <p style="font-size: 15px; color: #555; line-height: 1.5;">
                Gracias por tu compra. Tu pedido fue registrado correctamente y ya lo estamos preparando.
              </p>

              <!-- Folio destacado -->
              <div style="background-color: #f5efe6; border-radius: 10px; padding: 14px 18px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; color: #6f4e37; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">NÚMERO DE PEDIDO</p>
                <p style="margin: 4px 0 0; color: #4a3323; font-size: 20px; font-weight: 700;">#${folio}</p>
              </div>

              <!-- Tabla de productos -->
              <p style="color: #4a3323; font-weight: 700; font-size: 15px; margin-bottom: 10px;">Resumen de tu pedido</p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                <thead>
                  <tr style="border-bottom: 2px solid #7a9d54;">
                    <th style="text-align: left; padding: 8px 4px; font-size: 13px; color: #6f4e37;">Producto</th>
                    <th style="text-align: center; padding: 8px 4px; font-size: 13px; color: #6f4e37;">Cant.</th>
                    <th style="text-align: right; padding: 8px 4px; font-size: 13px; color: #6f4e37;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${productos.map((p: any) => `
                    <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 8px 4px; font-size: 14px; color: #333;">${p.nombre}</td>
                      <td style="padding: 8px 4px; font-size: 14px; color: #333; text-align: center;">${p.cantidad}</td>
                      <td style="padding: 8px 4px; font-size: 14px; color: #333; text-align: right;">$${(p.precio * p.cantidad).toFixed(2)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>

              <!-- Total -->
              <div style="background-color: #eef5ee; border-radius: 10px; padding: 14px 18px; text-align: right; margin-bottom: 20px;">
                <p style="margin: 0; color: #2d5a2d; font-size: 18px; font-weight: 700;">Total: $${Number(total).toFixed(2)} MXN</p>
              </div>

             <p style="font-size: 13px; color: #888; line-height: 1.5;">
                Nos pondremos en contacto contigo para confirmar los detalles de tu envío. Si tienes alguna duda, puedes escribirnos a través del formulario de contacto en nuestro sitio.
              </p>
            </div>

            <!-- Pie -->
            <div style="background-color: #4a3323; padding: 18px 20px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="color: #f5efe6; margin: 0; font-size: 12px;">Patitas El Rey · Premios 100% naturales</p>
              <p style="color: #b0a494; margin: 4px 0 0; font-size: 11px;">Este es un correo automático, por favor no respondas directamente a esta dirección.</p>
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