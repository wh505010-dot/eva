/* ============================================
   CONEXIÓN A SUPABASE
   Este archivo crea el "cliente" que usamos en
   todo el sitio para hablar con la base de datos.
   ============================================ */

const SUPABASE_URL = "https://frfbwevvbwqhvdabitqy.supabase.co";
const SUPABASE_KEY = "sb_publishable_4wPiam7S4CP3P8PN5Rp1wA_49VqIv5a";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);