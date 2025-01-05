#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const readline = require("readline");

// CLI prompt for user input
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

// Helper to create a file or folder
function createFileOrFolder(filePath, content = "") {
  const fullPath = path.resolve(filePath);
  const isDirectory = fullPath.endsWith("/") || fullPath.endsWith(path.sep);

  if (fs.existsSync(fullPath)) {
    console.log(`File or folder already exists at ${fullPath}`);
    return;
  }

  if (isDirectory) {
    fs.mkdirSync(fullPath, { recursive: true });
  } else {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
}

// Initialize Git Repository
function initializeGitRepo(targetPath) {
  console.log("Initializing git repository...");
  execSync("git init", { cwd: targetPath, stdio: "inherit" });

  // Optionally, create a .gitignore file to exclude node_modules and environment files
  const gitignoreContent = `
node_modules/
.env.*
  `;
  createFileOrFolder(
    path.join(targetPath, ".gitignore"),
    gitignoreContent.trim()
  );
  console.log("Git repository initialized with a .gitignore file.");
}

// Main script
(async function main() {
  console.log("Welcome to create-express-app!");

  // Get the project name
  const projectName = await askQuestion("Project name: ");
  const targetPath = path.resolve(projectName);

  // Create the project folder
  console.log(`Creating project directory at ${targetPath}...`);
  fs.mkdirSync(targetPath, { recursive: true });

  // Define the folder and file structure
  const structure = {
    "package.json": `{
  "name": "${projectName}",
  "author": "your_name",
  "version": "1.0.0",
  "description": "Express app",
  "main": "listener.js",
  "repository": {
    "type": "git",
    "url": "your_repo_url"
  },
  "bugs": {
    "url": "your_github_issues_url"
  },
  "scripts": {
    "start": "node listener.js",
    "setup-dbs": "psql -f db/setup.sql",
    "seed": "node db/seeds/run-seed.js",
    "seed-prod": "NODE_ENV=production npm run seed",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.21.1",
    "pg": "^8.7.3",
    "pg-format": "^1.0.4",
    "dotenv": "^16.0.0",
    "cors": "^2.8.5",
    "nodemon": "^3.1.7"
  },
  "devDependencies": {
    "jest": "^27.5.1",
    "jest-extended": "^2.0.0",
    "jest-sorted": "^1.0.15",
    "supertest": "^7.0.0"
  },
  "jest": {
    "setupFilesAfterEnv": [
      "jest-extended/all",
      "jest-sorted"
    ]
  }
}`,
    "__tests__/app.test.js": `const app = require("../app.js");
const request = require("supertest");
const db = require("../db/connection.js");
const seed = require("../db/seeds/seed.js");
const data = require("../db/data/test-data/index.js");
const endpoints = require("../endpoints.json");
require("jest-sorted");

beforeEach(() => seed(data));
afterAll(() => db.end());

// Build tests here
`,
    "db/data/test-data/index.js": "// Test data",
    "db/seeds/seed.js": "// Seed data logic here",
    "db/seeds/run-seed.js": `const devData = require("../data/development-data/index.js");
const seed = require("../seeds/seed.js");
const db = require("../connection.js");

const runSeed = () => {
  return seed(devData).then(() => db.end()); 
};

runSeed();
`,
    "db/connection.js":
      `const { Pool } = require("pg");
const ENV = process.env.NODE_ENV || "development";

require("dotenv").config({
  path: path.resolve(__dirname, ` +
      "`../../.env.${ENV}`" +
      `),
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable must be set");
}
  
const config = {}

if (ENV === "production") {
  config.connectionString = process.env.DATABASE_URL;
  config.max = 2;
}
  
module.exports = new Pool(config);
`,
    "db/setup.sql": `DROP DATABASE IF EXISTS test_db_name_here;
DROP DATABASE IF EXISTS db_name_here;

CREATE DATABASE test_db_name_here;
CREATE DATABASE db_name_here;`,
    "controllers/users-controller.js": `const { selectUsers } = require("../models/users-models.js");

exports.getUsers = (req, res, next) => {
  selectUsers()
    .then((users) => {
      res.status(200).send({ users });
    })
    .catch((err) => {
      next(err);
    });
};
`,
    "models/users-models.js": `const db = require("../db/connection.js");

exports.selectUsers = async () => {
  return db.query("SELECT * FROM users").then(({ rows }) => {
    return rows;
  });
};
`,
    "routes/users-router.js": `const usersRouter = require("express").Router();
const { getUsers } = require("../controllers/users-controller.js");

usersRouter.get("/", getUsers);

module.exports = usersRouter;`,
    "routes/api-router.js": `const express = require("express");
const apiRouter = express.Router();
const usersRouter = require("./users-router.js");
const endpoints = require("../endpoints.json");

apiRouter.get("/", (req, res) => {
  res.status(200).send({ endpoints: endpoints });
});

apiRouter.use("/users", usersRouter);

module.exports = apiRouter;`,
    "app.js": `const express = require("express");
const cors = require("cors");
const apiRouter = require("./routes/api-router.js");
const app = express();
const { 
  inputErrorHandler,
  psqlErrorHandler,
  customErrorHandler,
  serverErrorHandler, 
} = require("./errors");

app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);
app.use("/api/*", inputErrorHandler);
app.use(psqlErrorHandler);
app.use(customErrorHandler);
app.use(serverErrorHandler);

module.exports = app;
`,
    "endpoints.json": `{
  "GET /api": {
    "description": "serves up a json representation of all the available endpoints of the api"
  },
  "GET /api/users": {
    "description": "Returns an array of users with the username, name and avatar url",
    "exampleResponse": [
      {
        "username": "10x engineer",
        "name": "Theo"
      }
    ]
  }
}`,
    "listener.js": `const app = require("./app.js");
const { PORT = 9090 } = process.env;
app.listen(PORT, () => console.log("Listening on port", PORT));`,
    "errors/index.js": `exports.inputErrorHandler = (req, res, next) => {
  res.status(404).send({ msg: "Invalid input" });
  next(err);
};

exports.psqlErrorHandler = (err, req, res, next) => {
  if (err.code === "23502" || err.code === "22P02" || err.code === "23503") {
    res.status(400).send({ msg: "Bad request" });
  } else next(err);
};

exports.customErrorHandler = (err, req, res, next) => {
  if (err.status && err.msg) {
    res.status(err.status).send({ msg: err.msg });
  } else next(err);
};

exports.serverErrorHandler = (err, req, res, next) => {
  console.log(err, "<<<<<< ------ Unhandled error");
  res.status(500).send({ msg: "Internal server error" });
};
`,
    ".env.production": "DATABASE_URL=your_production_db_url",
    ".env.test": "PGDATABASE=your_test_db_name",
    ".env.development": "PGDATABASE=your_db_name",
    ".env-example": `PGDATABASE=your_db_name
PGDATABASE=your_test_db_name
DATABASE_URL=your_production_db_url
`,
  };

  // Create the folder structure and files
  console.log("Creating project structure...");
  for (const [filePath, content] of Object.entries(structure)) {
    createFileOrFolder(path.join(targetPath, filePath), content);
  }

  // Initialize Git repository
  initializeGitRepo(targetPath);
  execSync("git branch -M main", { cwd: targetPath, stdio: "inherit" });

  // Install dependencies
  console.log("Installing dependencies...");
  execSync("npm install", { cwd: targetPath, stdio: "inherit" });

  console.log(`\nSuccess! Your Express app is ready at ${targetPath}`);
})();

module.exports = { askQuestion, createFileOrFolder, initializeGitRepo };
