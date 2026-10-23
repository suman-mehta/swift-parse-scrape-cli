// test/index.test.js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseData, serializeData, scrapePattern } from "../src/index.js";

describe("parseData", () => {
  test("parses JSON correctly", () => {
    const raw = '{"name":"Alice","age":30}';
    const out = parseData(raw, "json");
    assert.deepEqual(out, { name: "Alice", age: 30 });
  });

  test("parses CSV correctly", () => {
    const raw = "id,name\n1,Bob\n2,Carol";
    const out = parseData(raw, "csv");
    assert.deepEqual(out, [
      { id: "1", name: "Bob" },
      { id: "2", name: "Carol" }
    ]);
  });
});

describe("serializeData", () => {
  test("serializes to JSON", () => {
    const data = { foo: "bar", count: 5 };
    const out = serializeData(data, "json");
    assert.equal(out, JSON.stringify(data, null, 2));
  });

  test("serializes to CSV", () => {
    const data = [{ id: 1, val: "A" }, { id: 2, val: "B" }];
    const out = serializeData(data, "csv");
    const expected = "id,val\n1,A\n2,B";
    assert.equal(out, expected);
  });
});

describe("scrapePattern", () => {
  test("extracts with regex", () => {
    const html = "<title>Example Domain</title>";
    const result = scrapePattern(html, /<title>(.*?)<\/title>/);
    assert.equal(result, "Example Domain");
  });
});
