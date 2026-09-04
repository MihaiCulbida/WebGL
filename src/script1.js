import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const video = document.getElementById('camera');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

let handLandmarker;

const FINGERS = [
  { name: 'thumb',  points: [1, 2, 3, 4] },
  { name: 'index',  points: [5, 6, 7, 8] },
  { name: 'middle', points: [9, 10, 11, 12] },
  { name: 'ring',   points: [13, 14, 15, 16] },
  { name: 'pinky',  points: [17, 18, 19, 20] }
];

const PALM_CONNECTIONS = [[0,1],[0,5],[5,9],[9,13],[13,17],[0,17]];

async function initModel() {
  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );

  handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 2
  });
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  video.srcObject = stream;
  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      resolve();
    };
  });
}

function toScreen(lm) {
  return { x: lm.x * canvas.width, y: lm.y * canvas.height, z: lm.z };
}

function perpendicular(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: -dy / len, y: dx / len };
}

function strokeLine(p1, p2) {
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function drawArchitecturalHand(landmarks) {
  const points = landmarks.map(toScreen);

  const wrist = points[0];
  const middleBase = points[9];
  const handSize = Math.hypot(middleBase.x - wrist.x, middleBase.y - wrist.y);
  const baseHalfWidth = handSize * 0.09;

  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0, 255, 80, 0.9)';
  ctx.shadowColor = 'rgba(0, 255, 80, 0.7)';
  ctx.shadowBlur = 5;
  ctx.lineWidth = 1.5;

  for (const [a, b] of PALM_CONNECTIONS) {
    strokeLine(points[a], points[b]);
  }

  for (const finger of FINGERS) {
    const idx = finger.points;
    const total = idx.length - 1;

    for (let i = 0; i < total; i++) {
      const a = points[idx[i]];
      const b = points[idx[i + 1]];
      const perp = perpendicular(a, b);

      const taper = 1 - (i / total) * 0.4;
      const hw = baseHalfWidth * taper;

      const a1 = { x: a.x + perp.x * hw, y: a.y + perp.y * hw };
      const b1 = { x: b.x + perp.x * hw, y: b.y + perp.y * hw };
      const a2 = { x: a.x - perp.x * hw, y: a.y - perp.y * hw };
      const b2 = { x: b.x - perp.x * hw, y: b.y - perp.y * hw };

      strokeLine(a1, b1);
      strokeLine(a2, b2);
    }
  }

  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#ff2b2b';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(255, 40, 40, 0.6)';
  ctx.shadowBlur = 4;

  for (const p of points) {
    const size = mapRange(p.z, -0.1, 0.05, 17, 7);
    ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size);
  }

  ctx.shadowBlur = 0;
}

function mapRange(value, inMin, inMax, outMin, outMax) {
  const t = Math.min(1, Math.max(0, (value - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}

function detectLoop() {
  const timestamp = performance.now();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const handResult = handLandmarker.detectForVideo(video, timestamp);

  if (handResult.landmarks) {
    for (const landmarks of handResult.landmarks) {
      drawArchitecturalHand(landmarks);
    }
  }

  requestAnimationFrame(detectLoop);
}

async function main() {
  try {
    await startCamera();
    await initModel();
    detectLoop();
  } catch (err) {
    alert('Eroare: ' + err.message);
  }
}

main();