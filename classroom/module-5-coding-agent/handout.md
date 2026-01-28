# Module 5: Coding Agent - Handout

## edit_file Tool Schema

### TypeScript
```typescript
{
  name: "edit_file",
  description: "Replace old_string with new_string in a file. old_string must match exactly once.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file to edit"
      },
      old_string: {
        type: "string",
        description: "The exact text to replace (must match exactly once)"
      },
      new_string: {
        type: "string",
        description: "The text to replace it with"
      }
    },
    required: ["path", "old_string", "new_string"]
  }
}
```

## Core Edit Logic

### TypeScript
```typescript
async function editFile(path: string, oldStr: string, newStr: string): Promise<string> {
  const content = await fs.readFile(path, 'utf-8');

  // Count occurrences
  const occurrences = content.split(oldStr).length - 1;

  // Special case: create new file
  if (occurrences === 0 && content === '') {
    await fs.writeFile(path, newStr, 'utf-8');
    return `Created new file: ${path}`;
  }

  // Validate: exactly one match
  if (occurrences === 0) {
    return `Error: old_string not found in ${path}`;
  }

  if (occurrences > 1) {
    return `Error: old_string found ${occurrences} times in ${path}. ` +
           `Please include more context to make it unique.`;
  }

  // Perform replacement
  const updated = content.replace(oldStr, newStr);
  await fs.writeFile(path, updated, 'utf-8');

  return `Successfully edited ${path}`;
}
```

### Python
```python
def edit_file(path: str, old_str: str, new_str: str) -> str:
    with open(path, 'r') as f:
        content = f.read()

    # Count occurrences
    occurrences = content.count(old_str)

    # Special case: create new file
    if occurrences == 0 and content == '':
        with open(path, 'w') as f:
            f.write(new_str)
        return f'Created new file: {path}'

    # Validate: exactly one match
    if occurrences == 0:
        return f'Error: old_string not found in {path}'

    if occurrences > 1:
        return (f'Error: old_string found {occurrences} times in {path}. '
                f'Please include more context to make it unique.')

    # Perform replacement
    updated = content.replace(old_str, new_str)
    with open(path, 'w') as f:
        f.write(updated)

    return f'Successfully edited {path}'
```

## The Eight Rules (System Prompt)

```
You are a coding agent with access to file operations and editing tools.

Follow these rules:

1. ALWAYS read a file before editing it
   - Never assume file contents
   - Use read_file to see the current state

2. After making changes, verify by reading the file again
   - Confirm your edit had the desired effect
   - Check for syntax errors or unintended changes

3. Think step-by-step before acting:
   - Understand: What is the user asking for?
   - Explore: What files are relevant?
   - Plan: What changes are needed?
   - Implement: Make the minimal necessary changes
   - Verify: Confirm the changes worked

4. Make minimal, targeted changes
   - Don't refactor unless asked
   - Don't add features beyond the request
   - Don't change code style unless fixing bugs

5. When fixing bugs, understand the root cause first
   - Don't just patch symptoms
   - Use search_grep to find related code
   - Consider edge cases and side effects

6. Use search_grep to find relevant code patterns
   - Search before editing if you don't know the structure
   - Find all usages of functions/variables you're changing

7. Work through steps one at a time
   - Complete one task before starting the next
   - Don't make multiple unrelated changes in one turn

8. For new files, follow the existing code style
   - Read similar files in the project
   - Match indentation, naming, and structure
```

## The Read-Edit-Verify Pattern

```
┌─────────────────────────────────────┐
│  1. READ                            │
│     read_file(path)                 │
│     └─> See current state           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  2. SEARCH (if needed)              │
│     search_grep(pattern)            │
│     └─> Find context                │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  3. EDIT                            │
│     edit_file(path, old, new)       │
│     └─> Make targeted change        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  4. VERIFY                          │
│     read_file(path)                 │
│     └─> Confirm change worked       │
└─────────────────────────────────────┘
```

## Edit Strategies

### Good: Include Context
```typescript
// Bad - ambiguous
old_string: "return x * 2;"

// Good - unique with context
old_string: "function calculate(x: number) {\n  return x * 2;\n}"
```

### Good: Small, Targeted Changes
```typescript
// Bad - large change
old_string: "entire 50-line function..."

// Good - surgical edit
old_string: "const result = a + b;\n  return result;"
new_string: "const result = a * b;\n  return result;"
```

### Good: One Change at a Time
```typescript
// Bad - multiple changes in one edit
old_string: "function oldName(x) {\n  const y = x + 1;\n  return y * 2;\n}"
new_string: "function newName(input) {\n  const result = input + 1;\n  return result * 3;\n}"

// Good - separate edits
edit_1: Change function name
edit_2: Rename parameter
edit_3: Update calculation
```

## Error Handling

### Error: Not Found
```
Error: old_string not found in src/utils.ts
```

**Recovery:**
1. Re-read the file
2. Find the correct text
3. Try again

### Error: Multiple Matches
```
Error: old_string found 3 times in src/utils.ts. Please include more context.
```

**Recovery:**
1. Add more surrounding lines
2. Include unique identifiers (function name, comments)
3. Try again

## Common Patterns

### Pattern 1: Fix Typo
```
read_file("file.ts")
→ Find typo
edit_file(old: "teh data", new: "the data")
read_file("file.ts")
→ Verify fix
```

### Pattern 2: Rename Function
```
search_grep("oldFunctionName")
→ Find all usages
read_file("file1.ts")
edit_file(old: "function oldFunctionName", new: "function newFunctionName")
read_file("file2.ts")
edit_file(old: "oldFunctionName()", new: "newFunctionName()")
```

### Pattern 3: Add Feature
```
list_dir("src")
→ Understand structure
read_file("src/similar.ts")
→ Learn pattern
edit_file(old: "", new: "new file content")
→ Create new file
read_file("src/new-file.ts")
→ Verify creation
```

## Quick Reference

| Action | Tool | When to Use |
|--------|------|-------------|
| See file content | read_file | Before every edit |
| Find pattern | search_grep | When you don't know which file |
| Change code | edit_file | Surgical modifications |
| Verify change | read_file | After every edit |
| Explore structure | list_dir | When unfamiliar with codebase |

## Occurrence Counting

```typescript
// TypeScript
const occurrences = content.split(oldStr).length - 1;

// Python
occurrences = content.count(old_str)
```

**Why it works:**
- `"a b a".split("a")` → `["", " b ", ""]` (length 3)
- 3 - 1 = 2 occurrences
- Handles overlapping matches correctly

## Special Cases

### Create New File
```typescript
edit_file({
  path: "new.ts",
  old_string: "",  // Empty for new file
  new_string: "export function hello() {}"
})
```

### Empty File
```typescript
// If file exists but is empty
old_string: ""  // Matches the empty content
new_string: "first content"
```

### Whitespace Matters
```typescript
// These are different:
old_string: "function test() {\nreturn 42;\n}"
old_string: "function test() {  \n  return 42;\n}"

// Include exact whitespace from the file
```

## Testing Checklist

- [ ] Edit tool requires exactly one match
- [ ] Returns error string (not throw) when no match
- [ ] Returns error string when multiple matches
- [ ] Can create new files with empty old_string
- [ ] Preserves file content outside the replacement
- [ ] System prompt includes all 8 rules
- [ ] Agent follows read-edit-verify pattern
- [ ] Works with multi-line replacements
- [ ] Handles whitespace correctly
