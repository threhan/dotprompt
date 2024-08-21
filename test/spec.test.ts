import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { join, relative, sep } from "node:path";
import { DotpromptEnvironment } from "../src/environment";
import assert from "node:assert";

const specDir = join(__dirname, "..", "spec");
const files = readdirSync(specDir, { recursive: true, withFileTypes: true });

interface SpecSuite {
  name: string;
  template: string;
  tests: { desc?: string; data: object; expect: object }[];
}

for (const file of files) {
  if (file.isDirectory()) {
    continue;
  }

  if (file.name.endsWith(".yaml")) {
    const suiteName = join(relative(specDir, file.path), file.name);
    const suites: SpecSuite[] = parse(readFileSync(join(file.path, file.name), "utf-8"));
    for (const s of suites) {
      for (const tc of s.tests) {
        test(`${suiteName} ${s.name} ${tc.desc}`, () => {
          const env = new DotpromptEnvironment();
          const result = env.render(s.template, tc.data);
          assert.deepStrictEqual(tc.expect, result);
        });
      }
    }
  }
}
