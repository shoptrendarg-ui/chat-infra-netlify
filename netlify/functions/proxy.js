/**
 * proxy.js — Netlify Function
 * Proxy entre el frontend (index.html / panel_netlify.html) y Google Apps Script.
 *
 * ✅ NUEVO: Verifica token de Cloudflare Turnstile para acción "createTicket".
 *    Las demás acciones (login, listTickets, updateTicket, etc.) no requieren verificación.
 *
 * Secret Key de Turnstile: guardada en variable de entorno TURNSTILE_SECRET
 * (configurarla en Netlify → Site settings → Environment variables)
 */

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzZ3XAmopGRNX80MJw5R5rsp48662WjXjGie9t28tI5mlq-Ww5Y_SjXjQ5uJtGNGWg/exec";

// ── Secret key de Cloudflare Turnstile ──
// Se lee desde variable de entorno para no exponerla en el código.
// En Netlify: Site settings → Build & deploy → Environment → Add variable
//   TURNSTILE_SECRET = 0x4AAAAAACpsf2v_wX8P6Se84BbCDT151DE
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || "0x4AAAAAACpsf2v_wX8P6Se84BbCDT151DE";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

export async function handler(event) {

  /* ── CORS preflight ── */
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  try {
    const body    = event.body || "{}";
    const parsed  = JSON.parse(body);
    const action  = String(parsed.action || "").trim();

    /* ── Verificación Turnstile: solo para createTicket ── */
    if (action === "createTicket") {
      const tsToken = String((parsed.payload && parsed.payload.cfTurnstileToken) || "").trim();

      if (!tsToken) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          body: JSON.stringify({ ok: false, error: "Verificación de seguridad requerida. Completá el captcha antes de enviar." })
        };
      }

      // Verificar con la API de Cloudflare
      const cfVerify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(TURNSTILE_SECRET)}&response=${encodeURIComponent(tsToken)}`
      });

      const cfResult = await cfVerify.json();

      if (!cfResult.success) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          body: JSON.stringify({ ok: false, error: "Verificación de seguridad fallida. Recargá la página e intentá nuevamente." })
        };
      }

      // Token válido: limpiar del payload antes de enviar a Apps Script
      if (parsed.payload) {
        delete parsed.payload.cfTurnstileToken;
      }
    }

    /* ── Reenviar a Apps Script ── */
    const forwardBody = JSON.stringify(parsed);

    const resp = await fetch(APPS_SCRIPT_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    forwardBody
    });

    const text = await resp.text();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: text
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) })
    };
  }
}
