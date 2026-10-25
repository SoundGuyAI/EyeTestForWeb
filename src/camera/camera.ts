export const requestFrontCamera = async (): Promise<MediaStream> => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser does not provide camera access.')
  }

  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'user' },
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30, max: 30 },
    },
  })
}

export const stopCamera = (stream: MediaStream | null): void => {
  stream?.getTracks().forEach((track) => track.stop())
}

export const cameraErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Camera permission was denied. Allow camera access in your browser settings and try again.'
    }
    if (error.name === 'NotFoundError') {
      return 'No usable camera was found on this device.'
    }
    if (error.name === 'NotReadableError') {
      return 'The camera is already in use or could not be started.'
    }
  }

  return error instanceof Error ? error.message : 'The camera could not be started.'
}
