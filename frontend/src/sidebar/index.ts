/**
 * This script initialises the AsideWithButton.svelte component.
 */

import { mount } from "svelte";
import { derived } from "svelte/store";

import Modals from "../modals/Modals.svelte";
import { ledger_title } from "../stores/options.ts";
import HeaderAndAside from "./HeaderAndAside.svelte";
import { page_title } from "./page-title.ts";

export function init_sidebar(): void {
  derived(
    [page_title, ledger_title],
    ([{ title }, ledger]) => `${title} - ${ledger}`,
  ).subscribe((title) => {
    document.title = title;
  });

  const anchor = document.querySelector("article");
  mount(
    HeaderAndAside,
    anchor ? { target: document.body, anchor } : { target: document.body },
  );

  mount(Modals, {
    target: document.body,
  });
}
