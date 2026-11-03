// Creates a login line for AUTH_USERS.
//   npm run add-user -- alice
// You'll be asked for the password twice (typing is hidden).
import readline from "node:readline";
import { hashPassword, isValidUsername } from "../lib/auth.mjs";

const name = process.argv[2];
if (!isValidUsername(name)) {
  console.error("Usage: npm run add-user -- <username>");
  console.error("Username: 2–40 characters, letters, numbers, dot, dash or underscore.");
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    rl._writeToOutput = (s) => {
      if (!muted) rl.output.write(s);
      else if (s.includes("\n") || s.includes("\r")) rl.output.write("\n");
      else rl.output.write("*");
    };
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

const pass = await askHidden(`Password for ${name}: `);
const again = await askHidden("Repeat password: ");

if (pass !== again) {
  console.error("\nPasswords don't match.");
  process.exit(1);
}
if (pass.length < 10) {
  console.error("\nUse at least 10 characters.");
  process.exit(1);
}

const { salt, hash } = hashPassword(pass);
console.log("\nAdd this to AUTH_USERS (separate several users with commas):\n");
console.log(`${name}:${salt}:${hash}\n`);
