// An isolated Next app using the real components and synthetic props. No .env or auth.
import {
  mkdir,
  readFile,
  writeFile,
  symlink,
  copyFile,
  mkdtemp,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
const root = process.cwd();
const dir = await mkdtemp(path.join(tmpdir(), "pointed-ui-"));
await mkdir(path.join(dir, "src/app"), { recursive: true });
await symlink(path.join(root, "node_modules"), path.join(dir, "node_modules"));
await symlink(path.join(root, "public"), path.join(dir, "public"));
for (const name of ["components", "lib"])
  await symlink(path.join(root, "src", name), path.join(dir, "src", name));
for (const name of ["tsconfig.json", "postcss.config.mjs"])
  await copyFile(path.join(root, name), path.join(dir, name));
await writeFile(
  path.join(dir, "package.json"),
  JSON.stringify({
    private: true,
    dependencies: JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).dependencies,
  }),
);
for (const name of ["layout.tsx", "globals.css"])
  await copyFile(
    path.join(root, "src/app", name),
    path.join(dir, "src/app", name),
  );
const demo = await readFile(path.join(root, "src/app/demo/page.tsx"), "utf8");
await writeFile(
  path.join(dir, "src/fixture.ts"),
  demo
    .slice(0, demo.indexOf("export default async"))
    .replace('import { LiveRoom } from "@/components/LiveRoom";', "")
    .replace("const demoSnapshot", "export const demoSnapshot"),
);
await copyFile(
  path.join(root, "tests/fixtures/page.tsx"),
  path.join(dir, "src/app/page.tsx"),
);
const child = spawn(
  path.join(root, "node_modules/.bin/next"),
  ["dev", "--webpack", "--port", "3005", "--hostname", "127.0.0.1"],
  {
    cwd: dir,
    stdio: "inherit",
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: "development",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
