const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");
jest.mock("fs");
jest.mock("child_process");
jest.mock("readline", () => ({
  createInterface: jest.fn().mockReturnValue({
    question: jest.fn((_, callback) => callback("Hello, World!")),
    close: jest.fn(),
  }),
}));
const {
  createFileOrFolder,
  initializeGitRepo,
  askQuestion,
} = require("../create-expg-server");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("File and Folder Creation", () => {
  test("creates a folder if the path ends with '/'", () => {
    const folderPath = "/";
    const content = "";
    createFileOrFolder(folderPath, content);
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.resolve(folderPath), {
      recursive: true,
    });
  });
  test("creates a file with the specified content", () => {
    const filePath = "test-folder/test-file.js";
    const fileContent = "console.log('test');";
    createFileOrFolder(filePath, fileContent);
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.dirname(path.resolve(filePath)),
      { recursive: true }
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.resolve(filePath),
      fileContent
    );
  });
  test("creates a deeply nested file", () => {
    const filePath =
      "test-folder/nested-folder/second-nest/third-nest/test file.js";
    const fileContent = "console.log('test');";
    createFileOrFolder(filePath, fileContent);
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.dirname(path.resolve(filePath)),
      { recursive: true }
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.resolve(filePath),
      fileContent
    );
  });
  test("creates a file with no content", () => {
    const filePath = "test-folder/test-file.js";
    createFileOrFolder(filePath);
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.dirname(path.resolve(filePath)),
      { recursive: true }
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(path.resolve(filePath), "");
  });
  test("should create a file into a folder that already exists", () => {
    const filePath = "test-folder/test-files.js";
    const filePathTwo = "test-folder/test-file-two.js";
    fs.existsSync.mockReturnValueOnce(true);
    createFileOrFolder(filePath, "console.log('test');");
    createFileOrFolder(filePathTwo, "console.log('test');");
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.dirname(path.resolve(filePath)),
      { recursive: true }
    );
    expect(fs.mkdirSync).toHaveBeenCalledTimes(1);
  });
  test("should not create a file if one with the same name already exists", () => {
    const filePath = "test-folder/test-file.js";
    fs.existsSync.mockReturnValue(true);
    createFileOrFolder(filePath, "console.log('test');");
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe("initializeGitRepo", () => {
  test("initialises a git repository", () => {
    const targetPath = "/path/to/project";
    initializeGitRepo(targetPath);
    expect(execSync).toHaveBeenCalledWith("git init", {
      cwd: targetPath,
      stdio: "inherit",
    });
  });
});

describe("askQuestion", () => {
  let rl;
  beforeEach(() => {
    rl = {
      question: jest.fn(),
      close: jest.fn(),
    };
    readline.createInterface.mockReturnValue(rl);
  });

  test("resolves with the user's input", async () => {
    const answer = "Hello, World!";
    rl.question.mockImplementation((_, callback) => {
      callback(answer);
    });
    const result = await askQuestion("What is your name?");
    expect(readline.createInterface).toHaveBeenCalledWith({
      input: process.stdin,
      output: process.stdout,
    });
    expect(rl.question).toHaveBeenCalledWith(
      "What is your name?",
      expect.any(Function)
    );
    expect(rl.close).toHaveBeenCalled();
    expect(result).toBe(answer);
  });
});
