import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const FOLDER = 'medicinaia'

// Siempre 'raw': preserva los bytes EXACTOS del archivo (sin recodificar).
// Importante para imágenes médicas — no perder fidelidad diagnóstica.
export function resourceTypeDe(_mime) {
  return 'raw'
}

// Sube un buffer como recurso AUTENTICADO (privado) y devuelve { public_id, resource_type, bytes }
export function subirArchivo(buffer, mime) {
  const resource_type = resourceTypeDe(mime)
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: FOLDER, resource_type, type: 'authenticated' },
        (err, result) => (err ? reject(err) : resolve({ public_id: result.public_id, resource_type, bytes: result.bytes })))
      .end(buffer)
  })
}

// URL firmada de corta vida para que el backend baje el archivo privado
export function urlFirmada(publicId, resourceType = 'image') {
  return cloudinary.url(publicId, {
    type: 'authenticated',
    resource_type: resourceType,
    sign_url: true,
    secure: true,
  })
}

// Baja el archivo privado y lo devuelve como Buffer (para mandarlo a Claude en base64)
export async function bajarArchivo(publicId, resourceType = 'image') {
  const url = urlFirmada(publicId, resourceType)
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Cloudinary ${r.status} al bajar ${publicId}`)
  return Buffer.from(await r.arrayBuffer())
}

export function borrarArchivo(publicId, resourceType = 'image') {
  return cloudinary.uploader.destroy(publicId, { type: 'authenticated', resource_type: resourceType })
}

export { cloudinary }
