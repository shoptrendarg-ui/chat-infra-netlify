export async function handler(event) {
  try {
    // ✅ PEGÁ TU URL DE APPS SCRIPT /exec ACÁ:
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzZ3XAmopGRNX80MJw5R5rsp48662WjXjGie9t28tI5mlq-Ww5Y_SjXjQ5uJtGNGWg/exec";

    // Recibe lo que manda tu index.html
    const body = event.body || "{}";

    // Reenvía a Apps Script
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });

    const text = await resp.text();

    // ✅ Devuelve respuesta + CORS ok
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: text
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ ok:false, error: String(err && err.message ? err.message : err) })
    };
  }
}