/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { join, relative } from "node:path";
import { DotpromptEnvironment } from "../src/environment";
import assert from "node:assert";
import { DataArgument, JSONSchema, ToolDefinition } from "../src/types";

const specDir = join(__dirname, "..", "..", "spec");
const files = readdirSync(specDir, { recursive: true, withFileTypes: true });

interface SpecSuite {
  name: string;
  template: string;
  data?: DataArgument;
  schemas?: Record<string, JSONSchema>;
  tools?: Record<string, ToolDefinition>;
  tests: { desc?: string; data: DataArgument; expect: any; options: object }[];
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
          const env = new DotpromptEnvironment({
            schemas: s.schemas,
            tools: s.tools,
          });
          const result = env.render(s.template, { ...s.data, ...tc.data }, tc.options);
          assert.deepStrictEqual(result, { ...tc.expect, config: tc.expect.config || {} });
        });
      }
    }
  }
}
