// Furgone iniziale
let van = { row: 1, col: 5 };
van.x = van.col * CELL_SIZE; // posizione reale in pixel
van.y = van.row * CELL_SIZE;
van.targetRow = van.row;
van.targetCol = van.col;
let steps = 0;
let isMoving = false; // se il furgone sta andando avanti
van.direction = "up";

const vanFront = new Image();
vanFront.src = "img/vanFront.png";
const vanBack = new Image();
vanBack.src = "img/vanBack.png";
const vanLeft = new Image();
vanLeft.src = "img/vanLeft.png";
const vanRight = new Image();
vanRight.src = "img/vanRight.png";

let showCivicsDebug = false;

// Velocità in pixel al secondo (es. 1 tile ogni 2 secondi)
const vanPixelsPerSecond = CELL_SIZE;

// Direzioni associate ai numeri
const directionMap = {
    3: "right",
    4: "left",
    5: "up",
    6: "down"
};
const oppositeDirection = {
    3: "right",  // senso unico verso l'alto → vietato andare giù
    4: "left",  // verso destra → vietato andare sinistra
    5: "up",    // verso il basso → vietato andare su
    6: "down"  // verso sinistra → vietato andare destra
};


function drawArrow(col, row, dir) {
    const cx = col * CELL_SIZE + CELL_SIZE / 2;
    const cy = row * CELL_SIZE + CELL_SIZE / 2;
    const size = CELL_SIZE / 3;

    ctx.fillStyle = "red";
    ctx.beginPath();

    switch (dir) {
        case "up":
            ctx.moveTo(cx, cy - size / 2);
            ctx.lineTo(cx - size / 2, cy + size / 2);
            ctx.lineTo(cx + size / 2, cy + size / 2);
            break;
        case "down":
            ctx.moveTo(cx, cy + size / 2);
            ctx.lineTo(cx - size / 2, cy - size / 2);
            ctx.lineTo(cx + size / 2, cy - size / 2);
            break;
        case "left":
            ctx.moveTo(cx - size / 2, cy);
            ctx.lineTo(cx + size / 2, cy - size / 2);
            ctx.lineTo(cx + size / 2, cy + size / 2);
            break;
        case "right":
            ctx.moveTo(cx + size / 2, cy);
            ctx.lineTo(cx - size / 2, cy - size / 2);
            ctx.lineTo(cx - size / 2, cy + size / 2);
            break;
    }

    ctx.closePath();
    ctx.fill();
}

function formatCivics(civicsArray) {
    // civicsArray è un array tipo: {number, bells}
    return civicsArray.map(c => `${c.number} (${c.bells})`).join(", ");
}

function logVanPosition() {
    const r = van.row;
    const c = van.col;
    const streetTile = mapData[r][c];

    if (!streetTile || !ROAD_TYPES.includes(streetTile.type)) {
        console.log("Furgone fuori strada");
        return;
    }

    const civics = streetTile.civics?.length
        ? formatCivics(streetTile.civics)
        : "nessun civico";

    console.log(
        `Furgone in ${streetTile.street || "Via sconosciuta"} – civici → ${civics}`
    );
}

function updateStreetInfo(lastDir) {
    const currentTile = mapData[van.row][van.col];
    const currentStreet = currentTile?.street || "-";

    let nextIntersection = "-";

    const isStreet = t => t && ROAD_TYPES.includes(t.type);
    const maxRange = 4;   // lunghezza ricerca lungo la direzione
    const lateralSteps = [1, 2]; // prima riga vicina, poi più lontana

    const directions = {
        up: { dr: -1, dc: 0, lateral: [{ dr: 0, dc: -1 }, { dr: 0, dc: 1 }] },
        down: { dr: 1, dc: 0, lateral: [{ dr: 0, dc: -1 }, { dr: 0, dc: 1 }] },
        left: { dr: 0, dc: -1, lateral: [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }] },
        right: { dr: 0, dc: 1, lateral: [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }] }
    };

    const dir = directions[lastDir];
    if (!dir) return;

    for (let lIdx = 0; lIdx < lateralSteps.length; lIdx++) {
        const lStep = lateralSteps[lIdx];
        for (let step = 0; step <= maxRange; step++) {
            const rMain = van.row + dir.dr * step;
            const cMain = van.col + dir.dc * step;
            if (rMain < 0 || rMain >= ROWS || cMain < 0 || cMain >= COLS) break;

            for (let lat = 0; lat < dir.lateral.length; lat++) {
                const latMove = dir.lateral[lat];
                const rCheck = rMain + latMove.dr * lStep;
                const cCheck = cMain + latMove.dc * lStep;
                if (rCheck < 0 || rCheck >= ROWS || cCheck < 0 || cCheck >= COLS) continue;

                const t = mapData[rCheck][cCheck];
                if (!isStreet(t) || t.street === currentStreet) continue;

                nextIntersection = t.street;
                break;
            }
            if (nextIntersection !== "-") break;
        }
        if (nextIntersection !== "-") break;
    }

    document.getElementById('currentStreet').innerText = currentStreet;
    document.getElementById('nextIntersection').innerText = nextIntersection;
    return { currentStreet, nextIntersection };
}

function updateCivicInfo(lastDir) {
    const r = van.row;
    const c = van.col;

    let leftCivic = "-";
    let rightCivic = "-";
    let frontCivic = "-";

    const dirs = {
        up: { forward: [-1, 0], left: [0, -1], right: [0, 1] },
        down: { forward: [1, 0], left: [0, 1], right: [0, -1] },
        left: { forward: [0, -1], left: [1, 0], right: [-1, 0] },
        right: { forward: [0, 1], left: [-1, 0], right: [1, 0] }
    };

    const dir = dirs[lastDir];
    if (!dir) return;

    function readCivics(r, c) {
        const tile = mapData[r]?.[c];
        return tile?.civics?.map(n => n.number).join(" | ") || "-";
    }

    leftCivic = readCivics(r, c);
    rightCivic = readCivics(r, c);
    frontCivic = readCivics(r + dir.forward[0], c + dir.forward[1]);

    document.getElementById("civic").innerText = leftCivic;
    document.getElementById("nextCivic").innerText = frontCivic;
    return { leftCivic, rightCivic, frontCivic };
}

function rotateVan(angle) {
    // Ruota la direzione del furgone di 90° in senso orario/antiorario
    const directions = ["up", "right", "down", "left"];
    let idx = directions.indexOf(van.direction);
    if (idx === -1) idx = 0;

    if (angle === 90) idx = (idx + 1) % 4;
    else if (angle === -90) idx = (idx + 3) % 4; // equivalente a -1 modulo 4

    van.direction = directions[idx];
    drawMap();
    updateStreetInfo(lastDir);
    updateCivicInfo(lastDir);
}

function moveVan(dr, dc, updateDir = true) {
    const newRow = van.row + dr;
    const newCol = van.col + dc;

    if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) return;
    const destTile = mapData[newRow][newCol];
    if (!destTile || destTile.type === 1 || destTile.type === 2) return;
    if ([3, 4, 5, 6].includes(destTile.type) && isBlockedByOneWay(destTile.type, dr, dc)) return;

    if (updateDir) {
        if (dr === -1) van.direction = "up";
        else if (dr === 1) van.direction = "down";
        else if (dc === -1) van.direction = "left";
        else if (dc === 1) van.direction = "right";
    }

    // Imposta destinazione per animazione
    van.targetRow = newRow;
    van.targetCol = newCol;

    // Aggiorna logica
    van.row = newRow;
    van.col = newCol;

    steps++;
    document.getElementById('steps').innerText = steps;

    logVanPosition();
    lastDir = van.direction;
    updateStreetInfo(lastDir);
    updateCivicInfo(lastDir);
}

function moveVanByDirection(multiplier = 1) {
    let dr = 0, dc = 0;
    switch (van.direction) {
        case "up": dr = -1; break;
        case "down": dr = 1; break;
        case "left": dc = -1; break;
        case "right": dc = 1; break;
    }
    moveVan(dr * multiplier, dc * multiplier, false);
}

function updateVanPosition(delta) {
    const targetX = van.targetCol * CELL_SIZE;
    const targetY = van.targetRow * CELL_SIZE;

    const dx = targetX - van.x;
    const dy = targetY - van.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.5) {
        van.x = targetX;
        van.y = targetY;

        // Arrivato a destinazione: aggiorna lastDir
        lastDir = van.direction;

        // Se stiamo andando avanti, aggiorna la tile successiva
        if (isMoving) moveVanByDirection(1);
    } else {
        const moveDist = vanPixelsPerSecond * delta;
        van.x += dx / distance * Math.min(moveDist, distance);
        van.y += dy / distance * Math.min(moveDist, distance);
    }
}

function gameLoop(timestamp) {
    if (!gameLoop.lastTimestamp) gameLoop.lastTimestamp = timestamp;
    const delta = (timestamp - gameLoop.lastTimestamp) / 1000; // secondi

    // Aggiorna posizione fluida
    updateVanPosition(delta);

    // Disegna tutto in base alla modalità
    draw();

    gameLoop.lastTimestamp = timestamp;
    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
function drawMap() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = mapData[r][c];

            if (tile.type === 1) ctx.fillStyle = "#8B0000";        // edificio
            else if (tile.type === 2) ctx.fillStyle = "#8BC34A";   // parco
            else ctx.fillStyle = "#CCCCCC";                        // strada

            ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = "#333";
            ctx.strokeRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);

            if ([3, 4, 5, 6].includes(tile.type)) drawArrow(c, r, directionMap[tile.type]);
        }
    }

    // disegna furgone più grande (1.5x CELL_SIZE)
    const vanScale = 1.4;
    const offset = (CELL_SIZE * (vanScale - 1)) / 2; // per centrarlo sulla cella

    let vanImg = vanFront; // default
    switch (van.direction) {
        case "up": vanImg = vanBack; break;
        case "down": vanImg = vanFront; break;
        case "left": vanImg = vanLeft; break;
        case "right": vanImg = vanRight; break;
    }

    ctx.drawImage(
        vanImg,
        van.x - offset,
        van.y - offset,
        CELL_SIZE * vanScale,
        CELL_SIZE * vanScale
    );


    if (showCivicsDebug) {
        drawCivicsDebug();
    }
}

function isBlockedByOneWay(tileType, dr, dc) {
    // Blocca solo la direzione opposta al senso unico
    switch (tileType) {
        case 3: return dr === 0 && dc === -1; // freccia right → vietato andare left
        case 4: return dr === 0 && dc === 1;  // freccia left → vietato andare right
        case 5: return dr === 1 && dc === 0; // freccia up → vietato andare down
        case 6: return dr === -1 && dc === 0;  // freccia down → vietato andare up
        default: return false;
    }
}

// Eventi pulsanti e swipe
document.getElementById("up").addEventListener("click", () => {
    isMoving = true;
    vanSpeed = 1; // avanti
});

document.getElementById("down").addEventListener("click", () => {
    if (isMoving && vanSpeed === 1) {
        // frena
        isMoving = false;
        vanSpeed = 0;
    } else if (!isMoving && vanSpeed === 0) {
        // retromarcia di una casella se sei fermo
        moveVanByDirection(-1);
    }
});

document.getElementById("left").addEventListener("click", () => {
    rotateVan(-90); // ruota 90° antiorario
});

document.getElementById("right").addEventListener("click", () => {
    rotateVan(90); // ruota 90° orario
});

let startX, startY;
canvas.addEventListener('touchstart', e => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
});
canvas.addEventListener('touchend', e => {
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) > Math.abs(dy)) {
        dx > 0 ? moveVan(0, 1) : moveVan(0, -1);
    } else {
        dy > 0 ? moveVan(1, 0) : moveVan(-1, 0);
    }
});


function toggleCivicsDebug() {
    showCivicsDebug = !showCivicsDebug;
    draw();
    console.log("Civici debug:", showCivicsDebug ? "ON" : "OFF");
}

function drawCivicsDebug() {
    ctx.save();
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = mapData[r][c];

            // Solo tile strada con civici
            if (!tile || !ROAD_TYPES.includes(tile.type) || !tile.civics?.length) continue;

            const x = c * CELL_SIZE + CELL_SIZE / 2;
            const y = r * CELL_SIZE + CELL_SIZE / 2;

            // Es: "1 | 2 | 2/1"
            const txt = tile.civics.map(c => c.number).join(" | ");

            ctx.fillText(txt, x, y);
        }
    }

    ctx.restore();
}

function drawTileCoordinatesDebug() {
    ctx.save();
    ctx.font = "10px monospace";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * CELL_SIZE + CELL_SIZE / 2;
            const y = r * CELL_SIZE + CELL_SIZE / 2;

            ctx.fillText(`${r},${c}`, x, y);
        }
    }

    ctx.restore();
}


document.getElementById('deliverButton').addEventListener('click', () => {
    const tile = mapData[van.row][van.col];

    if (!tile || !ROAD_TYPES.includes(tile.type) || !tile.civics?.length) {
        alert("Qui non ci sono civici per consegnare");
        return;
    }

    openDeliveryModal(tile.street, tile.civics);
});

// Modale ora riceve strada e civici già calcolati
function openDeliveryModal(currentStreet, civicsOnTile) {
    const modal = document.getElementById('deliveryModal');
    const columnsDiv = document.getElementById('deliveryColumns');
    const recipientsDiv = document.getElementById('civicRecipients');
    const confirmBtn = document.getElementById('confirmDelivery');

    columnsDiv.innerHTML = "";
    recipientsDiv.innerHTML = "";
    confirmBtn.style.display = "none";

    let selectedCivic = null;
    let selectedRecipient = null;

    // =====================
    // CIVICI
    // =====================
    civicsOnTile.forEach(civic => {
        const btn = document.createElement("button");
        btn.textContent = `${civic.number}`;
        btn.style.display = "block";
        btn.style.margin = "4px 0";

        btn.onclick = () => {
            selectedCivic = civic;
            showRecipients(civic);
        };

        columnsDiv.appendChild(btn);
    });

    // =====================
    // CAMPANELLI (TUTTI)
    // =====================
    function showRecipients(civic) {
        recipientsDiv.innerHTML = "";
        selectedRecipient = null;
        confirmBtn.style.display = "none";

        if (!civic.recipients || civic.recipients.length === 0) {
            recipientsDiv.textContent = "Nessun campanello";
            return;
        }

        civic.recipients.forEach(recipient => {
            const btn = document.createElement("button");
            btn.textContent = recipient;
            btn.style.display = "block";
            btn.style.margin = "3px 0";

            btn.onclick = () => {
                selectedRecipient = recipient;
                confirmBtn.style.display = "block";
            };

            recipientsDiv.appendChild(btn);
        });
    }

    // =====================
    // CONFERMA CONSEGNA
    // =====================
    confirmBtn.onclick = () => {
        if (!selectedCivic || !selectedRecipient) return;

        const index = packages.findIndex(p =>
            p.street === currentStreet &&
            p.civic === selectedCivic.number &&
            Array.isArray(p.recipient) &&
            p.recipient.includes(selectedRecipient)
        );

        if (index === -1) {
            alert("❌ Consegna errata!");
            return;
        }

        packages.splice(index, 1);

        alert(
            `✅ Pacco consegnato!\n` +
            `${selectedRecipient}\n` +
            `${currentStreet}, civico ${selectedCivic.number}`
        );

        modal.style.display = "none";
        draw();
    };

    document.getElementById('closeDeliveryModal').onclick = () => {
        modal.style.display = "none";
    };

    modal.style.display = "block";
}
