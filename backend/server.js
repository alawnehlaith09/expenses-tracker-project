// ### Server Settings ###

// import express() package
const express = require("express");

// get an instance of express() package to real use
const app = express();

// each request must be converted from json into js
app.use(express.json());

// import cors package
const cors = require("cors");

// each request must take permission to be moved from server to client
app.use(cors());

// ### Pool Class settings to deal with database ###

// import dotenv package
require("dotenv").config();

// extract Pool class from pg package
const { Pool } = require("pg");

// get pool instance object and provide it with database connection info
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// to enfore user choicing from those categories
const categories = ["Food", "Transport", "Bills", "Entertainment", "Other"];

// IMPORTANT NOTE:
// Defensive Programming validation: even though the frontend restricts category
// (select) and date (date input), all fields below are re-validated on
// the server, since the API can be called directly (e.g. Thunder Client)
// without going through the frontend.

// ### Routes Settings ###

// GET /api/expenses Route
app.get("/api/expenses", async function (request, response) {
  try {
    // no need to use variables at this case, just for consistency purposes
    const query = `SELECT id, title, amount::FLOAT, category, TO_CHAR(date, 'YYYY-MM-DD') AS date 
                    FROM expenses`;

    // send the request to the databse and wait response
    const result = await pool.query(query);

    // inform client-side the process successfully done and converts response into json object to be moved via internet
    response.status(200).json(result.rows);
  } catch (error) {
    // inform client-side the process failed and converts response into json object to be moved via internet
    response.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/expenses/:id
app.get("/api/expenses/:id", async function (request, response) {
  try {
    // for readability and reusability purposes, we use variables
    const expenseId = request.params.id;

    // try to parse ID from string to integer (if already not)
    const parsedId = Number(expenseId);

    // check if the expense is a number or not
    if (isNaN(parsedId))
      return response.status(404).json({ error: "Invalid ID Format." });

    const query = `SELECT id, title, amount::FLOAT, category, TO_CHAR(date, 'YYYY-MM-DD') AS date 
                    FROM expenses WHERE id = $1`;

    const result = await pool.query(query, [parsedId]);

    // check if expense is found or not
    if (result.rows.length === 0)
      return response.status(404).json({ error: "Expense not found." });

    return response.status(200).json(result.rows[0]);
  } catch (error) {
    response.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/expenses
app.post("/api/expenses", async function (request, response) {
  try {
    // get the recieved data from client-side to be added to database
    const { title, amount, category, date } = request.body;

    // try to convert amount into number (if not)
    const numericAmount = Number(amount);

    // gurantee that title is taken as teimmed (even if unnecessary spaces put) and not null
    const trimmedTitle = title ? title.trim() : "";

    // make sure the client fills all required fields
    if (!trimmedTitle || !date || isNaN(numericAmount) || numericAmount <= 0)
      return response.status(400).json({ error: "Invalid or missing fields." });

    // try to read it as date format to make sure its a valid date, not a normal text
    if (isNaN(Date.parse(date)))
      return response.status(400).json({ error: "Invalid date format." });

    const trimmedCategory = category ? category.trim() : "";

    if (!categories.includes(trimmedCategory))
      return response.status(400).json({
        error: "Category is required and must be one of the allowed values.",
      });

    const nonQuery = `INSERT INTO expenses (title, amount, category, date) 
                      VALUES ($1, $2, $3, $4) 
                       RETURNING id, title, amount::FLOAT, category, TO_CHAR(date, 'YYYY-MM-DD') AS date`;

    const result = await pool.query(nonQuery, [
      trimmedTitle,
      amount,
      trimmedCategory,
      date,
    ]);

    return response.status(201).json(result.rows[0]);
  } catch (error) {
    response.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/expenses/:id
app.put("/api/expenses/:id", async function (request, response) {
  try {
    const expenseId = request.params.id;
    const parsedId = Number(expenseId);

    if (isNaN(parsedId))
      return response.status(404).json({ error: "Invalid ID Format." });

    const { title, amount, category, date } = request.body;

    const numericAmount = Number(amount);
    const trimmedTitle = title ? title.trim() : "";

    if (!trimmedTitle || !date || isNaN(numericAmount) || numericAmount <= 0)
      return response.status(400).json({ error: "Invalid or missing fields." });

    if (isNaN(Date.parse(date))) {
      return response.status(400).json({ error: "Invalid date format." });
    }

    const trimmedCategory = category ? category.trim() : "";

    if (!categories.includes(trimmedCategory))
      return response.status(400).json({
        error: "Category is required and must be one of the allowed values.",
      });

    const nonQuery = `UPDATE expenses
                      SET title = $1, amount = $2, category = $3, date = $4
                      WHERE id = $5
                        RETURNING id, title, amount::FLOAT, category, TO_CHAR(date, 'YYYY-MM-DD') AS date`;

    const result = await pool.query(nonQuery, [
      trimmedTitle,
      amount,
      trimmedCategory,
      date,
      parsedId,
    ]);

    if (result.rows.length === 0)
      return response.status(404).json({ error: "Expense not found." });

    return response.status(200).json(result.rows[0]);
  } catch (error) {
    response.status(500).json({ error: "Internal Server Failed" });
  }
});

// DELETE /api/expenses/:id
app.delete("/api/expenses/:id", async function (request, response) {
  try {
    const expenseId = request.params.id;
    const parsedId = Number(expenseId);

    if (isNaN(parsedId))
      return response.status(404).json({ error: "Invalid ID Format." });

    const nonQuery = `DELETE FROM expenses
                           WHERE id = $1
                           RETURNING id, title, amount::FLOAT, category, TO_CHAR(date, 'YYYY-MM-DD') AS date`;

    const result = await pool.query(nonQuery, [parsedId]);

    if (result.rows.length === 0)
      return response.status(404).json({ error: "Expense not found." });

    return response.status(200).json(result.rows[0]);
  } catch (error) {
    response.status(500).json({ error: "Internal server Failed" });
  }
});

// set the server port (in which port the server listens)
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
