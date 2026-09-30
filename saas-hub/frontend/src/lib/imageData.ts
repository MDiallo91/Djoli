/**
 * lib/imageData.ts
 * Réduit une image (même origine) à une petite data URL JPEG sur fond blanc (le logo et
 * les armoiries sont toujours affichés dans un cadre blanc sur la carte).
 * Utilisé pour les cartes scolaires : le générateur PDF intègre l'image une fois
 * PAR CARTE — un logo de 200 Ko × 80 faces donnait des PDF de plus de 15 Mo.
 */
export async function shrinkImageToDataUrl(url: string, maxPx = 240): Promise<string> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Image illisible : ${url}`));
    img.src = url;
  });
  const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}
