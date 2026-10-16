// ==========================================
// p5.js CSV 隨機選擇題測驗系統
// ==========================================

// ------------------------------
// 字型設定
// ------------------------------
// Google Fonts 由 index.html 載入，canvas 會使用這兩個字型名稱。
const FONT_CHINESE = "LXGW WenKai Mono TC";
const FONT_ENGLISH = "Isometra";

// ------------------------------
// 測驗設定
// ------------------------------
const QUIZ_LENGTH = 5;             // 每次測驗抽出五題
const SCORE_PER_QUESTION = 20;     // 每題答對得二十分
const REQUIRED_BANK_SIZE = 15;     // 預期 CSV 題庫總數

// ------------------------------
// 顏色設定
// ------------------------------
const COLORS = {
  background: "#bc6c25",  // 畫布背景
  questionBox: "#ffc8dd", // 題目方框
  white: "#ffffff",       // 一般文字與按鈕
  black: "#222222",       // 深色文字與外框
  correct: "#43aa8b",     // 答對選項
  wrong: "#f94144",       // 答錯選項
  answer: "#48cae4",      // 答錯時的正確答案
  buttonHover: "#e9ecef"  // 按鈕滑過顏色
};

// ------------------------------
// 題庫與載入狀態
// ------------------------------
let questionBank = [];      // CSV 讀入的全部題目
let quizQuestions = [];     // 本次不重複抽出的五題
let isLoading = true;       // 題庫是否正在讀取
let loadError = false;      // 題庫是否讀取失敗
let loadErrorMessage = "";  // 顯示給使用者的繁體中文錯誤訊息

// ------------------------------
// 測驗狀態
// ------------------------------
let currentQuestion = 0;    // 本次測驗的目前題號
let correctCount = 0;       // 答對題數
let selectedAnswer = -1;    // 使用者選取的選項索引
let hasAnswered = false;    // 本題是否已經作答
let isCorrect = false;      // 本題是否答對
let quizFinished = false;   // 是否已進入結果頁

// ------------------------------
// 答案動畫資料
// ------------------------------
let animationStartFrame = 0;
const ANSWER_ANIMATION_FRAMES = 48;

// ------------------------------
// 結果頁特效資料
// ------------------------------
let fireworks = [];
let lastFireworkFrame = 0;
let cheerStartFrame = 0;
let resultButton = null;

// ------------------------------
// 輸入防重複資料
// ------------------------------
let lastTouchTime = -1000;
let lastHandledInputTime = -1000;

// ------------------------------
// p5.js 預先載入 CSV 題庫
// ------------------------------
function preload() {
  // 使用 header 模式讀取有標題列的 CSV 檔案。
  loadTable(
    "questions.csv",
    "csv",
    "header",
    handleTableLoaded,
    handleTableError
  );
}

// ------------------------------
// CSV 成功載入處理
// ------------------------------
function handleTableLoaded(table) {
  // 清空題庫，逐列將 CSV 欄位轉成程式使用的物件。
  questionBank = [];

  for (let rowIndex = 0; rowIndex < table.getRowCount(); rowIndex += 1) {
    const question = table.getString(rowIndex, "question").trim();
    const optionA = table.getString(rowIndex, "optionA").trim();
    const optionB = table.getString(rowIndex, "optionB").trim();
    const optionC = table.getString(rowIndex, "optionC").trim();
    const optionD = table.getString(rowIndex, "optionD").trim();
    const answer = table.getString(rowIndex, "answer").trim().toUpperCase();

    // 只接受欄位完整且答案為 A、B、C 或 D 的題目。
    if (
      question.length > 0 &&
      optionA.length > 0 &&
      optionB.length > 0 &&
      optionC.length > 0 &&
      optionD.length > 0 &&
      ["A", "B", "C", "D"].includes(answer)
    ) {
      questionBank.push({
        question,
        options: [optionA, optionB, optionC, optionD],
        answer: answerToIndex(answer)
      });
    }
  }

  // 確保題庫至少可以抽出五題；並提醒預期的十五題數量。
  if (questionBank.length < QUIZ_LENGTH) {
    isLoading = false;
    loadError = true;
    loadErrorMessage = `題庫可用題目不足，至少需要 ${QUIZ_LENGTH} 題。`;
    return;
  }

  if (questionBank.length !== REQUIRED_BANK_SIZE) {
    console.warn(`目前讀入 ${questionBank.length} 題，預期為 ${REQUIRED_BANK_SIZE} 題。`);
  }

  isLoading = false;
  loadError = false;
  startNewQuiz();
}

// ------------------------------
// CSV 讀取失敗處理
// ------------------------------
function handleTableError(error) {
  // 顯示繁體中文錯誤訊息，不讓使用者看到難以理解的英文錯誤。
  isLoading = false;
  loadError = true;
  loadErrorMessage = "無法讀取 questions.csv，請確認檔案與 index.html 及 sketch.js 放在同一個資料夾。";
  console.error("questions.csv 載入失敗：", error);
}

// ------------------------------
// 將 A、B、C、D 轉成 0、1、2、3
// ------------------------------
function answerToIndex(answer) {
  const answerMap = { A: 0, B: 1, C: 2, D: 3 };
  return answerMap[answer];
}

// ------------------------------
// 建立全螢幕畫布
// ------------------------------
function setup() {
  // 依照瀏覽器目前寬高建立響應式畫布。
  createCanvas(windowWidth, windowHeight);
  rectMode(CORNER);
  textAlign(CENTER, CENTER);
  textFont(FONT_CHINESE);

  // 取消瀏覽器的觸控滑動與縮放，避免影響選項點擊。
  document.body.style.touchAction = "none";
}

// ------------------------------
// 主繪圖迴圈
// ------------------------------
function draw() {
  // 每一幀先填入指定背景色。
  background(COLORS.background);

  if (isLoading) {
    drawLoadingScreen();
    return;
  }

  if (loadError) {
    drawErrorScreen();
    return;
  }

  if (quizFinished) {
    drawResultScreen();
  } else {
    drawQuizScreen();
  }
}

// ------------------------------
// 載入中畫面
// ------------------------------
function drawLoadingScreen() {
  fill(COLORS.white);
  noStroke();
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(constrain(width * 0.06, 24, 48));
  text("正在載入題庫⋯⋯", width / 2, height / 2);
}

// ------------------------------
// 載入失敗畫面
// ------------------------------
function drawErrorScreen() {
  fill(COLORS.white);
  noStroke();
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(constrain(width * 0.06, 24, 48));
  text("題庫載入失敗", width / 2, height * 0.34);

  textStyle(NORMAL);
  textSize(constrain(width * 0.034, 16, 28));
  drawWrappedText(loadErrorMessage, width / 2, height * 0.52, width * 0.82, 34);
}

// ------------------------------
// 隨機抽出五題且同次不重複
// ------------------------------
function startNewQuiz() {
  // p5.js shuffle 會回傳打亂後的陣列；slice 不會改動原始題庫。
  quizQuestions = shuffle(questionBank.slice(), true).slice(0, QUIZ_LENGTH);

  // 重設所有測驗狀態，讓重新開始等同全新測驗。
  currentQuestion = 0;
  correctCount = 0;
  selectedAnswer = -1;
  hasAnswered = false;
  isCorrect = false;
  quizFinished = false;
  fireworks = [];
  resultButton = null;
  cheerStartFrame = frameCount;
}

// ------------------------------
// 取得響應式測驗版面
// ------------------------------
function getQuizLayout() {
  const isPortrait = height >= width;
  const sidePadding = constrain(width * 0.055, 14, 64);
  const contentWidth = min(width - sidePadding * 2, 920);
  const compact = height < 620;

  // 依螢幕方向與高度調整字體，避免手機橫向時內容超出畫面。
  const titleSize = constrain(width * 0.04, 19, 40);
  const progressSize = constrain(width * 0.022, 14, 23);
  const questionSize = constrain(width * 0.03, 16, 30);
  const optionTextSize = constrain(width * 0.024, 15, 25);
  const buttonTextSize = constrain(width * 0.024, 16, 27);

  const titleY = compact ? 27 : constrain(height * 0.06, 27, 58);
  const progressY = compact ? 58 : constrain(height * 0.12, 52, 92);
  const questionY = compact ? 82 : constrain(height * 0.17, 78, 145);

  const questionBoxHeight = compact
    ? constrain(height * 0.18, 68, 104)
    : isPortrait
      ? constrain(height * 0.14, 88, 154)
      : constrain(height * 0.16, 78, 140);

  let optionHeight = compact
    ? constrain(height * 0.105, 34, 48)
    : isPortrait
      ? constrain(height * 0.062, 44, 66)
      : constrain(height * 0.08, 42, 68);

  let optionGap = compact
    ? 5
    : constrain(height * 0.014, 6, 15);

  const buttonWidth = constrain(width * 0.34, 145, 250);
  const buttonHeight = compact
    ? 42
    : constrain(height * 0.075, 46, 68);
  const buttonY = height - buttonHeight - (compact ? 10 : constrain(height * 0.035, 14, 32));

  // 若高度很小，依可用高度縮小選項，使四個選項與按鈕仍能同時顯示。
  const optionsGapBefore = compact ? 8 : constrain(height * 0.024, 10, 25);
  let optionStartY = questionY + questionBoxHeight + optionsGapBefore;
  const maxOptionBottom = buttonY - 8;
  const availableOptionsHeight = maxOptionBottom - optionStartY;
  const requiredOptionsHeight = optionHeight * 4 + optionGap * 3;

  if (requiredOptionsHeight > availableOptionsHeight) {
    const fittedHeight = (availableOptionsHeight - optionGap * 3) / 4;
    optionHeight = max(30, fittedHeight);
  }

  const finalOptionsHeight = optionHeight * 4 + optionGap * 3;
  if (optionStartY + finalOptionsHeight > maxOptionBottom) {
    optionStartY = max(questionY + questionBoxHeight + 5, maxOptionBottom - finalOptionsHeight);
  }

  return {
    contentWidth,
    titleSize,
    progressSize,
    questionSize,
    optionTextSize,
    buttonTextSize,
    titleY,
    progressY,
    questionY,
    questionBoxHeight,
    optionHeight,
    optionGap,
    optionStartY,
    buttonWidth,
    buttonHeight,
    buttonY
  };
}

// ------------------------------
// 繪製測驗畫面
// ------------------------------
function drawQuizScreen() {
  const question = quizQuestions[currentQuestion];
  const layout = getQuizLayout();

  fill(COLORS.white);
  noStroke();
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(layout.titleSize);
  text("p5.js 簡易指令練習測驗", width / 2, layout.titleY);

  textStyle(NORMAL);
  textSize(layout.progressSize);
  text(`第 ${currentQuestion + 1} 題／共 ${QUIZ_LENGTH} 題`, width / 2, layout.progressY);

  drawQuestionBox(question.question, layout);

  for (let optionIndex = 0; optionIndex < question.options.length; optionIndex += 1) {
    drawOption(question, optionIndex, layout);
  }

  if (hasAnswered) {
    drawNextButton(layout);
  }
}

// ------------------------------
// 繪製題目方框
// ------------------------------
function drawQuestionBox(questionText, layout) {
  const x = width / 2 - layout.contentWidth / 2;
  const y = layout.questionY;

  // 題目方框使用指定的 #ffc8dd 顏色，並加上陰影區隔選項。
  noStroke();
  fill(0, 42);
  rect(x + 4, y + 5, layout.contentWidth, layout.questionBoxHeight, 15);

  fill(COLORS.questionBox);
  stroke(COLORS.black);
  strokeWeight(2);
  rect(x, y, layout.contentWidth, layout.questionBoxHeight, 15);

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
    layout.questionSize * 1.3
  );
}

// ------------------------------
// 繪製選項與答題動畫
// ------------------------------
function drawOption(question, optionIndex, layout) {
  const x = width / 2 - layout.contentWidth / 2;
  const originalY = layout.optionStartY + optionIndex * (layout.optionHeight + layout.optionGap);
  let drawX = x;
  let drawY = originalY;
  let optionColor = COLORS.white;

  // 作答後依照答題結果套用指定顏色。
  if (hasAnswered) {
    if (optionIndex === selectedAnswer) {
      optionColor = isCorrect ? COLORS.correct : COLORS.wrong;
    }
    if (!isCorrect && optionIndex === question.answer) {
      optionColor = COLORS.answer;
    }
  }

  // 答對上下跳動；答錯時錯誤選項左右晃動且正確答案上下跳動。
  const elapsed = frameCount - animationStartFrame;
  if (hasAnswered && elapsed >= 0 && elapsed < ANSWER_ANIMATION_FRAMES) {
    const fade = 1 - elapsed / ANSWER_ANIMATION_FRAMES;

    if (isCorrect && optionIndex === selectedAnswer) {
      drawY += sin(elapsed * 0.48) * 12 * fade;
    }
    if (!isCorrect && optionIndex === selectedAnswer) {
      drawX += sin(elapsed * 0.78) * 13 * fade;
    }
    if (!isCorrect && optionIndex === question.answer) {
      drawY += sin(elapsed * 0.48) * 12 * fade;
    }
  }

  // 繪製選項陰影與本體。
  noStroke();
  fill(0, 48);
  rect(drawX + 4, drawY + 5, layout.contentWidth, layout.optionHeight, 11);

  fill(optionColor);
  stroke(COLORS.black);
  strokeWeight(2);
  rect(drawX, drawY, layout.contentWidth, layout.optionHeight, 11);

  // 讓選項文字在寬度不足時自動縮小並保持置中。
  noStroke();
  fill(COLORS.black);
  textFont(FONT_CHINESE);
  textStyle(NORMAL);
  textSize(layout.optionTextSize);
  const label = `${String.fromCharCode(65 + optionIndex)}. ${question.options[optionIndex]}`;
  const maxTextWidth = layout.contentWidth * 0.9;
  let fittedSize = layout.optionTextSize;
  while (textWidth(label) > maxTextWidth && fittedSize > 12) {
    fittedSize -= 1;
    textSize(fittedSize);
  }
  text(label, width / 2, drawY + layout.optionHeight / 2);
}

// ------------------------------
// 繪製下一題按鈕
// ------------------------------
function drawNextButton(layout) {
  const x = width / 2 - layout.buttonWidth / 2;
  const y = layout.buttonY;
  const hovering = isInsideRect(mouseX, mouseY, x, y, layout.buttonWidth, layout.buttonHeight);

  noStroke();
  fill(0, 52);
  rect(x + 4, y + 5, layout.buttonWidth, layout.buttonHeight, 11);

  fill(hovering ? COLORS.buttonHover : COLORS.white);
  stroke(COLORS.black);
  strokeWeight(2);
  rect(x, y, layout.buttonWidth, layout.buttonHeight, 11);

  noStroke();
  fill(COLORS.black);
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(layout.buttonTextSize);
  const label = currentQuestion === QUIZ_LENGTH - 1 ? "查看成績" : "下一題";
  text(label, width / 2, y + layout.buttonHeight / 2);
}

// ------------------------------
// 結果頁版面
// ------------------------------
function getResultLayout() {
  const compact = height < 600;
  const buttonWidth = constrain(width * 0.36, 155, 270);
  const buttonHeight = compact ? 44 : constrain(height * 0.08, 48, 70);

  return {
    titleSize: constrain(width * 0.07, 28, 58),
    scoreSize: constrain(width * 0.043, 19, 38),
    messageSize: constrain(width * 0.052, 23, 48),
    titleY: compact ? height * 0.12 : height * 0.18,
    countY: compact ? height * 0.25 : height * 0.34,
    scoreY: compact ? height * 0.33 : height * 0.43,
    messageY: compact ? height * 0.51 : height * 0.58,
    buttonWidth,
    buttonHeight,
    buttonY: compact ? height * 0.78 : height * 0.78
  };
}

// ------------------------------
// 繪製結果頁與成功或鼓勵特效
// ------------------------------
function drawResultScreen() {
  const layout = getResultLayout();
  const totalScore = correctCount * SCORE_PER_QUESTION;

  // 總分大於六十分，也就是答對四題或五題時，繪製自行製作的煙火。
  if (totalScore > 60) {
    drawFireworks();
    fill(COLORS.white);
    noStroke();
    textFont(FONT_CHINESE);
    textStyle(BOLD);
    textSize(layout.messageSize);
    text("太棒了！表現非常優秀！", width / 2, layout.messageY);
  } else {
    // 其他分數顯示「請加油」並持續放大旋轉。
    drawCheerEffect(layout);
  }

  fill(COLORS.white);
  noStroke();
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(layout.titleSize);
  text("測驗完成！", width / 2, layout.titleY);

  textStyle(NORMAL);
  textSize(layout.scoreSize);
  text(`答對題數：${correctCount}／${QUIZ_LENGTH}`, width / 2, layout.countY);
  text(`總成績：${totalScore} 分`, width / 2, layout.scoreY);

  drawRestartButton(layout);
}

// ------------------------------
// 「請加油」放大旋轉動畫
// ------------------------------
function drawCheerEffect(layout) {
  const elapsed = frameCount - cheerStartFrame;
  const pulse = 1 + (sin(elapsed * 0.06) + 1) * 0.24;
  const rotation = sin(elapsed * 0.055) * 0.38;
  const baseSize = min(width * 0.16, height * 0.22);
  const cheerSize = min(baseSize * pulse, width * 0.42);

  push();
  translate(width / 2, layout.messageY);
  rotate(rotation);

  noStroke();
  fill(255, 255, 255, 42);
  ellipse(0, 0, cheerSize * 1.45, cheerSize * 0.86);

  fill(COLORS.white);
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(cheerSize);
  text("請加油", 0, 0);
  pop();
}

// ------------------------------
// 自行繪製煙火：初始化煙火群組
// ------------------------------
function initializeFireworks() {
  fireworks = [];
  lastFireworkFrame = frameCount - 45;

  for (let index = 0; index < 6; index += 1) {
    fireworks.push({
      x: random(width * 0.12, width * 0.88),
      y: random(height * 0.08, height * 0.52),
      startFrame: frameCount + index * 12,
      active: false,
      particles: [],
      fireworkColor: color(random(170, 255), random(170, 255), random(170, 255))
    });
  }
}

// ------------------------------
// 自行繪製煙火：更新粒子與產生新煙火
// ------------------------------
function drawFireworks() {
  if (fireworks.length === 0) {
    initializeFireworks();
  }

  for (const firework of fireworks) {
    const elapsed = frameCount - firework.startFrame;

    // 到達起爆時間後建立放射狀粒子。
    if (elapsed >= 0 && !firework.active) {
      firework.active = true;
      for (let index = 0; index < 48; index += 1) {
        const angle = random(TWO_PI);
        const speed = random(1.5, 4.6);
        firework.particles.push({
          x: firework.x,
          y: firework.y,
          vx: cos(angle) * speed,
          vy: sin(angle) * speed,
          size: random(2.5, 6.5),
          life: 255
        });
      }
    }

    // 更新粒子位置、重力與透明度，形成煙火消散效果。
    if (firework.active) {
      for (const particle of firework.particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.035;
        particle.life -= 2.7;

        noStroke();
        fill(
          red(firework.fireworkColor),
          green(firework.fireworkColor),
          blue(firework.fireworkColor),
          max(0, particle.life)
        );
        ellipse(particle.x, particle.y, particle.size, particle.size);
      }
    }
  }

  // 週期性重置一組煙火，讓結果頁持續有煙火效果。
  if (frameCount - lastFireworkFrame > 62) {
    lastFireworkFrame = frameCount;
    const firework = random(fireworks);
    firework.x = random(width * 0.12, width * 0.88);
    firework.y = random(height * 0.08, height * 0.52);
    firework.startFrame = frameCount;
    firework.active = false;
    firework.particles = [];
    firework.fireworkColor = color(random(170, 255), random(170, 255), random(170, 255));
  }
}

// ------------------------------
// 繪製重新開始按鈕
// ------------------------------
function drawRestartButton(layout) {
  const x = width / 2 - layout.buttonWidth / 2;
  const y = layout.buttonY;
  resultButton = { x, y, width: layout.buttonWidth, height: layout.buttonHeight };
  const hovering = isInsideRect(mouseX, mouseY, x, y, layout.buttonWidth, layout.buttonHeight);

  noStroke();
  fill(0, 52);
  rect(x + 4, y + 5, layout.buttonWidth, layout.buttonHeight, 11);

  fill(hovering ? COLORS.buttonHover : COLORS.white);
  stroke(COLORS.black);
  strokeWeight(2);
  rect(x, y, layout.buttonWidth, layout.buttonHeight, 11);

  noStroke();
  fill(COLORS.black);
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(constrain(width * 0.028, 17, 28));
  text("重新開始", width / 2, y + layout.buttonHeight / 2);
}

// ------------------------------
// 滑鼠輸入事件
// ------------------------------
function mousePressed() {
  // 觸控裝置常會在 touchStarted 後模擬 mousePressed，這裡將其忽略。
  if (millis() - lastTouchTime < 550) {
    return;
  }
  handleInput(mouseX, mouseY);
}

// ------------------------------
// 觸控輸入事件
// ------------------------------
function touchStarted() {
  // 記錄觸控時間，讓後續的模擬滑鼠事件不會再次觸發。
  lastTouchTime = millis();
  handleInput(mouseX, mouseY);
  return false;
}

// ------------------------------
// 統一處理滑鼠與觸控操作
// ------------------------------
function handleInput(inputX, inputY) {
  // 額外的時間鎖避免同一個輸入事件被重複處理。
  if (millis() - lastHandledInputTime < 120) {
    return;
  }
  lastHandledInputTime = millis();

  if (loadError || isLoading) {
    return;
  }

  // 結果頁只處理重新開始按鈕。
  if (quizFinished) {
    if (resultButton && isInsideRect(inputX, inputY, resultButton.x, resultButton.y, resultButton.width, resultButton.height)) {
      startNewQuiz();
    }
    return;
  }

  const layout = getQuizLayout();
  const question = quizQuestions[currentQuestion];

  // 尚未作答時，只允許點擊四個選項一次。
  if (!hasAnswered) {
    for (let optionIndex = 0; optionIndex < question.options.length; optionIndex += 1) {
      const optionX = width / 2 - layout.contentWidth / 2;
      const optionY = layout.optionStartY + optionIndex * (layout.optionHeight + layout.optionGap);

      if (isInsideRect(inputX, inputY, optionX, optionY, layout.contentWidth, layout.optionHeight)) {
        selectedAnswer = optionIndex;
        isCorrect = selectedAnswer === question.answer;
        hasAnswered = true;
        if (isCorrect) {
          correctCount += 1;
        }
        animationStartFrame = frameCount;
        return;
      }
    }
    return;
  }

  // 作答後只允許點擊下一題或查看成績按鈕。
  const buttonX = width / 2 - layout.buttonWidth / 2;
  if (isInsideRect(inputX, inputY, buttonX, layout.buttonY, layout.buttonWidth, layout.buttonHeight)) {
    if (currentQuestion === QUIZ_LENGTH - 1) {
      quizFinished = true;
      cheerStartFrame = frameCount;
      fireworks = [];
      resultButton = null;
    } else {
      currentQuestion += 1;
      selectedAnswer = -1;
      hasAnswered = false;
      isCorrect = false;
    }
  }
}

// ------------------------------
// 矩形點擊判斷工具
// ------------------------------
function isInsideRect(pointX, pointY, rectX, rectY, rectWidth, rectHeight) {
  return pointX >= rectX && pointX <= rectX + rectWidth && pointY >= rectY && pointY <= rectY + rectHeight;
}

// ------------------------------
// 中文與長文字自動換行
// ------------------------------
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
  for (let index = 0; index < lines.length; index += 1) {
    text(lines[index], centerX, startY + index * lineHeight);
  }
}

// ------------------------------
// 視窗尺寸改變時重新調整畫布
// ------------------------------
function windowResized() {
  // 讓畫布跟隨手機旋轉、平板與桌機視窗尺寸改變。
  resizeCanvas(windowWidth, windowHeight);
  resultButton = null;
}
