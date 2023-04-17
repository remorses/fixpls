#!/usr/bin/env ts-node

import { spawn } from "child_process";


console.log(process.argv);
// Get the command and its arguments from the command line arguments
const [command, ...args] = process.argv.slice(3);

// Check if the command is provided
if (!command) {
  console.error("Please provide a command to run after --");
  process.exit(1);
}

// Initialize variables to store stdout and stderr
let stdout = "";
let stderr = "";

// Spawn the command with its arguments
const childProcess = spawn(command, args, { stdio: ["inherit", "pipe", "pipe"] });

// Handle stdout
childProcess.stdout.on("data", (data) => {
  stdout += data.toString();
  process.stdout.write(data);
});

// Handle stderr
childProcess.stderr.on("data", (data) => {
  stderr += data.toString();
  process.stderr.write(data);
});

// Handle process exit
childProcess.on("exit", (code) => {
  console.log("\nProcess exited with code", code);
  console.log("stdout:", stdout);
  console.log("stderr:", stderr);
});