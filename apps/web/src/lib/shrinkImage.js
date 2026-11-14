// Make a photo sensible to upload from a phone: no larger than 1600px on its
// longest side, re-encoded as JPEG.
//
// A phone photo is often 4000px and 5–10 MB, which is slow over mobile data
// and far more than a card or a hero banner needs. iPhones also hand over HEIC,
// which most browsers (and so most people looking at the event) cannot show;
// the iOS WebView can decode it, so redrawing it to a canvas converts it.
//
// Anything that cannot be decoded here — HEIC on desktop Chrome, an odd format —
// is returned unchanged, and the upload still works as before.

const MAX_SIDE = 1600
const QUALITY = 0.85

export async function shrinkImage(file) {
  if (!file?.type?.startsWith('image/') || file.type === 'image/gif') return file

  let bitmap
  try {
    // 'from-image' applies the EXIF rotation, so portrait phone shots stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const smallEnough = scale === 1 && file.type === 'image/jpeg' && file.size < 1.5 * 1024 * 1024
  if (smallEnough) { bitmap.close?.(); return file }

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  // JPEG has no transparency; a PNG logo on black would otherwise go black.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
  if (!blob || blob.size >= file.size) return file

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
}
