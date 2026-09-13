<!--
  @component
  A basic fullsize readonly editor that loads and displays the text document
  at the given URL.
-->
<script lang="ts">
  import { attach_editor } from "../codemirror/dom.ts";
  import type { CodemirrorBql } from "../codemirror/types.ts";
  import { fetch_text } from "../lib/fetch.ts";

  interface Props {
    /** Codemirror setup module */
    codemirror_bql: CodemirrorBql;
    /** The URL to load the editor contents from. */
    url: string;
  }

  let { url, codemirror_bql }: Props = $props();

  // svelte-ignore state_referenced_locally
  const editor = codemirror_bql.init_document_preview_editor();

  const set_editor_content = (value: string) => {
    if (value !== editor.state.sliceDoc()) {
      editor.dispatch(codemirror_bql.replace_contents(editor.state, value));
    }
  };

  $effect(() => {
    let active = true;
    const requested_url = url;
    fetch_text(requested_url).then(
      (text) => {
        if (active) {
          set_editor_content(text);
        }
      },
      () => {
        if (active) {
          set_editor_content(`Loading ${requested_url} failed...`);
        }
      },
    );
    return () => {
      active = false;
    };
  });
</script>

<div {@attach attach_editor(editor)}></div>

<style>
  div {
    width: 100%;
    height: 100%;
  }

  div :global(.cm-editor) {
    width: 100%;
    height: 100%;
  }
</style>
