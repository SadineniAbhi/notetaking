// Get canvas element
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

// Disable right-click context menu
document.oncontextmenu = () => false;

var socket = io.connect('http://localhost:5000');
let roomName = prompt("Enter Room Name:");
// Storing all drawn strokes and undo/redo stacks
let drawings = [];
const undoStack = [];
let currentStroke = [];

// Cursor coordinates
let cursorX, cursorY, prevCursorX, prevCursorY;
let offsetX = 0, offsetY = 0;
let scale = 1;

// Convert coordinates between screen and true canvas space
function toScreenX(xTrue) { return (xTrue + offsetX) * scale; }
function toScreenY(yTrue) { return (yTrue + offsetY) * scale; }
function toTrueX(xScreen) { return (xScreen / scale) - offsetX; }
function toTrueY(yScreen) { return (yScreen / scale) - offsetY; }

function redrawCanvas() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw all stored strokes
    drawings.forEach(stroke => {
        stroke.forEach(line => {
            drawLine(toScreenX(line.x0), toScreenY(line.y0), toScreenX(line.x1), toScreenY(line.y1));
        });
    });
}

redrawCanvas();

// Mouse Event Handlers
canvas.addEventListener('mousedown', onMouseDown);
canvas.addEventListener('mouseup', onMouseUp);
canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('wheel', onMouseWheel);

let leftMouseDown = false;
let rightMouseDown = false;

function onMouseDown(event) {
    if (event.button === 0) {
        leftMouseDown = true;
        currentStroke = [];
    }
    if (event.button === 2) {
        rightMouseDown = true;
    }
    cursorX = event.pageX;
    cursorY = event.pageY;
    prevCursorX = cursorX;
    prevCursorY = cursorY;
}

function onMouseMove(event) {
    cursorX = event.pageX;
    cursorY = event.pageY;
    const scaledX = toTrueX(cursorX);
    const scaledY = toTrueY(cursorY);
    const prevScaledX = toTrueX(prevCursorX);
    const prevScaledY = toTrueY(prevCursorY);

    if (leftMouseDown) {
        currentStroke.push({ x0: prevScaledX, y0: prevScaledY, x1: scaledX, y1: scaledY });
        drawLine(prevCursorX, prevCursorY, cursorX, cursorY);
    }

    if (rightMouseDown) {
        offsetX += (cursorX - prevCursorX) / scale;
        offsetY += (cursorY - prevCursorY) / scale;
        redrawCanvas();
    }

    prevCursorX = cursorX;
    prevCursorY = cursorY;
}

function onMouseUp() {
    leftMouseDown = false;
    rightMouseDown = false;
    if (currentStroke.length > 0) {
        drawings.push([...currentStroke]); // Store deep copy of stroke
        emitDrawingMessages(drawings);
        undoStack.length = 0; // Clear redo stack on new action
    }
}

function onMouseWheel(event) {
    const scaleAmount = -event.deltaY / 500;
    scale *= (1 + scaleAmount);

    const distX = event.pageX / canvas.clientWidth;
    const distY = event.pageY / canvas.clientHeight;

    const unitsZoomedX = canvas.clientWidth * scaleAmount;
    const unitsZoomedY = canvas.clientHeight * scaleAmount;

    offsetX -= unitsZoomedX * distX;
    offsetY -= unitsZoomedY * distY;

    redrawCanvas();
}

function drawLine(x0, y0, x1, y1) {
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = '#FF0000';
    context.lineWidth = 2;
    context.stroke();
}

// Undo functionality (Ctrl + Z)
function undo() {
    if (drawings.length > 0) {
        undoStack.push(drawings.pop());
        emitDrawingMessages(drawings);
        redrawCanvas();
    }
}

// Redo functionality (Ctrl + Y)
function redo() {
    if (undoStack.length > 0) {
        drawings.push(undoStack.pop());
        emitDrawingMessages(drawings);
        redrawCanvas();
    }
}

// Keyboard event listeners for undo/redo
document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        undo();
    }
    if (event.ctrlKey && event.key === 'y') {
        event.preventDefault();
        redo();
    }
});

socket.on('connect', () => {
    socket.emit('join_room', { room: roomName });
});

socket.on('drawing', function(receivedDrawings) {
    console.log('New drawings received:', receivedDrawings);

    if (Array.isArray(receivedDrawings)) {
        drawings = JSON.parse(JSON.stringify(receivedDrawings)); // Deep copy
        redrawCanvas();
    }
});

function emitDrawingMessages(drawings) {
    socket.emit('drawings have been changed', {room : roomName, drawings: drawings});
}

socket.on('new connections established', function(receivedDrawings) {
    console.log('New drawings received:', receivedDrawings);

    if (Array.isArray(receivedDrawings)) {
        drawings = JSON.parse(JSON.stringify(receivedDrawings)); // Deep copy
        redrawCanvas();
    }
});