// ============================================================
// p5.js 響應式 Google 試算表選擇題測驗系統
// ============================================================

// ------------------------------------------------------------
// Google 試算表 CSV 網址
// ------------------------------------------------------------
// 請先將 Google 試算表設定為「發布到網路」，再替換下方網址中的：
// 1. 試算表ID：Google 試算表網址 /d/ 與下一個 / 之間的文字
// 2. 工作表GID：工作表網址中的 gid= 後面的數字
//
// 正確格式：
// https://docs.google.com/spreadsheets/d/試算表ID/export?format=csv&gid=工作表GID
//
// 例如：
// https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=0
// ------------------------------------------------------------
const GOOGLE_SHEET_CSV_URL = https://docs.google.com/spreadsheets/d/e/2PACX-1vQzIMIob9Ioo21j7qjBprFI-jDvmpUlZ4ixfxQrmE8XUXvx-zZkSnt2xbJeZXlQTA/pub?gid=1212739791&single=true&output=csv
  "https://docs.google.com/spreadsheets/d/試算表ID/export?format=csv&gid=工作表GID";

// ------------------------------------------------------------
// 字型設定
// ------------------------------------------------------------
const FONT_CHINESE = "LXGW WenKai Mono TC";
const FONT_ENGLISH = "Isometra";

// ------------------------------------------------------------
// 測驗設定
// ------------------------------------------------------------
const QUIZ_LENGTH = 5;          // 每次測驗隨機抽出五題
const SCORE_PER_QUESTION = 20; // 每題答對得二十分

// ------------------------------------------------------------
// 顏色設定
// ------------------------------------------------------------
const COLORS = {
  background: "#bc6c25",  // 畫布背景
  questionBox: "#ffc8dd", // 題目方框
  white: "#ffffff",       // 白色
  black: "#222222",       // 文字與外框
  correct: "#43aa8b",     // 答對選項
  wrong: "#f94144",       // 答錯選項
  answer: "#48cae4",      // 正確答案提示
  button: "#ffffff",      // 按鈕
  buttonHover: "#e9ecef"  // 滑鼠移到按鈕上
};

// ------------------------------------------------------------
// 題庫與載入狀態
// ------------------------------------------------------------
let questionBank = [];       // Google 試算表目前載入的所有有效題目
let quizQuestions = [];      // 本次測驗隨機抽出的五題
let isLoading = true;        // 是否正在讀取 Google 試算表
let loadError = false;       // 是否發生載入錯誤
let loadErrorMessage = "";  // 顯示給使用者的錯誤說明

// ------------------------------------------------------------
// 測驗狀態
// ------------------------------------------------------------
let currentQuestion = 0;    // 目前題目索引
let correctCount = 0;       // 答對題數
let selectedAnswer = -1;    // 使用者選擇的選項索引
let hasAnswered = false;    // 本題是否已作答
let isCorrect = false;      // 本題是否答對
let quizFinished = false;    // 是否已完成測驗

// ------------------------------------------------------------
// 答題動畫與結果動畫
// ------------------------------------------------------------
let animationStartFrame = 0;
const animationDuration = 45;
let cheerStartFrame = 0;
let fireworks = [];
let lastFireworkFrame = 0;

// ------------------------------------------------------------
// 按鈕資料與觸控防重複
// ------------------------------------------------------------
let resultRestartButton = null;
let resultReloadButton = null;
let errorReloadButton = null;
let lastTouchTime = -1000;

// ------------------------------------------------------------
// 建立畫布並開始讀取 Google 試算表
// ------------------------------------------------------------
function setup() {
  // 建立符合瀏覽器視窗大小的全螢幕畫布
  createCanvas(windowWidth, windowHeight);

  // 設定文字置中與矩形繪製模式
  textAlign(CENTER, CENTER);
  rectMode(CORNER);

  // 設定預設中文字型
  textFont(FONT_CHINESE);

  // 停用手機瀏覽器可能產生的滑動與縮放手勢
  document.body.style.touchAction = "none";

  // 啟動 Google 試算表 CSV 讀取
  loadQuestionBank();
}

// ------------------------------------------------------------
// 從 Google 試算表讀取最新題庫
// ------------------------------------------------------------
function loadQuestionBank() {
  // 顯示載入狀態，並清除前一次錯誤
  isLoading = true;
  loadError = false;
  loadErrorMessage = "";
  errorReloadButton = null;

  // Google export CSV 網址已經有查詢參數，因此用 & 加上防快取參數。
  // 每次重新讀取都使用新的時間戳記，避免只取得瀏覽器舊快取內容。
  const cacheBustingQuery = "&_cacheBust=" + Date.now();

  // 使用 p5.js loadTable 讀取公開發布的 Google Sheet CSV。
  // CSV 標題列必須是：question,optionA,optionB,optionC,optionD,answer
  loadTable(
    GOOGLE_SHEET_CSV_URL + cacheBustingQuery,
    "csv",
    "header",
    handleTableLoaded,
    handleTableError
  );
}

// ------------------------------------------------------------
// Google 試算表成功讀取後處理資料
// ------------------------------------------------------------
function handleTableLoaded(table) {
  // 先清空舊題庫，確保重新讀取不會混入舊資料
  questionBank = [];

  // 逐列讀取並驗證題目
  for (let rowIndex = 0; rowIndex < table.getRowCount(); rowIndex++) {
    const question = getTableValue(table, rowIndex, "question");
    const optionA = getTableValue(table, rowIndex, "optionA");
    const optionB = getTableValue(table, rowIndex, "optionB");
    const optionC = getTableValue(table, rowIndex, "optionC");
    const optionD = getTableValue(table, rowIndex, "optionD");
    const answer = getTableValue(table, rowIndex, "answer")
      .trim()
      .toUpperCase();

    // 只有六欄都有效，且答案是 A、B、C、D 時才加入正式題庫
    if (
      question !== "" &&
      optionA !== "" &&
      optionB !== "" &&
      optionC !== "" &&
      optionD !== "" &&
      ["A", "B", "C", "D"].includes(answer)
    ) {
      questionBank.push({
        question: question,
        options: [optionA, optionB, optionC, optionD],
        answer: answerToIndex(answer)
      });
    }
  }

  // 載入完成，先關閉載入畫面
  isLoading = false;

  // 有效題目不足五題時，不進入測驗並顯示清楚錯誤
  if (questionBank.length < QUIZ_LENGTH) {
    loadError = true;
    loadErrorMessage =
      "有效題目少於五題。請確認每列都有 question、optionA、optionB、optionC、optionD、answer 六個欄位，且 answer 只能填 A、B、C 或 D。";
    return;
  }

  // 讀取成功後，從最新題庫重新隨機抽出五題
  loadError = false;
  startNewQuiz();
}

// ------------------------------------------------------------
// 安全讀取 p5.Table 欄位內容
// ------------------------------------------------------------
function getTableValue(table, rowIndex, columnName) {
  // 欄位不存在或資料異常時回傳空字串，避免程式中斷
  try {
    const value = table.getString(rowIndex, columnName);
    return value === undefined || value === null ? "" : String(value).trim();
  } catch (error) {
    console.error("讀取欄位失敗：", columnName, error);
    return "";
  }
}

// ------------------------------------------------------------
// Google 試算表讀取失敗後處理錯誤
// ------------------------------------------------------------
function handleTableError(error) {
  // 關閉載入畫面並顯示錯誤頁
  isLoading = false;
  loadError = true;

  // 若仍使用預設佔位網址，直接提示替換方式
  if (GOOGLE_SHEET_CSV_URL.includes("試算表ID")) {
    loadErrorMessage =
      "請先在 sketch.js 的 GOOGLE_SHEET_CSV_URL 填入真正的試算表 ID 與工作表 GID。";
  } else {
    // 其他錯誤通常與未公開、網址錯誤或網路連線有關
    loadErrorMessage =
      "無法讀取 Google 試算表。請確認試算表已使用「檔案 → 共用 → 發布到網路」公開發布，網址格式正確，且網路連線正常。";
  }

  // 將詳細錯誤留在瀏覽器主控台，方便除錯
  console.error("Google Sheet CSV 載入失敗：", error);
}

// ------------------------------------------------------------
// 將 A、B、C、D 轉成 0、1、2、3
// ------------------------------------------------------------
function answerToIndex(answer) {
  const answerMap = { A: 0, B: 1, C: 2, D: 3 };
  return answerMap[answer];
}

// ------------------------------------------------------------
// p5.js 主繪圖函式
// ------------------------------------------------------------
function draw() {
  // 每一幀先填滿背景
  background(COLORS.background);

  // 依照狀態顯示載入中、錯誤、測驗或結果畫面
  if (isLoading) {
    drawLoadingScreen();
  } else if (loadError) {
    drawErrorScreen();
  } else if (quizFinished) {
    drawResultScreen();
  } else {
    drawQuizScreen();
  }
}

// ------------------------------------------------------------
// 顯示載入中畫面
// ------------------------------------------------------------
function drawLoadingScreen() {
  // 顯示正在讀取提示
  fill(COLORS.white);
  noStroke();
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(constrain(min(width * 0.06, height * 0.08), 24, 48));
  text("正在讀取 Google 試算表題庫...", width / 2, height / 2);
}

// ------------------------------------------------------------
// 顯示錯誤畫面
// ------------------------------------------------------------
function drawErrorScreen() {
  const titleSize = constrain(min(width * 0.065, height * 0.09), 24, 48);
  const messageSize = constrain(min(width * 0.035, height * 0.05), 16, 28);
  const buttonWidth = constrain(width * 0.46, 190, 310);
  const buttonHeight = constrain(height * 0.08, 48, 68);
  const buttonY = height * 0.72;

  // 顯示錯誤標題
  fill(COLORS.white);
  noStroke();
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(titleSize);
  text("題庫載入失敗", width / 2, height * 0.27);

  // 顯示錯誤原因與處理方向
  textStyle(NORMAL);
  textSize(messageSize);
  drawWrappedText(
    loadErrorMessage,
    width / 2,
    height * 0.47,
    width * 0.82,
    messageSize * 1.55
  );

  // 顯示重新讀取按鈕
  errorReloadButton = {
    x: width / 2 - buttonWidth / 2,
    y: buttonY,
    width: buttonWidth,
    height: buttonHeight
  };
  drawButton(errorReloadButton, "重新讀取題庫", messageSize);
}

// ------------------------------------------------------------
// 開始新的五題測驗，不重新讀取 Google Sheet
// ------------------------------------------------------------
function startNewQuiz() {
  // Fisher-Yates 由 p5.js shuffle 產生不重複的隨機順序
  const shuffledQuestions = shuffle(questionBank.slice(), true);
  quizQuestions = shuffledQuestions.slice(0, QUIZ_LENGTH);

  // 重設答題狀態
  currentQuestion = 0;
  correctCount = 0;
  selectedAnswer = -1;
  hasAnswered = false;
  isCorrect = false;
  quizFinished = false;
  resultRestartButton = null;
  resultReloadButton = null;
  fireworks = [];
}

// ------------------------------------------------------------
// 取得測驗頁響應式版面
// ------------------------------------------------------------
function getQuizLayout() {
  const isPortrait = height >= width;
  const sidePadding = constrain(width * 0.055, 12, 64);
  const contentWidth = min(width - sidePadding * 2, 900);

  // 小畫面使用較小字體，確保手機橫向仍有足夠空間
  const titleSize = constrain(min(width * 0.04, height * 0.075), 18, 40);
  const progressSize = constrain(min(width * 0.023, height * 0.05), 14, 24);
  const questionSize = constrain(min(width * 0.031, height * 0.052), 16, 30);
  const optionTextSize = constrain(min(width * 0.026, height * 0.048), 14, 25);
  const buttonTextSize = constrain(min(width * 0.026, height * 0.05), 15, 27);

  const titleY = constrain(height * 0.055, 24, 52);
  const progressY = constrain(height * 0.115, 48, 84);
  const questionY = constrain(height * 0.17, 72, 132);

  // 題目方框在直向畫面可稍高，橫向畫面則避免佔用太多高度
  const questionBoxHeight = isPortrait
    ? constrain(height * 0.14, 78, 150)
    : constrain(height * 0.19, 68, 128);

  const buttonHeight = constrain(height * 0.075, 42, 66);
  const buttonWidth = constrain(width * 0.34, 150, 250);
  const buttonY = height - buttonHeight - constrain(height * 0.035, 10, 28);

  const optionGap = constrain(height * 0.012, 5, 14);
  const desiredOptionHeight = isPortrait
    ? constrain(height * 0.062, 40, 64)
    : constrain(height * 0.095, 32, 58);

  const firstOptionY = questionY + questionBoxHeight + constrain(height * 0.022, 8, 22);
  const availableOptionHeight = buttonY - 12 - firstOptionY;
  const fittedOptionHeight = (availableOptionHeight - optionGap * 3) / 4;
  const optionHeight = max(28, min(desiredOptionHeight, fittedOptionHeight));

  return {
    contentWidth: contentWidth,
    titleSize: titleSize,
    progressSize: progressSize,
    questionSize: questionSize,
    optionTextSize: optionTextSize,
    buttonTextSize: buttonTextSize,
    titleY: titleY,
    progressY: progressY,
    questionY: questionY,
    questionBoxHeight: questionBoxHeight,
    optionHeight: optionHeight,
    optionGap: optionGap,
    optionStartY: firstOptionY,
    buttonWidth: buttonWidth,
    buttonHeight: buttonHeight,
    buttonY: buttonY
  };
}

// ------------------------------------------------------------
// 繪製測驗畫面
// ------------------------------------------------------------
function drawQuizScreen() {
  const question = quizQuestions[currentQuestion];
  const layout = getQuizLayout();

  // 繪製標題與進度
  fill(COLORS.white);
  noStroke();
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(layout.titleSize);
  text("p5.js 簡易指令練習測驗", width / 2, layout.titleY);

  textStyle(NORMAL);
  textSize(layout.progressSize);
  text(
    `第 ${currentQuestion + 1} 題／共 ${QUIZ_LENGTH} 題`,
    width / 2,
    layout.progressY
  );

  // 顯示題目與四個選項
  drawQuestionBox(question.question, layout);
  for (let optionIndex = 0; optionIndex < 4; optionIndex++) {
    drawOption(question, optionIndex, layout);
  }

  // 作答後才顯示下一題按鈕
  if (hasAnswered) {
    drawNextButton(layout);
  }
}

// ------------------------------------------------------------
// 繪製題目方框
// ------------------------------------------------------------
function drawQuestionBox(questionText, layout) {
  const x = width / 2 - layout.contentWidth / 2;
  const y = layout.questionY;

  // 題目方框陰影
  noStroke();
  fill(0, 45);
  rect(x + 4, y + 5, layout.contentWidth, layout.questionBoxHeight, 16);

  // 題目方框背景色 #ffc8dd
  fill(COLORS.questionBox);
  stroke(COLORS.black);
  strokeWeight(2);
  rect(x, y, layout.contentWidth, layout.questionBoxHeight, 16);

  // 題目文字
  noStroke();
  fill(COLORS.black);
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(layout.questionSize);
  drawWrappedText(
    questionText,
    width / 2,
    y + layout.questionBoxHeight / 2,
    layout.contentWidth * 0.88,
    layout.questionSize * 1.35
  );
}

// ------------------------------------------------------------
// 繪製單一選項與答題動畫
// ------------------------------------------------------------
function drawOption(question, optionIndex, layout) {
  const x = width / 2 - layout.contentWidth / 2;
  const originalY = layout.optionStartY + optionIndex * (layout.optionHeight + layout.optionGap);
  let drawX = x;
  let drawY = originalY;
  let optionColor = COLORS.white;

  // 作答後設定使用者選項與正確答案的顏色
  if (hasAnswered) {
    if (optionIndex === selectedAnswer) {
      optionColor = isCorrect ? COLORS.correct : COLORS.wrong;
    }
    if (!isCorrect && optionIndex === question.answer) {
      optionColor = COLORS.answer;
    }
  }

  // 答對上下跳動；答錯左右晃動，正確答案上下跳動
  const elapsed = frameCount - animationStartFrame;
  if (hasAnswered && elapsed >= 0 && elapsed < animationDuration) {
    const progress = 1 - elapsed / animationDuration;

    if (isCorrect && optionIndex === selectedAnswer) {
      drawY += sin(elapsed * 0.48) * 12 * progress;
    }
    if (!isCorrect && optionIndex === selectedAnswer) {
      drawX += sin(elapsed * 0.75) * 13 * progress;
    }
    if (!isCorrect && optionIndex === question.answer) {
      drawY += sin(elapsed * 0.48) * 12 * progress;
    }
  }

  // 選項陰影與背景
  noStroke();
  fill(0, 50);
  rect(drawX + 4, drawY + 5, layout.contentWidth, layout.optionHeight, 12);

  fill(optionColor);
  stroke(COLORS.black);
  strokeWeight(2);
  rect(drawX, drawY, layout.contentWidth, layout.optionHeight, 12);

  // 選項文字使用英文字型，中文會由瀏覽器字型回退顯示
  noStroke();
  fill(COLORS.black);
  textFont(FONT_ENGLISH);
  textStyle(NORMAL);
  textSize(layout.optionTextSize);
  text(
    `${String.fromCharCode(65 + optionIndex)}. ${question.options[optionIndex]}`,
    width / 2,
    drawY + layout.optionHeight / 2
  );
}

// ------------------------------------------------------------
// 繪製下一題按鈕
// ------------------------------------------------------------
function drawNextButton(layout) {
  const button = {
    x: width / 2 - layout.buttonWidth / 2,
    y: layout.buttonY,
    width: layout.buttonWidth,
    height: layout.buttonHeight
  };
  const label = currentQuestion === QUIZ_LENGTH - 1 ? "查看成績" : "下一題";
  drawButton(button, label, layout.buttonTextSize);
}

// ------------------------------------------------------------
// 繪製結果頁
// ------------------------------------------------------------
function drawResultScreen() {
  const totalScore = correctCount * SCORE_PER_QUESTION;
  const isExcellent = totalScore > 60;
  const titleSize = constrain(min(width * 0.07, height * 0.1), 28, 58);
  const scoreSize = constrain(min(width * 0.043, height * 0.06), 18, 38);
  const messageSize = constrain(min(width * 0.052, height * 0.07), 22, 48);

  // 先繪製煙火或請加油動畫
  if (isExcellent) {
    drawFireworks();
  }

  // 結果標題、答對題數與分數
  fill(COLORS.white);
  noStroke();
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(titleSize);
  text("測驗完成！", width / 2, height * 0.16);

  textStyle(NORMAL);
  textSize(scoreSize);
  text(`答對題數：${correctCount}／${QUIZ_LENGTH}`, width / 2, height * 0.29);
  text(`總成績：${totalScore} 分`, width / 2, height * 0.37);

  if (isExcellent) {
    textStyle(BOLD);
    textSize(messageSize);
    text("太棒了！表現非常優秀！", width / 2, height * 0.49);
  } else {
    drawCheerEffect(height * 0.52, messageSize);
  }

  // 結果頁提供「重新開始」及「重新讀取題庫」兩個按鈕
  const buttonWidth = constrain(width * 0.36, 155, 270);
  const buttonHeight = constrain(height * 0.075, 44, 64);
  const gap = constrain(height * 0.018, 8, 16);
  const firstButtonY = height * 0.72;
  const secondButtonY = firstButtonY + buttonHeight + gap;

  resultRestartButton = {
    x: width / 2 - buttonWidth / 2,
    y: firstButtonY,
    width: buttonWidth,
    height: buttonHeight
  };
  resultReloadButton = {
    x: width / 2 - buttonWidth / 2,
    y: secondButtonY,
    width: buttonWidth,
    height: buttonHeight
  };

  drawButton(resultRestartButton, "重新開始", scoreSize);
  drawButton(resultReloadButton, "重新讀取題庫", scoreSize);
}

// ------------------------------------------------------------
// 「請加油」放大旋轉動畫
// ------------------------------------------------------------
function drawCheerEffect(centerY, baseSize) {
  const elapsed = frameCount - cheerStartFrame;
  const scaleValue = 1 + (sin(elapsed * 0.06) + 1) * 0.28;
  const rotationValue = sin(elapsed * 0.055) * 0.35;
  const cheerSize = min(baseSize * 1.8 * scaleValue, width * 0.34, height * 0.18);

  push();
  translate(width / 2, centerY);
  rotate(rotationValue);

  noStroke();
  fill(255, 255, 255, 45);
  ellipse(0, 0, cheerSize * 1.7, cheerSize * 0.9);

  fill(COLORS.white);
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(cheerSize);
  text("請加油", 0, 0);
  pop();
}

// ------------------------------------------------------------
// 初始化煙火粒子
// ------------------------------------------------------------
function initializeFireworks() {
  fireworks = [];
  lastFireworkFrame = frameCount - 30;

  for (let fireworkIndex = 0; fireworkIndex < 6; fireworkIndex++) {
    fireworks.push({
      x: random(width * 0.12, width * 0.88),
      y: random(height * 0.08, height * 0.48),
      particles: [],
      active: false,
      startFrame: -fireworkIndex * 24,
      color: color(random(150, 255), random(150, 255), random(150, 255))
    });
  }
}

// ------------------------------------------------------------
// 繪製答對時的煙火特效
// ------------------------------------------------------------
function drawFireworks() {
  if (fireworks.length === 0) {
    initializeFireworks();
  }

  for (const firework of fireworks) {
    const elapsed = frameCount - firework.startFrame;

    if (elapsed > 0 && !firework.active) {
      firework.active = true;
      for (let particleIndex = 0; particleIndex < 42; particleIndex++) {
        const angle = random(TWO_PI);
        const speed = random(1.5, 4.5);
        firework.particles.push({
          x: firework.x,
          y: firework.y,
          vx: cos(angle) * speed,
          vy: sin(angle) * speed,
          size: random(3, 7),
          life: 255
        });
      }
    }

    if (firework.active) {
      for (const particle of firework.particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.035;
        particle.life -= 2.5;

        noStroke();
        fill(
          red(firework.color),
          green(firework.color),
          blue(firework.color),
          max(0, particle.life)
        );
        ellipse(particle.x, particle.y, particle.size, particle.size);
      }
    }
  }

  // 持續在結果頁產生新的煙火
  if (frameCount - lastFireworkFrame > 55) {
    lastFireworkFrame = frameCount;
    const firework = fireworks[floor(random(fireworks.length))];
    firework.x = random(width * 0.12, width * 0.88);
    firework.y = random(height * 0.08, height * 0.48);
    firework.particles = [];
    firework.active = false;
    firework.startFrame = frameCount;
    firework.color = color(random(150, 255), random(150, 255), random(150, 255));
  }
}

// ------------------------------------------------------------
// 通用按鈕繪製函式
// ------------------------------------------------------------
function drawButton(button, label, buttonTextSize) {
  const hovering =
    mouseX >= button.x &&
    mouseX <= button.x + button.width &&
    mouseY >= button.y &&
    mouseY <= button.y + button.height;

  // 按鈕陰影
  noStroke();
  fill(0, 50);
  rect(button.x + 4, button.y + 5, button.width, button.height, 12);

  // 按鈕本體
  fill(hovering ? COLORS.buttonHover : COLORS.button);
  stroke(COLORS.black);
  strokeWeight(2);
  rect(button.x, button.y, button.width, button.height, 12);

  // 按鈕文字
  noStroke();
  fill(COLORS.black);
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(buttonTextSize);
  text(label, button.x + button.width / 2, button.y + button.height / 2);
}

// ------------------------------------------------------------
// 滑鼠輸入事件
// ------------------------------------------------------------
function mousePressed() {
  // 避免觸控後瀏覽器模擬滑鼠事件造成重複點擊
  if (millis() - lastTouchTime < 500) {
    return;
  }
  handleInput(mouseX, mouseY);
}

// ------------------------------------------------------------
// 觸控輸入事件
// ------------------------------------------------------------
function touchStarted() {
  // 記錄觸控時間，讓後續模擬滑鼠事件被忽略
  lastTouchTime = millis();
  handleInput(mouseX, mouseY);
  return false;
}

// ------------------------------------------------------------
// 統一處理滑鼠與觸控輸入
// ------------------------------------------------------------
function handleInput(inputX, inputY) {
  // 載入期間不處理點擊
  if (isLoading) {
    return;
  }

  // 錯誤頁的重新讀取按鈕
  if (loadError) {
    if (isInsideButton(inputX, inputY, errorReloadButton)) {
      loadQuestionBank();
    }
    return;
  }

  // 結果頁按鈕
  if (quizFinished) {
    if (isInsideButton(inputX, inputY, resultRestartButton)) {
      startNewQuiz();
      return;
    }
    if (isInsideButton(inputX, inputY, resultReloadButton)) {
      // 這裡重新呼叫 loadQuestionBank，會重新向 Google Sheet 取資料，
      // 不會只使用原本已載入的 questionBank。
      loadQuestionBank();
    }
    return;
  }

  const layout = getQuizLayout();

  // 尚未作答時，只接受一次選項點擊
  if (!hasAnswered) {
    const question = quizQuestions[currentQuestion];

    for (let optionIndex = 0; optionIndex < 4; optionIndex++) {
      const optionX = width / 2 - layout.contentWidth / 2;
      const optionY = layout.optionStartY + optionIndex * (layout.optionHeight + layout.optionGap);
      const clickedOption =
        inputX >= optionX &&
        inputX <= optionX + layout.contentWidth &&
        inputY >= optionY &&
        inputY <= optionY + layout.optionHeight;

      if (clickedOption) {
        // 記錄答案並鎖定本題，防止重複計分
        selectedAnswer = optionIndex;
        isCorrect = selectedAnswer === question.answer;
        hasAnswered = true;
        if (isCorrect) {
          correctCount++;
        }
        animationStartFrame = frameCount;
        return;
      }
    }
    return;
  }

  // 作答後接受下一題按鈕
  const nextButton = {
    x: width / 2 - layout.buttonWidth / 2,
    y: layout.buttonY,
    width: layout.buttonWidth,
    height: layout.buttonHeight
  };

  if (isInsideButton(inputX, inputY, nextButton)) {
    if (currentQuestion === QUIZ_LENGTH - 1) {
      quizFinished = true;
      cheerStartFrame = frameCount;
      fireworks = [];
    } else {
      currentQuestion++;
      selectedAnswer = -1;
      hasAnswered = false;
      isCorrect = false;
    }
  }
}

// ------------------------------------------------------------
// 判斷座標是否在按鈕內
// ------------------------------------------------------------
function isInsideButton(inputX, inputY, button) {
  return button !== null &&
    inputX >= button.x &&
    inputX <= button.x + button.width &&
    inputY >= button.y &&
    inputY <= button.y + button.height;
}

// ------------------------------------------------------------
// 中文文字自動換行
// ------------------------------------------------------------
function drawWrappedText(message, centerX, centerY, maxWidth, lineHeight) {
  const characters = String(message).split("");
  const lines = [];
  let currentLine = "";

  for (const character of characters) {
    const testLine = currentLine + character;
    if (textWidth(testLine) > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = character;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  const totalHeight = lines.length * lineHeight;
  const startY = centerY - totalHeight / 2 + lineHeight / 2;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    text(lines[lineIndex], centerX, startY + lineIndex * lineHeight);
  }
}

// ------------------------------------------------------------
// 視窗尺寸改變時重新調整畫布
// ------------------------------------------------------------
function windowResized() {
  // 讓畫布符合新的瀏覽器視窗大小
  resizeCanvas(windowWidth, windowHeight);

  // 下一幀會依新尺寸重新計算按鈕與版面
  resultRestartButton = null;
  resultReloadButton = null;
  errorReloadButton = null;
}
