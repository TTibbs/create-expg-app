#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import * as readline from "readline";

// CLI prompt for user input
function askQuestion(query: string): Promise<string> {
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
function createFileOrFolder(filePath: string, content: string = ""): void {
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
function initializeGitRepo(targetPath: string): void {
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
(async function main(): Promise<void> {
  console.log("Welcome to create-expg-server!");

  // Get the project name
  const projectName: string = await askQuestion("Project name: ");
  const authorName: string = await askQuestion("Author name: ");
  const hasGitHubRepo: string = (
    await askQuestion("Do you have a GitHub repository? (y/n) ")
  ).toLowerCase();
  if (hasGitHubRepo !== "y" && hasGitHubRepo !== "n") {
    console.error("Invalid input. Please enter 'y' or 'n'.");
    process.exit(1);
  }
  let repoUrl: string = "";
  if (hasGitHubRepo === "y") {
    repoUrl = await askQuestion("GitHub repository URL: ");
  }
  const isTypeScript: string = await askQuestion(
    "Do you want to use TypeScript? (y/n) "
  );
  if (isTypeScript !== "y" && isTypeScript !== "n") {
    console.error("Invalid input. Please enter 'y' or 'n'.");
    process.exit(1);
  }
  const targetPath: string = path.resolve(projectName);

  // Create the project folder
  console.log(`Creating project directory at ${targetPath}...`);
  fs.mkdirSync(targetPath, { recursive: true });

  // Define the folder and file structure
  const structure: { [key: string]: string } =
    isTypeScript === "y"
      ? {
          "package.json": `{
  "name": "${projectName}",
  "author": "${authorName}",
  "version": "1.0.0",
  "description": "Express app",
  "main": "listener.ts",
  "repository": {
    "type": "git",
    "url": "git+${repoUrl}.git"
  },
  "bugs": {
    "url": "${repoUrl}/issues"
  },
  "homepage": "${repoUrl}#readme",
  "keywords": [],
  "license": "MIT",
  "scripts": {
    "start": "ts-node listener.ts",
    "build": "tsc",
    "seed": "ts-node db/seeds/run-seed.ts"
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
    "@types/express": "^4.17.x",
    "@types/node": "^20.x.x",
    "@types/cors": "^2.8.x",
    "@types/pg": "^8.x.x",
    "@types/jest": "^27.x.x",
    "@types/supertest": "^2.x.x",
    "ts-node": "^10.x.x",
    "typescript": "^5.x.x",
    "ts-jest": "^29.x.x"
  },
  "jest": {
    "setupFilesAfterEnv": [
      "jest-extended/all",
      "jest-sorted"
    ]
  }
}`,
          "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES6",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "**/*.test.ts"]
}`,
          "__tests__/app.test.ts": `import app from '../app';
import request from 'supertest';
import db from '../db/connection';
import seed from '../db/seeds/seed';
import data from '../db/data/test-data/index';
import endpoints from '../endpoints.json';
require("jest-sorted");

beforeEach(() => seed(data));
afterAll(() => db.end());

// Build tests here
`,
          "db/data/test-data/index.ts": "// Test data",
          "db/seeds/seed.ts": "// Seed data logic here",
          "db/seeds/run-seed.ts": `import devData from "../data/development-data/index";
import seed from "../seeds/seed";
import db from "../connection";

const runSeed = () => {
  return seed(devData).then(() => db.end()); 
};

runSeed();
`,
          "db/connection.ts":
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
  
export default new Pool(config);
`,
          "db/setup.sql": `DROP DATABASE IF EXISTS test_db_name_here;
DROP DATABASE IF EXISTS db_name_here;

CREATE DATABASE test_db_name_here;
CREATE DATABASE db_name_here;`,
          "controllers/users-controller.ts": `import { Request, Response, NextFunction } from 'express';
import { selectUsers } from "../models/users-models";

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await selectUsers();
    res.status(200).send({ users });
  } catch (err) {
    next(err);
  }
};
`,
          "models/users-models.ts": `import db from "../db/connection";

exports.selectUsers = async () => {
  return db.query("SELECT * FROM users").then(({ rows }) => {
    return rows;
  });
};
`,
          "routes/users-router.ts": `const usersRouter = require("express").Router();
import { getUsers } from "../controllers/users-controller";

usersRouter.get("/", getUsers);

export default usersRouter;`,
          "routes/api-router.ts": `import express from "express";
const apiRouter = express.Router();
import usersRouter from "./users-router";
import endpoints from "../endpoints.json";

apiRouter.get("/", (req, res) => {
  res.status(200).send({ endpoints: endpoints });
});

apiRouter.use("/users", usersRouter);

module.exports = apiRouter;`,
          "app.ts": `import express from "express";
import cors from "cors";
import apiRouter from "./routes/api-router";
const app = express();
import { inputErrorHandler, psqlErrorHandler, customErrorHandler, serverErrorHandler } from "./errors";

app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);
app.use("/api/*", inputErrorHandler);
app.use(psqlErrorHandler);
app.use(customErrorHandler);
app.use(serverErrorHandler);

export default app;
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
          "listener.ts": `import app from "./app";
const { PORT = 9090 } = process.env;
app.listen(PORT, () => console.log("Listening on port", PORT));`,
          "errors/index.ts": `import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  status?: number;
  msg?: string;
}

exports.inputErrorHandler = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).send({ msg: "Invalid input" });
  next(err);
};

exports.psqlErrorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
  if (err.code === "23502" || err.code === "22P02" || err.code === "23503") {
    res.status(400).send({ msg: "Bad request" });
  } else next(err);
};

exports.customErrorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
  if (err.status && err.msg) {
    res.status(err.status).send({ msg: err.msg });
  } else next(err);
};

exports.serverErrorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
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
        }
      : {
          "package.json": `{
  "name": "${projectName}",
  "author": "${authorName}",
  "version": "1.0.0",
  "description": "Express app",
  "main": "listener.js",
  "repository": {
    "type": "git",
    "url": "git+${repoUrl}.git"
  },
  "bugs": {
    "url": "${repoUrl}/issues"
  },
  "homepage": "${repoUrl}#readme",
  "keywords": [],
  "license": "MIT",
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

  // Create the files and folders based on the structure
  for (const [filePath, content] of Object.entries(structure)) {
    const fullPath = path.join(targetPath, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  // Create a .gitignore file
  const gitignoreContent = `
node_modules/
.env.*
`;
  createFileOrFolder(
    path.join(targetPath, ".gitignore"),
    gitignoreContent.trim()
  );

  console.log("Project setup complete.");

  // Create the folder structure and files
  console.log("Creating project structure...");
  for (const [filePath, content] of Object.entries(structure)) {
    createFileOrFolder(path.join(targetPath, filePath), content);
  }

  // Initialize Git repository
  if (hasGitHubRepo === "y") {
    console.log("GitHub repository already exists.");
  } else {
    console.log("Creating a new GitHub repository...");
    initializeGitRepo(targetPath);
    execSync("git branch -M main", { cwd: targetPath, stdio: "inherit" });
  }

  if (isTypeScript === "y") {
    console.log("Setting up TypeScript...");
    execSync(
      "npm install --save-dev @types/express @types/express-serve-static-core @types/node"
    );
  }

  // Install dependencies
  console.log("Installing dependencies...");
  execSync("npm install", { cwd: targetPath, stdio: "inherit" });

  console.log(`\nSuccess! Your Express app is ready at ${targetPath}`);
})();

module.exports = { askQuestion, createFileOrFolder, initializeGitRepo };
