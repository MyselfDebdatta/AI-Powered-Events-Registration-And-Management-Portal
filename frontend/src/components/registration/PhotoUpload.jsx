import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, Upload, X, RotateCcw, AlertCircle, ImagePlus, Info } from 'lucide-react'
import Button from '../ui/Button'
import { cn } from '../../lib/cn'

/**
 * PhotoUpload — drag/drop + file picker + device camera photo input.
 *
 * Requirements from React-Registration-Planning.md §2.1–§2.2:
 * - File picker, drag-and-drop, and device camera where available
 * - Preview, remove and re-upload
 * - One-face/quality guidance shown before submission
 * - 44px touch targets, keyboard accessible
 */

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_SIZE_MB = 10
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

function validatePhoto(file) {
  if (!file) return 'A photo is required.'
  if (file.size > MAX_SIZE_BYTES) return `Photo must be under ${MAX_SIZE_MB} MB.`
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Only JPEG, PNG or WebP photos are accepted.'
  }
  return null
}

export function PhotoUpload({
  value,
  onChange,
  error,
  disabled = false,
  id,
}) {
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const dropZoneRef = useRef(null)

  const [preview, setPreview] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [stream, setStream] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState(null)

  // If value is set externally (e.g. from draft), create a preview
  useEffect(() => {
    if (value && !preview) {
      setPreview(URL.createObjectURL(value))
    }
  }, [value, preview])

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  // ─── File selection ─────────────────────────────────────────────────

  const handleFile = useCallback(
    (file) => {
      setLocalError(null)
      setCameraError(null)

      const err = validatePhoto(file)
      if (err) {
        setLocalError(err)
        return
      }

      if (preview) URL.revokeObjectURL(preview)
      setPreview(URL.createObjectURL(file))
      onChange?.(file)
    },
    [preview, onChange]
  )

  const handleFileInput = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      // Reset input so the same file can be re-selected
      e.target.value = ''
    },
    [handleFile]
  )

  // ─── Drag and drop ─────────────────────────────────────────────────

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      setDragging(false)
      if (disabled) return
      const file = e.dataTransfer?.files?.[0]
      if (file) handleFile(file)
    },
    [disabled, handleFile]
  )

  // ─── Camera ─────────────────────────────────────────────────────────

  const hasCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  const startCamera = useCallback(async () => {
    setCameraError(null)
    setLocalError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      })
      setStream(s)
      setCameraActive(true)
      // Wait a tick for the video element to mount
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s
        }
      })
    } catch {
      setCameraError('Camera access denied. Please allow camera permissions or upload a photo instead.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      setStream(null)
    }
    setCameraActive(false)
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    // Use the actual video dimensions for a quality capture
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
          handleFile(file)
          stopCamera()
        }
      },
      'image/jpeg',
      0.92
    )
  }, [handleFile, stopCamera])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [stream])

  // ─── Remove photo ───────────────────────────────────────────────────

  const removePhoto = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setLocalError(null)
    onChange?.(null)
  }, [preview, onChange])

  // ─── Display error ──────────────────────────────────────────────────
  const displayError = error || localError || cameraError

  // ─── Preview state ──────────────────────────────────────────────────

  if (preview && value) {
    return (
      <div className="w-full">
        <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-md border border-border bg-paper">
          <img
            src={preview}
            alt="Preview of your selection"
            className="aspect-square w-full object-cover"
          />
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-teal-600">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full bg-teal-500"
              />
              Photo selected
            </p>
            <button
              type="button"
              onClick={removePhoto}
              disabled={disabled}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900 disabled:opacity-50"
              aria-label="Remove photo"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
        {displayError && (
          <p className="mt-2 flex items-start gap-1 text-xs text-status-danger" role="alert">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {displayError}
          </p>
        )}
      </div>
    )
  }

  // ─── Camera active ──────────────────────────────────────────────────

  if (cameraActive) {
    return (
      <div className="w-full space-y-3">
        <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-md border-2 border-ink-900 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-square w-full object-cover"
            aria-label="Camera viewfinder"
          />
          {/* Face guide overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="h-3/5 w-3/5 rounded-full border-2 border-dashed border-white/40" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            onClick={capturePhoto}
            className="min-h-[44px]"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            Capture
          </Button>
          <Button type="button" variant="secondary" onClick={stopCamera} className="min-h-[44px]">
            Cancel
          </Button>
        </div>
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      </div>
    )
  }

  // ─── Upload zone ────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {/* Drag/drop zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors',
          dragging
            ? 'border-ink-900 bg-sand-100'
            : displayError
              ? 'border-red-600/40 bg-red-100/30'
              : 'border-sand-300 bg-sand-100/50',
          disabled && 'pointer-events-none opacity-50'
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sand-200/60">
          <ImagePlus className="h-5 w-5 text-muted" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-medium text-ink-900">
            Drop a photo here or{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="font-semibold underline underline-offset-4 hover:text-ink-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
            >
              browse files
            </button>
          </p>
          <p className="mt-1 text-xs text-muted">JPEG, PNG or WebP · Max {MAX_SIZE_MB} MB</p>
        </div>

        {hasCamera && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startCamera}
            disabled={disabled}
            className="mt-1 min-h-[44px]"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            Use camera
          </Button>
        )}
      </div>

      {/* Quality guidance */}
      <div className="mt-3 flex items-start gap-2 rounded-md border border-sand-200 bg-sand-100 px-3 py-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-slate-700">
          Use a recent photo with <strong>one clear face</strong>, a plain background, and
          good lighting. Minimum 640 × 640 pixels.
        </p>
      </div>

      {/* Error */}
      {displayError && (
        <p className="mt-2 flex items-start gap-1 text-xs text-status-danger" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {displayError}
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept={ACCEPT}
        onChange={handleFileInput}
        disabled={disabled}
        className="sr-only"
        aria-label="Upload photo"
      />
    </div>
  )
}

export default PhotoUpload
