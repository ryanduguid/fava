<!--
  @component
  A sub-item in an app menu.
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** A title (optional) for the element. */
    title?: string;
    /** Whether this menu item should be marked as selected. */
    selected?: boolean;
    /** The action to execute on click. */
    action: () => void;
    children: Snippet;
    right?: Snippet;
  }

  let { title, selected = false, action, children, right }: Props = $props();
</script>

<li role="presentation">
  <button
    type="button"
    class="unset"
    class:selected
    {title}
    role="menuitem"
    onclick={action}
  >
    {@render children()}
    {#if right}
      <span>
        {@render right()}
      </span>
    {/if}
  </button>
</li>

<style>
  .selected::before {
    content: "›";
  }

  button {
    width: 100%;
    padding: 0.25em 0.5em;
  }

  span {
    float: right;
  }

  button:hover,
  button:focus-visible {
    background-color: var(--background-darkest);
  }
</style>
