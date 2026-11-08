---
name: create-test
---
Test Rules:
- One topic = 1 test and 1 assert
- Don't duplicate logic. Import from source, split/export if needed
- No decorative fixtures: If the bug repros with 1 line, don't add 2
- Test highest level functions, not internals that may change
- Test name:
 * Why or what we test, not what it does
 * Conversational style: "clicking search icon shows input", not "toggler reveals input"
- Order: Write test > run to fail > apply fix if user approved > run again
