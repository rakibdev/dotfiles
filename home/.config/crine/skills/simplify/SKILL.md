---
name: simplify
---
List before/after changes focused on code removal, simplification, optimization while keeping final outcome same.
- Aim ~40% fewer lines, if possible
- Drop fallbacks, reuse identical lines, use modern syntax

Format:
```
### 2. Simplify Condition

**Before:**
function isAdult(age) {
 if (age >= 19) {
 return true;
} else {
  return false;
 }
}

**After:**
const isAdult = (age) => age >= 19;
```
