import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { join, relative, sep } from "node:path";
import { DotpromptEnvironment } from "../src/environment";
import assert from "node:assert";

const specDir = join(__dirname, "..", "..", "spec");
const files = readdirSync(specDir, { recursive: true, withFileTypes: true });

interface SpecSuite {
  name: string;
  template: string;
  data?: object;
  tests: { desc?: string; data: object; expect: object; options: object }[];
}

for (const file of files) {
  if (file.isDirectory()) {
    continue;
  }

  if (file.name.endsWith(".yaml")) {
    const suiteName = join(relative(specDir, file.path), file.name.replace(/\.yaml$/, ""));
    const suites: SpecSuite[] = parse(readFileSync(join(file.path, file.name), "utf-8"));
    for (const s of suites) {
      for (const tc of s.tests) {
        test(`${suiteName} ${s.name} ${tc.desc}`, () => {
          const env = new DotpromptEnvironment();
          const result = env.render(s.template, { ...s.data, ...tc.data }, tc.options);
          assert.deepStrictEqual(result, { ...tc.expect, config: tc.expect.config || {} });
        });
      }
    }
  }
}
