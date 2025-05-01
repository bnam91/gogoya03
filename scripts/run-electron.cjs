// scripts/run-electron.js
const { spawn } = require("child_process");

const mode = process.argv[2] || "development";
const isWin = process.platform === "win32";

const env = {
  ...process.env,
  NODE_ENV: mode,
  CHARSET: "UTF-8",
  LANG: "ko_KR.UTF-8",
};

const command = isWin ? "cmd" : "electron";
const args = isWin
  ? ["/c", "chcp", "65001", "&&", "electron", "."]
  : ["."];

const child = spawn(command, args, {
  stdio: "inherit",
  env,
  shell: true,
});

child.on("exit", (code) => process.exit(code));
