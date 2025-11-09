'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Camera, Check } from 'lucide-react'

export default function FaceRegistrationPage() {
  const [capturing, setCapturing] = useState(false)
  const [captured, setCaptured] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      setStream(mediaStream)
      setCapturing(true)
    } catch (error) {
      console.error('Error accessing camera:', error)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setCapturing(false)
  }, [stream])

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 640, 480)
        setCaptured(true)
        stopCamera()
      }
    }
  }, [stopCamera])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Face Registration</CardTitle>
          <CardDescription>
            Register your face for quick authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900">
            {!capturing && !captured && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Camera className="mx-auto h-16 w-16 text-gray-400" />
                  <p className="mt-4 text-gray-400">Camera not started</p>
                </div>
              </div>
            )}

            {capturing && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
            )}

            <canvas
              ref={canvasRef}
              width="640"
              height="480"
              className={captured ? 'h-full w-full object-cover' : 'hidden'}
            />
          </div>

          <div className="space-y-2">
            {!capturing && !captured && (
              <Button
                onClick={startCamera}
                className="w-full"
              >
                <Camera className="mr-2 h-4 w-4" />
                Start Camera
              </Button>
            )}

            {capturing && (
              <div className="flex gap-2">
                <Button
                  onClick={captureImage}
                  className="flex-1"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Capture
                </Button>
                <Button
                  onClick={stopCamera}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            )}

            {captured && (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    alert('Face data would be saved here')
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Register Face
                </Button>
                <Button
                  onClick={() => {
                    setCaptured(false)
                    startCamera()
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Retake
                </Button>
              </div>
            )}

            <Link href="/auth/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
