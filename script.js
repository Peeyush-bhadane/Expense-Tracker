document.addEventListener("DOMContentLoaded", () => { 
  const contentArea = document.getElementById("contentArea");
  const dashboard = document.getElementById("dashboard");
  const budgets = document.getElementById("budgets");
  const expenses = document.getElementById("expenses");
  
  const dashboardBtn = document.getElementById("dashboardBtn");
  const budgetsBtn = document.getElementById("budgetsBtn");
  const expensesBtn = document.getElementById("expensesBtn");

  let selectedBudgetIndex = null;
  let chartInstance = null;

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) {
    window.location.href = "login.html";
  }

  const getUserData = () => {
    const allData = JSON.parse(localStorage.getItem("userData")) || {};
    return allData[currentUser.email] || { budgets: [] };
  };

  const saveUserData = (data) => {
    const allData = JSON.parse(localStorage.getItem("userData")) || {};
    allData[currentUser.email] = data;
    localStorage.setItem("userData", JSON.stringify(allData));
  };

  const updateBudgetChart = () => {
    const { budgets } = getUserData();
    const chartCanvas = document.getElementById("budgetChart");

    if (!chartCanvas || budgets.length === 0) {
      if (document.getElementById("noChartMessage")) {
        document.getElementById("noChartMessage").style.display = "block";
      }
      return;
    }

    const ctx = chartCanvas.getContext("2d");
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: budgets.map(b => b.name),
        datasets: [
          {
            label: "Budgeted",
            data: budgets.map(b => b.total),
            backgroundColor: "#4CAF50"
          },
          {
            label: "Spent",
            data: budgets.map(b => b.spent),
            backgroundColor: "#F44336"
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: "Budget vs Spent" }
        }
      }
    });
  };

  const updateDashboard = () => {
    const { budgets } = getUserData();
    const totalBudget = budgets.reduce((sum, b) => sum + b.total, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

    document.getElementById("total-budget").textContent = `₹${totalBudget}`;
    document.getElementById("total-spent").textContent = `₹${totalSpent}`;
    document.getElementById("total-budgets").textContent = `${budgets.length} ${budgets.length !== 1 ? "" : ""}`;

    if (budgets.length > 0) {
      document.getElementById("noChartMessage").style.display = "none";
      updateBudgetChart();
    } else {
      document.getElementById("noChartMessage").style.display = "block";
    }

    const latestBudgetsList = document.getElementById("latestBudgetsList");
    latestBudgetsList.innerHTML = "";

    const recentBudgets = budgets.slice(-3).reverse();
    recentBudgets.forEach(budget => {
      const budgetCard = document.createElement("div");
      budgetCard.className = "budget-card-small";
      budgetCard.innerHTML = `
        <div class="budget-emoji">${budget.emoji || "📁"}</div>
        <div class="budget-info">
          <p class="budget-name">${budget.name}</p>
          <p class="budget-status">₹${budget.spent} spent of ₹${budget.total}</p>
          <div class="budget-progress">
            <div class="budget-progress-bar" style="width: ${Math.min((budget.spent / budget.total) * 100, 100)}%;"></div>
          </div>
        </div>
      `;
      latestBudgetsList.appendChild(budgetCard);
    });

    const latestExpensesList = document.getElementById("latestExpensesList");
    latestExpensesList.innerHTML = "";

    const recentExpenses = budgets.flatMap(b =>
      b.expenses.map(e => ({ ...e, budgetName: b.name }))
    ).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    recentExpenses.forEach(expense => {
      const expenseItem = document.createElement("li");
      expenseItem.className = "expense-card";
      expenseItem.innerHTML = `
        <div class="expense-header">
          <span>${expense.name}</span>
          <span>₹${expense.amount}</span>
        </div>
        <div class="expense-meta">
          ${expense.date} · ${expense.budgetName}
        </div>
      `;
      latestExpensesList.appendChild(expenseItem);
    });
  };

  const updateBudgets = () => {
    const { budgets } = getUserData();
    const budgetsContainer = document.getElementById("budgetsContainer");

    budgetsContainer.innerHTML = "";

    const createBudgetCard = document.createElement("div");
    createBudgetCard.className = "budget-card create-new";
    createBudgetCard.id = "createBudgetBtn";
    createBudgetCard.textContent = "+ Create New Budget";
    budgetsContainer.appendChild(createBudgetCard);

    budgets.forEach((budget, index) => {
      const budgetCard = document.createElement("div");
      budgetCard.className = "budget-card";
      budgetCard.innerHTML = `
        <div class="budget-header">
          <div class="emoji">${budget.emoji || "📁"}</div>
          <div class="budget-info">
            <strong>${budget.name}</strong>
            <p>${budget.expenses.length} Item${budget.expenses.length !== 1 ? "s" : ""}</p>
          </div>
          <div class="budget-amount">₹${budget.total}</div>
        </div>
        <div class="budget-details">
          <span class="spent">₹${budget.spent} Spent</span>
          <span class="remaining">₹${budget.total - budget.spent} Remaining</span>
        </div>
        <div class="progress-bar">
          <div class="spent-bar" style="width: ${Math.min((budget.spent / budget.total) * 100, 100)}%;"></div>
        </div>
        <div class="budget-actions">
          <button class="viewBudgetBtn" data-index="${index}">View</button>
          <button class="deleteBudgetBtn" data-index="${index}">🗑️</button>
        </div>
      `;
      budgetsContainer.appendChild(budgetCard);
    });

    document.getElementById("createBudgetBtn").addEventListener("click", showCreateBudgetModal);

    document.querySelectorAll(".viewBudgetBtn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        selectedBudgetIndex = parseInt(e.target.getAttribute("data-index"));
        showExpensesSection();
      });
    });

    document.querySelectorAll(".deleteBudgetBtn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.getAttribute("data-index"));
        if (confirm("Are you sure you want to delete this budget?")) {
          const userData = getUserData();
          userData.budgets.splice(index, 1);
          saveUserData(userData);
          updateBudgets();
        }
      });
    });
  };

  const showCreateBudgetModal = () => {
    if (!document.getElementById("createModal")) {
      const modal = document.createElement("div");
      modal.className = "modal";
      modal.id = "createModal";
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close" id="closeModal">&times;</span>
          <h3>Create New Budget</h3>
          <label>Select Emoji:</label>
          <select id="emojiSelect" class="styled-input">
            <option value="🛍️">🛍️ Shopping</option>
            <option value="🍔">🍔 Food</option>
            <option value="🏠">🏠 Home</option>
            <option value="🚗">🚗 Travel</option>
            <option value="📚">📚 Education</option>
            <option value="📁">📁 Other</option>
          </select>
          <input type="text" id="newBudgetName" placeholder="Budget Name" class="styled-input"/>
          <input type="number" id="newBudgetTotal" placeholder="Total Amount" class="styled-input"/>
          <button id="saveBudgetBtn" class="styled-button">Create Budget</button>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById("closeModal").addEventListener("click", () => {
        document.getElementById("createModal").style.display = "none";
      });

      document.getElementById("saveBudgetBtn").addEventListener("click", createNewBudget);
    }

    document.getElementById("createModal").style.display = "block";
  };

  const createNewBudget = () => {
    const name = document.getElementById("newBudgetName").value.trim();
    const total = Number(document.getElementById("newBudgetTotal").value.trim());
    const emoji = document.getElementById("emojiSelect").value;

    if (name && total) {
      const userData = getUserData();
      userData.budgets.push({ name, total, spent: 0, expenses: [], emoji });
      saveUserData(userData);
      document.getElementById("createModal").style.display = "none";
      updateBudgets();
    } else {
      alert("Please fill out both fields.");
    }
  };

  const updateExpenses = () => {
    if (selectedBudgetIndex === null) {
      expenses.innerHTML = `
        <h2>Please select a budget first</h2>
        <p>Go to the Budgets section and select a budget to view its expenses.</p>
        <button id="gotoBudgetsBtn" class="styled-button">Go to Budgets</button>
      `;
      document.getElementById("gotoBudgetsBtn").addEventListener("click", showBudgetsSection);
      return;
    }

    const userData = getUserData();
    const budget = userData.budgets[selectedBudgetIndex];

    expenses.innerHTML = `
      <h2>Expenses for ${budget.name}</h2>
      <div class="add-expense">
        <input type="text" id="expenseName" placeholder="Expense Name"/>
        <input type="number" id="expenseAmount" placeholder="Amount"/>
        <button id="addExpenseBtn">Add New Expense</button>
      </div>
      <div class="expense-summary">
        <table class="expense-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="expenseTableBody">
            ${budget.expenses.map((e, index) => `
              <tr>
                <td><input type="text" value="${e.name}" data-index="${index}" class="editName"/></td>
                <td><input type="number" value="${e.amount}" data-index="${index}" class="editAmount"/></td>
                <td>${e.date}</td>
                <td>
                  <button class="deleteExpenseBtn" data-index="${index}">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById("addExpenseBtn").addEventListener("click", addNewExpense);

    document.querySelectorAll(".editName, .editAmount").forEach(input => {
      input.addEventListener("blur", () => {
        const index = parseInt(input.getAttribute("data-index"));
        updateExpense(index);
      });
    });

    document.querySelectorAll(".deleteExpenseBtn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.getAttribute("data-index"));
        deleteExpense(index);
      });
    });
  };

  const addNewExpense = () => {
    const name = document.getElementById("expenseName").value.trim();
    const amount = Number(document.getElementById("expenseAmount").value.trim());

    if (name && amount) {
      const userData = getUserData();
      const budget = userData.budgets[selectedBudgetIndex];

      const expense = {
        name,
        amount,
        date: new Date().toLocaleDateString()
      };

      budget.expenses.push(expense);
      budget.spent += amount;
      saveUserData(userData);
      updateExpenses();
      document.getElementById("expenseName").value = "";
      document.getElementById("expenseAmount").value = "";
    } else {
      alert("Please enter a valid name and amount.");
    }
  };

  const updateExpense = (index) => {
    const userData = getUserData();
    const budget = userData.budgets[selectedBudgetIndex];

    const newName = document.querySelector(`.editName[data-index="${index}"]`).value.trim();
    const newAmount = Number(document.querySelector(`.editAmount[data-index="${index}"]`).value);

    if (newName && !isNaN(newAmount)) {
      const oldAmount = budget.expenses[index].amount;
      budget.expenses[index].name = newName;
      budget.expenses[index].amount = newAmount;
      budget.spent += newAmount - oldAmount;
      saveUserData(userData);
      updateExpenses();
    }
  };

  const deleteExpense = (index) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      const userData = getUserData();
      const budget = userData.budgets[selectedBudgetIndex];

      budget.spent -= budget.expenses[index].amount;
      budget.expenses.splice(index, 1);
      saveUserData(userData);
      updateExpenses();
    }
  };

  const showDashboardSection = () => {
    dashboard.style.display = "block";
    budgets.style.display = "none";
    expenses.style.display = "none";
    contentArea.style.display = "none";
    updateDashboard();
  };

  const showBudgetsSection = () => {
    dashboard.style.display = "none";
    budgets.style.display = "block";
    expenses.style.display = "none";
    contentArea.style.display = "none";
    updateBudgets();
  };

  const showExpensesSection = () => {
    dashboard.style.display = "none";
    budgets.style.display = "none";
    expenses.style.display = "block";
    contentArea.style.display = "none";
    updateExpenses();
  };

  dashboardBtn.addEventListener("click", showDashboardSection);
  budgetsBtn.addEventListener("click", showBudgetsSection);
  expensesBtn.addEventListener("click", showExpensesSection);

  showDashboardSection();
});
