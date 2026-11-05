---
"octane": patch
---

Use @tsrx/oxc 0.24.0, which fixes type-aware consistent-return diagnostics on component bodies and resolves imported TSRX modules during partial TSRX lint runs.

Reset the editor compiler's type-only export parser state before later local declarations, preserving independent function scopes after a type re-export.
