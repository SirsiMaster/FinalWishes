/**
 * CameraCaptureButton — "Take Photo / Record Video" alongside the library picker.
 *
 * On phones/tablets the `capture` attribute opens the device camera directly; on
 * desktop the browser ignores `capture` and falls back to the file picker, so the
 * one button is safe on every platform. The captured File is handed back via
 * `onFile`, which callers route into the SAME upload path as their dropzone
 * (e.g. `onFile={(f) => onDrop([f])}`).
 */
import { useRef } from 'react';

interface CameraCaptureButtonProps {
  onFile: (file: File) => void;
  /** Allowed media. Default: photos + videos. Use 'image/*' for photo-only surfaces. */
  accept?: string;
  label?: string;
  className?: string;
}

export function CameraCaptureButton({
  onFile,
  accept = 'image/*,video/*',
  label = 'Take photo / video',
  className,
}: CameraCaptureButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={
          className ??
          'inline-flex items-center gap-2 rounded-full border border-[#133378]/20 bg-white px-4 py-2 text-xs font-semibold text-[#133378] transition-colors hover:bg-[#133378]/5'
        }
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        // `capture` makes mobile open the camera; desktop ignores it.
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          // reset so selecting the same capture again re-fires onChange
          e.target.value = '';
        }}
      />
    </>
  );
}
