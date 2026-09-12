import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

import { compile, compileModule } from "svelte/compiler";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".svelte.ts")) {
      const filename = fileURLToPath(url);
      const raw_source = stripTypeScriptTypes(readFileSync(filename, "utf8"));
      const result = compileModule(raw_source, { filename });
      const source = `${result.js.code}\n//# sourceMappingURL=${result.js.map.toUrl()}`;
      return { format: "module", source, shortCircuit: true };
    }
    if (url.endsWith(".svelte")) {
      const filename = fileURLToPath(url);
      const raw_source = readFileSync(filename, "utf8");
      const result = compile(raw_source, { filename });
      const source = `${result.js.code}\n//# sourceMappingURL=${result.js.map.toUrl()}`;
      return { format: "module", source, shortCircuit: true };
    }

    return nextLoad(url, context);
  },
});
