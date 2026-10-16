// ==========================================
// p5.js 響應式選擇題測驗系統
// ==========================================

// ------------------------------
// Google 字型設定
// ------------------------------
// 中文使用 LXGW WenKai Mono TC
// 英文與數字使用 Isometra
const FONT_CHINESE = "LXGW WenKai Mono TC";
const FONT_ENGLISH = "Isometra";

// ------------------------------
// 題庫資料
// ------------------------------
const questionBank = [
  {
    question: "p5.js 中用來建立畫布的函式是哪一個？",
    options: [
      "createCanvas()",
      "makeCanvas()",
      "canvasCreate()",
      "newCanvas()"
    ],
    answer: 0
  },
  {
    question: "p5.js 中用來設定背景顏色的函式是哪一個？",
    options: [
      "fill()",
      "background()",
      "color()",
      "paint()"
    ],
    answer: 1
  },
  {
    question: "p5.js 中用來繪製矩形的函式是哪一個？",
    options: [
      "box()",
      "squareBox()",
      "rect()",
      "rectangle()"
    ],
    answer: 2
  },
  {
    question: "p5.js 中用來設定文字大小的函式是哪一個？",
    options: [
      "fontSize()",
      "textSize()",
      "sizeText()",
      "文字大小()"
    ],
    answer: 1
  },
  {
    question: "p5.js 中用來取得滑鼠水平座標的變數是哪一個？",
    options: [
      "mouseY",
      "mousePosition",
      "mouseX",
      "cursorX"
    ],
    answer: 2
  }
];

// ------------------------------
// 顏色設定
// ------------------------------
const COLORS = {
  background: "#bc6c25",
  questionBox: "#ffc8dd",
  white: "#ffffff",
  black: "#222222",
  correct: "#43aa8b",
  wrong: "#f94144",
  answer: "#48cae4",
  button: "#ffffff",
  buttonHover: "#e9ecef"
};

// ------------------------------
// 測驗狀態
// ------------------------------
let currentQuestion = 0;
let correctCount = 0;
let selectedAnswer = -1;
let hasAnswered = false;
let isCorrect = false;
let quizFinished = false;

// ------------------------------
// 動畫設定
// ------------------------------
let animationStartFrame = 0;
const animationDuration = 45;

// ------------------------------
// 煙火粒子陣列
// ------------------------------
let fireworks = [];
let lastFireworkFrame = 0;

// ------------------------------
// 「請加油」動畫開始時間
// ------------------------------
let cheerStartFrame = 0;

// ------------------------------
// 重新開始按鈕資料
// ------------------------------
let resultButton = null;

// ------------------------------
// 觸控事件的滑鼠防重複處理
// ------------------------------
let lastTouchTime = 0;

// ------------------------------
// 建立畫布
// ------------------------------
function setup() {
  // 建立符合瀏覽器視窗大小的畫布
  createCanvas(windowWidth, windowHeight);

  // 設定文字對齊方式
  textAlign(CENTER, CENTER);

  // 設定畫布使用的文字字型
  textFont(FONT_CHINESE);

  // 設定矩形從左上角開始繪製
  rectMode(CORNER);

  // 防止手機觸控時出現瀏覽器預設行為
  document.body.style.touchAction = "none";
}

// ------------------------------
// 主繪圖函式
// ------------------------------
function draw() {
  // 設定畫布背景顏色
  background(COLORS.background);

  // 判斷目前是否已經完成測驗
  if (quizFinished) {
    drawResultScreen();
  } else {
    drawQuizScreen();
  }
}

// ------------------------------
// 繪製測驗畫面
// ------------------------------
function drawQuizScreen() {
  // 取得目前題目
  const question = questionBank[currentQuestion];

  // 取得響應式版面資料
  const layout = getQuizLayout();

  // 繪製標題
  fill(COLORS.white);
  noStroke();
  textStyle(BOLD);
  textFont(FONT_CHINESE);
  textSize(layout.titleSize);
  text("p5.js 簡易指令練習測驗", width / 2, layout.titleY);

  // 繪製題數資訊
  textStyle(NORMAL);
  textSize(layout.progressSize);
  text(
    `第 ${currentQuestion + 1} 題／共 ${questionBank.length} 題`,
    width / 2,
    layout.progressY
  );

  // 繪製題目方框
  drawQuestionBox(question.question, layout);

  // 繪製四個選項
  for (let i = 0; i < question.options.length; i++) {
    drawOption(question, i, layout);
  }

  // 作答後顯示下一題按鈕
  if (hasAnswered) {
    drawNextButton(layout);
  }
}

// ------------------------------
// 取得測驗頁響應式版面
// ------------------------------
function getQuizLayout() {
  // 設定左右安全邊界
  const sidePadding = constrain(width * 0.06, 16, 70);

  // 設定內容區域寬度
  const contentWidth = min(width - sidePadding * 2, 900);

  // 判斷目前是否為直向畫面
  const isPortrait = height > width;

  // 計算標題與題目字體大小
  const titleSize = constrain(width * 0.04, 20, 40);
  const progressSize = constrain(width * 0.022, 15, 24);
  const questionSize = constrain(width * 0.031, 17, 30);
  const optionTextSize = constrain(width * 0.026, 16, 25);
  const buttonTextSize = constrain(width * 0.026, 17, 27);

  // 計算題目方框高度
  const questionBoxHeight = isPortrait
    ? constrain(height * 0.14, 92, 155)
    : constrain(height * 0.17, 82, 145);

  // 計算選項高度
  const optionHeight = isPortrait
    ? constrain(height * 0.062, 46, 66)
    : constrain(height * 0.085, 44, 70);

  // 計算選項間距
  const optionGap = constrain(height * 0.014, 7, 16);

  // 計算各區域的垂直位置
  const titleY = constrain(height * 0.06, 27, 60);
  const progressY = constrain(height * 0.12, 52, 94);
  const questionY = constrain(height * 0.17, 80, 145);

  // 計算按鈕大小與位置
  const buttonWidth = constrain(width * 0.34, 150, 250);
  const buttonHeight = constrain(height * 0.075, 48, 68);
  const buttonY =
    height - buttonHeight - constrain(height * 0.035, 16, 34);

  // 計算選項開始位置
  let optionStartY =
    questionY +
    questionBoxHeight +
    constrain(height * 0.025, 12, 26);

  // 計算選項區域高度
  const optionsTotalHeight =
    optionHeight * 4 + optionGap * 3;

  // 如果內容高度不足，進行垂直壓縮
  const availableBottom = buttonY - 12;
  const requiredBottom = optionStartY + optionsTotalHeight;

  if (requiredBottom > availableBottom) {
    optionStartY = availableBottom - optionsTotalHeight;

    // 確保選項不會與題目方框重疊
    optionStartY = max(
      optionStartY,
      questionY + questionBoxHeight + 8
    );
  }

  return {
    sidePadding,
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
// 繪製題目方框
// ------------------------------
function drawQuestionBox(questionText, layout) {
  // 計算題目方框位置
  const x = width / 2 - layout.contentWidth / 2;
  const y = layout.questionY;

  // 題目方框陰影
  noStroke();
  fill(0, 45);
  rect(
    x + 4,
    y + 5,
    layout.contentWidth,
    layout.questionBoxHeight,
    16
  );

  // 題目方框背景色
  fill(COLORS.questionBox);
  stroke(COLORS.black);
  strokeWeight(2);
  rect(
    x,
    y,
    layout.contentWidth,
    layout.questionBoxHeight,
    16
  );

  // 設定題目文字樣式
  noStroke();
  fill(COLORS.black);
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(layout.questionSize);

  // 題目文字最大寬度
  const maxTextWidth = layout.contentWidth * 0.88;

  // 將題目文字放在方框中央
  drawWrappedText(
    questionText,
    width / 2,
    y + layout.questionBoxHeight / 2,
    maxTextWidth,
    layout.questionSize * 1.35
  );
}

// ------------------------------
// 繪製選項
// ------------------------------
function drawOption(question, optionIndex, layout) {
  // 計算選項位置
  const x = width / 2 - layout.contentWidth / 2;
  const originalY =
    layout.optionStartY +
    optionIndex * (layout.optionHeight + layout.optionGap);

  // 設定選項初始位置
  let drawX = x;
  let drawY = originalY;

  // 預設選項背景色
  let optionColor = COLORS.white;

  // 作答後依答案狀態改變顏色
  if (hasAnswered) {
    // 使用者選擇的選項
    if (optionIndex === selectedAnswer) {
      optionColor = isCorrect
        ? COLORS.correct
        : COLORS.wrong;
    }

    // 答錯時顯示正確答案
    if (!isCorrect && optionIndex === question.answer) {
      optionColor = COLORS.answer;
    }
  }

  // 計算動畫時間
  const elapsed = frameCount - animationStartFrame;

  // 播放答案動畫
  if (
    hasAnswered &&
    elapsed >= 0 &&
    elapsed < animationDuration
  ) {
    // 讓動畫逐漸停止
    const progress = 1 - elapsed / animationDuration;

    // 答對時上下跳動
    if (isCorrect && optionIndex === selectedAnswer) {
      drawY += sin(elapsed * 0.48) * 12 * progress;
    }

    // 答錯時錯誤選項左右晃動
    if (!isCorrect && optionIndex === selectedAnswer) {
      drawX += sin(elapsed * 0.75) * 13 * progress;
    }

    // 答錯時正確答案上下跳動
    if (!isCorrect && optionIndex === question.answer) {
      drawY += sin(elapsed * 0.48) * 12 * progress;
    }
  }

  // 選項陰影
  noStroke();
  fill(0, 50);
  rect(
    drawX + 4,
    drawY + 5,
    layout.contentWidth,
    layout.optionHeight,
    12
  );

  // 選項背景
  fill(optionColor);
  stroke(COLORS.black);
  strokeWeight(2);
  rect(
    drawX,
    drawY,
    layout.contentWidth,
    layout.optionHeight,
    12
  );

  // 選項文字
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

// ------------------------------
// 繪製下一題按鈕
// ------------------------------
function drawNextButton(layout) {
  // 判斷滑鼠是否移到按鈕上
  const hovering =
    mouseX >= width / 2 - layout.buttonWidth / 2 &&
    mouseX <= width / 2 + layout.buttonWidth / 2 &&
    mouseY >= layout.buttonY &&
    mouseY <= layout.buttonY + layout.buttonHeight;

  // 按鈕陰影
  noStroke();
  fill(0, 50);
  rect(
    width / 2 - layout.buttonWidth / 2 + 4,
    layout.buttonY + 5,
    layout.buttonWidth,
    layout.buttonHeight,
    12
  );

  // 按鈕背景
  fill(hovering ? COLORS.buttonHover : COLORS.button);
  stroke(COLORS.black);
  strokeWeight(2);
  rect(
    width / 2 - layout.buttonWidth / 2,
    layout.buttonY,
    layout.buttonWidth,
    layout.buttonHeight,
    12
  );

  // 按鈕文字
  noStroke();
  fill(COLORS.black);
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(layout.buttonTextSize);

  const buttonText =
    currentQuestion === questionBank.length - 1
      ? "查看成績"
      : "下一題";

  text(
    buttonText,
    width / 2,
    layout.buttonY + layout.buttonHeight / 2
  );
}

// ------------------------------
// 取得結果頁版面
// ------------------------------
function getResultLayout() {
  // 設定結果頁文字與按鈕尺寸
  const buttonWidth = constrain(width * 0.36, 170, 270);
  const buttonHeight = constrain(height * 0.08, 50, 72);

  return {
    titleSize: constrain(width * 0.07, 30, 58),
    scoreSize: constrain(width * 0.043, 21, 38),
    messageSize: constrain(width * 0.052, 24, 48),

    titleY: height * 0.18,
    countY: height * 0.34,
    scoreY: height * 0.43,
    messageY: height * 0.58,

    buttonWidth,
    buttonHeight,
    buttonY: height * 0.78
  };
}

// ------------------------------
// 繪製結果畫面
// ------------------------------
function drawResultScreen() {
  // 取得結果頁版面資料
  const layout = getResultLayout();

  // 計算總分
  const totalScore = correctCount * 20;

  // 分數大於60分時顯示煙火
  if (totalScore > 60) {
    drawFireworks();

    // 顯示鼓勵文字
    fill(COLORS.white);
    noStroke();
    textFont(FONT_CHINESE);
    textStyle(BOLD);
    textSize(layout.messageSize);
    text("太棒了！表現非常優秀！", width / 2, layout.messageY);
  } else {
    // 分數不大於60分時顯示加油動畫
    drawCheerEffect(layout);
  }

  // 顯示結果標題
  fill(COLORS.white);
  noStroke();
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(layout.titleSize);
  text("測驗完成！", width / 2, layout.titleY);

  // 顯示答對題數
  textStyle(NORMAL);
  textSize(layout.scoreSize);
  text(
    `答對題數：${correctCount}／${questionBank.length}`,
    width / 2,
    layout.countY
  );

  // 顯示總分
  text(
    `總成績：${totalScore} 分`,
    width / 2,
    layout.scoreY
  );

  // 繪製重新開始按鈕
  drawRestartButton(layout);
}

// ------------------------------
// 繪製「請加油」動畫
// ------------------------------
function drawCheerEffect(layout) {
  // 計算動畫經過時間
  const elapsed = frameCount - cheerStartFrame;

  // 持續放大與縮小
  const scaleValue =
    1 + (sin(elapsed * 0.06) + 1) * 0.28;

  // 持續旋轉
  const rotationValue =
    sin(elapsed * 0.055) * 0.35;

  // 設定文字大小並限制最大尺寸
  const baseSize = min(width * 0.16, height * 0.22);
  const cheerSize = min(baseSize * scaleValue, width * 0.42);

  // 儲存目前繪圖狀態
  push();

  // 將繪圖原點移動到畫面中央
  translate(width / 2, layout.messageY);

  // 旋轉文字
  rotate(rotationValue);

  // 繪製半透明圓形背景
  noStroke();
  fill(255, 255, 255, 45);
  ellipse(
    0,
    0,
    cheerSize * 1.45,
    cheerSize * 0.85
  );

  // 繪製「請加油」
  fill(COLORS.white);
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(cheerSize);
  text("請加油", 0, 0);

  // 還原繪圖狀態
  pop();
}

// ------------------------------
// 初始化煙火
// ------------------------------
function initializeFireworks() {
  // 清空原有煙火
  fireworks = [];

  // 設定上一次煙火時間
  lastFireworkFrame = frameCount - 30;

  // 建立六組煙火
  for (let i = 0; i < 6; i++) {
    fireworks.push({
      x: random(width * 0.15, width * 0.85),
      y: random(height * 0.1, height * 0.55),
      particles: [],
      active: false,
      startFrame: -i * 24,
      color: color(
        random(150, 255),
        random(150, 255),
        random(150, 255)
      )
    });
  }
}

// ------------------------------
// 繪製煙火特效
// ------------------------------
function drawFireworks() {
  // 第一次進入結果頁時初始化煙火
  if (fireworks.length === 0) {
    initializeFireworks();
  }

  // 處理每一組煙火
  for (const firework of fireworks) {
    const elapsed =
      frameCount - firework.startFrame;

    // 到達指定時間後產生爆炸
    if (elapsed > 0 && !firework.active) {
      firework.active = true;

      // 建立煙火粒子
      for (let i = 0; i < 42; i++) {
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

    // 更新煙火粒子
    if (firework.active) {
      for (const particle of firework.particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // 模擬重力
        particle.vy += 0.035;

        // 逐漸透明
        particle.life -= 2.5;

        // 繪製粒子
        noStroke();
        fill(
          red(firework.color),
          green(firework.color),
          blue(firework.color),
          particle.life
        );

        ellipse(
          particle.x,
          particle.y,
          particle.size,
          particle.size
        );
      }
    }
  }

  // 定期產生新的煙火
  if (frameCount - lastFireworkFrame > 55) {
    lastFireworkFrame = frameCount;

    const firework =
      fireworks[floor(random(fireworks.length))];

    firework.x = random(width * 0.15, width * 0.85);
    firework.y = random(height * 0.1, height * 0.55);
    firework.particles = [];
    firework.active = false;
    firework.startFrame = frameCount;
    firework.color = color(
      random(150, 255),
      random(150, 255),
      random(150, 255)
    );
  }
}

// ------------------------------
// 繪製重新開始按鈕
// ------------------------------
function drawRestartButton(layout) {
  // 計算按鈕位置
  const x = width / 2 - layout.buttonWidth / 2;
  const y = layout.buttonY;

  // 判斷滑鼠是否在按鈕上
  const hovering =
    mouseX >= x &&
    mouseX <= x + layout.buttonWidth &&
    mouseY >= y &&
    mouseY <= y + layout.buttonHeight;

  // 儲存按鈕位置
  resultButton = {
    x,
    y,
    width: layout.buttonWidth,
    height: layout.buttonHeight
  };

  // 繪製按鈕陰影
  noStroke();
  fill(0, 50);
  rect(
    x + 4,
    y + 5,
    layout.buttonWidth,
    layout.buttonHeight,
    12
  );

  // 繪製按鈕背景
  fill(hovering ? COLORS.buttonHover : COLORS.button);
  stroke(COLORS.black);
  strokeWeight(2);
  rect(
    x,
    y,
    layout.buttonWidth,
    layout.buttonHeight,
    12
  );

  // 繪製按鈕文字
  noStroke();
  fill(COLORS.black);
  textFont(FONT_CHINESE);
  textStyle(BOLD);
  textSize(constrain(width * 0.028, 18, 28));
  text(
    "重新開始",
    width / 2,
    y + layout.buttonHeight / 2
  );
}

// ------------------------------
// 滑鼠按下事件
// ------------------------------
function mousePressed() {
  // 處理滑鼠輸入
  handleInput(mouseX, mouseY);
}

// ------------------------------
// 觸控事件
// ------------------------------
function touchStarted() {
  // 記錄觸控時間
  lastTouchTime = millis();

  // 處理觸控輸入
  handleInput(mouseX, mouseY);

  // 阻止瀏覽器預設觸控行為
  return false;
}

// ------------------------------
// 統一處理滑鼠與觸控輸入
// ------------------------------
function handleInput(inputX, inputY) {
  // 如果觸控後瀏覽器又觸發滑鼠事件，避免重複處理
  if (millis() - lastTouchTime < 500) {
    // 當輸入來源是滑鼠時才阻擋；
    // 觸控事件本身仍會正常執行
    if (mouseIsPressed && touches.length === 0) {
      return;
    }
  }

  // 結果頁處理重新開始
  if (quizFinished) {
    if (resultButton !== null) {
      const clickedRestart =
        inputX >= resultButton.x &&
        inputX <= resultButton.x + resultButton.width &&
        inputY >= resultButton.y &&
        inputY <= resultButton.y + resultButton.height;

      if (clickedRestart) {
        restartQuiz();
      }
    }

    return;
  }

  // 取得目前版面資料
  const layout = getQuizLayout();

  // 尚未作答時，判斷是否點擊選項
  if (!hasAnswered) {
    const question = questionBank[currentQuestion];

    for (let i = 0; i < question.options.length; i++) {
      const optionX =
        width / 2 - layout.contentWidth / 2;

      const optionY =
        layout.optionStartY +
        i * (layout.optionHeight + layout.optionGap);

      const clickedOption =
        inputX >= optionX &&
        inputX <= optionX + layout.contentWidth &&
        inputY >= optionY &&
        inputY <= optionY + layout.optionHeight;

      if (clickedOption) {
        // 記錄使用者選擇
        selectedAnswer = i;

        // 判斷答案是否正確
        isCorrect =
          selectedAnswer === question.answer;

        // 設定作答狀態
        hasAnswered = true;

        // 答對才增加答對題數
        if (isCorrect) {
          correctCount++;
        }

        // 啟動選項動畫
        animationStartFrame = frameCount;

        break;
      }
    }

    return;
  }

  // 已作答時，判斷是否點擊下一題按鈕
  const buttonX =
    width / 2 - layout.buttonWidth / 2;

  const buttonY = layout.buttonY;

  const clickedNext =
    inputX >= buttonX &&
    inputX <= buttonX + layout.buttonWidth &&
    inputY >= buttonY &&
    inputY <= buttonY + layout.buttonHeight;

  if (clickedNext) {
    // 最後一題完成後進入結果頁
    if (currentQuestion === questionBank.length - 1) {
      quizFinished = true;
      cheerStartFrame = frameCount;
      fireworks = [];
    } else {
      // 前往下一題
      currentQuestion++;

      // 重設本題狀態
      selectedAnswer = -1;
      hasAnswered = false;
      isCorrect = false;
    }
  }
}

// ------------------------------
// 重新開始測驗
// ------------------------------
function restartQuiz() {
  // 重設題目進度
  currentQuestion = 0;

  // 重設答對題數
  correctCount = 0;

  // 重設作答狀態
  selectedAnswer = -1;
  hasAnswered = false;
  isCorrect = false;
  quizFinished = false;

  // 清除動畫資料
  fireworks = [];
  resultButton = null;
  cheerStartFrame = frameCount;
}

// ------------------------------
// 繪製可自動換行的中文文字
// ------------------------------
function drawWrappedText(
  message,
  centerX,
  centerY,
  maxWidth,
  lineHeight
) {
  // 將文字拆成單一字元
  const characters = message.split("");

  // 儲存每一行文字
  const lines = [];

  // 目前正在組合的文字
  let currentLine = "";

  // 逐字計算文字寬度
  for (let i = 0; i < characters.length; i++) {
    const testLine = currentLine + characters[i];

    // 超過最大寬度時換行
    if (
      textWidth(testLine) > maxWidth &&
      currentLine.length > 0
    ) {
      lines.push(currentLine);
      currentLine = characters[i];
    } else {
      currentLine = testLine;
    }
  }

  // 加入最後一行
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // 計算整段文字高度
  const totalHeight = lines.length * lineHeight;
  const startY =
    centerY - totalHeight / 2 + lineHeight / 2;

  // 逐行繪製
  for (let i = 0; i < lines.length; i++) {
    text(
      lines[i],
      centerX,
      startY + i * lineHeight
    );
  }
}

// ------------------------------
// 視窗大小改變事件
// ------------------------------
function windowResized() {
  // 讓畫布符合最新的視窗尺寸
  resizeCanvas(windowWidth, windowHeight);

  // 清除舊的按鈕位置，讓下一幀重新計算
  resultButton = null;
}