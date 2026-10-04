const textarea = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

// Restore draft and theme
window.addEventListener("DOMContentLoaded", () => {
  const draft = localStorage.getItem("draft");
  if (draft) textarea.value = draft;

  const theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "Light mode";
  }

  updateCounts();
});

// Update counts on input
textarea.addEventListener("input", () => {
  localStorage.setItem("draft", textarea.value);
  updateCounts();
});

function updateCounts() {
  const text = textarea.value;
  const length = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  charCount.textContent = `${length} / 200 characters`;
  wordCount.textContent = `${words} words`;

  charCount.classList.remove("warning", "over");
  if (length > 200) {
    charCount.classList.add("over");
  } else if (length > 180) {
    charCount.classList.add("warning");
  }
}

// Clear button
clearBtn.addEventListener("click", clearNote);

function clearNote() {
  textarea.value = "";
  localStorage.removeItem("draft");
  updateCounts();
}

// Theme toggle
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

// Escape clears textarea
textarea.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    clearNote();
  }
});
