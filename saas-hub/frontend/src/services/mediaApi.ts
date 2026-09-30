/**
 * services/mediaApi.ts
 * Upload d'images stockées EN BASE (backend routes/mediaRoute.ts) — il n'y a plus
 * de Cloudinary : site vitrine, logos d'école, photos d'élèves et du personnel.
 * Consommé par : AccueilSection, ui/ImageUpload, ui/design_system/FileUpload
 */

import apiClient from '../lib/apiClient';

/** Taille max acceptée par le backend (MEDIA_MAX_BYTES). */
export const MEDIA_MAX_BYTES = 3 * 1024 * 1024;
export const MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const MEDIA_ACCEPT = MEDIA_TYPES.join(',');

// Les photos de téléphone dépassent souvent 3 Mo / 4000 px : on les réduit avant
// l'envoi (plus léger en base et plus rapide à afficher). Le GIF est laissé tel quel
// (redessiner casserait l'animation) ; le PNG reste en PNG (transparence des logos).
const DEFAULT_MAX_DIMENSION = 1600;

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image illisible'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// WEBP converti en PNG : le générateur PDF des cartes scolaires (@react-pdf) ne lit
// que le PNG et le JPEG — un logo/une photo WEBP ferait échouer toute la génération.
const outputType = (type: string) => (type === 'image/webp' ? 'image/png' : type);

async function shrinkIfNeeded(file: File, maxDimension: number): Promise<Blob> {
  if (file.type === 'image/gif') return file;
  const img = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
  const convert = outputType(file.type) !== file.type;
  if (scale === 1 && !convert && file.size <= MEDIA_MAX_BYTES / 2) return file;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, outputType(file.type), 0.85));
  if (convert) { if (!blob) throw new Error("Conversion de l'image impossible"); return blob; }
  // Si la recompression n'apporte rien, on garde l'original
  return blob && blob.size < file.size ? blob : file;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const s = r.result as string; resolve(s.slice(s.indexOf(',') + 1)); };
    r.onerror = () => reject(new Error('Lecture du fichier impossible'));
    r.readAsDataURL(blob);
  });
}

/**
 * Envoie une image et retourne son URL (/api/media/<id>) à enregistrer
 * (réglage, logo, photo_url…). Nécessite d'être connecté (admin ou école).
 */
export async function uploadMedia(file: File, opts: { maxDimension?: number } = {}): Promise<string> {
  if (!MEDIA_TYPES.includes(file.type)) throw new Error('Image PNG, JPG, WEBP ou GIF requise');
  const blob = await shrinkIfNeeded(file, opts.maxDimension ?? DEFAULT_MAX_DIMENSION);
  if (blob.size > MEDIA_MAX_BYTES) throw new Error('Image trop volumineuse (3 Mo maximum)');
  const { data } = await apiClient.post<{ id: string; url: string }>('/media', {
    name: file.name, type: blob.type || file.type, data: await blobToBase64(blob),
  });
  return data.url;
}
