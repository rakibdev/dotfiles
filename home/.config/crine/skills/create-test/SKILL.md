---
name: create-test
---
Write one ultra-minimal test
- Max 1-2 assert
- Avoid duplicate: Must import functions from source, split+export if needed
- No decorative fixtures: If the bug repros with one line alone, don't add two
- Test name = what we test, not what it does
- Order: Add test first > run it to fail > apply fix > run again
