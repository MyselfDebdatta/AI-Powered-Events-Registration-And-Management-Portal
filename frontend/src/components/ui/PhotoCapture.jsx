import { useRef, useState, useCallback } from 'react'
import { Camera, Upload, X, RotateCcw } from 'lucide-react'
import Button from './Button'

export default function PhotoCapture({ onCapture }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [preview, setPreview] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [error, setError] = useState(null)

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      setStream(s)
      setCameraActive(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s
        }
      }, 100)
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions or upload a photo.')
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
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
          setPreview(URL.createObjectURL(blob))
          onCapture?.(file)
          stopCamera()
        }
      },
      'image/jpeg',
      0.9
    )
  }, [onCapture, stopCamera])

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
      onCapture?.(file)
      stopCamera()
    }
  }

  const reset = () => {
    setPreview(null)
    onCapture?.(null)
    stopCamera()
  }

  if (preview) {
    return (
      <div className="space-y-3">
        <div className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden border-2 border-accent shadow-lg">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <button
            onClick={reset}
            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-center text-sm text-accent font-medium">✓ Photo captured</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      {cameraActive ? (
        <div className="space-y-3">
          <div className="relative w-64 h-48 mx-auto rounded-xl overflow-hidden border-2 border-primary bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="accent" onClick={capturePhoto}>
              <Camera className="h-4 w-4" /> Capture
            </Button>
            <Button variant="secondary" onClick={stopCamera}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="outline" onClick={startCamera}>
            <Camera className="h-4 w-4" /> Take Photo
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload Photo
          </Button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  )
}

