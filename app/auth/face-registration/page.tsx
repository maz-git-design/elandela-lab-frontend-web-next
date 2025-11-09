'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Camera, Check, Microscope } from 'lucide-react'

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4">
            <Microscope className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Lab Manager</h1>
          <p className="text-slate-600">Laboratory Management System</p>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-semibold">Face Registration</CardTitle>
            <CardDescription>
              Register your face for quick authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-900">
              {!capturing && !captured && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <Camera className="mx-auto h-16 w-16 text-slate-400" />
                    <p className="mt-4 text-slate-400">Camera not started</p>
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
                  className="w-full bg-blue-600 hover:bg-blue-700 h-10"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Start Camera
                </Button>
              )}

              {capturing && (
                <div className="flex gap-2">
                  <Button
                    onClick={captureImage}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 h-10"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Capture
                  </Button>
                  <Button
                    onClick={stopCamera}
                    variant="outline"
                    className="h-10"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {captured && (
                <div className="space-y-2">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 h-10"
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
                    className="w-full h-10"
                  >
                    Retake
                  </Button>
                </div>
              )}

              <Link href="/auth/login">
                <Button variant="outline" className="w-full h-10">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">
          Advanced laboratory equipment and attendance management
        </p>
      </div>
    </div>
  )
}
