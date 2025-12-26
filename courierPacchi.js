// Funzione per disegnare il furgone
function drawVanArea() {
    ctx.fillStyle = "orange";
    ctx.fillRect(
        vanGrid.col * CELL_SIZE,
        vanGrid.row * CELL_SIZE,
        FUR_COLS * CELL_SIZE,
        FUR_ROWS * CELL_SIZE
    );
    ctx.strokeStyle = "#333";
    ctx.strokeRect(
        vanGrid.col * CELL_SIZE,
        vanGrid.row * CELL_SIZE,
        FUR_COLS * CELL_SIZE,
        FUR_ROWS * CELL_SIZE
    );
}



function placePackages() {
    packages.forEach(p => {
        let placed = false;

        while (!placed) {
            // righe sotto il furgone (riga 10 fino a ROWS-1)
            const r = FUR_ROWS + Math.floor(Math.random() * (ROWS - FUR_ROWS - p.height + 1));
            // tutte le colonne
            const c = Math.floor(Math.random() * (COLS - p.width + 1));

            p.row = r;
            p.col = c;
            placed = true;
        }
    });
}

function getFreeArea(pkg) {
    let minRow = 0; // inizio canvas
    let maxRow = ROWS - pkg.height;
    let minCol = 0;
    let maxCol = COLS - pkg.width;

    for (let other of packages) {
        if (other.id === pkg.id) continue;

        const overlapCol = pkg.col < other.col + other.width && pkg.col + pkg.width > other.col;
        const overlapRow = pkg.row < other.row + other.height && pkg.row + pkg.height > other.row;

        if (overlapCol) {
            if (other.row < pkg.row) minRow = Math.max(minRow, other.row + other.height);
            if (other.row > pkg.row) maxRow = Math.min(maxRow, other.row - pkg.height);
        }

        if (overlapRow) {
            if (other.col < pkg.col) minCol = Math.max(minCol, other.col + other.width);
            if (other.col > pkg.col) maxCol = Math.min(maxCol, other.col - pkg.width);
        }
    }

    return { minRow, maxRow, minCol, maxCol };
}

function drawPackages() {
    packages.forEach(p => {
        // Colore pacco
        ctx.fillStyle = p.isDragging ? withAlpha(p.color, 0.6) : p.color;
        ctx.fillRect(p.col * CELL_SIZE, p.row * CELL_SIZE, p.width * CELL_SIZE, p.height * CELL_SIZE);

        // Bordo pacco
        ctx.strokeStyle = "#333";
        ctx.strokeRect(p.col * CELL_SIZE, p.row * CELL_SIZE, p.width * CELL_SIZE, p.height * CELL_SIZE);

        // Etichetta numero civico
        const label = p.civic; // solo numero
        ctx.font = "12px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        const paddingX = 4; // più largo orizzontalmente
        const paddingY = 2; // verticalmente
        const radius = 4;
        const textWidth = ctx.measureText(label).width;
        const textHeight = 12; // font size

        // Box arrotondato più largo del testo
        ctx.fillStyle = "#fff7e6"; // crema chiaro
        roundRect(
            ctx,
            p.col * CELL_SIZE + 1,
            p.row * CELL_SIZE + 1,
            textWidth + paddingX * 2,
            textHeight + paddingY * 2,
            radius
        );
        ctx.fill();

        // Testo sopra il box
        ctx.fillStyle = "#000";
        ctx.fillText(
            label,
            p.col * CELL_SIZE + paddingX + 1,
            p.row * CELL_SIZE + paddingY + 1
        );
    });
}

// Funzione helper per rettangolo arrotondato
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}
function withAlpha(color, alpha = 0.6) {
    if (color.startsWith("#")) {
        // Converti hex in rgb
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
    if (color.startsWith("rgb(")) {
        return color.replace("rgb(", "rgba(").replace(")", `,${alpha})`);
    }
    return color;
}

let selectedPackage = null;
let offsetX, offsetY;
let longPressTimer = null;
let longPressTriggered = false;
let touchStartTime = 0;

const infoBox = document.createElement('div');
infoBox.id = "infoBox";
Object.assign(infoBox.style, {
    position: "absolute",
    background: "rgba(0,0,0,0.8)",
    color: "#fff",
    padding: "8px",
    borderRadius: "6px",
    pointerEvents: "none",
    display: "none",
});
document.body.appendChild(infoBox);
// Mostra info pacco
function showPackageInfo(pkg, x, y) {
    infoBox.innerHTML = `
        <strong>Destinatario:</strong> ${pkg.recipient}<br>
        <strong>Via:</strong> ${pkg.street}<br>
        <strong>Civico:</strong> ${pkg.civic}
    `;

    // Larghezza e altezza dell'infoBox
    infoBox.style.display = "block"; // serve per calcolare dimensioni
    const boxWidth = infoBox.offsetWidth;
    const boxHeight = infoBox.offsetHeight;

    // Coordinate iniziali
    let left = x + 10;
    let top = y + 10;

    // Correggi se esce a destra
    if (left + boxWidth > canvas.width) {
        left = x - boxWidth - 10;
        if (left < 0) left = 0;
    }

    // Correggi se esce in basso
    if (top + boxHeight > canvas.height) {
        top = y - boxHeight - 10;
        if (top < 0) top = 0;
    }

    infoBox.style.left = `${left}px`;
    infoBox.style.top = `${top}px`;
}


// ===== Drag / tap / long press =====
function startDrag(e) {
    if (mode !== "pacchi" && mode !== "consegna") return;

    const { x, y } = getEventCoords(e);
    const { row, col } = getCellFromCoords(x, y);

    selectedPackage = packages.find(p => isInsidePackage(p, row, col));
    if (!selectedPackage) return;

    selectedPackage.isDragging = true;
    longPressTriggered = false;
    offsetX = col - selectedPackage.col;
    offsetY = row - selectedPackage.row;
    touchStartTime = Date.now();

    selectedPackage.wasInsideVan = (
        selectedPackage.row >= VAN_TOP &&
        selectedPackage.row + selectedPackage.height <= VAN_BOTTOM &&
        selectedPackage.col >= VAN_LEFT &&
        selectedPackage.col + selectedPackage.width <= VAN_RIGHT
    );

    longPressTimer = setTimeout(() => {
        longPressTriggered = true;
        showPackageInfo(selectedPackage, x, y);
        selectedPackage.isDragging = false; // blocca drag durante info
    }, 500);
}

function dragPackage(e) {
    if (!selectedPackage || !selectedPackage.isDragging) return;
    clearTimeout(longPressTimer);

    const { row, col } = getCellFromCoords(...Object.values(getEventCoords(e)));
    let newRow = row - offsetY;
    let newCol = col - offsetX;

    if (mode === "consegna") {
        const insideVan =
            newRow >= VAN_TOP &&
            newRow + selectedPackage.height <= VAN_BOTTOM +4 &&
            newCol >= VAN_LEFT -1 &&
            newCol + selectedPackage.width <= VAN_RIGHT +1;
        if (!insideVan) return; // ⛔ durante il drag solo furgone 
    }

    // Limiti canvas
    if (
        newRow < 0 ||
        newCol < 0 ||
        newRow + selectedPackage.height > ROWS ||
        newCol + selectedPackage.width > COLS
    ) return;

    const pkgTop = newRow;
    const pkgBottom = newRow + selectedPackage.height;

    // Sliding-block logic applicata sempre, ovunque
    const area = getFreeArea(selectedPackage);
    newRow = Math.max(area.minRow, Math.min(newRow, area.maxRow));
    newCol = Math.max(area.minCol, Math.min(newCol, area.maxCol));

    // Vincolo laterale: se il pacco è sulle righe del furgone, non può oltrepassare i muri
    if (pkgBottom > VAN_TOP && pkgTop < VAN_BOTTOM) {
        if (newCol < VAN_LEFT) newCol = VAN_LEFT;
        if (newCol + selectedPackage.width > VAN_RIGHT) newCol = VAN_RIGHT - selectedPackage.width;
    }
    // 🚨 Vincolo laterale se il pacco era stato preso dentro il furgone
    if (selectedPackage.wasInsideVan) {
        if (newCol < VAN_LEFT) newCol = VAN_LEFT;
        if (newCol + selectedPackage.width > VAN_RIGHT) newCol = VAN_RIGHT - selectedPackage.width;
    }

    // Movimento valido 
    selectedPackage.row = newRow;
    selectedPackage.col = newCol;
    draw();
}
function endDrag(e) {
    if (!selectedPackage) return;

    clearTimeout(longPressTimer);

    const elapsed = Date.now() - touchStartTime;

    // Coordinate di rilascio (SERVONO PRIMA)
    const rect = canvas.getBoundingClientRect();
    const releaseX =
        (e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - rect.left;
    const releaseY =
        (e.changedTouches ? e.changedTouches[0].clientY : e.clientY) - rect.top;

    // Tap breve → ruota pacco solo se non è scattato il long press
    if (elapsed < 500 && !longPressTriggered) {
        selectedPackage.rotate();
        draw();
    }

    // LOGICA CONSEGNA
    if (mode === "consegna") {

        // BUFFER
        if (
            pointInsideZone(releaseX, releaseY, BUFFER_ZONE) &&
            !isZoneOccupied(BUFFER_ZONE, selectedPackage)
        ) {
            snapToZone(selectedPackage, BUFFER_ZONE);
        }

        // CONSEGNA
        else if (
            pointInsideZone(releaseX, releaseY, DELIVERY_ZONE) &&
            !isZoneOccupied(DELIVERY_ZONE, selectedPackage)
        ) {
            snapToZone(selectedPackage, DELIVERY_ZONE);
        }

        // altrimenti resta dov'è (cioè nel furgone)
        draw();
    }

    selectedPackage.isDragging = false;
    selectedPackage = null;
}

function pointInsideZone(x, y, zone) {
    return (
        x >= zone.col * CELL_SIZE &&
        x <= (zone.col + zone.cols) * CELL_SIZE &&
        y >= zone.row * CELL_SIZE &&
        y <= (zone.row + zone.rows) * CELL_SIZE
    );
}

function cannotPass(pkg, other) { // spazio libero laterale nel furgone 
    const freeSpace = FUR_COLS - other.width;
    return pkg.width > freeSpace;
}

// ===== Helper =====
function getEventCoords(e) {
    if (e.touches && e.touches.length > 0) {
        const t = e.touches[0];
        return { x: t.clientX, y: t.clientY };
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        return { x: t.clientX, y: t.clientY };
    } else {
        return { x: e.clientX, y: e.clientY };
    }
}

function getCellFromCoords(x, y) {
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((x - rect.left) / CELL_SIZE);
    const row = Math.floor((y - rect.top) / CELL_SIZE);
    return { row, col };
}

function isInsideZone(pkg, zone) {
    return (
        pkg.row >= zone.row &&
        pkg.col >= zone.col &&
        pkg.row + pkg.height <= zone.row + zone.rows &&
        pkg.col + pkg.width <= zone.col + zone.cols
    );
}

function isZoneOccupied(zone, exceptPkg = null) {
    return packages.some(p => {
        if (p === exceptPkg) return false;
        return isInsideZone(p, zone);
    });
}

function snapToZone(pkg, zone) {
    // Controlla se almeno una cella del pacco è sopra la zona
    const intersects =
        pkg.row < zone.row + zone.rows &&
        pkg.row + pkg.height > zone.row &&
        pkg.col < zone.col + zone.cols &&
        pkg.col + pkg.width > zone.col;

    if (intersects) {
        // Snap: allinea il pacco in alto a sinistra della zona
        pkg.row = zone.row;
        pkg.col = zone.col;
    }
}

// ===== Eventi =====
canvas.addEventListener('mousedown', startDrag);
canvas.addEventListener('mousemove', dragPackage);
canvas.addEventListener('mouseup', endDrag);
canvas.addEventListener('mouseleave', endDrag);

canvas.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e); infoBox.style.display = "none"; });
canvas.addEventListener('touchmove', e => { e.preventDefault(); dragPackage(e); });
canvas.addEventListener('touchend', e => { e.preventDefault(); endDrag(e); });
canvas.addEventListener('touchcancel', e => { e.preventDefault(); endDrag(e); });

// helper
function getCellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { col: Math.floor(x / CELL_SIZE), row: Math.floor(y / CELL_SIZE) };
}

function isInsidePackage(p, row, col) {
    return row >= p.row && row < p.row + p.height && col >= p.col && col < p.col + p.width;
}

function checkCollisionLimit(pkg, newRow, newCol) {
    let maxRow = 0; // riga massima libera 
    for (let other of packages) {
        if (other.id === pkg.id) continue; const overlapCol = newCol < other.col + other.width && newCol + pkg.width > other.col; if (!overlapCol) continue; const overlapRow = newRow < other.row + other.height && newRow + pkg.height > other.row; if (overlapRow) {
            if (pkg.width + other.width > FUR_COLS) { // blocca tutte le righe sopra
                maxRow = Math.max(maxRow, other.row + other.height);
            } else { // collisione normale: blocca solo quella riga 
                maxRow = Math.max(maxRow, newRow);
            }
        }
    } return maxRow;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mode === "mappa") {
        drawMap();
    } else if (mode === "pacchi") {
        drawVanArea();
        drawPackages();
    } else if (mode === "consegna") {
        drawDeliveryZones();
        blockOutsideCells();
        drawVanArea();
        drawPackages();
    }
}

function drawDeliveryZones() {
    const cellSize = CELL_SIZE;

    // Esempio: zona consegna a destra del furgone
    const deliveryStartCol = VAN_RIGHT -2;
    const deliveryStartRow = VAN_TOP +11;
    ctx.fillStyle = "rgba(0,255,0,0.3)"; // verde trasparente
    for (let r = deliveryStartRow; r < deliveryStartRow + 3; r++) {
        for (let c = deliveryStartCol; c < deliveryStartCol + 3; c++) {
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
    }

    // Zona buffer / marciapiede a sinistra
    const bufferStartCol = VAN_LEFT -1;
    const bufferStartRow = VAN_TOP +11;
    ctx.fillStyle = "rgba(0,0,255,0.3)"; // blu trasparente
    for (let r = bufferStartRow; r < bufferStartRow + 3; r++) {
        for (let c = bufferStartCol; c < bufferStartCol + 3; c++) {
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
    }
}

function blockOutsideCells() {
    const cellSize = CELL_SIZE;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (
                r >= VAN_TOP && r < VAN_BOTTOM &&
                c >= VAN_LEFT && c < VAN_RIGHT
            ) continue; // furgone, lasciamo libera
            if (
                r >= VAN_TOP +11 && r < VAN_TOP + 14 && c >= VAN_RIGHT -2 && c < VAN_RIGHT + 1
            ) continue; // consegna
            if (
                r >= VAN_TOP +11 && r < VAN_TOP + 14 && c >= VAN_LEFT - 1 && c < VAN_LEFT +2
            ) continue; // buffer
            // Tutto il resto è bloccato
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
    }
}

// Passa a modalità mappa
// Toggle modalità mappa con il pulsante "Mappa"

// Controlla se tutti i pacchi sono nel furgone
function allPackagesInVan() {
    return packages.every(p => {
        return (
            p.row >= vanGrid.row &&
            p.row + p.height <= vanGrid.row + FUR_ROWS &&
            p.col >= vanGrid.col &&
            p.col + p.width <= vanGrid.col + FUR_COLS
        );
    });
}

placePackages();
draw();
