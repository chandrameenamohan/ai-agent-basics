# Module 5: Coding Agent - Quiz

## Section 1: Edit Strategy (25 points)

### Question 1 (5 points)
Why is search-and-replace better than line-number editing for LLM-based agents?

A) It's faster to execute
B) LLMs are good with text but hallucinate line numbers
C) It uses less memory
D) It's easier to implement

**Answer:** B

---

### Question 2 (10 points)
Your edit tool receives:
```typescript
path: "utils.ts",
old_string: "return x;",
new_string: "return x * 2;"
```

The file contains:
```typescript
function calc(x) { return x; }
function double(x) { return x; }
```

What should the tool do and why?

**Answer:** The tool should return an error: "old_string found 2 times in utils.ts. Please include more context to make it unique."

**Why:** When `old_string` matches multiple times, the LLM's intent is ambiguous. We don't know which occurrence to replace. Requiring exactly one match forces the LLM to be specific by including more context (e.g., "function calc(x) { return x; }").

---

### Question 3 (5 points)
What does this code count?
```typescript
const occurrences = content.split(oldStr).length - 1;
```

A) The number of lines in the file
B) The number of words in old_string
C) The number of times old_string appears in content
D) The length of old_string

**Answer:** C

Explain the logic: If `content = "a b a"` and `oldStr = "a"`, then `split("a")` gives `["", " b ", ""]` with length 3. Since split creates n+1 parts for n occurrences, we subtract 1 to get 2 occurrences.

---

### Question 4 (5 points)
True or False: An empty `old_string` should always be rejected as invalid input.

A) True - empty strings are meaningless
B) False - empty old_string can be used to create new files

**Answer:** B

Explain: When a file is empty (new file), `old_string: ""` matches the empty content, allowing the tool to write the initial content. This lets `edit_file` double as a file creation tool.

---

## Section 2: System Prompt Design (25 points)

### Question 5 (10 points)
List the three most critical rules from the Eight Rules of Coding Agents:

**Answer:**
1. ALWAYS read a file before editing it
2. After making changes, verify by reading the file again
3. Make minimal, targeted changes (or: Think step-by-step / Understand root cause first)

These establish the read-edit-verify pattern and prevent destructive changes.

---

### Question 6 (5 points)
An agent keeps making large edits that change 50+ lines at once. Which rule is it violating?

A) Rule 1: Read before editing
B) Rule 4: Make minimal, targeted changes
C) Rule 6: Use search_grep
D) Rule 8: Follow existing code style

**Answer:** B

---

### Question 7 (10 points)
Why is "Think step-by-step" (Rule 3) important for coding agents? Describe the steps it should follow.

**Answer:**

The step-by-step approach prevents impulsive, poorly-planned changes. The steps are:

1. **Understand**: What is the user asking for?
2. **Explore**: What files are relevant?
3. **Plan**: What changes are needed?
4. **Implement**: Make the minimal necessary changes
5. **Verify**: Confirm the changes worked

This forces deliberation and ensures the agent doesn't jump straight to editing without understanding context.

---

## Section 3: The Read-Edit-Verify Pattern (20 points)

### Question 8 (10 points)
Put these steps in the correct order for the read-edit-verify pattern:

A) Verify by reading the file
B) Make the edit with edit_file
C) Search for context if needed
D) Read the file to see current state

**Answer:** D → C → B → A

1. Read the file to see current state
2. Search for context if needed
3. Make the edit with edit_file
4. Verify by reading the file

---

### Question 9 (10 points)
An agent edited a file but didn't verify. The edit had a typo that broke the code. How would following the read-edit-verify pattern have caught this?

**Answer:**

If the agent had read the file after editing (verify step), it would have seen the typo in the modified code. At that point, it could:
1. Recognize the error
2. Make another edit to fix the typo
3. Verify again

Without verification, the agent doesn't know if its edit was successful, and the error persists undetected until the code runs.

---

## Section 4: Error Handling (30 points)

### Question 10 (10 points)
Complete this error handling code:

```typescript
const occurrences = content.split(oldStr).length - 1;

if (occurrences === 0 && content === '') {
  // TODO: What should happen here?
}

if (occurrences === 0) {
  // TODO: What should happen here?
}

if (occurrences > 1) {
  // TODO: What should happen here?
}
```

**Answer:**
```typescript
const occurrences = content.split(oldStr).length - 1;

if (occurrences === 0 && content === '') {
  // Create new file
  await fs.writeFile(path, newStr, 'utf-8');
  return `Created new file: ${path}`;
}

if (occurrences === 0) {
  // old_string not found
  return `Error: old_string not found in ${path}`;
}

if (occurrences > 1) {
  // Multiple matches
  return `Error: old_string found ${occurrences} times in ${path}. ` +
         `Please include more context to make it unique.`;
}
```

---

### Question 11 (10 points)
Your agent gets this error:
```
Error: old_string found 3 times in calculator.ts. Please include more context to make it unique.
```

Describe the steps the agent should take to recover.

**Answer:**

1. **Re-read the file** to see all three occurrences
2. **Identify which occurrence** needs to be changed based on the user's request
3. **Add more context** to the `old_string` to make it unique:
   - Include surrounding lines (e.g., the function name, comments)
   - Include unique identifiers from that specific location
4. **Retry the edit** with the more specific `old_string`
5. **Verify** by reading the file after the successful edit

Example: Change `old_string: "return x;"` to `old_string: "function calculate(x) {\n  return x;\n}"`

---

### Question 12 (10 points)
Why should the edit tool return errors as strings instead of throwing exceptions?

**Answer:**

Returning errors as strings keeps the agent loop running. The LLM can:
1. **Read the error message** and understand what went wrong
2. **Adapt its approach** (e.g., add more context, re-read the file)
3. **Retry the operation** with corrected input
4. **Continue to completion** rather than crashing

If the tool threw an exception, the agent loop would crash and the task would fail, even though the LLM could have self-corrected given the error information.

---

## Bonus Questions (5 points each)

### Bonus Question 1
You're editing a file with this content:
```typescript
function test() {
  return x;
}
```

You want to change it to:
```typescript
function test() {
  return x * 2;
}
```

Write the exact `old_string` and `new_string` values, including all whitespace:

**Answer:**
```typescript
old_string: "function test() {\n  return x;\n}"
new_string: "function test() {\n  return x * 2;\n}"
```

Or with more minimal context:
```typescript
old_string: "  return x;"
new_string: "  return x * 2;"
```

(Second option is better - more surgical)

---

### Bonus Question 2
What's wrong with this edit?

```typescript
edit_file({
  path: "app.ts",
  old_string: "const API_URL = 'http://localhost:3000';\nconst DB_HOST = 'localhost';\nconst MAX_RETRIES = 3;",
  new_string: "const API_URL = 'https://api.prod.com';\nconst DB_HOST = 'prod.db.com';\nconst MAX_RETRIES = 5;"
})
```

**Answer:**

This edit changes too many things at once (API_URL, DB_HOST, and MAX_RETRIES). Better to make three separate edits:

1. Edit API_URL
2. Edit DB_HOST
3. Edit MAX_RETRIES

**Why better:**
- Each change can be verified independently
- If one fails, others aren't blocked
- Easier to see which change caused issues
- Follows Rule 7: "Work through steps one at a time"
- Follows Rule 4: "Make minimal, targeted changes"

---

## Scoring

- 90-100: Excellent understanding of edit patterns and agent design
- 80-89: Good grasp of concepts, minor gaps in error handling
- 70-79: Adequate understanding, review the read-edit-verify pattern
- Below 70: Review the module and focus on why search-and-replace works for LLMs

## Answer Key Summary

1. B
2. See detailed answer
3. C (with explanation)
4. B
5. See detailed answer
6. B
7. See detailed answer
8. D → C → B → A
9. See detailed answer
10. See detailed answer
11. See detailed answer
12. See detailed answer
Bonus 1: See detailed answer
Bonus 2: See detailed answer
