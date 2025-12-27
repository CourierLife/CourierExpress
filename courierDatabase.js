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
    [1, 0, 1, 1, 0, 3, 3, 3, 0, 0, 2, 0, 3, 0, 1],
    [1, 0, 0, 0, 0, 1, 1, 1, 6, 5, 1, 5, 1, 0, 1],
    [1, 0, 1, 1, 0, 4, 4, 4, 0, 0, 2, 5, 1, 0, 1],
    [1, 0, 1, 1, 0, 1, 2, 1, 6, 5, 3, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 6, 0, 2, 6, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 6, 5, 1, 6, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 6, 5, 2, 0, 3, 0, 1],
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
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
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
    { name: "Via Caraibi", start: [1, 1], end: [11, 1] },
    { name: "Via Singapore", start: [3, 5], end: [3, 7] },
    { name: "Via Giappone", start: [5, 5], end: [5, 7] },
    { name: "Via Liechtenstein", start: [7, 6], end: [8, 6] },
    { name: "Via San Francesco", start: [1, 13], end: [11, 13] },
    { name: "Via San Luigi", start: [3, 11], end: [3, 12] },
    { name: "Via San Marco", start: [6, 10], end: [6, 11] },
    { name: "Via San Marco", start: [4, 11], end: [8, 11] },
    { name: "Via San Giacomo", start: [9, 11], end: [9, 12] },
    { name: "Via San Giovanni", start: [1, 9], end: [1, 12] },
    { name: "Via San Giusto", start: [11, 10], end: [11, 12] },
    { name: "Via Staranzano", start: [12, 11], end: [15, 11] },
    { name: "Via Fossalon", start: [16, 10], end: [16, 11] },
    { name: "Via Lignano", start: [18, 10], end: [18, 12] },
    { name: "Via Grado", start: [12, 13], end: [18, 13] },
    { name: "Via Venezia", start: [13, 6], end: [22, 6] },
    { name: "Via Torino", start: [14, 2], end: [14, 7] },
    { name: "Via Firenze", start: [16, 2], end: [16, 7] },
    { name: "Via Ancona", start: [19, 2], end: [19, 7] },
    { name: "Via Potenza", start: [21, 2], end: [21, 7] },
    { name: "Via Sgonico", start: [20, 13], end: [23, 13] },
    { name: "Via Trieste", start: [2, 8], end: [23, 9] },
    { name: "Viale Milano", start: [11, 2], end: [12, 7] },
    { name: "Viale Nazionale", start: [13, 3], end: [22, 4] },
    { name: "Via Palermo", start: [23, 1], end: [23, 8] },
    { name: "Via Prosecco", start: [23, 9], end: [23, 13] },

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
        { number: "2", bells: 3 },
        { number: "3", bells: 5 }
    ]);
    addCivicToStreet(1, 6, [
        { number: "4", bells: 3 },
        { number: "5", bells: 5 }
    ]);
    addCivicToStreet(1, 5, [
        { number: "6", bells: 3 },
        { number: "7", bells: 5 }
    ]);
    addCivicToStreet(1, 4, [
        { number: "9", bells: 5 },
    ]);
    addCivicToStreet(1, 3, [
        { number: "8", bells: 3 },
        { number: "8/1", bells: 3 },
        { number: "11", bells: 5 },
    ]);
    addCivicToStreet(1, 2, [
        { number: "10", bells: 3 },
        { number: "10/1", bells: 3 },
        { number: "13", bells: 5 },
    ]);
    addCivicToStreet(3, 7, [
        { number: "2", bells: 3 },
        { number: "1", bells: 3 },
    ]);
    addCivicToStreet(3, 6, [
        { number: "4", bells: 3 },
        { number: "3", bells: 3 }
    ]);
    addCivicToStreet(3, 5, [
        { number: "6", bells: 3 },
        { number: "5", bells: 3 }
    ]);
    addCivicToStreet(5, 7, [
        { number: "2", bells: 3 },
        { number: "1", bells: 3 }
    ]);
    addCivicToStreet(5, 6, [
        { number: "3", bells: 3 }
    ]);
    addCivicToStreet(5, 5, [
        { number: "4", bells: 3 },
        { number: "5", bells: 3 }
    ]);
    addCivicToStreet(4, 3, [
        { number: "2", bells: 3 },
        { number: "2/1", bells: 3 },
        { number: "1", bells: 3 },
        { number: "1/1", bells: 3 },
    ]);
    addCivicToStreet(4, 2, [
        { number: "4", bells: 3 },
        { number: "4/1", bells: 3 },
        { number: "3", bells: 3 },
        { number: "3/1", bells: 3 },
    ]);
    addCivicToStreet(7, 5, [
        { number: "2", bells: 12 },
        { number: "1", bells: 10 },
    ]);
    addCivicToStreet(7, 4, [
        { number: "4", bells: 12 },
    ]);
    addCivicToStreet(7, 3, [
        { number: "6", bells: 12 },
        { number: "3", bells: 3 },
        { number: "3/1", bells: 3 },
    ]);
    addCivicToStreet(7, 2, [
        { number: "8", bells: 12 },
        { number: "5", bells: 3 },
        { number: "5/1", bells: 3 },
    ]);
    addCivicToStreet(9, 7, [
        { number: "2", bells: 8 },
        { number: "1", bells: 15 },
    ]);
    addCivicToStreet(9, 6, [
        { number: "4", bells: 8 },
    ]);
    addCivicToStreet(9, 5, [
        { number: "6", bells: 8 },
        { number: "3", bells: 12 },
    ]);
    addCivicToStreet(9, 4, [
        { number: "8", bells: 8 },
        { number: "5", bells: 12 },
    ]);
    addCivicToStreet(9, 3, [
        { number: "10", bells: 8 },
        { number: "7", bells: 12 },
    ]);
    addCivicToStreet(9, 2, [
        { number: "12", bells: 8 },
        { number: "9", bells: 12 },
    ]);
    addCivicToStreet(11, 1, [
        { number: "2", bells: 5 },
    ]);
    addCivicToStreet(10, 1, [
        { number: "4", bells: 5 },
        { number: "1", bells: 12 },
    ]);
    addCivicToStreet(9, 1, [
        { number: "6", bells: 5 },
    ]);
    addCivicToStreet(8, 1, [
        { number: "8", bells: 5 },
        { number: "3", bells: 12 },
    ]);
    addCivicToStreet(7, 1, [
        { number: "10", bells: 5 },
    ]);
    addCivicToStreet(6, 1, [
        { number: "12", bells: 5 },
        { number: "5", bells: 3 },
        { number: "5/1", bells: 3 },
    ]);
    addCivicToStreet(5, 1, [
        { number: "14", bells: 5 },
        { number: "7", bells: 3 },
        { number: "7/1", bells: 3 },
    ]);
    addCivicToStreet(4, 1, [
        { number: "16", bells: 5 },
    ]);
    addCivicToStreet(3, 1, [
        { number: "18", bells: 5 },
        { number: "9", bells: 3 },
        { number: "9/1", bells: 3 },
    ]);
    addCivicToStreet(2, 1, [
        { number: "20", bells: 5 },
        { number: "11", bells: 3 },
        { number: "11/1", bells: 3 },
    ]);
    addCivicToStreet(6, 4, [
        { number: "2", bells: 3 },
        { number: "2/1", bells: 3 },
        { number: "1", bells: 10 },
    ]);
    addCivicToStreet(5, 4, [
        { number: "4", bells: 3 },
        { number: "4/1", bells: 3 },
    ]);
    addCivicToStreet(4, 4, [
        { number: "3", bells: 3 },
    ]);
    addCivicToStreet(3, 4, [
        { number: "6", bells: 3 },
        { number: "6/1", bells: 3 },
    ]);
    addCivicToStreet(2, 4, [
        { number: "8", bells: 3 },
        { number: "8/1", bells: 3 },
        { number: "5", bells: 3 },

    ]);
    addCivicToStreet(8, 6, [
        { number: "2", bells: 12 },
        { number: "1", bells: 6 },
    ]);
    addCivicToStreet(7, 6, [
        { number: "3", bells: 6 },
    ]);

    addCivicToStreet(22, 8, [
        { number: "2", bells: 9 },
    ]);
    addCivicToStreet(20, 8, [
        { number: "4", bells: 20 },
    ]);
    addCivicToStreet(18, 8, [
        { number: "6", bells: 20 },
    ]);
    addCivicToStreet(17, 8, [
        { number: "8", bells: 20 },
    ]);
    addCivicToStreet(15, 8, [
        { number: "10", bells: 8 },
    ]);
    addCivicToStreet(13, 8, [
        { number: "12", bells: 10 },
    ]);
    addCivicToStreet(10, 8, [
        { number: "14", bells: 8 },
    ]);
    addCivicToStreet(8, 8, [
        { number: "16", bells: 6 },
    ]);
    addCivicToStreet(7, 8, [
        { number: "18", bells: 6 },
    ]);
    addCivicToStreet(6, 8, [
        { number: "20", bells: 6 },
    ]);
    addCivicToStreet(4, 8, [
        { number: "22", bells: 3 },
    ]);
    addCivicToStreet(2, 8, [
        { number: "24", bells: 3 },
    ]);
    addCivicToStreet(22, 9, [
        { number: "1", bells: 7 },
    ]);
    addCivicToStreet(21, 9, [
        { number: "3", bells: 7 },
    ]);
    addCivicToStreet(19, 9, [
        { number: "5", bells: 12 },
    ]);
    addCivicToStreet(17, 9, [
        { number: "7", bells: 10 },
    ]);
    addCivicToStreet(15, 9, [
        { number: "9", bells: 12 },
    ]);
    addCivicToStreet(14, 9, [
        { number: "11", bells: 12 },
    ]);
    addCivicToStreet(13, 9, [
        { number: "13", bells: 12 },
    ]);
    addCivicToStreet(12, 9, [
        { number: "15", bells: 12 },
    ]);
    addCivicToStreet(10, 9, [
        { number: "17", bells: 6 },
    ]);
    addCivicToStreet(8, 9, [
        { number: "19", bells: 4 },
        { number: "19/1", bells: 4 },
    ]);
    addCivicToStreet(4, 9, [
        { number: "21", bells: 4 },
        { number: "21/1", bells: 4 },
    ]);
    addCivicToStreet(2, 9, [
        { number: "23", bells: 6 },
    ]);
    addCivicToStreet(1, 9, [
        { number: "2", bells: 5 },
    ]);
    addCivicToStreet(1, 10, [
        { number: "4", bells: 5 },
        { number: "1", bells: 6 },
    ]);
    addCivicToStreet(1, 11, [
        { number: "6", bells: 5 },
        { number: "3", bells: 6 },
    ]);
    addCivicToStreet(1, 12, [
        { number: "8", bells: 5 },
        { number: "5", bells: 6 },
    ]);
    addCivicToStreet(3, 11, [
        { number: "2", bells: 6 },
    ]);
    addCivicToStreet(3, 12, [
        { number: "4", bells: 6 },
        { number: "1", bells: 2 },
    ]);
    addCivicToStreet(9, 11, [
        { number: "1", bells: 6 },
    ]);
    addCivicToStreet(9, 12, [
        { number: "2", bells: 2 },
        { number: "3", bells: 6 },
    ]);
    addCivicToStreet(8, 11, [
        { number: "2", bells: 4 },
        { number: "2/1", bells: 4 },
        { number: "1", bells: 2 },
        { number: "1/1", bells: 2 },
    ]);
    addCivicToStreet(7, 11, [
        { number: "3", bells: 2 },
        { number: "3/1", bells: 2 },
    ]);
    addCivicToStreet(6, 11, [
        { number: "5", bells: 2 },
        { number: "5/1", bells: 2 },
    ]);
    addCivicToStreet(5, 11, [
        { number: "7", bells: 2 },
        { number: "7/1", bells: 2 },
    ]);
    addCivicToStreet(4, 11, [
        { number: "4", bells: 4 },
        { number: "4/1", bells: 4 },
        { number: "9", bells: 2 },
        { number: "9/1", bells: 2 },
    ]);
    addCivicToStreet(11, 13, [
        { number: "1", bells: 5 },
    ]);
    addCivicToStreet(10, 13, [
        { number: "2", bells: 6 },
        { number: "3", bells: 5 },
    ]);
    addCivicToStreet(9, 13, [
        { number: "5", bells: 5 },
    ]);
    addCivicToStreet(8, 13, [
        { number: "4", bells: 2 },
        { number: "4/1", bells: 2 },
        { number: "7", bells: 5 },
    ]);
    addCivicToStreet(7, 13, [
        { number: "6", bells: 2 },
        { number: "6/1", bells: 2 },
        { number: "9", bells: 5 },
    ]);
    addCivicToStreet(6, 13, [
        { number: "8", bells: 2 },
        { number: "8/1", bells: 2 },
        { number: "11", bells: 5 },
    ]);
    addCivicToStreet(5, 13, [
        { number: "10", bells: 2 },
        { number: "10/1", bells: 2 },
        { number: "13", bells: 5 },
    ]);
    addCivicToStreet(4, 13, [
        { number: "12", bells: 2 },
        { number: "12/1", bells: 2 },
        { number: "15", bells: 5 },
    ]);
    addCivicToStreet(3, 13, [
        { number: "17", bells: 5 },
    ]);
    addCivicToStreet(2, 13, [
        { number: "14", bells: 6 },
        { number: "19", bells: 5 },
    ]);
    addCivicToStreet(11, 10, [
        { number: "2", bells: 6 },
        { number: "1", bells: 12 },
    ]);
    addCivicToStreet(11, 11, [
        { number: "4", bells: 6 },
    ]);
    addCivicToStreet(11, 12, [
        { number: "6", bells: 6 },
        { number: "3", bells: 8 },
    ]);
    addCivicToStreet(16, 10, [
        { number: "2", bells: 12 },
        { number: "1", bells: 10 },
    ]);
    addCivicToStreet(16, 11, [
        { number: "3", bells: 10 },
    ]);
    addCivicToStreet(12, 11, [
        { number: "2", bells: 12 },
        { number: "1", bells: 8 },
    ]);
    addCivicToStreet(13, 11, [
        { number: "4", bells: 12 },
        { number: "3", bells: 8 },
    ]);
    addCivicToStreet(14, 11, [
        { number: "6", bells: 12 },
        { number: "5", bells: 8 },
    ]);
    addCivicToStreet(15, 11, [
        { number: "8", bells: 12 },
    ]);
    addCivicToStreet(12, 13, [
        { number: "2", bells: 5 },
        { number: "1", bells: 8 },
    ]);
    addCivicToStreet(13, 13, [
        { number: "4", bells: 5 },
        { number: "3", bells: 8 },
    ]);
    addCivicToStreet(14, 13, [
        { number: "6", bells: 5 },
        { number: "5", bells: 8 },
    ]);
    addCivicToStreet(15, 13, [
        { number: "8", bells: 5 },
    ]);
    addCivicToStreet(16, 13, [
        { number: "10", bells: 5 },
    ]);
    addCivicToStreet(17, 13, [
        { number: "12", bells: 5 },
        { number: "7", bells: 10 },
    ]);
    addCivicToStreet(18, 13, [
        { number: "14", bells: 5 },
    ]);
    addCivicToStreet(18, 10, [
        { number: "2", bells: 5 },
        { number: "1", bells: 12 },
    ]);
    addCivicToStreet(18, 11, [
        { number: "4", bells: 5 },
        { number: "3", bells: 12 },
    ]);
    addCivicToStreet(18, 12, [
        { number: "6", bells: 5 },
        { number: "5", bells: 12 },
    ]);
    addCivicToStreet(20, 10, [
        { number: "2", bells: 12 },
        { number: "1", bells: 7 },
    ]);
    addCivicToStreet(20, 11, [
        { number: "4", bells: 12 },
    ]);
    addCivicToStreet(20, 12, [
        { number: "6", bells: 12 },
        { number: "3", bells: 7 },
    ]);
    addCivicToStreet(23, 9, [
        { number: "1", bells: 5 },
    ]);
    addCivicToStreet(23, 10, [
        { number: "2", bells: 7 },
        { number: "3", bells: 5 },
    ]);
    addCivicToStreet(23, 11, [
        { number: "4", bells: 7 },
        { number: "5", bells: 5 },
    ]);
    addCivicToStreet(23, 12, [
        { number: "6", bells: 7 },
        { number: "7", bells: 5 },
    ]);
    addCivicToStreet(20, 13, [
        { number: "2", bells: 5 },
    ]);
    addCivicToStreet(21, 13, [
        { number: "4", bells: 5 },
        { number: "1", bells: 7 },
    ]);
    addCivicToStreet(22, 13, [
        { number: "6", bells: 5 },
        { number: "3", bells: 7 },
    ]);
    addCivicToStreet(12, 1, [
        { number: "1", bells: 5 },
    ]);
    addCivicToStreet(13, 1, [
        { number: "2", bells: 10 },
        { number: "3", bells: 5 },
    ]);
    addCivicToStreet(14, 1, [
        { number: "5", bells: 5 },
    ]);
    addCivicToStreet(15, 1, [
        { number: "4", bells: 8 },
        { number: "7", bells: 5 },
    ]);
    addCivicToStreet(16, 1, [
        { number: "9", bells: 5 },
    ]);
    addCivicToStreet(17, 1, [
        { number: "6", bells: 20 },
        { number: "11", bells: 5 },
    ]);
    addCivicToStreet(18, 1, [
        { number: "8", bells: 20 },
        { number: "13", bells: 5 },
    ]);
    addCivicToStreet(19, 1, [
        { number: "15", bells: 5 },
    ]);
    addCivicToStreet(20, 1, [
        { number: "10", bells: 20 },
        { number: "12", bells: 20 },
        { number: "17", bells: 5 },
    ]);
    addCivicToStreet(21, 1, [
        { number: "19", bells: 5 },
    ]);
    addCivicToStreet(22, 1, [
        { number: "14", bells: 9 },
        { number: "21", bells: 5 },
    ]);
    addCivicToStreet(13, 3, [
        { number: "2", bells: 10 },
    ]);
    addCivicToStreet(15, 3, [
        { number: "4", bells: 8 },
    ]);
    addCivicToStreet(17, 3, [
        { number: "6", bells: 20 },
    ]);
    addCivicToStreet(18, 3, [
        { number: "8", bells: 20 },
    ]);
    addCivicToStreet(20, 3, [
        { number: "10", bells: 20 },
        { number: "12", bells: 20 },
    ]);
    addCivicToStreet(22, 3, [
        { number: "14", bells: 9 },
    ]);
    addCivicToStreet(13, 4, [
        { number: "1", bells: 10 },
    ]);
    addCivicToStreet(15, 4, [
        { number: "3", bells: 8 },
    ]);
    addCivicToStreet(17, 4, [
        { number: "5", bells: 20 },
    ]);
    addCivicToStreet(18, 4, [
        { number: "7", bells: 20 },
    ]);
    addCivicToStreet(20, 4, [
        { number: "9", bells: 20 },
        { number: "11", bells: 20 },
    ]);
    addCivicToStreet(22, 4, [
        { number: "13", bells: 9 },
    ]);
    addCivicToStreet(13, 6, [
        { number: "2", bells: 10 },
        { number: "1", bells: 10},
    ]);
    addCivicToStreet(15, 6, [
        { number: "4", bells: 8 },
        { number: "3", bells: 8 },
    ]);
    addCivicToStreet(17, 6, [
        { number: "6", bells: 20 },
        { number: "5", bells: 20 },
    ]);
    addCivicToStreet(18, 6, [
        { number: "8", bells: 20 },
        { number: "7", bells: 20 },
    ]);
    addCivicToStreet(20, 6, [
        { number: "10", bells: 20 },
        { number: "12", bells: 20 },
        { number: "9", bells: 20 },
        { number: "11", bells: 20 },
    ]);
    addCivicToStreet(22, 6, [
        { number: "14", bells: 9 },
        { number: "13", bells: 9 },
    ]);
    addCivicToStreet(11, 7, [
        { number: "1", bells: 8 },
    ]);
    addCivicToStreet(11, 6, [
        { number: "3", bells: 8 },
    ]);
    addCivicToStreet(11, 5, [
        { number: "5", bells: 8 },
    ]);
    addCivicToStreet(11, 4, [
        { number: "7", bells: 8 },
    ]);
    addCivicToStreet(11, 3, [
        { number: "9", bells: 8 },
    ]);
    addCivicToStreet(11, 2, [
        { number: "11", bells: 8 },
    ]);
    addCivicToStreet(12, 7, [
        { number: "2", bells: 10 },
    ]);
    addCivicToStreet(12, 5, [
        { number: "4", bells: 10 },
    ]);
    addCivicToStreet(12, 2, [
        { number: "6", bells: 10 },
    ]);
    addCivicToStreet(14, 7, [
        { number: "2", bells: 8 },
        { number: "1", bells: 10 },
    ]);
    addCivicToStreet(14, 5, [
        { number: "4", bells: 8 },
        { number: "3", bells: 10 },
    ]);
    addCivicToStreet(14, 2, [
        { number: "6", bells: 8 },
        { number: "5", bells: 10 },
    ]);
    addCivicToStreet(16, 7, [
        { number: "2", bells: 20 },
        { number: "1", bells: 8 },
    ]);
    addCivicToStreet(16, 5, [
        { number: "4", bells: 20 },
        { number: "3", bells: 8 },
    ]);
    addCivicToStreet(16, 2, [
        { number: "6", bells: 20 },
        { number: "5", bells: 8 },
    ]);
    addCivicToStreet(19, 7, [
        { number: "2", bells: 20 },
        { number: "4", bells: 20 },
        { number: "1", bells: 20 },
    ]);
    addCivicToStreet(19, 5, [
        { number: "6", bells: 20 },
        { number: "8", bells: 20 },
        { number: "3", bells: 20 },
    ]);
    addCivicToStreet(19, 2, [
        { number: "10", bells: 20 },
        { number: "12", bells: 20 },
        { number: "5", bells: 20 },
    ]);
    addCivicToStreet(21, 7, [
        { number: "2", bells: 9 },
        { number: "1", bells: 20 },
        { number: "3", bells: 20 },
    ]);
    addCivicToStreet(21, 5, [
        { number: "4", bells: 9 },
        { number: "5", bells: 20 },
        { number: "7", bells: 20 },
    ]);
    addCivicToStreet(21, 2, [
        { number: "6", bells: 9 },
        { number: "9", bells: 20 },
        { number: "11", bells: 20 },
    ]);
    addCivicToStreet(23, 8, [
        { number: "2", bells: 5 },
    ]);
    addCivicToStreet(23, 7, [
        { number: "4", bells: 5 },
        { number: "1", bells: 9 },
    ]);
    addCivicToStreet(23, 6, [
        { number: "6", bells: 5 },
    ]);
    addCivicToStreet(23, 5, [
        { number: "8", bells: 5 },
        { number: "3", bells: 9 },
    ]);
    addCivicToStreet(23, 4, [
        { number: "10", bells: 5 },
    ]);
    addCivicToStreet(23, 3, [
        { number: "12", bells: 5 },
    ]);
    addCivicToStreet(23, 2, [
        { number: "14", bells: 5 },
        { number: "5", bells: 9 },
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
    { w: 3, h: 3, count: 1, size: "Grande"},
    { w: 3, h: 2, count: 2, size: "Grande"},
    { w: 2, h: 2, count: 2, size: ""},
    { w: 3, h: 1, count: 3, size: ""},
    { w: 2, h: 1, count: 4, size: "piccolo"},
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
    const saturation = 30 + Math.random() * 40; // 40–60%
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
            pkg.size = type.size;
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

let deliveryOrder = []; // id dei pacchi nell'ordine scelto

function openDeliveryListModal() {
    const modal = document.getElementById("deliveryListModal");
    const list = document.getElementById("deliveryListContent");

    list.innerHTML = ""; // reset

    // Controlla se qualche pacco è già nell'ordine (deliveryOrder)
    const anyNumbered = deliveryOrder.length > 0;

    let displayPackages = [...packages];

    if (anyNumbered) {
        // Ordina in base all'ordine attuale (i non numerati in fondo)
        displayPackages.sort((a, b) => {
            const indexA = deliveryOrder.indexOf(a.id);
            const indexB = deliveryOrder.indexOf(b.id);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    } else {
        // Shuffle random
        displayPackages.sort(() => Math.random() - 0.5);
    }

    // Crea gli elementi della lista
    displayPackages.forEach(pkg => {
        const li = document.createElement("li");
        li.dataset.pkgId = pkg.id; // id pacco per tracking
        li.innerHTML = `
            <span>${pkg.street} ${pkg.civic} — ${pkg.size}</span>
            <div class="delivery-badge"></div>
        `;
        list.appendChild(li);
    });

    updateBadges(); // Aggiorna numeri e colori dei badge
    modal.style.display = "flex";
}

function updateBadges() {
    const listItems = document.querySelectorAll("#deliveryListContent li");
    listItems.forEach(li => {
        const badge = li.querySelector(".delivery-badge");
        const pkgId = parseInt(li.dataset.pkgId);
        const index = deliveryOrder.indexOf(pkgId);
        if (index !== -1) {
            badge.textContent = index + 1;
            badge.classList.add("active");
        } else {
            badge.textContent = "";
            badge.classList.remove("active");
        }
    });
}

document.getElementById("deliveryListContent").addEventListener("click", (e) => {
    if (!e.target.classList.contains("delivery-badge")) return;

    const li = e.target.closest("li");
    const pkgId = parseInt(li.dataset.pkgId);
    const idx = deliveryOrder.indexOf(pkgId);

    if (idx === -1) {
        // aggiunge alla fine
        deliveryOrder.push(pkgId);
    } else {
        // rimuove e scala indietro
        deliveryOrder.splice(idx, 1);
    }

    updateBadges();
});

// Pulsante ordina
document.getElementById("sortDeliveryList").addEventListener("click", () => {
    const list = document.getElementById("deliveryListContent");
    const items = Array.from(list.children);

    items.sort((a, b) => {
        const idA = parseInt(a.dataset.pkgId);
        const idB = parseInt(b.dataset.pkgId);

        const indexA = deliveryOrder.indexOf(idA);
        const indexB = deliveryOrder.indexOf(idB);

        if (indexA === -1) return 1; // non numerati in fondo
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    items.forEach(i => list.appendChild(i));
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
    if (allPackagesInVan()) {
        mode = "mappa"; // o altra modalità che vuoi
        draw();

        // Ripristina i pulsanti originali
        document.getElementById('moveControls').style.display = "block";
        document.getElementById('deliveryButton').style.display = "block";
        document.getElementById('deliveryControls').style.display = "none";
    } else {
        alert("Stai lasciando dei pacchi a terra!!");
    }
});
// Mostra la finestra delle regole all'avvio
window.addEventListener('load', () => {
    document.getElementById('rulesModal').style.display = "flex";
});

// Chiudi la finestra e inizia il gioco
document.getElementById('startGameButton').addEventListener('click', () => {
    document.getElementById('rulesModal').style.display = "none";
    if (!timerInterval) { // evita di avviare più intervalli
        timerInterval = setInterval(updateTimer, 1000); // 1 secondo reale = 1 minuto di gioco
    }

});

document.getElementById("deliveryList").addEventListener("click", () => {
    openDeliveryListModal();
});

document.getElementById("closeDeliveryListModal").addEventListener("click", () => {
    document.getElementById("deliveryListModal").style.display = "none";
});






