// elements
const canvas = document.getElementById('appCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvasContainer');
const instructions = document.getElementById('instructions');

const btnDraw = document.getElementById('btnDraw');
const btnEdit = document.getElementById('btnEdit');
const btnClear = document.getElementById('btnClear');

const inputTileW = document.getElementById('tileW');
const inputTileH = document.getElementById('tileH');
const inputJoint = document.getElementById('joint');
const inputOffsetX = document.getElementById('offsetX');
const inputOffsetY = document.getElementById('offsetY');
const inputScale = document.getElementById('scale');

const preciseInputGroup = document.getElementById('preciseInputGroup');
const inputWallLength = document.getElementById('wallLength');
const btnApplyWall = document.getElementById('btnApplyWall');

const statArea = document.getElementById('statArea');
const statAreaMarge = document.getElementById('statAreaMarge');
const statFullTiles = document.getElementById('statFullTiles');
const statCutTiles = document.getElementById('statCutTiles');
const statTotalTiles = document.getElementById('statTotalTiles');

// State
let mode = 'DRAW'; // DRAW, EDIT
let points = [];
let isClosed = false;
let mousePos = { x: 0, y: 0 };
let isDraggingGrid = false;
let isDraggingPoint = null;
let dragStart = { x: 0, y: 0 };
let initialOffset = { x: 0, y: 0 };

const SNAP_DIST = 15; // pixels to snap to start point
const POINT_RADIUS = 6;

// Resize canvas to fill container
function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    draw();
}
window.addEventListener('resize', resizeCanvas);

// Setup UI Events
btnDraw.addEventListener('click', () => setMode('DRAW'));
btnEdit.addEventListener('click', () => setMode('EDIT'));
btnClear.addEventListener('click', () => {
    points = [];
    isClosed = false;
    inputOffsetX.value = 0;
    inputOffsetY.value = 0;
    instructions.classList.remove('hidden');
    updatePreciseInputVisibility();
    draw();
});

[inputTileW, inputTileH, inputJoint, inputOffsetX, inputOffsetY, inputScale].forEach(el => {
    el.addEventListener('input', draw);
});

function updatePreciseInputVisibility() {
    if (mode === 'DRAW' && points.length > 0 && !isClosed) {
        preciseInputGroup.style.display = 'block';
        inputWallLength.focus();
    } else {
        preciseInputGroup.style.display = 'none';
        inputWallLength.value = '';
    }
}

function setMode(newMode) {
    mode = newMode;
    btnDraw.classList.toggle('active', mode === 'DRAW');
    btnEdit.classList.toggle('active', mode === 'EDIT');
    container.style.cursor = mode === 'DRAW' ? 'crosshair' : 'grab';
    updatePreciseInputVisibility();
    draw();
}

function applyPreciseWall() {
    if (mode !== 'DRAW' || points.length === 0 || isClosed) return;

    const lengthCm = parseFloat(inputWallLength.value);
    if (!lengthCm || lengthCm <= 0) return;

    const pxlScale = parseFloat(inputScale.value) || 3;
    const lengthPx = lengthCm * pxlScale;

    const last = points[points.length - 1];
    const angle = Math.atan2(mousePos.y - last.y, mousePos.x - last.x);

    let p = {
        x: last.x + Math.cos(angle) * lengthPx,
        y: last.y + Math.sin(angle) * lengthPx
    };

    if (points.length > 2) {
        const start = points[0];
        if (Math.hypot(p.x - start.x, p.y - start.y) < SNAP_DIST) {
            isClosed = true;
            updatePreciseInputVisibility();
            draw();
            return;
        }
    }

    points.push(p);
    inputWallLength.value = '';
    updatePreciseInputVisibility();
    draw();
}

btnApplyWall.addEventListener('click', applyPreciseWall);
inputWallLength.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyPreciseWall();
});

// Canvas Mouse Events
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };

    if (e.shiftKey && !isClosed && points.length > 0 && mode === 'DRAW') {
        const last = points[points.length - 1];
        const dx = Math.abs(mousePos.x - last.x);
        const dy = Math.abs(mousePos.y - last.y);
        if (dx > dy) mousePos.y = last.y;
        else mousePos.x = last.x;
    }

    if (isDraggingGrid && mode === 'EDIT') {
        const pxlScale = parseFloat(inputScale.value);
        const dx = (mousePos.x - dragStart.x) / pxlScale;
        const dy = (mousePos.y - dragStart.y) / pxlScale;
        inputOffsetX.value = Math.round(initialOffset.x + dx);
        inputOffsetY.value = Math.round(initialOffset.y + dy);
        draw();
    } else if (isDraggingPoint !== null) {
        if (e.shiftKey && points.length > 2) {
            // Pseudo-orthogonal snapping for dragging a point could go here
            // But keep it simple for now
        }
        points[isDraggingPoint].x = mousePos.x;
        points[isDraggingPoint].y = mousePos.y;
        draw();
    } else {
        // check hover over points
        let hoveringPoint = false;
        if (isClosed) {
            for (let i = 0; i < points.length; i++) {
                if (Math.hypot(points[i].x - mousePos.x, points[i].y - mousePos.y) < POINT_RADIUS * 2) {
                    hoveringPoint = true;
                    break;
                }
            }
        }
        if (hoveringPoint) {
            canvas.style.cursor = 'move';
        } else {
            canvas.style.cursor = mode === 'DRAW' ? 'crosshair' : (isDraggingGrid ? 'grabbing' : 'grab');
        }

        if (!isClosed && mode === 'DRAW') {
            draw(); // draw preview line
        }
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // only left click

    // Check if clicking a point
    if (isClosed) {
        for (let i = 0; i < points.length; i++) {
            if (Math.hypot(points[i].x - mousePos.x, points[i].y - mousePos.y) < POINT_RADIUS * 2) {
                isDraggingPoint = i;
                return;
            }
        }
    }

    if (mode === 'EDIT' && isClosed) {
        isDraggingGrid = true;
        dragStart = { ...mousePos };
        initialOffset = {
            x: parseFloat(inputOffsetX.value) || 0,
            y: parseFloat(inputOffsetY.value) || 0
        };
        canvas.style.cursor = 'grabbing';
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (isDraggingGrid) {
        isDraggingGrid = false;
        canvas.style.cursor = 'grab';
        return;
    }
    if (isDraggingPoint !== null) {
        isDraggingPoint = null;
        return;
    }

    if (mode === 'DRAW' && !isClosed) {
        instructions.classList.add('hidden');

        let p = { ...mousePos };

        // Orthogonal snap with Shift
        if (e.shiftKey && points.length > 0) {
            const last = points[points.length - 1];
            const dx = Math.abs(p.x - last.x);
            const dy = Math.abs(p.y - last.y);
            if (dx > dy) p.y = last.y;
            else p.x = last.x;
        }

        // Close polygon if near start
        if (points.length > 2) {
            const start = points[0];
            if (Math.hypot(p.x - start.x, p.y - start.y) < SNAP_DIST) {
                isClosed = true;
                updatePreciseInputVisibility();
                draw();
                return;
            }
        }

        points.push(p);
        updatePreciseInputVisibility();
        draw();
    }
});

canvas.addEventListener('mouseleave', () => {
    isDraggingGrid = false;
    isDraggingPoint = null;
    canvas.style.cursor = mode === 'DRAW' ? 'crosshair' : 'grab';
    draw();
});

// Math Helpers
function polygonArea(pts) {
    let area = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        area += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
    }
    return Math.abs(area / 2);
}

// Ray-casting point in polygon
function pointInPolygon(point, vs) {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x, yi = vs[i].y;
        let xj = vs[j].x, yj = vs[j].y;
        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Line intersection
function lineIntersection(p1, p2, p3, p4) {
    const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (denom === 0) return false;
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
    const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// Check if a tile polygon intersects with room polygon
function testTileIntersection(tilePoly, roomPoly) {
    // 1. Check if any tile corner is inside room
    let allInside = true;
    let anyInside = false;
    for (let pt of tilePoly) {
        if (pointInPolygon(pt, roomPoly)) {
            anyInside = true;
        } else {
            allInside = false;
        }
    }

    // 2. Check if any room corner is inside tile
    let anyRoomInside = false;
    for (let pt of roomPoly) {
        if (pointInPolygon(pt, tilePoly)) {
            anyRoomInside = true;
            break;
        }
    }

    // 3. Check line intersections
    let linesIntersect = false;
    for (let i = 0; i < tilePoly.length; i++) {
        const t1 = tilePoly[i];
        const t2 = tilePoly[(i + 1) % tilePoly.length];
        for (let j = 0; j < roomPoly.length; j++) {
            const r1 = roomPoly[j];
            const r2 = roomPoly[(j + 1) % roomPoly.length];
            if (lineIntersection(t1, t2, r1, r2)) {
                linesIntersect = true;
                break;
            }
        }
        if (linesIntersect) break;
    }

    const intersects = anyInside || anyRoomInside || linesIntersect;
    const isFull = allInside && !linesIntersect; // Strictly inside and edges don't cross boundaries inward

    if (!intersects) return false;
    return isFull ? 'FULL' : 'CUT';
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid Background
    const drawGrid = false; // Using CSS grid instead for the background

    const pxlScale = parseFloat(inputScale.value) || 3;
    const tW = parseFloat(inputTileW.value) || 60;
    const tH = parseFloat(inputTileH.value) || 60;
    const joint = (parseFloat(inputJoint.value) || 3) / 10; // mm to cm
    const oX = (parseFloat(inputOffsetX.value) || 0);
    const oY = (parseFloat(inputOffsetY.value) || 0);

    // Draw Room Polygon
    if (points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        if (isClosed) {
            ctx.closePath();
            ctx.fillStyle = "#ffffff";
            ctx.fill();
        }

        ctx.strokeStyle = "#2c3e50";
        ctx.lineWidth = 3;
        ctx.stroke();

        if (!isClosed && mode === 'DRAW') {
            ctx.lineTo(mousePos.x, mousePos.y);
            ctx.strokeStyle = "rgba(44, 62, 80, 0.5)";
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw current segment length preview
            const last = points[points.length - 1];
            const distPx = Math.hypot(mousePos.x - last.x, mousePos.y - last.y);
            const distCm = distPx / pxlScale;

            ctx.fillStyle = "#e74c3c";
            ctx.font = "bold 14px 'Outfit', sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";
            const mx = (last.x + mousePos.x) / 2;
            const my = (last.y + mousePos.y) / 2;
            ctx.fillText(`${Math.round(distCm)} cm`, mx + 15, my - 15);
        }

        // Draw vertices
        for (let i = 0; i < points.length; i++) {
            ctx.beginPath();
            ctx.arc(points[i].x, points[i].y, POINT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = (i === 0 && !isClosed) ? "#e74c3c" : "#3498db";
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw wall dimensions
        ctx.fillStyle = "#2c3e50";
        ctx.font = "bold 13px 'Outfit', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let i = 0; i < points.length; i++) {
            if (!isClosed && i === points.length - 1) break;

            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const distCm = distPx / pxlScale;

            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;

            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const offX = Math.cos(angle - Math.PI / 2) * 20;
            const offY = Math.sin(angle - Math.PI / 2) * 20;

            ctx.save();
            ctx.translate(mx + offX, my + offY);
            let textAngle = angle;
            if (textAngle > Math.PI / 2 || textAngle <= -Math.PI / 2) {
                textAngle += Math.PI;
            }
            ctx.rotate(textAngle);

            const txt = `${Math.round(distCm)} cm`;
            const tw = ctx.measureText(txt).width;
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.fillRect(-tw / 2 - 4, -10, tw + 8, 20);

            ctx.fillStyle = "#2c3e50";
            ctx.fillText(txt, 0, 0);
            ctx.restore();
        }
    }

    // Tiling Logic
    if (isClosed && points.length > 2) {
        // Calculate Bounding Box of Room
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        points.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });

        // Set clipping mask for visual grid
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.closePath();
        ctx.clip();

        // Convert tile dims to canvas pixels
        const tileW_px = tW * pxlScale;
        const tileH_px = tH * pxlScale;
        const joint_px = joint * pxlScale;
        const offsetX_px = (oX * pxlScale) % (tileW_px + joint_px);
        const offsetY_px = (oY * pxlScale) % (tileH_px + joint_px);

        // Find grid starting point before bounding box
        const startX = minX - ((minX - offsetX_px) % (tileW_px + joint_px)) - (tileW_px + joint_px);
        const startY = minY - ((minY - offsetY_px) % (tileH_px + joint_px)) - (tileH_px + joint_px);

        let fullTilesCount = 0;
        let cutTilesCount = 0;

        ctx.fillStyle = "rgba(52, 152, 219, 0.2)";
        ctx.strokeStyle = "rgba(41, 128, 185, 0.8)";
        ctx.lineWidth = 1;

        for (let x = startX; x < maxX; x += tileW_px + joint_px) {
            for (let y = startY; y < maxY; y += tileH_px + joint_px) {

                const tilePoly = [
                    { x: x, y: y },
                    { x: x + tileW_px, y: y },
                    { x: x + tileW_px, y: y + tileH_px },
                    { x: x, y: y + tileH_px }
                ];

                const status = testTileIntersection(tilePoly, points);

                if (status) {
                    // Draw tile
                    ctx.fillRect(x, y, tileW_px, tileH_px);
                    ctx.strokeRect(x, y, tileW_px, tileH_px);

                    if (status === 'FULL') {
                        fullTilesCount++;
                    } else if (status === 'CUT') {
                        cutTilesCount++;
                        // highlight cut tiles visually
                        ctx.fillStyle = "rgba(231, 76, 60, 0.3)";
                        ctx.fillRect(x, y, tileW_px, tileH_px);
                        ctx.fillStyle = "rgba(52, 152, 219, 0.2)"; // reset
                    }
                }
            }
        }

        ctx.restore();

        // Compute Stats
        const areaPx = polygonArea(points);
        // Area in pixels to cm²: (AreaPx / pxlScale) / pxlScale
        // Then to m²: / 10000
        const areaM2 = areaPx / (pxlScale * pxlScale) / 10000;

        statArea.innerText = areaM2.toFixed(2) + " m²";
        statAreaMarge.innerText = (areaM2 * 1.1).toFixed(2) + " m²";
        statFullTiles.innerText = fullTilesCount;
        statCutTiles.innerText = cutTilesCount;
        statTotalTiles.innerText = (fullTilesCount + cutTilesCount);
    } else {
        statArea.innerText = "0.00 m²";
        statAreaMarge.innerText = "0.00 m²";
        statFullTiles.innerText = "0";
        statCutTiles.innerText = "0";
        statTotalTiles.innerText = "0";
    }
}

// Init
resizeCanvas();
