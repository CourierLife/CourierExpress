const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ROWS = 25;
const COLS = 15;

const FUR_ROWS = 10; // altezza furgone
const FUR_COLS = 5;  // larghezza furgone
let vanGrid = { row: 0, col: Math.floor((COLS - FUR_COLS) / 2) };

let mode = "pacchi"; // modalità iniziale

// Coordinate del furgone sul canvas
const VAN_TOP = vanGrid.row;                 // 0
const VAN_BOTTOM = vanGrid.row + FUR_ROWS;  // 10
const VAN_LEFT = vanGrid.col;               // es. 5
const VAN_RIGHT = vanGrid.col + FUR_COLS;   // es. 10

// Dimensioni dell’area di carico sotto il furgone
const LOAD_ROWS = ROWS - FUR_ROWS;         // 15 righe sotto il furgone
const LOAD_COLS = COLS;                     // tutte le colonne

// Griglia di consegna (stessa dimensione del furgone)
const DELIVERY_ROWS = FUR_ROWS;
const DELIVERY_COLS = FUR_COLS;
let deliveryGrid = Array.from(
    { length: DELIVERY_ROWS },
    () => Array(DELIVERY_COLS).fill(null)
);
// Spazi sotto la griglia: buffer sinistro, consegna centrale, buffer destro
let deliveryBuffers = [[], [], []]; // array di pacchi

// Adatta CELL_SIZE in base alla larghezza e altezza disponibili
function calculateCellSize() {
    const availableWidth = window.innerWidth * 0.95;
    const availableHeight = window.innerHeight * 0.7; // spazio HUD + controlli

    const cellWidth = Math.floor(availableWidth / COLS);
    const cellHeight = Math.floor(availableHeight / ROWS);

    return Math.min(cellWidth, cellHeight);
}

let CELL_SIZE = calculateCellSize();
canvas.width = COLS * CELL_SIZE;
canvas.height = ROWS * CELL_SIZE;

window.addEventListener('resize', () => {
    CELL_SIZE = calculateCellSize();
    draw(); // basta disegnare di nuovo
});

const BUFFER_ZONE = {
    row: VAN_TOP + 11,
    col: VAN_LEFT - 1,
    rows: 3,
    cols: 3
};

const DELIVERY_ZONE = {
    row: VAN_TOP + 11,
    col: VAN_RIGHT - 2,
    rows: 3,
    cols: 3
};

const rawMap = [
    [2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [1, 0, 1, 1, 0, 1, 1, 1, 6, 5, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 0, 3, 3, 3, 0, 0, 2, 0, 4, 0, 1],
    [1, 0, 0, 0, 0, 1, 1, 1, 6, 5, 2, 6, 1, 0, 1],
    [1, 0, 1, 1, 0, 4, 4, 4, 0, 0, 1, 6, 1, 0, 1],
    [1, 0, 1, 1, 0, 1, 2, 1, 6, 5, 1, 6, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 6, 0, 4, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 6, 5, 1, 5, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 6, 5, 2, 0, 4, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 6, 5, 1, 1, 1, 0, 1],
    [1, 0, 4, 0, 0, 4, 0, 4, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 3, 0, 0, 3, 0, 3, 0, 0, 1, 5, 1, 0, 1],
    [1, 6, 1, 6, 5, 1, 5, 1, 6, 5, 1, 5, 1, 0, 1],
    [1, 0, 3, 0, 0, 3, 0, 3, 0, 0, 1, 5, 1, 0, 1],
    [1, 6, 1, 6, 5, 1, 5, 1, 6, 5, 1, 5, 2, 0, 1],
    [1, 0, 4, 0, 0, 4, 0, 4, 0, 0, 3, 0, 2, 0, 1],
    [1, 6, 1, 6, 5, 1, 5, 1, 6, 5, 1, 1, 1, 0, 1],
    [1, 6, 1, 6, 5, 1, 5, 1, 6, 5, 0, 0, 0, 0, 1],
    [1, 0, 3, 0, 0, 3, 0, 3, 0, 0, 1, 1, 1, 2, 2],
    [1, 6, 1, 6, 5, 1, 5, 1, 6, 5, 0, 0, 0, 0, 1],
    [1, 0, 4, 0, 0, 4, 0, 4, 0, 0, 1, 0, 1, 0, 1],
    [1, 6, 1, 6, 5, 1, 5, 1, 6, 5, 1, 1, 1, 0, 1],
    [2, 0, 3, 0, 0, 3, 0, 3, 0, 0, 0, 0, 0, 0, 2],
    [2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2]
];

const streets = [
    { name: "Via Muggia", start: [20, 10], end: [20, 12] },
    { name: "Via Seychelles", start: [1, 2], end: [1, 8] },
    { name: "Via Bermuda", start: [4, 2], end: [4, 3] },
    { name: "Via Lussemburgo", start: [7, 2], end: [7, 5] },
    { name: "Via Montecarlo", start: [9, 2], end: [9, 7] },
    { name: "Via Hong Kong", start: [2, 4], end: [6, 4] },
    { name: "Via Napoli", start: [12, 1], end: [23, 1] },
    { name: "Via Roma", start: [1, 1], end: [11, 1] },
    { name: "Via Singapore", start: [3, 5], end: [3, 7] },
    { name: "Via Giappone", start: [5, 5], end: [5, 7] },
    { name: "Via Macao", start: [7, 6], end: [8, 6] },
    { name: "Via Bologna", start: [1, 13], end: [18, 13] },
    { name: "Via Staranzano", start: [3, 11], end: [3, 12] },
    { name: "Via Grado", start: [4, 11], end: [8, 11] },
    { name: "Via Fossalon", start: [7, 10], end: [7, 10] },
    { name: "Via Gradisca", start: [9, 11], end: [9, 12] },
    { name: "Via Lignano", start: [1, 9], end: [1, 12] },
    { name: "Via San Luigi", start: [11, 10], end: [11, 12] },
    { name: "Via San Francesco", start: [12, 11], end: [15, 11] },
    { name: "Via San Giusto", start: [16, 10], end: [16, 11] },
    { name: "Via San Giacomo", start: [18, 10], end: [18, 12] },
    { name: "Via Venezia", start: [13, 6], end: [22, 6] },
    { name: "Via Torino", start: [14, 2], end: [14, 7] },
    { name: "Via Firenze", start: [16, 2], end: [16, 7] },
    { name: "Via Ancona", start: [19, 2], end: [19, 7] },
    { name: "Via Potenza", start: [21, 2], end: [21, 7] },
    { name: "Via Modena", start: [20, 13], end: [23, 13] },
    { name: "Via Trieste", start: [2, 8], end: [23, 9] },
    { name: "Viale Milano", start: [11, 2], end: [12, 7] },
    { name: "Viale Nazionale", start: [13, 3], end: [22, 4] },
    { name: "Via Palermo", start: [23, 1], end: [22, 8] },
    { name: "Via San Marco", start: [23, 9], end: [23, 13] },

];

function addCivicToStreet(row, col, civics) {
    const tile = mapData[row][col];
    if (!tile || !ROAD_TYPES.includes(tile.type)) return;

    if (!tile.civics) tile.civics = [];

    // civics è un array tipo: [{ number: "1", bells: 3, recipients: [...] }, ...]
    tile.civics.push(...civics);
}

function loadStreetCivics() {
    addCivicToStreet(1, 8, [
        { number: "1", bells: 5 },
    ]);
    addCivicToStreet(1, 7, [
        { number: "3", bells: 5 },
        { number: "2", bells: 3 }
    ]);
    addCivicToStreet(1, 6, [
        { number: "5", bells: 5 },
        { number: "4", bells: 3 }
    ]);
    addCivicToStreet(1, 5, [
        { number: "7", bells: 5 },
        { number: "6", bells: 3 }
    ]);
    addCivicToStreet(1, 4, [
        { number: "9", bells: 5 },
    ]);
    addCivicToStreet(1, 3, [
        { number: "11", bells: 5 },
        { number: "8", bells: 3 },
        { number: "8/1", bells: 3 },
    ]);
    addCivicToStreet(1, 2, [
        { number: "13", bells: 5 },
        { number: "10", bells: 3 },
        { number: "10/1", bells: 3 },

    ]);
    addCivicToStreet(3, 7, [
        { number: "1", bells: 3 },
        { number: "2", bells: 3 }
    ]);
    addCivicToStreet(3, 6, [
        { number: "3", bells: 3 },
        { number: "4", bells: 3 }
    ]);
    addCivicToStreet(3, 5, [
        { number: "5", bells: 3 },
        { number: "6", bells: 3 }
    ]);
    addCivicToStreet(5, 7, [
        { number: "1", bells: 3 },
        { number: "2", bells: 3 }
    ]);
    addCivicToStreet(5, 6, [
        { number: "3", bells: 3 },
        { number: "4", bells: 3 }
    ]);
    addCivicToStreet(5, 5, [
        { number: "5", bells: 3 },
        { number: "6", bells: 3 }
    ]);
    addCivicToStreet(4, 3, [
        { number: "1", bells: 3 },
        { number: "1/1", bells: 3 },
        { number: "2", bells: 3 },
        { number: "2/1", bells: 3 },
    ]);
    addCivicToStreet(4, 2, [
        { number: "3", bells: 3 },
        { number: "3/1", bells: 3 },
        { number: "4", bells: 3},
        { number: "4/1", bells: 3 },

    ]);
    addCivicToStreet(7, 5, [
        { number: "1", bells: 10 },
        { number: "2", bells: 12 },
    ]);
    addCivicToStreet(7, 4, [
        { number: "4", bells: 12 },
    ]);
    addCivicToStreet(7, 3, [
        { number: "3", bells: 3 },
        { number: "3/1", bells: 3 },
        { number: "6", bells: 12 },
    ]);
    addCivicToStreet(7, 2, [
        { number: "5", bells: 3 },
        { number: "5/1", bells: 3 },
        { number: "8", bells: 12 },
    ]);
    addCivicToStreet(9, 7, [
        { number: "1", bells: 15 },
        { number: "2", bells: 8 },
    ]);
    addCivicToStreet(9, 6, [
        { number: "4", bells: 8 },
    ]); addCivicToStreet(9, 5, [
        { number: "3", bells: 12 },
        { number: "6", bells: 8 },
    ]); addCivicToStreet(9, 4, [
        { number: "5", bells: 12 },
        { number: "8", bells: 8 },
    ]); addCivicToStreet(9, 3, [
        { number: "7", bells: 12 },
        { number: "10", bells: 8 },
    ]); addCivicToStreet(9, 2, [
        { number: "9", bells: 12 },
        { number: "12", bells: 8 },
    ]);
}

const mapData = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({
        type: rawMap[r][c],
        street: null,
        numbers: null
    }))
);

class Package {
    constructor(id, width, height, street, civic, recipient) {
        this.id = id;
        this.width = width;
        this.height = height;
        this.row = null; // posizionato in griglia
        this.col = null;
        this.street = street;
        this.civic = civic;
        this.recipient = recipient;
        this.isDragging = false;
        this.rotation = 0; // 0 = originale, 1 = ruotato 90°
    }

    rotate() {
        const originalWidth = this.width;
        const originalHeight = this.height;
        const originalRotation = this.rotation;
        const originalCol = this.col;
        const originalRow = this.row;

        // Proviamo a ruotare
        [this.width, this.height] = [this.height, this.width];
        this.rotation = (this.rotation + 1) % 2;

        const collides = () => {
            // Controllo collisione con altri pacchi
            const overlapWithPackages = packages.some(p => {
                if (p === this) return false;
                const overlapCol = this.col < p.col + p.width && this.col + this.width > p.col;
                const overlapRow = this.row < p.row + p.height && this.row + this.height > p.row;
                return overlapCol && overlapRow;
            });

            // Controllo limiti furgone solo se il pacco era dentro il furgone
            let insideVanCheck = true;
            if (this.wasInsideVan) {
                insideVanCheck =
                    this.col >= VAN_LEFT &&
                    this.col + this.width <= VAN_RIGHT &&
                    this.row >= VAN_TOP &&
                    this.row + this.height <= VAN_BOTTOM;
            }

            return overlapWithPackages || !insideVanCheck;
        };

        // Se non collide, ok
        if (!collides()) return;

        // Altrimenti proviamo piccoli spostamenti
        const shifts = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [-1, -1], [1, -1], [-1, 1]
        ];

        for (let [dx, dy] of shifts) {
            this.col += dx;
            this.row += dy;
            if (!collides()) return; // trovato spazio, conferma rotazione
            this.col -= dx;
            this.row -= dy; // rollback
        }

        // Se qui, nessuno spostamento ha funzionato → annulla rotazione
        this.width = originalWidth;
        this.height = originalHeight;
        this.rotation = originalRotation;
        this.col = originalCol;
        this.row = originalRow;
    }

}

const PACKAGE_TYPES = [
    { w: 3, h: 3, count: 1 },
   // { w: 3, h: 2, count: 2 },
   // { w: 2, h: 2, count: 3 },
   // { w: 2, h: 1, count: 4 },
   // { w: 1, h: 1, count: 6 },
];

const ROAD_TYPES = [0, 3, 4, 5, 6];

function assignStreetNames(mapData, streets) {
    streets.forEach(street => {
        const [r1, c1] = street.start;
        const [r2, c2] = street.end;

        const rMin = Math.min(r1, r2);
        const rMax = Math.max(r1, r2);
        const cMin = Math.min(c1, c2);
        const cMax = Math.max(c1, c2);

        for (let r = rMin; r <= rMax; r++) {
            for (let c = cMin; c <= cMax; c++) {
                const tile = mapData[r][c];
                if (!tile) continue;

                if (ROAD_TYPES.includes(tile.type)) {
                    tile.street = street.name;

                    // inizializza array civics se non esiste
                    if (!tile.civics) tile.civics = [];
                }
            }
        }
    });
}

function assignRecipientsToCivics(mapData, cognomi) {
    for (let r = 0; r < mapData.length; r++) {
        for (let c = 0; c < mapData[r].length; c++) {
            const tile = mapData[r][c];
            if (!tile || !ROAD_TYPES.includes(tile.type) || !tile.civics) continue;

            tile.civics.forEach(civic => {
                civic.recipients = getRandomUniqueCognomi(cognomi, civic.bells);
            });
        }
    }
}

function generateBellList(mapData) {
    const bellList = [];

    for (let r = 0; r < mapData.length; r++) {
        for (let c = 0; c < mapData[r].length; c++) {
            const tile = mapData[r][c];
            if (!tile || !ROAD_TYPES.includes(tile.type) || !tile.civics || !tile.street) continue;

            tile.civics.forEach(civic => {
                if (!civic.recipients) return;

                civic.recipients.forEach(recipient => {
                    bellList.push({
                        street: tile.street,
                        civic: civic.number,
                        recipient
                    });
                });
            });
        }
    }

    return bellList;
}

function getRandomUniqueCognomi(cognomi, count) {
    if (count >= cognomi.length) {
        // fallback: shuffle e prendili tutti
        return [...cognomi].sort(() => Math.random() - 0.5);
    }

    const shuffled = [...cognomi].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}


function shuffle(array) {
    return [...array].sort(() => Math.random() - 0.5);
}

function randomSoftColor() {
    const hue = Math.floor(Math.random() * 360); // tonalità
    const saturation = 40 + Math.random() * 20; // 40–60%
    const lightness = 60 + Math.random() * 15;  // 60–75%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function generatePackagesFromBellList(bellList) {
    const shuffled = [...bellList].sort(() => Math.random() - 0.5);
    const packages = [];
    let id = 1;
    let index = 0;

    const totalPackages = PACKAGE_TYPES.reduce((s, p) => s + p.count, 0);

    if (shuffled.length < totalPackages) {
        console.warn("⚠️ Destinatari insufficienti per il numero di pacchi");
    }

    for (const type of PACKAGE_TYPES) {
        for (let i = 0; i < type.count; i++) {
            if (!shuffled[index]) break;

            const dest = shuffled[index++];

            const pkg = new Package(
                id++,
                type.w,
                type.h,
                dest.street,
                dest.civic,
                [dest.recipient]
            );

            // 🎨 colore assegnato UNA VOLTA
            pkg.color = randomSoftColor();

            packages.push(pkg);
        }
    }

    return packages;
}

assignStreetNames(mapData, streets);
loadStreetCivics();
assignRecipientsToCivics(mapData, cognomi);

const bellList = generateBellList(mapData); // prende tutti i civici con destinatari
const packages = generatePackagesFromBellList(bellList); // genera i pacchi
console.log(packages);
console.log(bellList);
console.log(
    mapData.flat().filter(t => t.type === 1 && t.street && t.numbers)
);

// Ora iniziale del timer (ore e minuti)
let gameHours = 9;
let gameMinutes = 0;
let timerInterval = null;

// Funzione per aggiornare il timer
function updateTimer() {
    gameMinutes++;

    if (gameMinutes >= 60) {
        gameMinutes = 0;
        gameHours++;
    }

    const displayHours = String(gameHours).padStart(2, "0");
    const displayMinutes = String(gameMinutes).padStart(2, "0");
    document.getElementById("timer").innerText = `${displayHours}:${displayMinutes}`;

    // Fine turno
    if ((gameHours === 18 && gameMinutes === 30) || packages.length === 0) {
        clearInterval(timerInterval);
        console.log("Timer fermo!");
    }
}

// Parte quando premi il pulsante "Partenza"
document.getElementById("completeButton").addEventListener("click", () => {
    if (!timerInterval) { // evita di avviare più intervalli
        timerInterval = setInterval(updateTimer, 1000); // 1 secondo reale = 1 minuto di gioco
    }
});

// Interrompe automaticamente quando consegni l'ultimo pacco
function onPackageDelivered(deliveredIndex) {
    packages.splice(deliveredIndex, 1);

    if (packages.length === 0 && timerInterval) {
        clearInterval(timerInterval);
        console.log("Ultimo pacco consegnato, timer fermo!");
    }
}
document.getElementById('mapButton').addEventListener('click', () => {
    console.log("Premuto mappa, prima:", mode);
    if (mode === "mappa") {
        mode = "pacchi";
    } else {
        mode = "mappa";
    }
    draw();
    console.log("Modalità attuale:", mode);
});

// Pulsante "Carico completato"
document.getElementById('completeButton').addEventListener('click', () => {
    if (allPackagesInVan()) {
        mode = "mappa"; // switch automatico alla modalità mappa
        draw();
        document.getElementById('startButton').style.display = "none";
        document.getElementById('moveControls').style.display = "block";
        document.getElementById('deliveryButtonContainer').style.display = "block";
    } else {
        alert("Ci sono ancora pacchi da caricare nel furgone!");
    }
    console.log("Modalità attuale:", mode);
});

document.getElementById('deliveryButton').addEventListener('click', () => {
    mode = "consegna";
    draw();
    console.log("Modalità attuale:", mode);

    // Nascondi pulsanti di movimento + vecchia consegna
    document.getElementById('moveControls').style.display = "none";
    document.getElementById('deliveryButton').style.display = "none";
    // Mostra pulsanti guida + consegna
    document.getElementById('deliveryControls').style.display = "block";
});

// Se vuoi aggiungere la possibilità di tornare indietro (facoltativo)
document.getElementById('driveButton').addEventListener('click', () => {
    mode = "mappa"; // o altra modalità che vuoi
    draw();

    // Ripristina i pulsanti originali
    document.getElementById('moveControls').style.display = "block";
    document.getElementById('deliveryButton').style.display = "block";
    document.getElementById('deliveryControls').style.display = "none";
});
// Mostra la finestra delle regole all'avvio
window.addEventListener('load', () => {
    document.getElementById('rulesModal').style.display = "flex";
});

// Chiudi la finestra e inizia il gioco
document.getElementById('startGameButton').addEventListener('click', () => {
    document.getElementById('rulesModal').style.display = "none";
});
