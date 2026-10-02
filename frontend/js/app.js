// Expense Tracker - frontend logic

const API_URL = "http://localhost:3000/api/expenses";

// get HTML needed elements
const tableAlertContainer = document.querySelector("#table-alert-container");
const spinnerContainer = document.querySelector("#loading-spinner");
const tableBody = document.querySelector("#expenses-table-body");
const totalCard = document.querySelector("#summary-total");
const countCard = document.querySelector("#summary-count");
const highestAmount = document.querySelector("#summary-highest-amount");
const highestTitle = document.querySelector("#summary-highest-title");

// get HTML elements that take input from user
const form = document.querySelector("#expense-form");
const titleInput = document.querySelector("#expense-title");
const amountInput = document.querySelector("#expense-amount");
const categoryInput = document.querySelector("#expense-category");
const dateInput = document.querySelector("#expense-date");

// to validate categoryInputField only
const allowedCategories = [
  "Food",
  "Transport",
  "Bills",
  "Entertainment",
  "Other",
];

// Modal Elements
const editModalElement = document.querySelector("#editExpenseModal");
const editForm = document.querySelector("#edit-expense-form");

// get an instance of Modal bootstrap object using Modal Library
const editModal = new bootstrap.Modal(editModalElement);

// get Modal elements that take input from user
const editTitleInput = document.querySelector("#edit-expense-title");
const editAmountInput = document.querySelector("#edit-expense-amount");
const editCategoryInput = document.querySelector("#edit-expense-category");
const editDateInput = document.querySelector("#edit-expense-date");
const editAlertContainer = document.querySelector("#edit-alert-container");

// the currentId of the current edited expense
let currentEditId = null;

// ### Prepare Helper Functions

// used with every failiure to inform the user
function showAlert(message, container = tableAlertContainer) {
  let temp = `
    <div class="alert alert-danger alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;

  container.innerHTML = temp;
}

// used with every table changes to get the new form of the table
async function refresh() {
  // make the table empty to re-build
  tableAlertContainer.innerHTML = "";

  // display the spinner loading while all data loaded
  spinnerContainer.classList.remove("d-none");

  // get all data by GET API request
  const data = await getExpenses();

  // filteration data proesses
  const filteredData = applyCategoryFilter(data);
  const monthFilteredData = applyMonthFilter(filteredData);
  const searchedData = applySearch(monthFilteredData);

  // re-build te table and the cards
  renderTable(searchedData);
  renderSummary(data);

  // hide the spinner
  spinnerContainer.classList.add("d-none");
}

// used to handle needed caculcations
function renderSummary(list) {
  // handle the empty table if found
  if (list.length === 0) {
    totalCard.textContent = "0.00";
    countCard.textContent = "0";
    highestAmount.textContent = "0.00";
    highestTitle.textContent = "";
    return;
  }

  // get total amounts
  const total = list.reduce(function (acc, current) {
    return acc + current.amount;
  }, 0);

  // get rows count
  const count = list.length;

  // get the highest amount with the highest title
  let maxAmount = list[0].amount;
  let maxTitle = list[0].title;

  for (let i = 1; i < list.length; i++)
    if (list[i].amount > maxAmount) {
      maxAmount = list[i].amount;
      maxTitle = list[i].title;
    }

  // update cards with the calculated values
  totalCard.textContent = total.toFixed(2);
  countCard.textContent = count;
  highestAmount.textContent = maxAmount.toFixed(2);
  highestTitle.textContent = maxTitle;
}

// used to really build table again after changes occur
function renderTable(list) {
  // make tableBody empty to clearly re-build it
  tableBody.innerHTML = "";

  // pass through each row to re-add it with the needed updated
  list.forEach((expense) => {
    // Prepare HTML Table Elements
    const row = document.createElement("tr");

    const titleCell = document.createElement("td");
    titleCell.textContent = expense.title;

    const amountCell = document.createElement("td");
    amountCell.textContent = expense.amount.toFixed(2);

    const categoryCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `badge badge-category badge-${expense.category.toLowerCase()}`;
    badge.textContent = expense.category;
    categoryCell.appendChild(badge);

    const dateCell = document.createElement("td");
    dateCell.textContent = expense.date;

    const buttonsCell = document.createElement("td");

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-sm btn-outline-primary me-1";
    editBtn.textContent = "Edit";

    // handle click editBtn event
    editBtn.addEventListener("click", function () {
      currentEditId = expense.id;

      editAlertContainer.innerHTML = "";

      editTitleInput.value = expense.title;
      editAmountInput.value = expense.amount;
      editCategoryInput.value = expense.category;
      editDateInput.value = expense.date;

      // to show modal window
      editModal.show();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-sm btn-outline-danger";
    deleteBtn.textContent = "Delete";

    deleteBtn.addEventListener("click", async function () {
      // pre-ask the user to avoid deletions by mistake
      const isConfirmed = confirm(
        "Are you sure you want to delete this expense?",
      );

      if (isConfirmed) {
        spinnerContainer.classList.remove("d-none");

        const isSuccess = await deleteExpense(expense.id);

        spinnerContainer.classList.add("d-none");

        if (isSuccess) await refresh();
      }
    });

    // Link HTML Table Elements
    buttonsCell.appendChild(editBtn);
    buttonsCell.appendChild(deleteBtn);

    row.appendChild(titleCell);
    row.appendChild(amountCell);
    row.appendChild(categoryCell);
    row.appendChild(dateCell);
    row.appendChild(buttonsCell);

    tableBody.appendChild(row);
  });
}

function validateExpense(
  title,
  amount,
  category,
  date,
  alertContainer = tableAlertContainer,
) {
  if (!title) {
    showAlert("Title is required.", alertContainer);
    return false;
  }
  if (isNaN(amount) || amount <= 0) {
    showAlert("Enter an amount greater than 0.", alertContainer);
    return false;
  }
  if (!allowedCategories.includes(category)) {
    showAlert("Choose a category.", alertContainer);
    return false;
  }
  if (!date || isNaN(Date.parse(date))) {
    showAlert("Choose a valid date.", alertContainer);
    return false;
  }
  return true;
}

// ### Prepeare Requests by fetch function ###

// Get All Data
async function getExpenses() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!response.ok) {
      showAlert(data.error);
      return [];
    }

    return data;
  } catch (error) {
    showAlert("Cannot reach the server. Is it running?");
    return [];
  }
}

// Add New Expense
async function addExpense(data) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const resData = await response.json();

    if (!response.ok) {
      showAlert(resData.error);
      return false;
    }

    return true;
  } catch (error) {
    showAlert("Cannot reach the server. Is it running?");
    return false;
  }
}

// handle click add button event
form.addEventListener("submit", async function (e) {
  // to prevent the normal behavior of the addBtn submits
  e.preventDefault();

  // validate input data
  const title = titleInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;

  // validate all required fields
  if (!validateExpense(title, amount, category, date)) return;

  // prepere the added expense to be sent to the server
  const newExpense = { title, amount, category, date };

  // show spinner loading
  spinnerContainer.classList.remove("d-none");

  // send data to the server
  const isSuccess = await addExpense(newExpense);

  // hide spinner loading
  spinnerContainer.classList.add("d-none");

  // refresh the table if the process successfully done
  if (isSuccess) {
    await refresh();

    // empty the text fields to be filled at the next add request
    titleInput.value = "";
    amountInput.value = "";
    categoryInput.value = "";
    dateInput.value = "";
  }
});

// Update Exist Expense
async function updateExpense(id, data) {
  try {
    const response = await fetch(API_URL + "/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const resData = await response.json();

    if (!response.ok) {
      showAlert(resData.error, editAlertContainer);
      return false;
    }

    return true;
  } catch (error) {
    showAlert("Cannot reach the server. Is it running?", editAlertContainer);
    return false;
  }
}

// Handle click on "Save Changes" inside the Modal
editForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  // get the new data to be replaced the old onec
  const title = editTitleInput.value.trim();
  const amount = parseFloat(editAmountInput.value);
  const category = editCategoryInput.value;
  const date = editDateInput.value;

  if (!validateExpense(title, amount, category, date, editAlertContainer))
    return;

  const updatedData = { title, amount, category, date };

  spinnerContainer.classList.remove("d-none");

  const isSuccess = await updateExpense(currentEditId, updatedData);

  spinnerContainer.classList.add("d-none");

  if (isSuccess) {
    // to hide modal window
    editModal.hide();

    currentEditId = null;
    await refresh();
  }
});

// Delete an Expense
async function deleteExpense(id) {
  try {
    const response = await fetch(API_URL + "/" + id, {
      method: "DELETE",
    });
    const resData = await response.json();

    if (!response.ok) {
      showAlert(resData.error);
      return false;
    }

    return true;
  } catch (error) {
    showAlert("Cannot reach the server. Is it running?");
    return false;
  }
}

// ### Filter Data by Category ###

// get HTML elements needed for filteration
const categoryFilter = document.querySelector("#category-filter");

function applyCategoryFilter(data) {
  const selectedCategory = categoryFilter.value;

  if (selectedCategory === "All" || !selectedCategory) return data;

  return data.filter((expense) => expense.category === selectedCategory);
}

// handle select category element change
categoryFilter.addEventListener("change", function () {
  refresh();
});

// ### Dark Mode Settings ###

// get HTML elements needed for dark mode process
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const bodyElement = document.body;
const expensesTable = document.getElementById("expenses-table");

function applyTheme(isDark) {
  if (isDark) {
    bodyElement.classList.add("dark-mode");
    if (expensesTable) expensesTable.classList.add("table-dark");

    themeToggleBtn.textContent = "☀️ Light Mode";
    localStorage.setItem("theme", "dark");
  } else {
    bodyElement.classList.remove("dark-mode");
    if (expensesTable) expensesTable.classList.remove("table-dark");

    themeToggleBtn.textContent = "🌙 Dark Mode";
    localStorage.setItem("theme", "light");
  }
}

// apply saved theme on page load
const savedTheme = localStorage.getItem("theme");
applyTheme(savedTheme === "dark");

// handle click toggleBtn event
themeToggleBtn.addEventListener("click", function () {
  const isCurrentlyDark = bodyElement.classList.contains("dark-mode");
  applyTheme(!isCurrentlyDark);
});

// ### Search by Title Settings ###

// get HTML elements needed for search
const searchInput = document.querySelector("#search-title");

function applySearch(data) {
  const userTitleInput = searchInput.value.trim().toLowerCase();

  if (!userTitleInput) return data;

  return data.filter((expense) =>
    expense.title.toLowerCase().includes(userTitleInput),
  );
}

// handle type on searchInput field event
searchInput.addEventListener("input", function () {
  refresh();
});

// ### Filter Data by Month ###

// get HTML elements needed for month filtering
const monthFilter = document.querySelector("#month-filter");

function applyMonthFilter(data) {
  const selectedMonth = monthFilter.value;

  if (selectedMonth === "All" || !selectedMonth) return data;

  // take the second section of the data formatted as (YYYY-MM-DD)
  // [YYYY, MM, DD] => month is always index 1
  return data.filter((expense) => expense.date.split("-")[1] === selectedMonth);
}

// handle select month element change
monthFilter.addEventListener("change", function () {
  refresh();
});

refresh();
