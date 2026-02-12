let questions = [];
let userAnswers = [];
let currentIndex = 0;

const quiz_time = 300;
let timeLeft = quiz_time;
let timerId = null;

// ------- Fetching API to get Questions Dynamically ------- //
function decodeHTML(str) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = str;
  return textarea.value;
}

async function getQuestions() {
  try {
    const res = await fetch(
      "https://opentdb.com/api.php?amount=10&type=multiple",
    );
    const data = await res.json();

    if (!data.results?.length) {
      throw new Error("No questions returned from API");
    }

    questions = data.results.map((q) => {
      const choices = [...q.incorrect_answers, q.correct_answer].map(
        decodeHTML,
      );
      choices.sort(() => Math.random() - 0.5);

      return {
        question: decodeHTML(q.question),
        choices,
        answer: decodeHTML(q.correct_answer),
      };
    });

    userAnswers = new Array(questions.length).fill(null);
    renderQuestion(0);
    createIndicator();

  } catch (err) {
    console.error(err);
    alert("Failed to load questions. Try again later.");
  }
}

// ------- RENDER ONE QUESTION ------- //
function renderQuestion(index) {
  const q = questions[index];
  if (!q) return;

  const questionText = document.getElementById("question-text");
  const optionsDiv = document.getElementById("options");
  const count = document.getElementById("question-count");
  const nextBtn = document.getElementById("next-btn");

  questionText.textContent = q.question;
  count.textContent = `Question ${index + 1} / ${questions.length}`;

  optionsDiv.innerHTML = q.choices
    .map((choice, i) => {
      const id = `opt${i}`;
      return `
        <div>
            <input type="radio" name="answer" id="${id}" value="${choice}" />
            <label for="${id}">${choice}</label>
        </div>
        `;
    })
    .join("");

  // attach auto-save listener to each radio
  let radios = document.querySelectorAll('input[name="answer"]');

  radios.forEach((radio) => {
    radio.addEventListener("change", () => {
      userAnswers[currentIndex] = radio.value;
      saveState();
    });
  });

  // Restore previously selected answer (important!)
  const saved = userAnswers[index];
  if (saved) {
    radios.forEach((radio) => {
      if (radio.value === saved) radio.checked = true;
    });
  }

  updateIndicators();

  if (index == questions.length - 1) {
    nextBtn.innerText = "Submit";
  } else {
    nextBtn.innerText = "Next";
  }
}

// ------ NEXT QUESTION ------ //
function nextQuestion() {
  const selected = document.querySelector('input[name="answer"]:checked');
  const alertMsg = document.querySelector("small");

  if (!selected) {
    alertMsg.textContent = "Please select an option";
    return;
  }

  alertMsg.textContent = "";

  if (currentIndex === questions.length - 1) {
    showDialog();
    return;
  }

  currentIndex++;
  renderQuestion(currentIndex);
  updateIndicators();
  saveState();
}

// ------ PREVIOUS QUESTION ------ //
function prevQuestion() {
  if (currentIndex === 0) return;

  currentIndex--;
  renderQuestion(currentIndex);
}

// ------- SAVING STATE TO LOCALSTORAGE ------- //
function saveState() {
  localStorage.setItem(
    "quizState",
    JSON.stringify({
      questions,
      userAnswers,
      currentIndex,
      timeLeft,
    }),
  );
}

// ------ RESTORE SAVED STATE ------ //
function restoreState() {
  const saved = JSON.parse(localStorage.getItem("quizState"));

  if (!saved) return false;

  questions = saved.questions;
  userAnswers = saved.userAnswers;
  currentIndex = saved.currentIndex;
  timeLeft = saved.timeLeft ?? quiz_time;

  return true;
}

// ------- CREATE INDICATORS FOR ALL QUESTIONS ------- //
function createIndicator() {
  const indicatorContainer = document.getElementById("indicators");
  indicatorContainer.innerHTML = "";

  questions.forEach((_, index) => {
    const btn = document.createElement("button");
    btn.className = "indicator";
    btn.textContent = index + 1;

    btn.addEventListener("click", () => {
      currentIndex = index;
      renderQuestion(currentIndex);
    });

    indicatorContainer.appendChild(btn);
  });

  updateIndicators();
}
// ----- UPDATE THE INDICATORS BY HIGHLIGHTING ANSWERED/CURRENT BUTTONS ------ //
function updateIndicators() {
  const buttons = document.querySelectorAll(".indicator");

  buttons.forEach((btn, i) => {
    btn.classList.remove("answered", "current");

    if (userAnswers[i]) {
      btn.classList.add("answered");
    }

    if (i == currentIndex) {
      btn.classList.add("current");
    }
  });
}

// ----- RENDER THE USER SCORE ------ //
function renderScore() {
  const score = calculateScore();

  const indicators = document.getElementById("indicators");
  const questionsContainer = document.getElementById("questions-container");
  const resultContainer = document.getElementById("result");

  resultContainer.innerHTML = `
            <h2>Quiz Finished!</h2>
            <p><b>Your Score: </b>${score} / ${questions.length} Questions</p>
            <button id="restart-btn" class="btn reset">Start New</button>
  `;

  resultContainer.classList.remove("hidden");
  questionsContainer.classList.add("hidden");
  indicators.classList.add("hidden");

  document.getElementById("restart-btn").addEventListener("click", restartQuiz);

  hideDialog();
  stopTimer();
}


// ------ RESET THE QUIZ ------ //
function resetQuiz() {
  currentIndex = 0;
  userAnswers = new Array(questions.length).fill(null);

  renderQuestion(0);
  updateIndicators();
  saveState(); // keep same timer
}


// ------ RESTART QUIZ WITH NEW QUESTIONS ----- //
async function restartQuiz() {
  stopTimer();

  localStorage.removeItem("quizState");

  currentIndex = 0;
  timeLeft = quiz_time;

  document.getElementById("result").classList.add("hidden");
  document.getElementById("questions-container").classList.remove("hidden");
  document.getElementById("indicators").classList.remove("hidden");

  await getQuestions();
  startTimer();
  updateIndicators();
}

/* ----- IF USER ACCIDENTALLY SUBMIT THE QUIZ -----
   -----  DIALOG FOR CONFIRMATION TO SUBMIT   ----- */
function showDialog() {
  document.querySelector("dialog").showModal();
}
function hideDialog() {
  document.querySelector("dialog").close();
}

// ------- CALCULATE USER'S TOTAL SCORE ------ //
function calculateScore() {
  let score = 0;

  userAnswers.forEach((ans, i) => {
    if (ans === questions[i].answer) score++;
  });

  return score;
}

// ------ QUIZ TIMER ------ //
function startTimer() {
  clearInterval(timerId);

  timerId = setInterval(() => {
    timeLeft--;

    updateTimerUI();
    saveState();

    if (timeLeft <= 0) {
      clearInterval(timerId);
      timerId = null;
      renderScore();
    }
  }, 1000);
}

// ----- FUNCTION TO STOP TIMER WHEN USER SUBMITS BEFORE TIME OUT ----- //
function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

// ----- UPDATE TIMER UI ----- //
function updateTimerUI() {
  const el = document.getElementById("timer");

  const m = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const s = String(Math.floor(timeLeft % 60)).padStart(2, "0");

  el.textContent = `${m}:${s}`;
}

const saved = restoreState();

if (saved) {
  createIndicator();
  renderQuestion(currentIndex);
  startTimer();
} else {
  getQuestions().then(() => {
    createIndicator();
    startTimer();
  });
}

updateTimerUI();

document.getElementById("next-btn").addEventListener("click", nextQuestion);
document.getElementById("prev-btn").addEventListener("click", prevQuestion);
document.querySelector(".reset-btn").addEventListener("click", resetQuiz);