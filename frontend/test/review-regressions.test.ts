import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";
import { setImmediate } from "node:timers/promises";

import { EditorState, type TransactionSpec } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { flushSync, mount, unmount } from "svelte";
import { get } from "svelte/store";

import SaveButton from "../src/editor/SaveButton.svelte";
import { EntryMetadata } from "../src/entries/index.ts";
import { get_url_path } from "../src/helpers.ts";
import { fuzzytest, fuzzywrap } from "../src/lib/fuzzy.ts";
import { escape_for_regex } from "../src/lib/regex.ts";
import { local_storage_synced_store } from "../src/lib/store.ts";
import { string } from "../src/lib/validation.ts";
import EntryContextBalances from "../src/modals/EntryContextBalances.svelte";
import { query_table_validator } from "../src/reports/query/query_table.ts";
import { Sorter, StringColumn } from "../src/sort/index.ts";
import SortHeader from "../src/sort/SortHeader.svelte";
import { base_url } from "../src/stores/index.ts";
import { setup_jsdom } from "./dom.ts";
import { initialise_ledger_data } from "./helpers.ts";

test.before(initialise_ledger_data);
test.beforeEach(setup_jsdom);

test("metadata renames preserve both values on a collision", () => {
  const meta = new EntryMetadata({ first: "one", second: "two" });
  equal(meta.update_key("first", "second"), meta);
  deepEqual(meta.update_key("first", "third").toJSON(), {
    third: "one",
    second: "two",
  });
});

test("editing numeric metadata preserves numbers and string identifiers", () => {
  const meta = new EntryMetadata({ amount: 12, reference: "0012" });
  equal(meta.set_string("amount", "12.5").get("amount"), 12.5);
  equal(meta.set_string("amount", "-2e3").get("amount"), -2000);
  equal(meta.set_string("reference", "0013").get("reference"), "0013");
  equal(
    meta.set_string("amount", "ordinary text").get("amount"),
    "ordinary text",
  );
});

test("fuzzy matching handles separated Unicode code points", () => {
  ok(fuzzytest("😀b", "😀--b"));
  deepEqual(fuzzywrap("😀b", "😀--b"), [
    ["match", "😀"],
    ["text", "--"],
    ["match", "b"],
  ]);
  equal(fuzzytest("😀x", "😀--b"), 0);
});

test("malformed URL encoding returns an error result", () => {
  const prefix = get(base_url);
  ok(prefix);
  ok(get_url_path({ pathname: `${prefix}%broken` }).is_err);
  equal(get_url_path({ pathname: `${prefix}%41` }).unwrap(), "A");
});

test("query rows must match the declared column count", () => {
  const types = [{ name: "Name", dtype: "str" }];
  ok(query_table_validator({ types, rows: [["valid"]] }).is_ok);
  ok(query_table_validator({ types, rows: [[]] }).is_err);
  ok(query_table_validator({ types, rows: [["first", "extra"]] }).is_err);
});

test("FQL regex escaping keeps quotes inside the token", () => {
  const payee = 'A "quoted" shop (east)\\branch';
  const escaped = escape_for_regex(payee);
  equal(escaped.includes('"'), false);
  ok(new RegExp(`^${escaped}$`).test(payee));
  equal(new RegExp(`^${escaped}$`).test("other shop"), false);
});

test("local stores allow non-reserved fava prefixes", () => {
  const store = local_storage_synced_store(
    "favorite-accounts",
    string,
    () => "Assets",
  );
  equal(store.key, "fava-favorite-accounts");
});

test("context balances render accounts present on only one side", async () => {
  const component = mount(EntryContextBalances, {
    target: document.body,
    props: {
      balances_before: { Assets: ["1 AUD"] },
      balances_after: { Expenses: ["2 AUD"] },
    },
  });
  flushSync();
  equal(document.querySelectorAll("tbody tr").length, 2);
  await unmount(component);
});

test("save button ignores clicks while saving", async () => {
  const form = document.createElement("form");
  document.body.append(form);
  let submissions = 0;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submissions += 1;
  });
  const component = mount(SaveButton, {
    target: form,
    props: { changed: true, saving: true },
  });
  flushSync();
  const button = form.querySelector("button");
  ok(button);
  equal(button.disabled, true);
  button.click();
  equal(submissions, 0);
  await unmount(component);
});

test("sortable Svelte headers expose a native keyboard control", async () => {
  const table = document.createElement("table");
  const row = table.createTHead().insertRow();
  document.body.append(table);
  const column = new StringColumn<string>("Name", (value) => value);
  const component = mount(SortHeader, {
    target: row,
    props: { column, sorter: new Sorter(column, "asc") },
  });
  flushSync();
  const button = row.querySelector("button");
  ok(button);
  equal(button.type, "button");
  button.click();
  flushSync();
  equal(row.querySelector("th")?.dataset.order, "desc");
  await unmount(component);
});

test("static tables sort the physical column after an unsortable header", async () => {
  const sortable = await import("../src/sort/sortable-table.ts");
  document.body.innerHTML =
    '<table is="review-sortable"><thead><tr><th>First</th><th data-sort="string">Second</th></tr></thead><tbody><tr><td>A</td><td>Z</td></tr><tr><td>Z</td><td>A</td></tr></tbody></table>';
  customElements.define("review-sortable", sortable.SortableTable, {
    extends: "table",
  });
  const button = document.querySelector("th button");
  ok(button instanceof HTMLButtonElement);
  equal(button.tabIndex, 0);
  button.click();
  equal(document.querySelector("tbody tr td:nth-child(2)")?.textContent, "A");
});

test("late formatting preserves newer editor text", async (t) => {
  const { beancount_format } = await import(
    "../src/codemirror/beancount-format.ts"
  );
  for (const edited of [false, true]) {
    const response = Promise.withResolvers<Response>();
    const fetch_mock = t.mock.method(
      globalThis,
      "fetch",
      async () => response.promise,
    );
    const editor = {
      state: EditorState.create({ doc: "original" }),
      dispatch(spec: TransactionSpec) {
        this.state = this.state.update(spec).state;
      },
    };
    beancount_format(editor as EditorView);
    if (edited) {
      editor.state = EditorState.create({ doc: "newer edit" });
    }
    response.resolve(Response.json({ data: "formatted" }));
    await setImmediate();
    equal(editor.state.sliceDoc(), edited ? "newer edit" : "formatted");
    fetch_mock.mock.restore();
  }
});

test("suggestions reload the newest mtime after an in-flight request", async (t) => {
  const { fetch_payee_accounts } = await import(
    "../src/entry-forms/suggestions.svelte.ts"
  );
  const responses = [
    Promise.withResolvers<Response>(),
    Promise.withResolvers<Response>(),
  ];
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    const response = responses[requests++];
    ok(response);
    return response.promise;
  });
  const data = fetch_payee_accounts(1n, "Review coalescer");
  fetch_payee_accounts(2n, "Review coalescer");
  equal(requests, 1);
  responses[0]?.resolve(Response.json({ data: ["Old"] }));
  await setImmediate();
  equal(requests, 2);
  responses[1]?.resolve(Response.json({ data: ["New"] }));
  await setImmediate();
  deepEqual(data.data, ["New"]);
  fetch_payee_accounts(2n, "Review coalescer");
  equal(requests, 2);
});
