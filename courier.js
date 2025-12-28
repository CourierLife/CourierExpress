// Furgone iniziale
let van = { row: 21, col: 11 };
van.x = van.col * CELL_SIZE; // posizione reale in pixel
van.y = van.row * CELL_SIZE;
van.targetRow = van.row;
van.targetCol = van.col;
let steps = 0;
let isMoving = false; // se il furgone sta andando avanti
van.direction = "up";
let vanPath = [];

const vanFront = new Image();
vanFront.src = "img/vanFront.png";
const vanBack = new Image();
vanBack.src = "img/vanBack.png";
const vanLeft = new Image();
vanLeft.src = "img/vanLeft.png";
const vanRight = new Image();
vanRight.src = "img/vanRight.png";

let DEBUG = false;

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



function formatCivics(civicsArray) {
    // civicsArray è un array tipo: {number, bells}
    return civicsArray.map(c => `${c.number} (${c.bells})`).join(", ");
}

function logVanPosition(type = "move") {
    const r = van.row;
    const c = van.col;
    const tile = mapData[r][c];

    if (!tile || !ROAD_TYPES.includes(tile.type)) return;

    const last = vanPath[vanPath.length - 1];

    // evita doppio log sullo stesso tile
    if (last && last.row === r && last.col === c && last.type === type) {
        return;
    }

    vanPath.push({
        row: r,
        col: c,
        street: tile.street || null,
        civics: tile.civics ? tile.civics.map(c => c.number) : [],
        type, // "move" | "stop"
        time: Date.now()
    });

    // 🔍 DEBUG opzionale
    /*
    console.log(
        `[${type.toUpperCase()}] ${tile.street || "Via sconosciuta"} (${r},${c})`
    );
    */
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

    steps += 15; // ogni passo del furgone corrisponde a 15 m
    document.getElementById('steps').innerText = steps + " m";

    logVanPosition("move");
    lastDir = van.direction;
    updateStreetInfo(lastDir);
    updateCivicInfo(lastDir);
    // Ogni volta che il van si muove o aggiorna la mappa:
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
    checkReturnToBase();

    gameLoop.lastTimestamp = timestamp;
    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
// genera i colori per le celle di tipo 1 UNA VOLTA
function generateZoneColors() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = mapData[r][c];
            if (tile.type === 1) {
                let hue = 0;
                if (r >= 0 && r <= 10 && c >= 0 && c <= 8) hue = 200;      // blu
                else if (r >= 11 && r <= 24 && c >= 0 && c <= 8) hue = 120;    // verde
                else if (r >= 0 && r <= 11 && c >= 9 && c <= 14) hue = 50;   // giallo
                else if (r >= 12 && r <= 24 && c >= 9 && c <= 14) hue = 0; // rosso

                // piccola variazione di luminosità e saturazione
                const sat = 50 + Math.random() * 20;   // 50-70%
                const light = 40 + Math.random() * 20; // 40-60%

                tile.color = `hsl(${hue}, ${sat}%, ${light}%)`;
            }
        }
    }
}

function drawArrow(col, row, dir) {
    const cx = col * CELL_SIZE + CELL_SIZE / 2;
    const cy = row * CELL_SIZE + CELL_SIZE / 2;
    const size = CELL_SIZE / 3;

    ctx.fillStyle = "#8f0909";
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

function drawArrows() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = mapData[r][c];
            if ([3, 4, 5, 6].includes(tile.type)) {
                drawArrow(c, r, directionMap[tile.type]);
            }
        }
    }
}

// aggiorni drawMap() per usare il colore pre-generato
function drawMap() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = mapData[r][c];

            if (tile.type === 1) ctx.fillStyle = tile.color;       // usa colore pre-generato
            else if (tile.type === 2) ctx.fillStyle = "#8BC34A";   // parco
            else ctx.fillStyle = "#CCCCCC";                        // strada

            ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            // frecce stradali
            // bordi tra strada e edifici/parchi
            if (tile.type === 1 || tile.type === 2) {
                ctx.strokeStyle = "white";
                ctx.lineWidth = 2;

                if (r > 0 && [0, 3, 4, 5, 6].includes(mapData[r - 1][c].type)) {
                    ctx.beginPath();
                    ctx.moveTo(c * CELL_SIZE, r * CELL_SIZE);
                    ctx.lineTo((c + 1) * CELL_SIZE, r * CELL_SIZE);
                    ctx.stroke();
                }
                if (r < ROWS - 1 && [0, 3, 4, 5, 6].includes(mapData[r + 1][c].type)) {
                    ctx.beginPath();
                    ctx.moveTo(c * CELL_SIZE, (r + 1) * CELL_SIZE);
                    ctx.lineTo((c + 1) * CELL_SIZE, (r + 1) * CELL_SIZE);
                    ctx.stroke();
                }
                if (c > 0 && [0, 3, 4, 5, 6].includes(mapData[r][c - 1].type)) {
                    ctx.beginPath();
                    ctx.moveTo(c * CELL_SIZE, r * CELL_SIZE);
                    ctx.lineTo(c * CELL_SIZE, (r + 1) * CELL_SIZE);
                    ctx.stroke();
                }
                if (c < COLS - 1 && [0, 3, 4, 5, 6].includes(mapData[r][c + 1].type)) {
                    ctx.beginPath();
                    ctx.moveTo((c + 1) * CELL_SIZE, r * CELL_SIZE);
                    ctx.lineTo((c + 1) * CELL_SIZE, (r + 1) * CELL_SIZE);
                    ctx.stroke();
                }
            }
        }
    }
}

function drawStreetNames(ctx, streets, CELL_SIZE) {
    ctx.save();
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    streets.forEach(street => {
        // rimuove "Via " o "Viale "
        const name = street.name.replace(/^Via\s+|^Viale\s+/i, "");
        const [r1, c1] = street.start;
        const [r2, c2] = street.end;

        const x1 = c1 * CELL_SIZE + CELL_SIZE / 2;
        const y1 = r1 * CELL_SIZE + CELL_SIZE / 2;
        const x2 = c2 * CELL_SIZE + CELL_SIZE / 2;
        const y2 = r2 * CELL_SIZE + CELL_SIZE / 2;

        const horizontal = Math.abs(c2 - c1) >= Math.abs(r2 - r1);

        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;

        ctx.save();
        ctx.translate(centerX, centerY);

        if (!horizontal) ctx.rotate(-Math.PI / 2);

        // calcola larghezza e altezza testo
        const metrics = ctx.measureText(name);
        const textWidth = metrics.width;
        const textHeight = 14; // approssimazione per altezza del testo
        const padding = 1; // piccolo padding attorno al testo
        const radius = 4;  // raggio angoli arrotondati

        // rettangolo bianco semitrasparente con bordi arrotondati
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.moveTo(-textWidth / 2 - padding + radius, -textHeight / 2 - padding);
        ctx.lineTo(textWidth / 2 + padding - radius, -textHeight / 2 - padding);
        ctx.quadraticCurveTo(textWidth / 2 + padding, -textHeight / 2 - padding, textWidth / 2 + padding, -textHeight / 2 - padding + radius);
        ctx.lineTo(textWidth / 2 + padding, textHeight / 2 + padding - radius);
        ctx.quadraticCurveTo(textWidth / 2 + padding, textHeight / 2 + padding, textWidth / 2 + padding - radius, textHeight / 2 + padding);
        ctx.lineTo(-textWidth / 2 - padding + radius, textHeight / 2 + padding);
        ctx.quadraticCurveTo(-textWidth / 2 - padding, textHeight / 2 + padding, -textWidth / 2 - padding, textHeight / 2 + padding - radius);
        ctx.lineTo(-textWidth / 2 - padding, -textHeight / 2 - padding + radius);
        ctx.quadraticCurveTo(-textWidth / 2 - padding, -textHeight / 2 - padding, -textWidth / 2 - padding + radius, -textHeight / 2 - padding);
        ctx.closePath();
        ctx.fill();

        // testo rosso pastello
        ctx.fillStyle = "hsl(0, 70%, 60%)";
        ctx.fillText(name, 0, 0);

        ctx.restore();
    });

    ctx.restore();
}

function drawVan() {
    // disegna furgone
    const vanScale = 1.4;
    const offset = (CELL_SIZE * (vanScale - 1)) / 2;
    let vanImg = vanFront;
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
}

function drawBaseTile() {
    const r = 21;
    const c = 11;
    const x = c * CELL_SIZE + CELL_SIZE / 2;
    const y = r * CELL_SIZE + CELL_SIZE / 2;

    ctx.save();
    ctx.font = `${CELL_SIZE}px Arial`; // dimensione uguale alla tile
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // emoji edificio / garage
    ctx.fillText("🏢", x, y);

    ctx.restore();
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

function toggleCivicsDebug() {
    DEBUG = !DEBUG;
    draw();
    console.log("Civici debug:", DEBUG ? "ON" : "OFF");
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
function getPackagesInDeliveryZone() {
    const deliveryStartCol = VAN_RIGHT - 2;
    const deliveryStartRow = VAN_TOP + 11;
    const size = 3;

    return packages.filter(pkg =>
        pkg.col >= deliveryStartCol &&
        pkg.col < deliveryStartCol + size &&
        pkg.row >= deliveryStartRow &&
        pkg.row < deliveryStartRow + size
    );
}


document.getElementById('deliverButton').addEventListener('click', () => {
    const tile = mapData[van.row][van.col];

    // 1️⃣ Controllo civici
    if (!tile || !ROAD_TYPES.includes(tile.type) || !tile.civics?.length) {
        alert("Qui non ci sono civici per consegnare");
        return;
    }

    // 2️⃣ Controllo pacchi nella zona di consegna
    const deliveryPackages = getPackagesInDeliveryZone();
    if (deliveryPackages.length === 0) {
        alert("Non hai preso alcun pacco da consegnare");
        return;
    }

    // 3️⃣ Tutto ok → apri modale
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

        const deliveredPackage = packages[index];

        packages.splice(index, 1);

        logVanPosition("stop");

        logGameEvent("delivery", {
            street: deliveredPackage.street,
            civic: deliveredPackage.civic,
            recipient: selectedRecipient,
            position: { row: van.row, col: van.col }
        });

        modal.style.display = "none";
        draw();
    };

    document.getElementById('closeDeliveryModal').onclick = () => {
        modal.style.display = "none";
    };

    modal.style.display = "block";
}
let showFullPath = false;
function drawVanPath(ctx) {
    if (vanPath.length < 2) return;

    ctx.save();

    // linea del percorso
    ctx.strokeStyle = "rgba(21, 101, 192, 0.7)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    vanPath.forEach((p, i) => {
        const x = p.col * CELL_SIZE + CELL_SIZE / 2;
        const y = p.row * CELL_SIZE + CELL_SIZE / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.stroke();

    // stop di consegna
    vanPath
        .filter(p => p.type === "stop")
        .forEach(p => {
            const x = p.col * CELL_SIZE + CELL_SIZE / 2;
            const y = p.row * CELL_SIZE + CELL_SIZE / 2;

            ctx.fillStyle = "#e53935";
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
        });

    ctx.restore();
}

function showEndScreen() {
    saveGameResults();
    // Calcola orario di fine (ultimo aggiornamento del timer)
    const endTime = getGameTime();

    // Conteggio pacchi consegnati dalla timeline
    const totalDelivered = gameTimeline.filter(ev => ev.type === "delivery").length;

    // Trova l'evento di inizio guida (dopo il carico)
    const startEvent = gameTimeline.find(ev => ev.type === "start_drive");
    const startTime = startEvent ? startEvent.time : { hours: 9, minutes: 0 };

    // Calcolo tempo totale in minuti
    const totalMinutesStart = startTime.hours * 60 + startTime.minutes;
    const totalMinutesEnd = endTime.hours * 60 + endTime.minutes;
    const totalMinutesElapsed = totalMinutesEnd - totalMinutesStart;

    // Tempo medio per pacco
    const avgMinutesPerPackage = totalDelivered > 0 ? (totalMinutesElapsed / totalDelivered) : 0;
    const avgMinutesRounded = Math.round(avgMinutesPerPackage * 10) / 10;

    // Mostra la modale già presente nell'HTML
    const modal = document.getElementById('endGameModal');
    modal.style.display = "block";

    // Aggiorna i dati nella modale
    document.getElementById('loadEndTime').innerText = loadEndTime
        ? `${String(loadEndTime.hours).padStart(2, '0')}:${String(loadEndTime.minutes).padStart(2, '0')}`
        : "-";
    document.getElementById('endTime').innerText = `${String(endTime.hours).padStart(2, '0')}:${String(endTime.minutes).padStart(2, '0')}`;
    document.getElementById('deliveredCount').innerText = totalDelivered;
    document.getElementById('avgTimePerPackage').innerText = `${avgMinutesRounded} min`;
    document.getElementById('totalSteps').innerText = `${steps} m`;
}

// Listener per pulsante "Visualizza percorso"
document.getElementById('viewPathButton').addEventListener('click', () => {
    document.getElementById('endGameModal').style.display = "none";
    document.getElementById('moveControls').style.display = "none";
    document.getElementById('deliveryButton').style.display = "none";
    document.getElementById('score').style.display = "block";

    mode = "mappa";
    showFullPath = true; // attiva il disegno del percorso
    draw();
});

document.getElementById('score').addEventListener('click', () => {
    document.getElementById('endGameModal').style.display = "block";
});

document.getElementById("newGame").addEventListener("click", () => {
    document.getElementById('endGameModal').style.display = "none";
    document.getElementById('score').style.display = "none";
    resetGame();
});

function saveGameResults() {
    const endTime = getGameTime();
    const totalDelivered = gameTimeline.filter(ev => ev.type === "delivery").length;
    const startEvent = gameTimeline.find(ev => ev.type === "start_drive");
    const startTime = startEvent ? startEvent.time : { hours: 9, minutes: 0 };
    const totalMinutesStart = startTime.hours * 60 + startTime.minutes;
    const totalMinutesEnd = endTime.hours * 60 + endTime.minutes;
    const totalMinutesElapsed = totalMinutesEnd - totalMinutesStart;
    const avgMinutesPerPackage = totalDelivered > 0 ? (totalMinutesElapsed / totalDelivered) : 0;
    const avgMinutesRounded = Math.round(avgMinutesPerPackage * 10) / 10;

    const results = {
        startTime,
        endTime,
        totalDelivered,
        avgMinutesRounded,
        steps
    };

    localStorage.setItem("courierGameResults", JSON.stringify(results));
}

generateZoneColors();
