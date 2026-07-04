/**
 * ui/design_system/FileUpload.tsx
 * Upload de fichier avec 3 modes : image (Cloudinary), document (Cloudinary), URL directe.
 * Fusionne : components/ui/DocumentUpload.tsx + ImageUpload.tsx + inline FileUpload (AdminDashboard:185)
 * Consommé par : SchoolFormPage (logo, RCCM), SiteSection (logo), AccueilSection (hero, features)
 */

import { useRef, useState } from 'react';
import { FileText, Upload, X, ExternalLink } from 'lucide-react';
import { Spinner } from './Spinner';
import apiClient from '../../lib/apiClient';

type UploadMode = 'image-cloudinary' | 'document-cloudinary' | 'url';

interface FileUploadProps {
  value:     string;
  onChange:  (url: string) => void;
  mode?:     UploadMode;
  label?:    string;
  hint?:     string;
  optional?: boolean;
  /** Dossier Cloudinary (requis pour mode image-cloudinary) */
  folder?:   string;
  /** Aperçu image avec ratio fixe */
  previewHeight?: number;
}

export function FileUpload({
  value, onChange, mode = 'image-cloudinary',
  label, hint, optional, folder = 'djoli/uploads',
  previewHeight = 160,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage   = value.startsWith('data:image') || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(value);
  const isDocument = !isImage && value.length > 0;

  const handleFile = async (file: File) => {
    setError('');

    if (mode === 'url') {
      // Lecture en base64 locale (pas d'upload)
      const reader = new FileReader();
      reader.onloadend = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
      return;
    }

    const isDoc = mode === 'document-cloudinary';

    if (isDoc) {
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowed.includes(file.type)) { setError('PDF ou image requis'); return; }
      if (file.size > 10 * 1024 * 1024) { setError('Max 10 Mo'); return; }
    } else {
      if (!file.type.startsWith('image/')) { setError('Fichier image requis'); return; }
      if (file.size > 5 * 1024 * 1024)   { setError('Max 5 Mo'); return; }
    }

    setUploading(true);
    try {
      const { data } = await apiClient.get('/upload/signature', { params: { folder } });
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', data.apiKey);
      form.append('timestamp', String(data.timestamp));
      form.append('signature', data.signature);
      form.append('folder', data.folder);

      const resourceType = isDoc ? data.resourceType ?? 'auto' : 'image';
      const endpoint = `https://api.cloudinary.com/v1_1/${data.cloudName}/${resourceType}/upload`;
      const res = await fetch(endpoint, { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Upload échoué');
      }
      const json = await res.json();
      onChange(json.secure_url);
    } catch (e: any) {
      setError(e?.message || 'Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const accept = mode === 'document-cloudinary' ? '.pdf,image/*' : 'image/*';

  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          {label}
          {optional && <span className="ml-1 text-slate-400 font-normal normal-case">(optionnel)</span>}
        </label>
      )}

      {value ? (
        // État : fichier chargé
        isImage ? (
          <div className="relative rounded-xl overflow-hidden border border-slate-200" style={{ height: previewHeight }}>
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-black/50 hover:bg-red-600 rounded-lg text-white transition-all"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-800 truncate">Document uploadé</p>
              <p className="text-xs text-emerald-600">Cloudinary</p>
            </div>
            <a href={value} target="_blank" rel="noopener noreferrer"
              className="p-1.5 text-emerald-500 hover:text-emerald-700 transition-colors">
              <ExternalLink size={15} />
            </a>
            <button type="button" onClick={() => onChange('')}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
              <X size={15} />
            </button>
          </div>
        )
      ) : (
        // État : zone de dépôt
        <label
          className={[
            'flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all group',
            uploading
              ? 'border-indigo-300 bg-indigo-50/50'
              : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30',
          ].join(' ')}
          onClick={e => { e.preventDefault(); inputRef.current?.click(); }}
        >
          {uploading ? (
            <>
              <Spinner size="md" className="text-indigo-500 mb-2" />
              <p className="text-sm font-medium text-indigo-600">Upload en cours…</p>
            </>
          ) : (
            <>
              <Upload size={20} className="text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors" />
              <p className="text-sm font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
                Cliquez pour uploader
              </p>
              {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
            </>
          )}
        </label>
      )}

      {error && <p className="text-[11px] text-red-500 font-medium mt-1">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
}
