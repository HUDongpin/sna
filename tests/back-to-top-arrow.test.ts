import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { getScrollProgress } from "../components/BackToTopArrow";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

function read(relativePath: string) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

test("scroll progress uses the full scrollable page depth", () => {
  assert.equal(getScrollProgress({ scrollTop: 0, scrollHeight: 1600, clientHeight: 800 }), 0);
  assert.equal(getScrollProgress({ scrollTop: 400, scrollHeight: 1600, clientHeight: 800 }), 50);
  assert.equal(getScrollProgress({ scrollTop: 800, scrollHeight: 1600, clientHeight: 800 }), 100);
  assert.equal(getScrollProgress({ scrollTop: 1200, scrollHeight: 1600, clientHeight: 800 }), 100);
  assert.equal(getScrollProgress({ scrollTop: -40, scrollHeight: 1600, clientHeight: 800 }), 0);
  assert.equal(getScrollProgress({ scrollTop: 40, scrollHeight: 700, clientHeight: 800 }), 0);
});

test("back-to-top ring starts at twelve o'clock and advances clockwise", () => {
  const component = read("components/BackToTopArrow.tsx");
  const styles = read("app/globals.css");

  assert.match(component, /data-page-scroll-progress/);
  assert.match(component, /pathLength="100"/);
  assert.match(component, /strokeDasharray="100"/);
  assert.match(component, /strokeDashoffset="100"/);
  assert.match(component, /transform="rotate\(-90 24 24\)"/);
  assert.match(styles, /animation-timeline:\s*scroll\(root block\)/);
  assert.match(styles, /from\s*{\s*stroke-dashoffset:\s*100;/);
  assert.match(styles, /to\s*{\s*stroke-dashoffset:\s*0;/);
});
