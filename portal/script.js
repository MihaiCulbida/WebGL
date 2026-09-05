import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

/* ---------- config ---------- */
const FINGER_TIP = { thumb: 4, index: 8 };
const PORTAL_COLOR = "#00ff66";     // contur + puncte

/* ---------- dom ---------- */
const video = document.getElementById('camera');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

let handLandmarker = null;

/* ---------- init ---------- */
async function init() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
        },
        runningMode: "VIDEO",
        numHands: 2
    });

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await new Promise(resolve => { video.onloadedmetadata = resolve; });
    video.play();

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    requestAnimationFrame(loop);
}

/* ---------- main loop ---------- */
function loop() {
    const results = handLandmarker.detectForVideo(video, performance.now());
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const quad = extractQuadPoints(results);

    if (quad) {
        drawPortal(quad);
        drawFingerMarkers(quad);
    }

    requestAnimationFrame(loop);
}

/* ---------- extract 4 fixed-order points (2 per hand) ---------- */
function extractQuadPoints(results) {
    if (!results.landmarks || results.landmarks.length < 2) return null;

    const hands = { Left: null, Right: null };

    results.landmarks.forEach((landmarks, i) => {
        const label = results.handednesses?.[i]?.[0]?.categoryName || (i === 0 ? "Left" : "Right");
        hands[label] = landmarks;
    });

    if (!hands.Left || !hands.Right) return null;

    const toPoint = (landmarks, idx) => ({
        x: landmarks[idx].x * canvas.width,
        y: landmarks[idx].y * canvas.height
    });

    // Ordine fixa (nu sortata dupa unghi) -> daca degetele unei maini isi
    // schimba pozitia relativa, patrulaterul se auto-intersecteaza si
    // devine vizual 2 triunghiuri, exact ca la un portal "rasucit".
    return [
        toPoint(hands.Left, FINGER_TIP.thumb),
        toPoint(hands.Left, FINGER_TIP.index),
        toPoint(hands.Right, FINGER_TIP.index),
        toPoint(hands.Right, FINGER_TIP.thumb)
    ];
}

/* ---------- portal (contur verde + interior alb-negru) ---------- */
function drawPortal(points) {
    ctx.save();

    // path-ul patrulaterului (poate deveni bowtie / 2 triunghiuri)
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.lineTo(points[2].x, points[2].y);
    ctx.lineTo(points[3].x, points[3].y);
    ctx.closePath();

    // --- interior: cadru video alb-negru ---
    ctx.save();
    ctx.clip();
    ctx.filter = "grayscale(1) contrast(1.15)";
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    ctx.restore();

    // --- contur verde pe toata lungimea portalului ---
    ctx.lineWidth = 3;
    ctx.strokeStyle = PORTAL_COLOR;
    ctx.stroke();

    ctx.restore();
}

/* ---------- puncte la varfurile degetelor: alb cu contur verde ---------- */
function drawFingerMarkers(points) {
    points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = PORTAL_COLOR;
        ctx.stroke();
    });
}

init();