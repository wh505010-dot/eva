// Edge Function: crear-sesion-pago
// Recibe el carrito y crea una Checkout Session de Stripe.
// Regresa la URL a la que hay que redirigir al cliente para pagar.

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
   const { productos, productosMetadata, userId, direccion, urlExito, urlCancelado } = await req.json();

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

    const lineItems = productos.map((p: any) => ({
      price_data: {
        currency: "mxn",
        product_data: {
          name: p.nombre,
        },
        unit_amount: Math.round(p.precio * 100),
      },
      quantity: p.cantidad,
    }));

    const body = new URLSearchParams();
    body.append("mode", "payment");
    body.append("success_url", urlExito);
    body.append("cancel_url", urlCancelado);

    lineItems.forEach((item: any, index: number) => {
      body.append(`line_items[${index}][price_data][currency]`, item.price_data.currency);
      body.append(`line_items[${index}][price_data][product_data][name]`, item.price_data.product_data.name);
      body.append(`line_items[${index}][price_data][unit_amount]`, String(item.price_data.unit_amount));
      body.append(`line_items[${index}][quantity]`, String(item.quantity));
    });

    body.append("metadata[user_id]", userId);
    body.append("metadata[direccion]", direccion);
    body.append("metadata[negocio_id]", "patitas-el-rey");
    body.append("metadata[productos]", JSON.stringify(productosMetadata));

    const respuestaStripe = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const sesion = await respuestaStripe.json();

    if (sesion.error) {
      return new Response(JSON.stringify({ success: false, error: sesion.error.message }), {
        headers: { ...headersCORS, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ success: true, url: sesion.url, sessionId: sesion.id }), {
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