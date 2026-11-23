import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useCamera — one lifecycle for the arrival desk and the scanner (§7.5/§7.6).
 *
 * States: idle | starting | ready | denied | no-camera | in-use | unsupported |
 * error. The camera is never started implicitly: the volunteer taps "Start
 * camera", which keeps the first paint permission-free and makes the denied
 * and unavailable states first-class screens.
 */

const ERROR_COPY = {
  denied:
    'Camera access is blocked. Allow camera permission in the browser, or upload a photo instead.',
  'no-camera': 'No camera was found on this device. Upload a photo or use manual lookup.',
  'in-use': 'Another app is using the camera. Close it and retry.',
  unsupported: 'This browser cannot access a camera. Upload a photo or use manual lookup.',
  error: 'The camera could not start. Retry, upload a photo or use manual lookup.',
}

function classify(error) {
  const name = error?.name ?? ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'no-camera'
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return 'in-use'
  }
  return 'error'
}

export function useCamera({ facingMode = 'user' } = {}) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const mountedRef = useRef(true)
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)

  const supported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)

  const attach = useCallback(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [])

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    if (mountedRef.current) {
      setState('idle')
      setError(null)
    }
  }, [])

  const start = useCallback(async () => {
    if (!supported) {
      setState('unsupported')
      setError(ERROR_COPY.unsupported)
      return
    }

    stop()
    setState('starting')
    setError(null)

    try {
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
      } catch (firstError) {
        // Some fixed webcams reject facingMode; retry without constraints.
        if (firstError?.name === 'OverconstrainedError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        } else {
          throw firstError
        }
      }

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      attach()
      setState('ready')
    } catch (startError) {
      if (!mountedRef.current) return
      const next = classify(startError)
      setState(next)
      setError(ERROR_COPY[next])
    }
  }, [attach, facingMode, stop, supported])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  // Re-attach after React swaps the <video> element in (state transitions).
  useEffect(() => {
    if (state === 'ready') attach()
  }, [attach, state])

  return {
    videoRef,
    state,
    error,
    supported,
    ready: state === 'ready',
    start,
    stop,
    retry: start,
  }
}

export default useCamera
