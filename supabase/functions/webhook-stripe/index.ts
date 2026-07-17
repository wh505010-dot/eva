// Edge Function: webhook-stripe
// Stripe llama esta función automáticamente cuando algo pasa con un pago
// (ej. se completó exitosamente). Verificamos que el mensaje sea auténtico
// antes de confiar en él, y solo entonces guardamos el pedido en la BD.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

  // el cliente de Supabase aquí usa la Service Role Key, que tiene permisos
  // totales - por eso este código SOLO vive en el backend, nunca en el navegador
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const firma = req.headers.get("Stripe-Signature");
  const cuerpoCrudo = await req.text();

  let evento;
  try {
    // esta verificación es LA PARTE CLAVE de seguridad: confirma que el
    // mensaje de verdad viene de Stripe, y no de alguien fingiendo un pago exitoso
    evento = await stripe.webhooks.constructEventAsync(cuerpoCrudo, firma!, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Firma inválida: ${err.message}`, { status: 400 });
  }

  if (evento.type === "checkout.session.completed") {
    const sesion = evento.data.object as any;

    const metadata = sesion.metadata;
    const productos = JSON.parse(metadata.productos);
    const subtotal = productos.reduce((sum: number, p: any) => sum + (p.precio * p.cantidad), 0);
    const iva = subtotal * 0.16;
    const envioGratis = subtotal >= 300;
    const envio = envioGratis ? 0 : 99;
    const total = subtotal + iva + envio;

 
    const folio = "PER-" + Date.now().toString().slice(-6);

    // obtenemos los datos del cliente ANTES de guardar el pedido, para incluirlos
    const { data: usuario } = await supabaseAdmin.auth.admin.getUserById(metadata.user_id);
    const nombreCliente = usuario?.user?.user_metadata?.nombre || usuario?.user?.email || "No disponible";
    const telefonoCliente = usuario?.user?.user_metadata?.telefono || "No registrado";
    const emailCliente = usuario?.user?.email || "";

    await supabaseAdmin.from("pedidos").insert([{
      folio,
      user_id: metadata.user_id,
      productos,
      subtotal,
      iva,
      envio,
      total,
      estado: "Pendiente",
      direccion: metadata.direccion,
      metodo_pago: "Tarjeta (Stripe)",
      negocio_id: metadata.negocio_id,
      stripe_session_id: sesion.id,
      cliente_nombre: nombreCliente,
      cliente_telefono: telefonoCliente,
      cliente_email: emailCliente
    }]);
await supabaseAdmin.from("pedidos").insert([{
      folio,
      user_id: metadata.user_id,
      productos,
      subtotal,
      iva,
      envio,
      total,
      estado: "Pendiente",
      direccion: metadata.direccion,
      metodo_pago: "Tarjeta (Stripe)",
      negocio_id: metadata.negocio_id,
      stripe_session_id: sesion.id,
      cliente_nombre: nombreCliente,
      cliente_telefono: telefonoCliente,
      cliente_email: emailCliente
    }]);

    // descontamos el stock de cada producto vendido, de forma segura
    for (const item of productos) {
      await supabaseAdmin.rpc("descontar_stock", {
        producto_id: item.id,
        cantidad_vendida: item.cantidad
      });
    }
    // enviamos el correo de confirmación
    if (usuario?.user) {
      await supabaseAdmin.functions.invoke("enviar-confirmacion-pedido", {
        body: {
          email: emailCliente,
          nombre: nombreCliente,
          folio,
          productos,
          total
        }
      });
    }

    await supabaseAdmin.from("pedidos").insert([{
      folio,
      user_id: metadata.user_id,
      productos,
      subtotal,
      iva,
      envio,
      total,
      estado: "Pendiente",
      direccion: metadata.direccion,
      metodo_pago: "Tarjeta (Stripe)",
      negocio_id: metadata.negocio_id,
      stripe_session_id: sesion.id,
      cliente_nombre: nombreCliente,
      cliente_telefono: telefonoCliente,
      cliente_email: emailCliente
    }]);

    // enviamos el correo de confirmación
    if (usuario?.user) {
      await supabaseAdmin.functions.invoke("enviar-confirmacion-pedido", {
        body: {
          email: emailCliente,
          nombre: nombreCliente,
          folio,
          productos,
          total
        }
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});