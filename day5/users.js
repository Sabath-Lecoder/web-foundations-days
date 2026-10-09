const loadUsersButton = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const statusMessage = document.getElementById("status");
const usersList = document.getElementById("users-list");

let users = [];

function renderUsers(list) {
  usersList.replaceChildren();

  list.forEach((user) => {
    const listItem = document.createElement("li");
    const name = document.createElement("h2");
    const email = document.createElement("p");
    const city = document.createElement("p");
    const company = document.createElement("p");

    name.textContent = user.name;
    email.textContent = `Email: ${user.email}`;
    city.textContent = `City: ${user.address.city}`;
    company.textContent = `Company: ${user.company.name}`;

    listItem.append(name, email, city, company);
    usersList.appendChild(listItem);
  });

  statusMessage.textContent = list.length === 0
    ? "No users match your filter."
    : `Showing ${list.length} of ${users.length} users.`;
}

function filterUsers() {
  const searchTerm = filterInput.value.trim().toLowerCase();
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm)
  );

  renderUsers(filteredUsers);
}

async function loadUsers() {
  loadUsersButton.disabled = true;
  statusMessage.textContent = "Loading users...";

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }

    const loadedUsers = await response.json();
    if (!Array.isArray(loadedUsers)) {
      throw new Error("The server returned an invalid user list.");
    }

    users = loadedUsers;
    filterUsers();
  } catch (error) {
    users = [];
    usersList.replaceChildren();
    statusMessage.textContent = `Unable to load users: ${error.message}`;
  } finally {
    loadUsersButton.disabled = false;
  }
}

loadUsersButton.addEventListener("click", loadUsers);
filterInput.addEventListener("input", filterUsers);
