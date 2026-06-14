---
name: simplify
---
Recommend list of changes focused on code removal, simplification, and optimization while keeping functionally equivalent.

- Present "Before" and "After" code blocks with short explanation why
- Remove redundant fallbacks
- Reuse identical functions

<output-example>
### 2. Simplify Condition

**Before:**
```javascript
function isAdult(age) {
if (age >= 19) {
return true;
} else {
return false;
}
}
```

**After:**
```javascript
const isAdult = (age) => age >= 19;
```
</output-example>
