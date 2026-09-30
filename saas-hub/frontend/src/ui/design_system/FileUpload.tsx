/**
 * ui/design_system/FileUpload.tsx
 * Zone d'upload d'image (logo…) avec aperçu — l'image est stockée EN BASE
 * (services/mediaApi → /api/media), plus de Cloudinary.
 * Consommé par : SchoolFormPage (logo), SiteSection (logo du site)
 */

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Spinner } from './Spinner';
import { uploadMedia, MEDIA_ACCEPT } from '../../services/mediaApi';

interface FileUploadProps {
  value:     string;
  onChange:  (url: string) => void;
  label?:    string;
  hint?:     string;
  optional?: boolean;
  /** Hauteur de l'aperçu de l'image */
  previewHeight?: number;
}

export function FileUpload({ value, onChange, label, hint, optional, previewHeight = 160 }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError('');
    setUploading(true);
    try {
      onChange(await uploadMedia(file));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          {label}
          {optional && <span className="ml-1 text-slate-400 font-normal normal-case">(optionnel)</span>}
        </label>
      )}

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50" style={{ height: previewHeight }}>
          <img src={value} alt="" className="w-full h-full object-contain" />
          <button
            type="button"
            onClick={() => onChange('')}
            title="Retirer l'image"
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-black/50 hover:bg-red-600 rounded-lg text-white transition-all"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <label
          className={[
            'flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all group',
            uploading
              ? 'border-primary-300 bg-primary-50/50'
              : 'border-slate-200 hover:border-primary-400 hover:bg-primary-50/30',
          ].join(' ')}
          onClick={e => { e.preventDefault(); if (!uploading) inputRef.current?.click(); }}
        >
          {uploading ? (
            <>
              <Spinner size="md" className="text-primary-500 mb-2" />
              <p className="text-sm font-medium text-primary-600">Upload en cours…</p>
            </>
          ) : (
            <>
              <Upload size={20} className="text-slate-400 group-hover:text-primary-500 mb-2 transition-colors" />
              <p className="text-sm font-medium text-slate-500 group-hover:text-primary-600 transition-colors">
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
        accept={MEDIA_ACCEPT}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
}
