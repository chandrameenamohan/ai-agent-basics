# Module 4: Filesystem Tools - Quiz

## Section 1: Sandbox Security (25 points)

### Question 1 (5 points)
What is the primary security vulnerability that the Sandbox class prevents?

A) SQL injection
B) Cross-site scripting
C) Path traversal attacks
D) Buffer overflow

**Answer:** C

---

### Question 2 (5 points)
Which of these paths should the sandbox BLOCK if the root is `/home/user/project`?

A) `src/index.ts`
B) `./lib/utils.ts`
C) `../../etc/passwd`
D) `nested/deep/file.txt`

**Answer:** C

---

### Question 3 (10 points)
Explain why this sandbox implementation is UNSAFE:

```typescript
class Sandbox {
  constructor(public root: string) {}

  resolve(filePath: string): string {
    return this.root + '/' + filePath;
  }
}
```

**Answer:** This implementation doesn't resolve `..` segments or validate that the final path stays within the root. An attacker could use `../../etc/passwd` and the simple concatenation would create `/home/user/project/../../etc/passwd`, which when actually used by the filesystem would resolve to `/etc/passwd`. The sandbox needs to use `path.resolve()` and check with `startsWith()` to ensure containment.

---

### Question 4 (5 points)
True or False: Using absolute paths like `/etc/passwd` bypasses sandbox protection.

A) True - absolute paths ignore the sandbox root
B) False - the sandbox blocks absolute paths that don't start with root

**Answer:** B (The sandbox checks if the resolved path starts with root, which will fail for `/etc/passwd`)

---

## Section 2: Tool Design (25 points)

### Question 5 (5 points)
Why should filesystem tools return errors as strings instead of throwing exceptions?

A) Strings are faster than exceptions
B) LLMs can read error messages and adapt their approach
C) Exceptions are deprecated in modern JavaScript
D) It's easier to debug

**Answer:** B

---

### Question 6 (10 points)
You're implementing the `search_grep` tool. It finds 500 matches across files. What should you do?

A) Return all 500 matches
B) Return the first 50 matches and indicate truncation
C) Throw an error saying "too many matches"
D) Return only filenames without content

**Answer:** B

Explain why: Returning all 500 matches would waste tokens and context. Returning the first 50 with a truncation message allows the agent to see results and potentially refine the search pattern. The agent can understand from the truncation that it needs to be more specific.

---

### Question 7 (5 points)
What's the purpose of labeling directory entries with `[dir]` and `[file]`?

A) It makes the output look prettier
B) It's required by the JSON schema
C) It helps the LLM distinguish files from directories
D) It's a security feature

**Answer:** C

---

### Question 8 (5 points)
Which output format is BETTER for the LLM?

A) `processData`
B) `src/index.ts:15: export function processData(input: string) {`

**Answer:** B (provides context: which file, which line, and surrounding code)

---

## Section 3: System Prompts (20 points)

### Question 9 (10 points)
List the three most important rules to include in a system prompt for filesystem agents:

**Answer:**
1. ALWAYS read a file before modifying it
2. After making changes, verify by reading the file again
3. Use list_dir to explore unfamiliar directories (or: Never assume file contents - always read first)

---

### Question 10 (10 points)
An agent is making blind edits without reading files first. What's the problem and how do you fix it?

**Problem:**

**Solution:**

**Answer:**

**Problem:** The agent lacks a system prompt rule enforcing the read-before-edit pattern. Without reading first, the agent might overwrite files, make incorrect assumptions about structure, or create conflicts.

**Solution:** Add a system prompt rule: "ALWAYS read a file before editing it" and "After changes, verify by reading the file again." This establishes the read-edit-verify pattern that ensures the agent understands context before making changes.

---

## Section 4: Tool Implementation (30 points)

### Question 11 (10 points)
Complete this `read_file` tool implementation:

```typescript
execute: async (input: any): Promise<string> => {
  try {
    const safePath = sandbox.resolve(input.path);
    // TODO: Complete the implementation
  } catch (error: any) {
    return `Error reading file: ${error.message}`;
  }
}
```

**Answer:**
```typescript
execute: async (input: any): Promise<string> => {
  try {
    const safePath = sandbox.resolve(input.path);
    const content = await fs.readFile(safePath, 'utf-8');
    return content;
  } catch (error: any) {
    return `Error reading file: ${error.message}`;
  }
}
```

---

### Question 12 (10 points)
The `run_shell` tool needs to block dangerous commands. List four command patterns that should be blocked:

**Answer:**
1. `rm -rf` (recursive deletion)
2. `dd` (disk duplication/wiping)
3. `mkfs` (filesystem formatting)
4. `> /dev/` (writing to device files)

Other acceptable answers: `chmod 777`, `curl | bash`, `:(){ :|:& };:` (fork bomb), `sudo`, etc.

---

### Question 13 (10 points)
Why is a 30-second timeout important for the `run_shell` tool? What happens without it?

**Answer:** Without a timeout, a command could hang indefinitely (e.g., waiting for user input, infinite loop, or network request that never returns). This would freeze the agent loop and waste API costs while waiting. A 30-second timeout ensures the agent gets a timeout error message and can continue to the next action rather than hanging forever.

---

## Bonus Question (5 points)

### Question 14
You have a sandbox with root `/home/user/project`. An agent tries to access:
- Path A: `src/../lib/utils.ts`
- Path B: `src/../../etc/passwd`

Which path is allowed and why?

**Answer:**

Path A is allowed. When resolved, it becomes `/home/user/project/src/../lib/utils.ts` → `/home/user/project/lib/utils.ts`, which starts with the root.

Path B is blocked. When resolved, it becomes `/home/user/project/src/../../etc/passwd` → `/home/etc/passwd`, which does NOT start with `/home/user/project` and is therefore outside the sandbox.

The key is that `path.resolve()` processes all `..` segments, then the `startsWith()` check validates containment.

---

## Scoring

- 90-100: Excellent understanding of filesystem security and tool design
- 80-89: Good grasp of concepts, minor gaps
- 70-79: Adequate understanding, needs review of security principles
- Below 70: Review the module and focus on sandbox security and tool design patterns

## Answer Key Summary

1. C
2. C
3. See detailed answer
4. B
5. B
6. B
7. C
8. B
9. See detailed answer
10. See detailed answer
11. See detailed answer
12. See detailed answer
13. See detailed answer
14. See detailed answer
