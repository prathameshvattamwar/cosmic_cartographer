const welcomeScreen = document.getElementById("welcome-screen");
const gameScreen = document.getElementById("game-screen");
const completionScreen = document.getElementById("completion-screen");
const screens = [welcomeScreen, gameScreen, completionScreen];

const userNameInput = document.getElementById("userName");
const startMissionBtn = document.getElementById("startMissionBtn");
const nameError = document.getElementById("nameError");

const userDesignationDisplay = document.getElementById("user-designation");
const starMapContainer = document.getElementById("star-map");
const consoleOutput = document.getElementById("console-output");
const progressText = document.getElementById("progress-text");
const progressBar = document.getElementById("progress-bar");
const resetProgressBtn = document.getElementById("resetProgressBtn");

const certUserNameDisplay = document.getElementById("cert-userName-display");
const certName = document.getElementById("cert-name");
const certDate = document.getElementById("cert-date");
const certificatePreview = document.getElementById("certificate-preview");
const downloadCertBtn = document.getElementById("downloadCertBtn");
const startNewMissionBtn = document.getElementById("startNewMissionBtn");

const instructionModal = document.getElementById("instruction-modal");
const instructionTitle = document.getElementById("instruction-title");
const instructionText = document.getElementById("instruction-text");
const instructionVisual = document.getElementById("instruction-visual");
const proceedScanBtn = document.getElementById("proceedScanBtn");

const miniGameModal = document.getElementById("minigame-modal");
const miniGameTitle = document.getElementById("minigame-title");
const miniGameInstructions = document.getElementById("minigame-instructions");
const miniGameArea = document.getElementById("minigame-area");
const miniGameFeedback = document.getElementById("minigame-feedback");

const { jsPDF } = window.jspdf;

const TOTAL_SYSTEMS = 12;
const SYSTEM_NAMES = [
  "Alpha Centauri",
  "Sirius",
  "Proxima Centauri",
  "Barnard's Star",
  "Wolf 359",
  "Lalande 21185",
  "Epsilon Eridani",
  "Tau Ceti",
  "Gliese 581",
  "Kepler-186f",
  "TRAPPIST-1",
  "Vega",
];
const MINIGAME_TYPES = [
  "pattern",
  "qte",
  "sequence",
  "rapidclick",
  "mathlock",
  "whack",
  "firewall",
];
const SEQUENCE_LENGTH = 5;
const SEQUENCE_COLORS = ["#ff4136", "#0074d9", "#2ecc40", "#ffdc00", "#b10dc9"];
const RAPID_CLICK_TARGET = 15;
const RAPID_CLICK_TIME = 5;
const WHACK_TARGET_SCORE = 10;
const WHACK_GAME_TIME = 10; // seconds
const FIREWALL_SYMBOLS = ["#", "$", "%", "&", "*", "@", "!", "?"];
const FIREWALL_LENGTH = 5;

let userName = "";
let scannedSystems = {};
let systemsData = [];
let currentTargetSystem = null;
let activeMiniGame = {
  timeoutId: null,
  intervalId: null,
  currentGameType: null,
};
let gameInProgress = false;

function showScreen(screenToShow) {
  screens.forEach((screen) => {
    if (screen === screenToShow) {
      screen.style.display = "block";
      setTimeout(() => screen.classList.add("active"), 10);
    } else {
      screen.classList.remove("active");
      const handleTransitionEnd = () => {
        if (!screen.classList.contains("active")) {
          screen.style.display = "none";
        }
        screen.removeEventListener("transitionend", handleTransitionEnd);
      };
      screen.addEventListener("transitionend", handleTransitionEnd);
      setTimeout(() => {
        if (!screen.classList.contains("active")) screen.style.display = "none";
      }, 600);
    }
  });
}

function logMessage(message, type = "info") {
  const p = document.createElement("p");
  p.textContent = message;
  p.className = `console-message ${type}`;
  consoleOutput.appendChild(p);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function updateProgress() {
  const scannedCount = Object.keys(scannedSystems).length;
  const percentage = (scannedCount / TOTAL_SYSTEMS) * 100;
  progressText.textContent = `Systems Scanned: ${scannedCount} / ${TOTAL_SYSTEMS}`;
  progressBar.style.width = `${percentage}%`;

  systemsData.forEach((sys) => {
    if (sys.element) {
      if (scannedSystems[sys.id]) {
        sys.element.classList.add("scanned");
        sys.element.classList.remove("scanning");
        const icon = sys.element.querySelector("i");
        if (icon) icon.className = "fas fa-check-circle";
      } else {
        sys.element.classList.remove("scanned");
        const icon = sys.element.querySelector("i");
        if (icon) icon.className = "fas fa-question-circle";
      }
    }
  });

  if (scannedCount === TOTAL_SYSTEMS && gameInProgress) {
    completeMission();
  }
}

function saveProgress() {
  const gameState = {
    userName: userName,
    scannedSystems: scannedSystems,
    gameInProgress: gameInProgress,
  };
  localStorage.setItem("cosmicCartographerState", JSON.stringify(gameState));
  if (gameInProgress) logMessage("Progress saved.", "system");
}

function loadProgress() {
  const savedState = localStorage.getItem("cosmicCartographerState");
  if (savedState) {
    try {
      const gameState = JSON.parse(savedState);
      userName = gameState.userName || "";
      scannedSystems = gameState.scannedSystems || {};
      gameInProgress = gameState.gameInProgress || false;
      if (userName) {
        userNameInput.value = userName;
      }
      return true;
    } catch (error) {
      logMessage("Error loading saved progress. Starting fresh.", "error");
      localStorage.removeItem("cosmicCartographerState");
      return false;
    }
  }
  return false;
}

function resetGameData() {
  scannedSystems = {};
  systemsData = [];
  currentTargetSystem = null;
  clearActiveMiniGame();
  gameInProgress = false;
  starMapContainer.innerHTML = '<div class="map-background"></div>';
  consoleOutput.innerHTML = "";
  localStorage.removeItem("cosmicCartographerState");
  updateProgress();
}

function initializeGameInterface() {
  userDesignationDisplay.textContent = `Trainee: ${userName}`;
  gameInProgress = true;
  scannedSystems = {};
  systemsData = [];
  starMapContainer.innerHTML = '<div class="map-background"></div>';
  consoleOutput.innerHTML = "";
  logMessage(
    `Mission started for Trainee ${userName}. Begin scanning Sector 7G.`,
    "system"
  );
  generateStarMap();
  updateProgress();
  saveProgress();
  showScreen(gameScreen);
}

function validateName() {
  if (userNameInput.value.trim() === "") {
    nameError.textContent = "Please enter your designation!";
    nameError.classList.add("show");
    userNameInput.focus();
    return false;
  }
  nameError.textContent = "";
  nameError.classList.remove("show");
  return true;
}

function generateStarMap() {
  systemsData = [];
  starMapContainer.innerHTML = '<div class="map-background"></div>'; // Clear before generating
  for (let i = 0; i < TOTAL_SYSTEMS; i++) {
    const systemId = `sys-${i}`;
    const systemName =
      SYSTEM_NAMES[i % SYSTEM_NAMES.length] || `System ${i + 1}`;

    const systemDiv = document.createElement("div");
    systemDiv.className = "star-system";
    systemDiv.id = systemId;
    systemDiv.title = `Scan ${systemName}`;

    const icon = document.createElement("i");
    icon.className = scannedSystems[systemId]
      ? "fas fa-check-circle"
      : "fas fa-question-circle";
    systemDiv.appendChild(icon);

    const systemInfo = {
      id: systemId,
      name: systemName,
      element: systemDiv,
      scanned: !!scannedSystems[systemId],
    };
    systemsData.push(systemInfo);

    if (systemInfo.scanned) {
      systemDiv.classList.add("scanned");
    }

    systemDiv.addEventListener("click", () => handleSystemClick(systemInfo));
    starMapContainer.appendChild(systemDiv);
  }
  if (gameInProgress)
    logMessage(
      `Generated ${TOTAL_SYSTEMS} target systems in Sector 7G.`,
      "system"
    );
}

function handleSystemClick(systemInfo) {
  if (!gameInProgress) {
    logMessage("Mission not active. Please start first.", "error");
    return;
  }
  if (scannedSystems[systemInfo.id]) {
    logMessage(
      `System ${systemInfo.name} (${systemInfo.id}) already scanned. Data: ${
        scannedSystems[systemInfo.id].data
      }`,
      "info"
    );
    return;
  }
  if (
    miniGameModal.classList.contains("active") ||
    instructionModal.classList.contains("active")
  ) {
    logMessage("Procedure already in progress.", "error");
    return;
  }

  logMessage(
    `Initiating scan for ${systemInfo.name} (${systemInfo.id})...`,
    "command"
  );
  currentTargetSystem = systemInfo;
  systemInfo.element.classList.add("scanning");

  const gameType =
    MINIGAME_TYPES[Math.floor(Math.random() * MINIGAME_TYPES.length)];
  activeMiniGame.currentGameType = gameType;

  showInstructionPopup(gameType);
}

function showInstructionPopup(gameType) {
  let instructions = "";
  let visualHTML = "";
  let gameName = "";

  switch (gameType) {
    case "pattern":
      gameName = "Pattern Recognition";
      instructions =
        "Memorize the highlighted pattern on the grid, then replicate it exactly.";
      visualHTML = `<div class="visual-grid"><div class="visual-cell"></div><div class="visual-cell highlight">X</div><div class="visual-cell"></div><div class="visual-cell highlight">X</div><div class="visual-cell"></div><div class="visual-cell"></div><div class="visual-cell"></div><div class="visual-cell"></div><div class="visual-cell highlight">X</div></div>`;
      break;
    case "qte":
      gameName = "Timing Calibration";
      instructions =
        "Press the button precisely when the moving indicator enters the highlighted target zone.";
      visualHTML = `<div class="visual-qte-bar"><span class="visual-qte-indicator">></span><span class="visual-qte-target"></span>  Target Zone</div>`;
      break;
    case "sequence":
      gameName = "Sequence Memory";
      instructions = `A sequence of ${SEQUENCE_LENGTH} colors will flash. Click the colored buttons in the same order.`;
      visualHTML = `<div class="visual-sequence"><div class="visual-sequence-item" style="background-color: ${SEQUENCE_COLORS[0]};"></div><div class="visual-sequence-item" style="background-color: ${SEQUENCE_COLORS[1]};"></div> ...</div>`;
      break;
    case "rapidclick":
      gameName = "Power Surge Control";
      instructions = `Click the target button ${RAPID_CLICK_TARGET} times before the timer runs out!`;
      visualHTML = `<div><span class="visual-click-target">Click Me!</span> / Time: ${RAPID_CLICK_TIME.toFixed(
        1
      )}s</div>`;
      break;
    case "mathlock":
      gameName = "Code Decryption";
      instructions =
        "Calculate the result of the mathematical expression to decrypt the access code.";
      visualHTML = `<span class="visual-math-problem">e.g., 5 * (3 + 2) = ?</span>`;
      break;
    case "whack":
      gameName = "Signal Purge";
      instructions = `Click the highlighted rogue signals as they appear. Reach ${WHACK_TARGET_SCORE} points.`;
      visualHTML = `<div class="visual-whack-grid"><div class="visual-whack-item"></div><div class="visual-whack-item active"><i class="fas fa-wifi"></i></div><div class="visual-whack-item"></div><div class="visual-whack-item active"><i class="fas fa-wifi"></i></div> ... </div>`;
      break;
    case "firewall":
      gameName = "Firewall Bypass";
      instructions = `Enter the displayed symbol sequence exactly using the provided buttons.`;
      visualHTML = `<div style="text-align: center;"><div class="visual-firewall-symbols"><span class="visual-firewall-symbol">#</span><span class="visual-firewall-symbol">></span><span class="visual-firewall-symbol">*</span> ...</div><span>Target Sequence</span></div>`;
      break;
    default:
      gameName = "Unknown Procedure";
      instructions = "Prepare for an unknown calibration procedure.";
      visualHTML = "<span>No visual example available.</span>";
  }

  instructionTitle.innerHTML = `<i class="fas fa-info-circle"></i> Scan Task: ${gameName}`;
  instructionText.textContent = instructions;
  instructionVisual.innerHTML = visualHTML;
  instructionModal.classList.add("active");
}

proceedScanBtn.onclick = () => {
  instructionModal.classList.remove("active");
  setTimeout(() => {
    if (activeMiniGame.currentGameType) {
      launchMiniGame(activeMiniGame.currentGameType);
    } else {
      logMessage("Error: Could not determine scan type.", "error");
      if (currentTargetSystem && currentTargetSystem.element) {
        currentTargetSystem.element.classList.remove("scanning");
      }
    }
  }, 150);
};

function launchMiniGame(type) {
  miniGameFeedback.textContent = "";
  miniGameFeedback.className = "feedback-message";
  miniGameArea.innerHTML = "";

  logMessage(
    `Scanner requires manual calibration. Procedure: ${type.toUpperCase()}`,
    "system"
  );

  switch (type) {
    case "pattern":
      setupPatternGame();
      break;
    case "qte":
      setupQTEGame();
      break;
    case "sequence":
      setupSequenceGame();
      break;
    case "rapidclick":
      setupRapidClickGame();
      break;
    case "mathlock":
      setupMathLockGame();
      break;
    case "whack":
      setupWhackGame();
      break;
    case "firewall":
      setupFirewallGame();
      break;
    default:
      logMessage(`Unknown minigame type: ${type}`, "error");
      handleMiniGameResult(false);
      return;
  }

  miniGameModal.classList.add("active");
}

function clearActiveMiniGame() {
  if (activeMiniGame) {
    clearTimeout(activeMiniGame.timeoutId);
    clearInterval(activeMiniGame.intervalId);
  }
  activeMiniGame = { timeoutId: null, intervalId: null, currentGameType: null };
}

function handleMiniGameResult(success) {
  clearActiveMiniGame();
  miniGameModal.classList.remove("active");

  if (currentTargetSystem && currentTargetSystem.element) {
    currentTargetSystem.element.classList.remove("scanning");

    if (success) {
      const systemId = currentTargetSystem.id;
      const systemName = currentTargetSystem.name;
      const scanData = `Data acquired. System exhibits: ${
        [
          "Normal Parameters",
          "Unusual Gravity Well",
          "Ancient Alien Signal",
          "Rich Mineral Veins",
          "Temporal Distortion",
        ][Math.floor(Math.random() * 5)]
      }.`;

      scannedSystems[systemId] = { name: systemName, data: scanData };
      const sysData = systemsData.find((s) => s.id === systemId);
      if (sysData) sysData.scanned = true;

      logMessage(
        `Scan successful for ${systemName}! ${scanData}`,
        "scan-success"
      );
      saveProgress();
    } else {
      logMessage(
        `Scan failed for ${currentTargetSystem.name}. Calibration interference detected. Try again.`,
        "scan-fail"
      );
    }
  } else {
    logMessage("Error: Target system lost during scan.", "error");
  }

  currentTargetSystem = null;
  updateProgress();
}

function setupPatternGame() {
  miniGameTitle.textContent = "Pattern Recognition";
  miniGameInstructions.textContent =
    "Observe the pattern, then replicate it by clicking the cells.";
  miniGameArea.innerHTML = `<div class="pattern-display">Pattern: <span id="pattern-sequence"></span></div><div class="pattern-grid" id="pattern-input-grid"></div><button id="submitPatternBtn" class="btn btn-primary btn-small">Confirm Pattern</button>`;
  const gridSize = 3;
  const gameSequenceLength = 4;
  let targetPattern = [];
  let userPattern = [];
  while (targetPattern.length < gameSequenceLength) {
    const randomIndex = Math.floor(Math.random() * (gridSize * gridSize));
    if (!targetPattern.includes(randomIndex)) {
      targetPattern.push(randomIndex);
    }
  }
  const gridCells = [];
  const inputGrid = document.getElementById("pattern-input-grid");
  if (!inputGrid) return handleMiniGameResult(false);
  inputGrid.style.gridTemplateColumns = `repeat(${gridSize}, 40px)`;
  for (let i = 0; i < gridSize * gridSize; i++) {
    const cell = document.createElement("div");
    cell.className = "pattern-cell";
    cell.dataset.index = i;
    inputGrid.appendChild(cell);
    gridCells.push(cell);
  }
  let flashCount = 0;
  miniGameInstructions.textContent = "Memorize the pattern...";
  inputGrid.style.pointerEvents = "none";
  clearActiveMiniGame();
  activeMiniGame.intervalId = setInterval(() => {
    if (flashCount >= targetPattern.length) {
      clearInterval(activeMiniGame.intervalId);
      activeMiniGame.intervalId = null;
      miniGameInstructions.textContent = "Now, replicate the pattern.";
      inputGrid.style.pointerEvents = "auto";
      gridCells.forEach((cell) => {
        cell.onclick = () => {
          const index = parseInt(cell.dataset.index);
          if (
            userPattern.length < gameSequenceLength &&
            !userPattern.includes(index)
          ) {
            userPattern.push(index);
            cell.classList.add("user-selected");
            if (userPattern.length === gameSequenceLength) {
              const submitBtn = document.getElementById("submitPatternBtn");
              if (submitBtn) {
                submitBtn.style.opacity = 1;
                submitBtn.disabled = false;
              }
            }
          } else if (userPattern.includes(index)) {
            userPattern = userPattern.filter((item) => item !== index);
            cell.classList.remove("user-selected");
            const submitBtn = document.getElementById("submitPatternBtn");
            if (submitBtn) {
              submitBtn.style.opacity = 0.5;
              submitBtn.disabled = true;
            }
          }
        };
      });
      const submitBtn = document.getElementById("submitPatternBtn");
      if (submitBtn) {
        submitBtn.style.opacity = 0.5;
        submitBtn.disabled = true;
      }
      return;
    }
    const indexToFlash = targetPattern[flashCount];
    if (gridCells[indexToFlash]) {
      gridCells[indexToFlash].classList.add("active");
      activeMiniGame.timeoutId = setTimeout(() => {
        if (gridCells[indexToFlash])
          gridCells[indexToFlash].classList.remove("active");
        flashCount++;
        activeMiniGame.timeoutId = null;
      }, 400);
    } else {
      clearInterval(activeMiniGame.intervalId);
      activeMiniGame.intervalId = null;
    }
  }, 600);
  const submitBtn = document.getElementById("submitPatternBtn");
  if (submitBtn) {
    submitBtn.onclick = () => {
      const success =
        JSON.stringify(targetPattern) === JSON.stringify(userPattern);
      miniGameFeedback.textContent = success
        ? "Pattern Matched!"
        : "Pattern Incorrect.";
      miniGameFeedback.className = `feedback-message ${
        success ? "success" : "error"
      }`;
      submitBtn.disabled = true;
      setTimeout(() => handleMiniGameResult(success), success ? 1000 : 1500);
    };
    submitBtn.style.opacity = 0.5;
    submitBtn.disabled = true;
  } else {
    handleMiniGameResult(false);
  }
}

function setupQTEGame() {
  miniGameTitle.textContent = "Timing Calibration";
  miniGameInstructions.textContent =
    "Hit the button when the indicator enters the green zone!";
  miniGameArea.innerHTML = `<div class="qte-bar-container"><div class="qte-target-zone" id="qte-target"></div><div class="qte-indicator" id="qte-indicator"></div></div><button id="qte-button" class="btn btn-secondary btn-glow">Calibrate!</button>`;
  const indicator = document.getElementById("qte-indicator");
  const target = document.getElementById("qte-target");
  const qteButton = document.getElementById("qte-button");
  if (!indicator || !target || !qteButton) return handleMiniGameResult(false);
  const targetWidth = Math.random() * 10 + 10;
  const targetLeft = Math.random() * (75 - targetWidth);
  target.style.width = `${targetWidth}%`;
  target.style.left = `${targetLeft}%`;
  const animationDuration = Math.random() * 1 + 1.5;
  indicator.style.animation = `qte-move ${animationDuration}s linear 1 forwards`;
  qteButton.disabled = false;
  let qtePressed = false;
  clearActiveMiniGame();
  qteButton.onclick = () => {
    if (qtePressed) return;
    qtePressed = true;
    qteButton.disabled = true;
    indicator.style.animationPlayState = "paused";
    clearTimeout(activeMiniGame.timeoutId);
    activeMiniGame.timeoutId = null;
    const indicatorRect = indicator.getBoundingClientRect();
    const containerRect = indicator.parentElement.getBoundingClientRect();
    if (containerRect.width === 0) return handleMiniGameResult(false);
    const indicatorLeftPercent =
      ((indicatorRect.left - containerRect.left) / containerRect.width) * 100;
    const success =
      indicatorLeftPercent >= targetLeft &&
      indicatorLeftPercent <= targetLeft + targetWidth;
    miniGameFeedback.textContent = success
      ? "Calibration Lock Acquired!"
      : "Timing Mismatch!";
    miniGameFeedback.className = `feedback-message ${
      success ? "success" : "error"
    }`;
    setTimeout(() => handleMiniGameResult(success), success ? 1000 : 1500);
  };
  activeMiniGame.timeoutId = setTimeout(() => {
    if (!qtePressed) {
      indicator.style.animationPlayState = "paused";
      qteButton.disabled = true;
      miniGameFeedback.textContent = "Calibration Timed Out!";
      miniGameFeedback.className = "feedback-message error";
      activeMiniGame.timeoutId = null;
      setTimeout(() => handleMiniGameResult(false), 1500);
    }
  }, animationDuration * 1000 + 100);
}

function setupSequenceGame() {
  miniGameTitle.textContent = "Sequence Memory";
  miniGameInstructions.textContent = `Watch the ${SEQUENCE_LENGTH} color sequence, then click the buttons in the same order.`;
  let colorButtonsHTML = "";
  SEQUENCE_COLORS.forEach((color) => {
    colorButtonsHTML += `<button class="sequence-color-btn" data-color="${color}" style="background-color: ${color};"></button>`;
  });
  miniGameArea.innerHTML = `<div id="sequence-display" class="sequence-display"></div><div class="sequence-colors">${colorButtonsHTML}</div>`;
  const displayArea = document.getElementById("sequence-display");
  const colorButtons = miniGameArea.querySelectorAll(".sequence-color-btn");
  if (!displayArea || colorButtons.length !== SEQUENCE_COLORS.length)
    return handleMiniGameResult(false);
  let targetSequence = [];
  let userSequence = [];
  for (let i = 0; i < SEQUENCE_LENGTH; i++) {
    targetSequence.push(
      SEQUENCE_COLORS[Math.floor(Math.random() * SEQUENCE_COLORS.length)]
    );
  }
  let flashIndex = 0;
  miniGameInstructions.textContent = "Memorize the sequence...";
  colorButtons.forEach((btn) => (btn.disabled = true));
  clearActiveMiniGame();
  activeMiniGame.intervalId = setInterval(() => {
    if (flashIndex >= targetSequence.length) {
      clearInterval(activeMiniGame.intervalId);
      activeMiniGame.intervalId = null;
      displayArea.innerHTML = "";
      miniGameInstructions.textContent = "Now, repeat the sequence.";
      colorButtons.forEach((btn) => (btn.disabled = false));
      return;
    }
    displayArea.innerHTML = `<div class="sequence-display-item" style="background-color: ${targetSequence[flashIndex]};"></div>`;
    flashIndex++;
    activeMiniGame.timeoutId = setTimeout(() => {
      if (flashIndex < targetSequence.length) {
        displayArea.innerHTML = "";
      }
      activeMiniGame.timeoutId = null;
    }, 500);
  }, 800);
  colorButtons.forEach((btn) => {
    btn.onclick = () => {
      const clickedColor = btn.dataset.color;
      userSequence.push(clickedColor);
      btn.style.transform = "scale(1.1)";
      setTimeout(() => (btn.style.transform = "scale(1)"), 150);
      if (userSequence.length === targetSequence.length) {
        colorButtons.forEach((b) => (b.disabled = true));
        const success =
          JSON.stringify(targetSequence) === JSON.stringify(userSequence);
        miniGameFeedback.textContent = success
          ? "Sequence Matched!"
          : "Sequence Incorrect!";
        miniGameFeedback.className = `feedback-message ${
          success ? "success" : "error"
        }`;
        setTimeout(() => handleMiniGameResult(success), success ? 1000 : 1500);
      }
    };
  });
}

function setupRapidClickGame() {
  miniGameTitle.textContent = "Power Surge Control";
  miniGameInstructions.textContent = `Click the button ${RAPID_CLICK_TARGET} times in ${RAPID_CLICK_TIME} seconds!`;
  miniGameArea.innerHTML = `<div class="rapid-click-area"><button id="clickTargetBtn">Click Fast!</button><div id="clickTimer">${RAPID_CLICK_TIME.toFixed(
    1
  )}s</div><div id="clickCounter">Clicks: 0 / ${RAPID_CLICK_TARGET}</div></div>`;
  const targetButton = document.getElementById("clickTargetBtn");
  const timerDisplay = document.getElementById("clickTimer");
  const counterDisplay = document.getElementById("clickCounter");
  if (!targetButton || !timerDisplay || !counterDisplay)
    return handleMiniGameResult(false);
  let clicks = 0;
  let timeLeft = RAPID_CLICK_TIME;
  targetButton.disabled = false;
  clearActiveMiniGame();
  targetButton.onclick = () => {
    clicks++;
    counterDisplay.textContent = `Clicks: ${clicks} / ${RAPID_CLICK_TARGET}`;
    targetButton.style.transform = "scale(1.05)";
    setTimeout(() => (targetButton.style.transform = "scale(1)"), 50);
    if (clicks >= RAPID_CLICK_TARGET) {
      clearInterval(activeMiniGame.intervalId);
      activeMiniGame.intervalId = null;
      targetButton.disabled = true;
      miniGameFeedback.textContent = "Power Stabilized!";
      miniGameFeedback.className = "feedback-message success";
      setTimeout(() => handleMiniGameResult(true), 1000);
    }
  };
  activeMiniGame.intervalId = setInterval(() => {
    timeLeft -= 0.1;
    timerDisplay.textContent = `${timeLeft.toFixed(1)}s`;
    if (timeLeft <= 0) {
      clearInterval(activeMiniGame.intervalId);
      activeMiniGame.intervalId = null;
      targetButton.disabled = true;
      if (clicks >= RAPID_CLICK_TARGET) {
        miniGameFeedback.textContent = "Power Stabilized!";
        miniGameFeedback.className = "feedback-message success";
        setTimeout(() => handleMiniGameResult(true), 1000);
      } else {
        miniGameFeedback.textContent = "Insufficient Power Output!";
        miniGameFeedback.className = "feedback-message error";
        setTimeout(() => handleMiniGameResult(false), 1500);
      }
    }
  }, 100);
}

function setupMathLockGame() {
  miniGameTitle.textContent = "Code Decryption";
  const num1 = Math.floor(Math.random() * 10) + 1; // 1-10
  const num2 = Math.floor(Math.random() * 5) + 1; // 1-5
  const num3 = Math.floor(Math.random() * 5) + 1; // 1-5
  const operators = ["+", "-", "*"];
  const op1 = operators[Math.floor(Math.random() * operators.length)];
  const op2 = operators[Math.floor(Math.random() * operators.length)];
  let problem = `${num1} ${op1} (${num2} ${op2} ${num3})`;
  let answer;
  try {
    // Use Function constructor for safe evaluation (more controlled than eval)
    answer = new Function(`return ${problem}`)();
  } catch (e) {
    // Fallback for safety or generation error
    problem = `${num1} + ${num2}`;
    answer = num1 + num2;
  }

  miniGameInstructions.textContent = `Calculate the result to find the decryption key:`;
  miniGameArea.innerHTML = `
        <div class="mathlock-area">
            <div class="mathlock-problem">${problem.replace("*", "x")} = ?</div>
            <input type="number" id="mathlock-answer" class="mathlock-input" placeholder="Code">
            <button id="submitMathBtn" class="btn btn-primary btn-small">Decrypt</button>
        </div>
     `;

  const inputField = document.getElementById("mathlock-answer");
  const submitBtn = document.getElementById("submitMathBtn");
  if (!inputField || !submitBtn) return handleMiniGameResult(false);
  clearActiveMiniGame(); // No timers for this game

  inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      submitBtn.click();
    }
  });

  submitBtn.onclick = () => {
    const userAnswer = parseFloat(inputField.value);
    // Use a small tolerance for potential floating point issues if division was added
    const success = Math.abs(userAnswer - answer) < 0.001;
    miniGameFeedback.textContent = success
      ? "Decryption Successful!"
      : "Incorrect Code!";
    miniGameFeedback.className = `feedback-message ${
      success ? "success" : "error"
    }`;
    submitBtn.disabled = true;
    inputField.disabled = true;
    setTimeout(() => handleMiniGameResult(success), success ? 1000 : 1500);
  };
}

function setupWhackGame() {
  miniGameTitle.textContent = "Signal Purge";
  miniGameInstructions.textContent = `Purge ${WHACK_TARGET_SCORE} rogue signals before time runs out!`;
  miniGameArea.innerHTML = `
        <div class="whack-area">
            <div class="whack-info">
                <span id="whack-score">Score: 0 / ${WHACK_TARGET_SCORE}</span>
                <span id="whack-timer">Time: ${WHACK_GAME_TIME.toFixed(
                  1
                )}s</span>
            </div>
            <div class="whack-grid" id="whack-grid"></div>
        </div>
    `;

  const grid = document.getElementById("whack-grid");
  const scoreDisplay = document.getElementById("whack-score");
  const timerDisplay = document.getElementById("whack-timer");
  if (!grid || !scoreDisplay || !timerDisplay)
    return handleMiniGameResult(false);

  let score = 0;
  let timeLeft = WHACK_GAME_TIME;
  const gridSize = 9; // 3x3 grid
  const items = [];
  clearActiveMiniGame();

  for (let i = 0; i < gridSize; i++) {
    const item = document.createElement("div");
    item.className = "whack-item";
    item.dataset.index = i;
    item.innerHTML = `<i class="fas fa-wifi"></i>`; // Icon inside
    item.onclick = () => {
      if (item.classList.contains("active")) {
        score++;
        scoreDisplay.textContent = `Score: ${score} / ${WHACK_TARGET_SCORE}`;
        item.classList.remove("active");
        item.classList.add("hit"); // Visual feedback for hit
        setTimeout(() => item.classList.remove("hit"), 200);
        // Check for win immediately after reaching score
        if (score >= WHACK_TARGET_SCORE) {
          endWhackGame(true);
        }
      }
    };
    grid.appendChild(item);
    items.push(item);
  }

  // Game loop interval
  activeMiniGame.intervalId = setInterval(() => {
    // Deactivate old ones
    items.forEach((item) => item.classList.remove("active"));
    // Activate a new random one
    const randomIndex = Math.floor(Math.random() * gridSize);
    items[randomIndex].classList.add("active");
  }, 800); // How often a new signal appears

  // Timer interval
  activeMiniGame.timeoutId = setInterval(() => {
    timeLeft -= 0.1;
    timerDisplay.textContent = `Time: ${timeLeft.toFixed(1)}s`;
    if (timeLeft <= 0) {
      endWhackGame(score >= WHACK_TARGET_SCORE);
    }
  }, 100);

  const endWhackGame = (success) => {
    clearActiveMiniGame(); // Stop intervals
    grid.style.pointerEvents = "none"; // Disable further clicks
    miniGameFeedback.textContent = success
      ? "Signals Purged!"
      : "Purge Failed!";
    miniGameFeedback.className = `feedback-message ${
      success ? "success" : "error"
    }`;
    setTimeout(() => handleMiniGameResult(success), success ? 1000 : 1500);
  };
}

function setupFirewallGame() {
  miniGameTitle.textContent = "Firewall Bypass";
  let targetSequence = "";
  for (let i = 0; i < FIREWALL_LENGTH; i++) {
    targetSequence +=
      FIREWALL_SYMBOLS[Math.floor(Math.random() * FIREWALL_SYMBOLS.length)];
  }

  miniGameInstructions.textContent = `Enter the bypass sequence exactly:`;
  let symbolButtonsHTML = "";
  FIREWALL_SYMBOLS.forEach((symbol) => {
    // Use .btn and .btn-secondary for styling, add specific class
    symbolButtonsHTML += `<button class="btn btn-secondary btn-small firewall-symbol-btn" data-symbol="${symbol}">${symbol}</button>`;
  });

  miniGameArea.innerHTML = `
        <div class="firewall-area">
            <div class="firewall-target-sequence">${targetSequence}</div>
            <div id="firewall-user-input" class="firewall-user-input"></div>
            <div class="firewall-symbol-buttons">${symbolButtonsHTML}</div>
        </div>
    `;

  const userInputDisplay = document.getElementById("firewall-user-input");
  const symbolButtons = miniGameArea.querySelectorAll(".firewall-symbol-btn");
  if (!userInputDisplay || symbolButtons.length === 0)
    return handleMiniGameResult(false);

  let userSequence = "";
  clearActiveMiniGame(); // No timers needed

  symbolButtons.forEach((btn) => {
    btn.onclick = () => {
      const clickedSymbol = btn.dataset.symbol;
      userSequence += clickedSymbol;
      userInputDisplay.textContent = userSequence;

      // Check if input is still valid prefix
      if (!targetSequence.startsWith(userSequence)) {
        // Incorrect sequence
        symbolButtons.forEach((b) => (b.disabled = true));
        miniGameFeedback.textContent = "Bypass Failed! Sequence Mismatch.";
        miniGameFeedback.className = "feedback-message error";
        setTimeout(() => handleMiniGameResult(false), 1500);
      } else if (userSequence.length === targetSequence.length) {
        // Correct and complete sequence
        symbolButtons.forEach((b) => (b.disabled = true));
        miniGameFeedback.textContent = "Firewall Bypassed!";
        miniGameFeedback.className = "feedback-message success";
        setTimeout(() => handleMiniGameResult(true), 1000);
      }
      // Otherwise, sequence is correct so far, continue...
    };
  });
}

function completeMission() {
  gameInProgress = false;
  logMessage("All systems mapped! Mission successful!", "system");
  certUserNameDisplay.textContent = userName;
  certName.textContent = userName;
  const today = new Date();
  const dateString = today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  certDate.textContent = `On Stardate ${today.getFullYear()}.${String(
    today.getMonth() + 1
  ).padStart(2, "0")}.${String(today.getDate()).padStart(
    2,
    "0"
  )} (Earth Date: ${dateString})`;
  if (Object.keys(scannedSystems).length === TOTAL_SYSTEMS) {
    saveProgress();
  }
  showScreen(completionScreen);
}

async function downloadCertificate() {
  logMessage("Generating certificate PDF...", "system");
  certificatePreview.style.transform = "scale(1.1)";
  certificatePreview.style.transformOrigin = "top left";
  await new Promise((resolve) => requestAnimationFrame(resolve));
  try {
    const canvas = await html2canvas(certificatePreview, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: null,
      width: certificatePreview.offsetWidth * 1.1,
      height: certificatePreview.offsetHeight * 1.1,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    });
    certificatePreview.style.transform = "scale(1)";
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const margin = 10;
    const availableWidth = pdfWidth - 2 * margin;
    const availableHeight = pdfHeight - 2 * margin;
    const imgRatio = imgProps.width / imgProps.height;
    const pageRatio = availableWidth / availableHeight;
    let finalImgWidth, finalImgHeight;
    if (imgRatio > pageRatio) {
      finalImgWidth = availableWidth;
      finalImgHeight = finalImgWidth / imgRatio;
    } else {
      finalImgHeight = availableHeight;
      finalImgWidth = finalImgHeight * imgRatio;
    }
    const x = margin + (availableWidth - finalImgWidth) / 2;
    const y = margin + (availableHeight - finalImgHeight) / 2;
    pdf.addImage(imgData, "PNG", x, y, finalImgWidth, finalImgHeight);
    pdf.save(`${userName.replace(/\s+/g, "_")}_Cosmic_Cartographer_Cert.pdf`);
    logMessage("Certificate PDF download initiated.", "info");
  } catch (error) {
    console.error("Error generating PDF:", error);
    logMessage("Error generating PDF. Check console for details.", "error");
    alert("Sorry, there was an error generating the certificate PDF.");
    certificatePreview.style.transform = "scale(1)";
  }
}

function initializeApp() {
  loadProgress.called = true;
  const loaded = loadProgress();
  if (loaded && gameInProgress) {
    logMessage("Resuming mission...", "system");
    userDesignationDisplay.textContent = `Trainee: ${userName}`;
    generateStarMap();
    updateProgress();
    showScreen(gameScreen);
  } else if (
    loaded &&
    !gameInProgress &&
    Object.keys(scannedSystems).length === TOTAL_SYSTEMS
  ) {
    logMessage("Mission already completed. Displaying certificate.", "system");
    completeMission();
  } else {
    resetGameData();
    logMessage("Ready for new mission.", "system");
    showScreen(welcomeScreen);
  }

  startMissionBtn.addEventListener("click", () => {
    if (validateName()) {
      userName = userNameInput.value.trim();
      initializeGameInterface();
    }
  });
  resetProgressBtn.addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to reset all progress for this mission? This cannot be undone."
      )
    ) {
      logMessage("Mission progress has been reset by user.", "system");
      const currentUserName = userName;
      resetGameData();
      userName = currentUserName;
      userNameInput.value = userName;
      initializeGameInterface();
    }
  });
  downloadCertBtn.addEventListener("click", downloadCertificate);
  startNewMissionBtn.addEventListener("click", () => {
    resetGameData();
    userNameInput.value = "";
    logMessage("Ready for new mission.", "system");
    showScreen(welcomeScreen);
  });
  userNameInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      startMissionBtn.click();
    }
  });
}

initializeApp();
