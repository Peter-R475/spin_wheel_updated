// State Variables
let wheelPool = [];
let winnersList = [];
let configPrizes = [];
let currentAngle = 0;
let isSpinning = false;

let rawData = [];
let nationalityCounts = {};
let nationChances = {};

// DOM Elements
const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");

const winnerModal = document.getElementById("winnerModal");
const modalWinnerText = document.getElementById("modalWinnerText");
const closeModalBtn = document.getElementById("closeModalBtn");

const dashboardModal = document.getElementById("dashboardModal");
const dashboardTableContainer = document.getElementById("dashboardTableContainer");
const finishBtn = document.getElementById("finishBtn");

// 1. Session Storage Data Loader
function loadWheelDataFromSession() {
    const stored = sessionStorage.getItem("data_ForWheel");
    if (!stored) {
        console.warn("No data_ForWheel found in sessionStorage.");
        return;
    }

    try {
        const parsed = JSON.parse(stored);
        rawData = Array.isArray(parsed) ? parsed : (parsed.data || []);
        wheelPool = [...rawData];

        // Calculate nationality counts
        nationalityCounts = {};
        rawData.forEach(item => {
            const nat = item.nationality;
            if (nat !== null && nat !== undefined && String(nat).trim() !== "") {
                nationalityCounts[nat] = (nationalityCounts[nat] || 0) + 1;
            }
        });

        // Initialize equal total percentage per nation
        const nations = Object.keys(nationalityCounts);
        const totalNations = nations.length;
        if (totalNations > 0) {
            const initialChance = 100 / totalNations;
            nations.forEach(nat => {
                nationChances[nat] = initialChance;
            });
        }

        // Calculate initial per-item weights
        updateItemWeights();

        // Initial render
        drawWheel();
        if (typeof renderNation === "function") {
            renderNation();
        }

    } catch (err) {
        console.error("Error loading data_ForWheel from sessionStorage:", err);
    }
}

// 2. Visual Drawing Function
function drawWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (wheelPool.length === 0) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 30;
    const sliceAngle = (2 * Math.PI) / wheelPool.length;
    const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];

    wheelPool.forEach((item, index) => {
        const startAngle = currentAngle + index * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#000";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(item.name || item.nationality, radius - 20, 6);
        ctx.restore();
    });

    // Top Pointer (North)
    ctx.beginPath();
    ctx.moveTo(centerX - 15, centerY - radius - 15);
    ctx.lineTo(centerX + 15, centerY - radius - 15);
    ctx.lineTo(centerX, centerY - radius + 15);
    ctx.closePath();
    ctx.fillStyle = "#FF0000";
    ctx.fill();
    ctx.stroke();
}

// 3. Weight Recalculation
function updateItemWeights() {
    rawData.forEach(item => {
        const nat = item.nationality;
        const count = nationalityCounts[nat];
        const currentNationChance = nationChances[nat] || 0;

        item.weight = count > 0 ? (currentNationChance / count) : 0;
    });

    sessionStorage.setItem("data_ForWheel", JSON.stringify(rawData));
}

// 4. Dynamic Probability Reduction & Redistribution
function processWinner(winnerNationality, reductionAmountPct = 5) {
    const nations = Object.keys(nationChances);
    const totalNations = nations.length;

    if (totalNations <= 1 || !nationChances[winnerNationality]) return;

    const actualReduction = Math.min(nationChances[winnerNationality], reductionAmountPct);

    nationChances[winnerNationality] -= actualReduction;

    const shareForOthers = actualReduction / (totalNations - 1);
    nations.forEach(nat => {
        if (nat !== winnerNationality) {
            nationChances[nat] += shareForOthers;
        }
    });

    updateItemWeights();
    if (typeof renderNation === "function") {
        renderNation();
    }
}

// 5. Weighted Random Selection
function selectWeightedWinner() {
    const totalWeight = wheelPool.reduce((sum, item) => sum + (item.weight || 0), 0);
    if (totalWeight <= 0) return null;

    let random = Math.random() * totalWeight;
    for (let i = 0; i < wheelPool.length; i++) {
        if (random < wheelPool[i].weight) {
            return { item: wheelPool[i], index: i };
        }
        random -= wheelPool[i].weight;
    }
    return { item: wheelPool[wheelPool.length - 1], index: wheelPool.length - 1 };
}

// 6. Spin & Animation Engine
function spin() {
    if (isSpinning || wheelPool.length === 0) return;

    const selected = selectWeightedWinner();
    if (!selected) return;

    isSpinning = true;
    spinBtn.disabled = true;

    const sliceAngle = (2 * Math.PI) / wheelPool.length;
    const winnerIndex = selected.index;

    // Align slice center to Top Pointer (270 degrees / 1.5 * PI)
    const sliceCenterAngle = winnerIndex * sliceAngle + sliceAngle / 2;
    const targetAngleOffset = (1.5 * Math.PI) - sliceCenterAngle;

    const fullRotations = 5 * (2 * Math.PI);
    const startAngle = currentAngle;
    const finalAngle = startAngle + fullRotations + ((targetAngleOffset - (startAngle % (2 * Math.PI))) % (2 * Math.PI));

    const duration = 4000;
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        if (elapsed < duration) {
            // Cubic ease-out
            const progress = elapsed / duration;
            const easeOut = 1 - Math.pow(1 - progress, 3);
            currentAngle = startAngle + (finalAngle - startAngle) * easeOut;
            drawWheel();
            requestAnimationFrame(animate);
        } else {
            currentAngle = finalAngle % (2 * Math.PI);
            drawWheel();
            isSpinning = false;
            spinBtn.disabled = false;

            // Handle output
            handleSpinEnd(selected.item);
        }
    }

    requestAnimationFrame(animate);
}

// 7. Post-Spin Operations
function handleSpinEnd(winner) {
    winnersList.push(winner);
    const index = wheelPool.indexOf(winner);
    if (index !== -1) {
        wheelPool.splice(index, 1);
    }
    console.log('Winners list:', winnersList);
    modalWinnerText.textContent = `${winner.name || 'Participant'} (${winner.nationality})`;
    winnerModal.classList.add("show");
    console.log("Pool:", wheelPool);
    processWinner(winner.nationality, 5);
}

// Event Listeners
spinBtn.addEventListener("click", spin);

closeModalBtn.addEventListener("click", () => {
    winnerModal.classList.remove("show");
});

finishBtn.addEventListener("click", () => {
    dashboardModal.classList.remove("show");
});

// Program Entry Point
document.addEventListener("DOMContentLoaded", loadWheelDataFromSession);