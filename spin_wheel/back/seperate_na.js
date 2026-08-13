let nationalityCounts = {};
let nationChances = {}; // Stores total % chance per nation
let rawData = [];

const tableBody = document.getElementById("prizeTableBody");
const addRowBtn = document.getElementById("addRowBtn");
const submitBtn = document.getElementById("submitBtn");
const clearBtn = document.getElementById("clearBtn");

// Elements for showing saved storage data
const selectedWheelContainer = document.getElementById("selectedWheelContainer");
const selectedWheelDataDisplay = document.getElementById("selectedWheelDataDisplay");
const goToSpinWheelBtn = document.getElementById("goToSpinWheelBtn");

// 1. Fetch data from sessionStorage
const storedWheelData = sessionStorage.getItem("wheel_data");

function initializeWheelData(storedWheelData) {
    if (!storedWheelData) {
        console.warn("No wheel_data found in sessionStorage.");
        return;
    }

    try {
        const parsedData = JSON.parse(storedWheelData);
        rawData = Array.isArray(parsedData) ? parsedData : (parsedData.data || []);
        console.log('RAW_DATA:', rawData);
        // 1. Count valid nationalities
        nationalityCounts = {};
        rawData.forEach(item => {
            const nat = item.nationality;
            if (nat !== null && nat !== undefined && String(nat).trim() !== "") {
                nationalityCounts[nat] = (nationalityCounts[nat] || 0) + 1;
            }
        });

        const nations = Object.keys(nationalityCounts);
        const totalNations = nations.length;

        if (totalNations === 0) return;

        // 2. Initialize equal chance per nation (100 / N)
        const initialNationChance = 100 / totalNations;
        nations.forEach(nat => {
            nationChances[nat] = initialNationChance;
        });


        // 3. Update individual item weights
        updateItemWeights();
        renderNation();

    } catch (err) {
        console.error("Error parsing wheel_data:", err);
    }
}

function updateItemWeights() {
    console.log(rawData);
    rawData.forEach(item => {
        const nat = item.nationality;
        const count = nationalityCounts[nat];
        //console.log("count: " + count);
        const currentNationChance = nationChances[nat] || 0;
        //console.log("currentNationChance: " + currentNationChance);

        // Weight per item = Nation's total chance / number of people in that nation
        item.weight = count > 0 ? (currentNationChance / count) : 0;
    });

    sessionStorage.setItem("data_ForWheel", JSON.stringify(rawData));
}



function renderNation() {
    const tbody = document.getElementById("prizeTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const nations = Object.keys(nationalityCounts).sort();
    console.log("nations: " + nations)
    if (nations.length === 0) {
        tbody.innerHTML = "<tr><td colspan='2'>No nationality data available.</td></tr>";
        return;
    }

    nations.forEach(nat => {
        const count = nationalityCounts[nat];
        const totalChance = nationChances[nat] || 0;
        const perPersonChance = count > 0 ? (totalChance / count) : 0;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${nat} (${count} participant${count > 1 ? 's' : ''})</td>
            <td>${totalChance.toFixed(2)}% total (${perPersonChance.toFixed(2)}% per person)</td>
        `;
        tbody.appendChild(tr);
    });
}

initializeWheelData(storedWheelData);

document.getElementById("submitBtn").addEventListener("click", function () {
    window.location.href = "/spin_wheel/front/spin_wheel.php";
});