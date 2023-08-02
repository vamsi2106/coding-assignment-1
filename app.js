var isValid = require("date-fns/isValid");
var format = require("date-fns/format");

const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

//Database initialization
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//API-1
app.get("/todos/", async (request, response) => {
  const {
    status = "",
    priority = "",
    search_q = "",
    category = "",
  } = request.query;
  const statusCheckArray = ["TO DO", "IN PROGRESS", "DONE", ""];
  const priorityCheckArray = ["HIGH", "MEDIUM", "LOW", ""];
  const categoryCheckArray = ["WORK", "HOME", "LEARNING", ""];

  const checkStatus = statusCheckArray.some((s) => s === status);
  const checkPriority = priorityCheckArray.some((p) => p === priority);
  const checkCategory = categoryCheckArray.some((c) => c === category);

  if (checkStatus === false) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (!checkPriority) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (!checkCategory) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    const getQuery = `
        SELECT 
            *
        FROM 
            todo
        WHERE 
            status LIKE "%${status}%" AND
            priority LIKE "%${priority}%" AND
            category LIKE "%${category}%"  AND 
            todo LIKE "%${search_q}%";  
    `;
    const getTodoListArray = await db.all(getQuery);
    const getTodo = getTodoListArray.map((t) => {
      return {
        id: t.id,
        todo: t.todo,
        priority: t.priority,
        status: t.status,
        category: t.category,
        dueDate: t.due_date,
      };
    });
    response.send(getTodo);
  }
});

//API-2
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT * FROM todo WHERE id = ${todoId}`;
  const getTodo = await db.get(getTodoQuery);
  const todo = {
    id: getTodo.id,
    todo: getTodo.todo,
    priority: getTodo.priority,
    status: getTodo.status,
    category: getTodo.category,
    dueDate: getTodo.due_date,
  };
  response.send(todo);
});

//API-3
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const validateDate = isValid(new Date(date)); //this checks whether the date month are in correct formate or not example date is in 31 or not and months is in 12 or not ala anamatta.

  if (validateDate) {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    const todoQuery = `SELECT * FROM todo WHERE strftime("%Y-%m-%d", due_date) LIKE "%${newDate}%" `;
    const todo = await db.all(todoQuery);
    //incase todo array empty ayithe adhi invalid date ani ardham
    if (todo.length === 0) {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      const todoResult = todo.map((obj) => {
        return {
          id: obj.id,
          todo: obj.todo,
          priority: obj.priority,
          status: obj.status,
          category: obj.category,
          dueDate: obj.due_date,
        };
      });
      response.send(todoResult);
    }
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//API-4
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const validateDate = isValid(new Date(dueDate));

  const statusCheckArray = ["TO DO", "IN PROGRESS", "DONE", ""];
  const priorityCheckArray = ["HIGH", "MEDIUM", "LOW", ""];
  const categoryCheckArray = ["WORK", "HOME", "LEARNING", ""];

  const checkStatus = statusCheckArray.some((s) => s === status);
  const checkPriority = priorityCheckArray.some((p) => p === priority);
  const checkCategory = categoryCheckArray.some((c) => c === category);

  if (checkStatus === false) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (!checkPriority) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (!checkCategory) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (!validateDate) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const createTodoQuery = `
            INSERT INTO 
                    todo(id, todo, category, priority, status, due_date)
            VALUES       
                    (
                        ${id}, 
                        '${todo}', 
                        '${category}',  
                        '${priority}', 
                        '${status}',  
                        '${format(new Date(dueDate), "yyyy-mm-dd")}'
                    );
            `;
    await db.all(createTodoQuery);
    response.status(200);
    response.send(`Todo Successfully Added`);
  }
});

//API-5
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }
  const previousTodoQuery = `SELECT * FROM todo WHERE id = ${todoId}`;
  const previousTodo = await db.get(previousTodoQuery);
  const {
    status = previousTodo.status,
    priority = previousTodo.priority,
    todo = previousTodo.todo,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  const statusCheckArray = ["TO DO", "IN PROGRESS", "DONE", ""];
  const priorityCheckArray = ["HIGH", "MEDIUM", "LOW", ""];
  const categoryCheckArray = ["WORK", "HOME", "LEARNING", ""];

  const checkStatus = statusCheckArray.some((s) => s === status);
  const checkPriority = priorityCheckArray.some((p) => p === priority);
  const checkCategory = categoryCheckArray.some((c) => c === category);

  if (checkStatus === false) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (!checkPriority) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (!checkCategory) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (requestBody.dueDate !== undefined && !isValid(new Date(dueDate))) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const updateTodoQuery = `
            UPDATE 
                todo
            SET 
                status = '${status}',
                priority = '${priority}',
                todo = '${todo}',
                category = '${category}',
                due_date = '${dueDate}'
            WHERE 
                id = ${todoId};
      `;
    await db.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  }
});

//API-6
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE FROM todo WHERE id = ${todoId}`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
