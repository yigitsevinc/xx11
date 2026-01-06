const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
const resetBtn = document.getElementById("resetBtn");
const diamondToggle = document.getElementById("diamondToggle");

const GRID_SIZE = 12;
const TILE_SIZE = canvas.width / GRID_SIZE;

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
let people = [];
let cars = [];
let lastFrame = 0;

const sidewalkPaths = buildSidewalkPaths();
const roadPaths = buildRoadPaths();

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

  return paths;
}

function spawnEntities() {
  people = Array.from({ length: 8 }, (_, index) => ({
    id: `person-${index}`,
    path: sidewalkPaths[index % sidewalkPaths.length],
    progress: Math.random(),
    speed: 0.015 + Math.random() * 0.01,
    color: "#ef4444",
  }));

  cars = Array.from({ length: 5 }, (_, index) => ({
    id: `car-${index}`,
    path: roadPaths[index % roadPaths.length],
    progress: Math.random(),
    speed: 0.02 + Math.random() * 0.015,
    color: "#0ea5e9",
  }));
}

function updateEntities(delta) {
  people.forEach((person) => {
    person.progress = (person.progress + person.speed * delta) % 1;
  });

  cars.forEach((car) => {
    car.progress = (car.progress + car.speed * delta) % 1;
  });
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

function drawEntities() {
  people.forEach((person) => {
    const point = getPointOnPath(person.path, person.progress);
    drawAvatar(point, 0.22, person.color, assetImages.person);
  });

  cars.forEach((car) => {
    const point = getPointOnPath(car.path, car.progress);
    drawAvatar(point, 0.35, car.color, assetImages.car, true);
  });
}

function drawAvatar(point, size, color, image, isCar = false) {
  const px = point.x * TILE_SIZE + TILE_SIZE / 2;
  const py = point.y * TILE_SIZE + TILE_SIZE / 2;
  const radius = TILE_SIZE * size;

  if (image) {
    const dimension = radius * 2;
    ctx.drawImage(image, px - radius, py - radius, dimension, dimension);
    return;
  }

  ctx.fillStyle = color;
  if (isCar) {
    ctx.fillRect(px - radius, py - radius / 1.2, radius * 2, radius * 1.2);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(px - radius * 0.6, py - radius * 0.8, radius * 1.2, radius * 0.4);
  } else {
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(px + radius * 0.3, py - radius * 0.3, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMap() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      drawTile(map[y][x], x, y);
    }
  }
  drawEntities();
}

function animate(timestamp) {
  const delta = Math.min((timestamp - lastFrame) / 1000, 0.05);
  lastFrame = timestamp;
  updateEntities(delta);
  drawMap();
  requestAnimationFrame(animate);
}

function resetSimulation() {
  spawnEntities();
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
