// Envío de WhatsApp vía UltraMsg
// Requiere en .env: ULTRAMSG_INSTANCE y ULTRAMSG_TOKEN
// Si no están configurados, la función simplemente no hace nada.

export async function sendWhatsApp(phone, message) {
  const instance = process.env.ULTRAMSG_INSTANCE
  const token    = process.env.ULTRAMSG_TOKEN

  if (!instance || !token) return  // WhatsApp no configurado, saltar silenciosamente

  // Normalizar teléfono: quitar espacios, guiones, paréntesis y agregar código de país si falta
  let numero = String(phone).replace(/[\s\-\(\)]/g, '')
  if (!numero.startsWith('+') && !numero.startsWith('54')) {
    numero = '54' + numero  // Argentina por defecto
  }
  numero = numero.replace(/^\+/, '')

  const body = new URLSearchParams({
    token,
    to:   numero,
    body: message,
  })

  const res = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`UltraMsg error ${res.status}: ${text}`)
  }

  return res.json()
}

export function whatsappConfigurado() {
  return !!(process.env.ULTRAMSG_INSTANCE && process.env.ULTRAMSG_TOKEN)
}
