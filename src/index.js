// src/index.js
// Zero‑dependency CLI for parsing, serializing, and scraping data.
// Uses only built‑in Node.js modules and native ANSI escape codes for colourful output.

import { readFile, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { request } from "node:https";
import { stdout, exit, argv } from "node:process";

/** ANSI colour helpers */
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m"
};

/**
 * Parse raw string data into a JavaScript object.
 * @param {string} raw - Input data as string.
 * @param {"json"|"csv"|"tsv"} format - Expected format.
 * @returns {object|Array<any>} Parsed representation.
 */
export function parseData(raw, format) {
  if (format === "json") {
    return JSON.parse(raw);
  }
  if (format === "csv" || format === "tsv") {
    const delimiter = format === "csv" ? "," : "\t";
    const [headerLine, ...rows] = raw.trim().split(/\r?\n/);
    const headers = headerLine.split(delimiter).map(h => h.trim());
    return rows.map(r => {
      const values = r.split(delimiter).map(v => v.trim());
      const obj = {};
      headers.forEach((h, i) => (obj[h] = values[i]));
      return obj;
    });
  }
  throw new Error(`Unsupported format: ${format}`);
}

/**
 * Serialize a JavaScript object/array into a string.
 * @param {object|Array<any>} data - Data to serialize.
 * @param {"json"|"csv"|"tsv"} format - Desired output format.
 * @returns {string} Serialized string.
 */
export function serializeData(data, format) {
  if (format === "json") {
    return JSON.stringify(data, null, 2);
  }
  if (format === "csv" || format === "tsv") {
    const delimiter = format === "csv" ? "," : "\t";
    const rows = Array.isArray(data) ? data : [data];
    const headers = Object.keys(rows[0] || {});
    const headerLine = headers.join(delimiter);
    const bodyLines = rows
      .map(row => headers.map(h => row[h] ?? "").join(delimiter))
      .join("\n");
    return `${headerLine}\n${bodyLines}`;
  }
  throw new Error(`Unsupported format: ${format}`);
}

/**
 * Perform a minimal HTTP GET request and return the raw body.
 * @param {string} url - Target URL (must be https).
 * @returns {Promise<string>} Response body.
 */
export function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = request(url, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.end();
  });
}

/**
 * Very small HTML scraper – extracts text between a simple tag or attribute.
 * Works without external parsers; suitable for quick one‑off extracts.
 * @param {string} html - Raw HTML string.
 * @param {RegExp} pattern - RegExp with a capturing group for the desired value.
 * @returns {string|null} First match or null.
 */
export function scrapePattern(html, pattern) {
  const match = pattern.exec(html);
  return match ? match[1] : null;
}

/** Helper to print colourful status messages */
function logStatus(message, type = "info") {
  const colour = {
    info: colors.cyan,
    success: colors.green,
    error: colors.red,
    warn: colors.yellow
  }[type] || colors.cyan;
  stdout.write(`${colour}${message}${colors.reset}\n`);
}

/** CLI entry point */
async function main() {
  const [, , command, ...args] = argv;
  if (!command) {
    logStatus("Usage: swift-parse-scrape <parse|serialize|scrape> [options]", "error");
    exit(1);
  }

  try {
    switch (command) {
      case "parse": {
        const [format, file] = args;
        if (!format || !file) throw new Error("parse <json|csv|tsv> <file>");
        const raw = await readFile(file, "utf8");
        const data = parseData(raw, format);
        logStatus(`${colors.bold}Parsed ${format.toUpperCase()} (${file}):${colors.reset}`);
        stdout.write(JSON.stringify(data, null, 2) + "\n");
        break;
      }
      case "serialize": {
        const [format, inputFile, outputFile] = args;
        if (!format || !inputFile || !outputFile) throw new Error("serialize <json|csv|tsv> <input> <output>");
        const raw = await readFile(inputFile, "utf8");
        const data = JSON.parse(raw);
        const serialized = serializeData(data, format);
        await writeFile(outputFile, serialized, "utf8");
        logStatus(`${colors.bold}Serialized to ${format.toUpperCase()} → ${outputFile}${colors.reset}`, "success");
        break;
      }
      case "scrape": {
        const [url, regex] = args;
        if (!url || !regex) throw new Error("scrape <https://...> <regex>");
        const html = await fetchUrl(url);
        const pattern = new RegExp(regex, "s");
        const result = scrapePattern(html, pattern);
        if (result) {
          logStatus(`${colors.bold}Scrape result:${colors.reset} ${result}`, "success");
        } else {
          logStatus("No match found.", "warn");
        }
        break;
      }
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (e) {
    logStatus(`Error: ${e.message}`, "error");
    exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
