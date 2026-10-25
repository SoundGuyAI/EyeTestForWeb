import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'

const TASKS_VISION_VERSION = '1.1.1'

const wasmRoot =
  import.meta.env.VITE_MEDIAPIPE_WASM_ROOT ??
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`

const modelAssetPath =
  import.meta.env.VITE_FACE_LANDMARKER_MODEL ??
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

const options = {
  runningMode: 'VIDEO' as const,
  numFaces: 1,
  outputFaceBlendshapes: true,
  outputFacialTransformationMatrixes: false,
  minFaceDetectionConfidence: 0.5,
  minFacePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
}

export interface FaceDetector {
  detect(video: HTMLVideoElement, timestampMs: number): FaceLandmarkerResult
  close(): void
  delegate: 'GPU' | 'CPU'
}

export const createFaceDetector = async (): Promise<FaceDetector> => {
  const vision = await FilesetResolver.forVisionTasks(wasmRoot)

  try {
    const landmarker = await FaceLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: { modelAssetPath, delegate: 'GPU' },
    })

    return {
      detect: (video, timestampMs) => landmarker.detectForVideo(video, timestampMs),
      close: () => landmarker.close(),
      delegate: 'GPU',
    }
  } catch (gpuError) {
    console.warn('GPU delegate unavailable; retrying with CPU.', gpuError)
    const landmarker = await FaceLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: { modelAssetPath, delegate: 'CPU' },
    })

    return {
      detect: (video, timestampMs) => landmarker.detectForVideo(video, timestampMs),
      close: () => landmarker.close(),
      delegate: 'CPU',
    }
  }
}
