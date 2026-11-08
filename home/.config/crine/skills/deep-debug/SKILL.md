---
name: deep-debug
---
1. Ask 1-3 questions to narrow scope
2. List ranked suspects with how you'd check each
3. Once user picks, isolate test e.g. `bun -e` in project dir (resolves node_modules, .env), or add logs user reports back
4. Explain cause (actual vs expected example) and propose ranked solution
5. Apply fix
6. After user confirms working, revert logs and previous failed fixes. If still happens then restart step 1

Skip any step if inapplicable
