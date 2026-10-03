// Starting notes data
const notes = [
  { text: "Buy groceries", category: "personal" },
  { text: "Finish project report", category: "work" },
  { text: "Study JavaScript functions", category: "study" },
  { text: "Call mom", category: "personal" },
  { text: "Review math notes", category: "study" }
];

// 1. searchNotes(word)
function searchNotes(word) {
  const lowerWord = word.toLowerCase();
  return notes.filter(note => note.text.toLowerCase().includes(lowerWord));
}
console.log("Search 'notes':", searchNotes("notes")); // Expected: [{ text: "Review math notes", category: "study" }]
console.log("Search with no results:", searchNotes("unmatched")); // Expected: []

// 2. longestNote()
function longestNote() {
  if (notes.length === 0) return null;
  return notes.reduce((longest, current) =>
    current.text.length > longest.text.length ? current : longest
  );
}
console.log("Longest note:", longestNote()); // Expected: { text: "Study JavaScript functions", category: "study" }

const savedNotes = [...notes];
notes.length = 0;
console.log("Longest note (empty):", longestNote()); // Expected: null

// 3. countByCategory()
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}
console.log("Count by category (empty):", countByCategory()); // Expected: {}

notes.push(...savedNotes);
console.log("Count by category:", countByCategory()); // Expected: { personal: 2, work: 1, study: 2 }

// 4. getSummary()
function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  const parts = Object.entries(counts).map(([category, count]) => `${count} ${category}`);
  const noteLabel = total === 1 ? "note" : "notes";
  return `${total} ${noteLabel}: ${parts.join(", ")}`;
}
notes.length = 0;
console.log("Summary (empty):", getSummary()); // Expected: "0 notes: "
notes.push(...savedNotes);
console.log("Summary:", getSummary()); // Expected: "5 notes: 2 personal, 1 work, 2 study"

notes.splice(0, notes.length, { text: "One note", category: "personal" });
console.log("Summary (one note):", getSummary()); // Expected: "1 note: 1 personal"
notes.splice(0, notes.length, ...savedNotes);

// 5. isDuplicate(text)
function isDuplicate(text) {
  const normalized = text.trim().toLowerCase();
  return notes.some(note => note.text.trim().toLowerCase() === normalized);
}
console.log("Is duplicate 'buy groceries':", isDuplicate("  Buy Groceries ")); // Expected: true
console.log("Is duplicate 'plan vacation':", isDuplicate("Plan vacation")); // Expected: false

// 6. addNote(text, category)
function addNote(text, category) {
  const validCategories = ["personal", "work", "study"];
  const trimmed = text.trim();

  if (trimmed.length < 1 || trimmed.length > 200) {
    return false;
  }
  if (!validCategories.includes(category)) {
    return false;
  }
  if (isDuplicate(trimmed)) {
    return false;
  }

  notes.push({ text: trimmed, category });
  return true;
}
console.log("Add note:", addNote("Practice coding challenges", "study")); // Expected: true
console.log("Add empty note:", addNote("   ", "personal")); // Expected: false
console.log("Add invalid category:", addNote("Test note", "random")); // Expected: false
console.log("Add duplicate:", addNote("Buy groceries", "personal")); // Expected: false
