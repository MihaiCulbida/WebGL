const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

function onResults(results) {
  canvasElement.width = results.image.width;
  canvasElement.height = results.image.height;

  canvasCtx.save();

  canvasCtx.fillStyle = '#000000';
  canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

  if (results.multiFaceLandmarks) {
    for (const landmarks of results.multiFaceLandmarks) {
      drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
        color: 'rgba(255,255,255,0.35)',
        lineWidth: 0.5
      });

      drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, {
        color: '#ffffff',
        lineWidth: 2
      });

      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, { color: '#ffffff', lineWidth: 1.5 });
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, { color: '#ffffff', lineWidth: 1.5 });

      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW, { color: '#ffffff', lineWidth: 1.5 });
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW, { color: '#ffffff', lineWidth: 1.5 });

      if (FACEMESH_LEFT_IRIS) {
        drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_IRIS, { color: '#ffffff', lineWidth: 1.5 });
        drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_IRIS, { color: '#ffffff', lineWidth: 1.5 });
      }

      drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, { color: '#ffffff', lineWidth: 1.5 });
    }
  }

  canvasCtx.restore();
}

const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 4,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
  },
  width: 1280,
  height: 720
});

camera.start();