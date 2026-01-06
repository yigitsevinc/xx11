const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
const resetBtn = document.getElementById("resetBtn");
const diamondToggle = document.getElementById("diamondToggle");
const statusEl = document.getElementById("status");

const GRID_SIZE = 12;
const TILE_SIZE = canvas.width / GRID_SIZE;
const TIME_SCALE = 120; // 1s = 2 dakika

const ASSETS = {
  road: "",
  sidewalk: "",
  lot: "",
  park: "",
  person: "",
  car: "",
};

const assetImages = {};

function loadAssets() {
  const entries = Object.entries(ASSETS).filter(([, value]) => value);
  return Promise.all(
    entries.map(([key, src]) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          assetImages[key] = img;
          resolve();
        };
        img.onerror = resolve;
        img.src = src;
      })
    )
  );
}

const map = createMap();
const sidewalkPaths = buildSidewalkPaths();
const roadPaths = buildRoadPaths();
const landmarks = buildLandmarks();

let people = [];
let cars = [];
let simMinutes = 8 * 60 + 30;
let lastFrame = 0;

const personProfiles = [
  { name: "komşu", speed: [0.013, 0.018], size: 0.22, color: "#ef4444" },
  { name: "koşucu", speed: [0.02, 0.028], size: 0.2, color: "#f97316" },
  { name: "yaşlı", speed: [0.01, 0.014], size: 0.24, color: "#8b5cf6" },
  { name: "öğrenci", speed: [0.016, 0.021], size: 0.21, color: "#10b981" },
];

const carProfiles = [
  { name: "otomobil", speed: [0.022, 0.03], size: 0.35, color: "#0ea5e9" },
  { name: "minibüs", speed: [0.018, 0.024], size: 0.42, color: "#6366f1" },
  { name: "kargo", speed: [0.017, 0.022], size: 0.38, color: "#facc15" },
];

function createMap() {
  const grid = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => "lot")
  );

  const roadRows = [3, 6, 9];
  const roadCols = [2, 5, 8];

  roadRows.forEach((row) => {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      grid[row][col] = "road";
      if (row > 0 && grid[row - 1][col] !== "road") {
        grid[row - 1][col] = "sidewalk";
      }
      if (row < GRID_SIZE - 1 && grid[row + 1][col] !== "road") {
        grid[row + 1][col] = "sidewalk";
      }
    }
  });

  roadCols.forEach((col) => {
    for (let row = 0; row < GRID_SIZE; row += 1) {
      grid[row][col] = "road";
      if (col > 0 && grid[row][col - 1] !== "road") {
        grid[row][col - 1] = "sidewalk";
      }
      if (col < GRID_SIZE - 1 && grid[row][col + 1] !== "road") {
        grid[row][col + 1] = "sidewalk";
      }
    }
  });

  grid[1][1] = "park";
  grid[10][10] = "park";
  grid[1][10] = "park";

  return grid;
}

function buildSidewalkPaths() {
  const paths = [];
  const outerLoop = [];
  for (let col = 0; col < GRID_SIZE; col += 1) {
    if (map[1][col] === "sidewalk") {
      outerLoop.push({ x: col, y: 1 });
    }
  }
  for (let row = 2; row < GRID_SIZE; row += 1) {
    if (map[row][GRID_SIZE - 2] === "sidewalk") {
      outerLoop.push({ x: GRID_SIZE - 2, y: row });
    }
  }
  for (let col = GRID_SIZE - 3; col >= 0; col -= 1) {
    if (map[GRID_SIZE - 2][col] === "sidewalk") {
      outerLoop.push({ x: col, y: GRID_SIZE - 2 });
    }
  }
  for (let row = GRID_SIZE - 3; row >= 1; row -= 1) {
    if (map[row][1] === "sidewalk") {
      outerLoop.push({ x: 1, y: row });
    }
  }
  if (outerLoop.length > 0) {
    paths.push(outerLoop);
  }

  const middleLoop = [];
  for (let col = 3; col <= 8; col += 1) {
    if (map[4][col] === "sidewalk") {
      middleLoop.push({ x: col, y: 4 });
    }
  }
  for (let row = 5; row <= 8; row += 1) {
    if (map[row][9] === "sidewalk") {
      middleLoop.push({ x: 9, y: row });
    }
  }
  for (let col = 8; col >= 3; col -= 1) {
    if (map[9][col] === "sidewalk") {
      middleLoop.push({ x: col, y: 9 });
    }
  }
  for (let row = 8; row >= 4; row -= 1) {
    if (map[row][3] === "sidewalk") {
      middleLoop.push({ x: 3, y: row });
    }
  }
  if (middleLoop.length > 0) {
    paths.push(middleLoop);
  }

  const parkLoop = [
    { x: 2, y: 1 },
    { x: 2, y: 2 },
    { x: 1, y: 2 },
    { x: 1, y: 1 },
  ];
  paths.push(parkLoop);

  return paths;
}

function buildRoadPaths() {
  const paths = [];
  const loop = [];
  for (let col = 0; col < GRID_SIZE; col += 1) {
    if (map[3][col] === "road") {
      loop.push({ x: col, y: 3 });
    }
  }
  for (let row = 4; row < GRID_SIZE; row += 1) {
    if (map[row][8] === "road") {
      loop.push({ x: 8, y: row });
    }
  }
  for (let col = GRID_SIZE - 1; col >= 0; col -= 1) {
    if (map[9][col] === "road") {
      loop.push({ x: col, y: 9 });
    }
  }
  for (let row = GRID_SIZE - 1; row >= 0; row -= 1) {
    if (map[row][2] === "road") {
      loop.push({ x: 2, y: row });
    }
  }
  if (loop.length > 0) {
    paths.push(loop);
  }

  const avenue = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    if (map[row][5] === "road") {
      avenue.push({ x: 5, y: row });
    }
  }
  if (avenue.length > 0) {
    paths.push(avenue);
  }

  const ring = [
    { x: 0, y: 6 },
    { x: 11, y: 6 },
    { x: 11, y: 3 },
    { x: 0, y: 3 },
  ];
  paths.push(ring);

  return paths;
}

function buildLandmarks() {
  return {
    parkNorth: { x: 1, y: 2 },
    parkEast: { x: 10, y: 2 },
    parkSouth: { x: 9, y: 10 },
    market: { x: 5, y: 4 },
    cafe: { x: 8, y: 4 },
    school: { x: 3, y: 9 },
  };
}

function findNearestIndex(path, point) {
  let bestIndex = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  path.forEach((node, index) => {
    const dist = Math.abs(node.x - point.x) + Math.abs(node.y - point.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function buildStops(path, points) {
  return points.map((point) => findNearestIndex(path, point));
}

function createPerson(index) {
  const profile = personProfiles[index % personProfiles.length];
  const path = sidewalkPaths[index % sidewalkPaths.length];
  const direction = Math.random() > 0.5 ? 1 : -1;
  const stops = buildStops(path, [
    landmarks.parkNorth,
    landmarks.market,
    landmarks.cafe,
    landmarks.school,
  ]);

  return {
    id: `person-${index}`,
    profile,
    path,
    direction,
    progress: Math.random(),
    speed: randomBetween(profile.speed[0], profile.speed[1]),
    color: profile.color,
    size: profile.size,
    wait: Math.random() * 3,
    nextStopIndex: stops[Math.floor(Math.random() * stops.length)],
    stopIndices: stops,
    routine: pickRoutine(),
  };
}

function createCar(index) {
  const profile = carProfiles[index % carProfiles.length];
  const path = roadPaths[index % roadPaths.length];
  const stopIndices = [
    findNearestIndex(path, { x: 2, y: 3 }),
    findNearestIndex(path, { x: 5, y: 6 }),
    findNearestIndex(path, { x: 8, y: 9 }),
  ];

  return {
    id: `car-${index}`,
    profile,
    path,
    direction: 1,
    progress: Math.random(),
    speed: randomBetween(profile.speed[0], profile.speed[1]),
    color: profile.color,
    size: profile.size,
    wait: Math.random() * 2,
    nextStopIndex: stopIndices[Math.floor(Math.random() * stopIndices.length)],
    stopIndices,
    routine: pickCarRoutine(),
  };
}

function pickRoutine() {
  const options = [
    { name: "işe gidiyor", pause: [2, 5], speedBoost: 0.003 },
    { name: "parkta geziyor", pause: [4, 7], speedBoost: 0 },
    { name: "alışveriş", pause: [5, 9], speedBoost: -0.001 },
  ];
  return options[Math.floor(Math.random() * options.length)];
}

function pickCarRoutine() {
  const options = [
    { name: "servis", pause: [2, 4], speedBoost: 0 },
    { name: "teslimat", pause: [4, 6], speedBoost: -0.002 },
    { name: "şehir içi", pause: [1, 3], speedBoost: 0.002 },
  ];
  return options[Math.floor(Math.random() * options.length)];
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function spawnEntities() {
  people = Array.from({ length: 12 }, (_, index) => createPerson(index));
  cars = Array.from({ length: 6 }, (_, index) => createCar(index));
}

function updateTime(delta) {
  simMinutes = (simMinutes + delta * TIME_SCALE) % (24 * 60);
}

function updateEntity(entity, delta) {
  if (!entity.path || entity.path.length === 0) {
    return;
  }

  if (entity.wait > 0) {
    entity.wait -= delta;
    return;
  }

  const pathLength = entity.path.length;
  const previousPosition = entity.progress * pathLength;
  const speed = entity.speed + (entity.routine?.speedBoost ?? 0);
  const deltaProgress = speed * delta * entity.direction;
  entity.progress = (entity.progress + deltaProgress + 1) % 1;

  const currentPosition = entity.progress * pathLength;
  const reachedStop = entity.direction > 0
    ? previousPosition < entity.nextStopIndex && currentPosition >= entity.nextStopIndex
    : previousPosition > entity.nextStopIndex && currentPosition <= entity.nextStopIndex;

  if (reachedStop) {
    const pauseRange = entity.routine?.pause || [2, 5];
    entity.wait = randomBetween(pauseRange[0], pauseRange[1]);
    const nextOptions = entity.stopIndices.filter((index) => index !== entity.nextStopIndex);
    entity.nextStopIndex = nextOptions[Math.floor(Math.random() * nextOptions.length)];
    if (Math.random() > 0.7) {
      entity.direction *= -1;
    }
  }
}

function updateEntities(delta) {
  people.forEach((person) => updateEntity(person, delta));
  cars.forEach((car) => updateEntity(car, delta));
}

function getPointOnPath(path, t) {
  if (!path || path.length === 0) {
    return { x: 0, y: 0 };
  }
  const total = path.length;
  const scaled = t * total;
  const index = Math.floor(scaled) % total;
  const nextIndex = (index + 1) % total;
  const localT = scaled - index;
  const start = path[index];
  const end = path[nextIndex];
  return {
    x: start.x + (end.x - start.x) * localT,
    y: start.y + (end.y - start.y) * localT,
  };
}

function drawTile(type, x, y) {
  const px = x * TILE_SIZE;
  const py = y * TILE_SIZE;
  const img = assetImages[type];
  if (img) {
    ctx.drawImage(img, px, py, TILE_SIZE, TILE_SIZE);
    return;
  }

  if (type === "road") {
    ctx.fillStyle = "#2f2f34";
  } else if (type === "sidewalk") {
    ctx.fillStyle = "#cbd5e1";
  } else if (type === "park") {
    ctx.fillStyle = "#34d399";
  } else {
    ctx.fillStyle = "#fbbf24";
  }
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
}

function drawLots() {
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.15)";
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (map[y][x] === "lot") {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        ctx.fillRect(px + TILE_SIZE * 0.2, py + TILE_SIZE * 0.2, TILE_SIZE * 0.6, TILE_SIZE * 0.4);
        ctx.fillRect(px + TILE_SIZE * 0.25, py + TILE_SIZE * 0.55, TILE_SIZE * 0.5, TILE_SIZE * 0.2);
      }
    }
  }
  ctx.restore();
}

function drawEntities() {
  people.forEach((person) => {
    const point = getPointOnPath(person.path, person.progress);
    drawAvatar(point, person.size, person.color, assetImages.person, false, person);
  });

  cars.forEach((car) => {
    const point = getPointOnPath(car.path, car.progress);
    drawAvatar(point, car.size, car.color, assetImages.car, true, car);
  });
}

function drawAvatar(point, size, color, image, isCar = false, entity = null) {
  const px = point.x * TILE_SIZE + TILE_SIZE / 2;
  const py = point.y * TILE_SIZE + TILE_SIZE / 2;
  const radius = TILE_SIZE * size;

  if (image) {
    const dimension = radius * 2;
    ctx.drawImage(image, px - radius, py - radius, dimension, dimension);
    return;
  }

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(isCar ? Math.PI / 2 : 0);
  ctx.fillStyle = color;

  if (isCar) {
    ctx.fillRect(-radius, -radius / 1.4, radius * 2, radius * 1.4);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(-radius * 0.6, -radius * 0.7, radius * 1.2, radius * 0.35);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(-radius * 0.9, radius * 0.45, radius * 0.4, radius * 0.2);
    ctx.fillRect(radius * 0.5, radius * 0.45, radius * 0.4, radius * 0.2);
  } else {
    const bob = Math.sin(performance.now() / 300 + px) * (radius * 0.08);
    ctx.beginPath();
    ctx.arc(0, bob, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.arc(radius * 0.3, bob - radius * 0.35, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();

    if (entity?.wait > 0.1) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
      ctx.fillRect(-radius * 0.6, radius * 0.9, radius * 1.2, radius * 0.15);
    }
  }

  ctx.restore();
}

function drawLighting() {
  const hour = simMinutes / 60;
  const isNight = hour < 6 || hour > 20;
  const isEvening = hour >= 18 && hour <= 20;
  if (!isNight && !isEvening) {
    return;
  }

  const alpha = isNight ? 0.25 : 0.12;
  ctx.save();
  ctx.fillStyle = `rgba(15, 23, 42, ${alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawMap() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      drawTile(map[y][x], x, y);
    }
  }
  drawLots();
  drawEntities();
  drawLighting();
}

function formatTime(minutes) {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = Math.floor(minutes % 60);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function updateStatus() {
  if (!statusEl) {
    return;
  }
  const timeText = formatTime(simMinutes);
  const activePeople = people.filter((person) => person.wait <= 0.1).length;
  const activeCars = cars.filter((car) => car.wait <= 0.1).length;
  const highlightRoutine = people[0]?.routine?.name ?? "";
  statusEl.innerHTML = `Saat: <strong>${timeText}</strong><br />
    Yürüyen: ${activePeople}/${people.length}<br />
    Araç: ${activeCars}/${cars.length}<br />
    Rutin: ${highlightRoutine}`;
}

function animate(timestamp) {
  const delta = Math.min((timestamp - lastFrame) / 1000, 0.05);
  lastFrame = timestamp;
  updateTime(delta);
  updateEntities(delta);
  drawMap();
  updateStatus();
  requestAnimationFrame(animate);
}

function resetSimulation() {
  spawnEntities();
  simMinutes = 8 * 60 + 30;
  lastFrame = performance.now();
}

resetBtn.addEventListener("click", resetSimulation);

diamondToggle.addEventListener("change", (event) => {
  document.body.classList.toggle("diamond", event.target.checked);
});

loadAssets().then(() => {
  resetSimulation();
  requestAnimationFrame(animate);
});
