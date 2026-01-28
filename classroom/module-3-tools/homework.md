# Module 3: Tool System - Homework

## Assignment Overview

Build a **Data Analysis Assistant** using a Tool Registry. The assistant should help users analyze arrays of numbers with statistical operations, data transformations, and visualizations.

**Deliverable:** A single TypeScript file `data-analyst.ts` that implements all requirements below.

**Due:** Complete before starting Module 4.

---

## Requirements

### Part 1: Tool Registry Implementation (25 points)

Implement a complete ToolRegistry class with:

1. **register() method** (5 points)
   - Add tools to the internal Map
   - Validate tool names are lowercase-kebab-case
   - Prevent duplicate registrations

2. **getDefinitions() method** (5 points)
   - Return array of tool schemas
   - Strip execute functions
   - Preserve name, description, input_schema

3. **execute() method** (10 points)
   - Look up tools by name
   - Return error string for unknown tools
   - Wrap execution in try/catch
   - Return error strings for exceptions

4. **Utility methods** (5 points)
   - has(name): check tool existence
   - list(): return array of tool names
   - count(): return number of registered tools (bonus method)

---

### Part 2: Statistical Tools (35 points)

Implement these five statistical tools. All should work with arrays of numbers.

#### 1. calculate-mean (7 points)

```typescript
{
  name: "calculate-mean",
  description: "Calculates the arithmetic mean (average) of an array of numbers",
  input_schema: {
    type: "object",
    properties: {
      values: {
        type: "array",
        items: { type: "number" },
        description: "Array of numbers to analyze"
      }
    },
    required: ["values"]
  }
}
```

- Return error if array is empty
- Calculate sum / length
- Return result as string with 2 decimal places

#### 2. calculate-median (7 points)

```typescript
{
  name: "calculate-median",
  description: "Calculates the median (middle value) of an array of numbers",
  input_schema: {
    type: "object",
    properties: {
      values: {
        type: "array",
        items: { type: "number" },
        description: "Array of numbers to analyze"
      }
    },
    required: ["values"]
  }
}
```

- Sort the array
- Return middle value (or average of two middle values for even-length arrays)
- Return as string with 2 decimal places

#### 3. calculate-range (7 points)

```typescript
{
  name: "calculate-range",
  description: "Calculates min, max, and range of an array of numbers",
  input_schema: {
    type: "object",
    properties: {
      values: {
        type: "array",
        items: { type: "number" },
        description: "Array of numbers to analyze"
      }
    },
    required: ["values"]
  }
}
```

- Find minimum and maximum values
- Calculate range (max - min)
- Return formatted string: "Min: X, Max: Y, Range: Z"

#### 4. calculate-standard-deviation (7 points)

```typescript
{
  name: "calculate-standard-deviation",
  description: "Calculates the standard deviation of an array of numbers",
  input_schema: {
    type: "object",
    properties: {
      values: {
        type: "array",
        items: { type: "number" },
        description: "Array of numbers to analyze"
      }
    },
    required: ["values"]
  }
}
```

- Calculate mean
- Calculate variance: average of squared differences from mean
- Return square root of variance
- Return as string with 2 decimal places

#### 5. filter-outliers (7 points)

```typescript
{
  name: "filter-outliers",
  description: "Removes outliers from an array using IQR method and returns filtered array",
  input_schema: {
    type: "object",
    properties: {
      values: {
        type: "array",
        items: { type: "number" },
        description: "Array of numbers to filter"
      }
    },
    required: ["values"]
  }
}
```

- Calculate Q1 (25th percentile) and Q3 (75th percentile)
- Calculate IQR = Q3 - Q1
- Remove values < Q1 - 1.5*IQR or > Q3 + 1.5*IQR
- Return JSON string with: `{ original: [...], filtered: [...], removed: [...] }`

---

### Part 3: Data Transformation Tools (20 points)

#### 6. sort-data (7 points)

```typescript
{
  name: "sort-data",
  description: "Sorts an array of numbers in ascending or descending order",
  input_schema: {
    type: "object",
    properties: {
      values: {
        type: "array",
        items: { type: "number" },
        description: "Array of numbers to sort"
      },
      order: {
        type: "string",
        description: "Sort order: 'asc' or 'desc'"
      }
    },
    required: ["values", "order"]
  }
}
```

- Validate order is "asc" or "desc"
- Sort array accordingly
- Return as JSON array string

#### 7. normalize-data (7 points)

```typescript
{
  name: "normalize-data",
  description: "Normalizes data to 0-1 range using min-max normalization",
  input_schema: {
    type: "object",
    properties: {
      values: {
        type: "array",
        items: { type: "number" },
        description: "Array of numbers to normalize"
      }
    },
    required: ["values"]
  }
}
```

- Find min and max
- Transform each value: (value - min) / (max - min)
- Return as JSON array string with values rounded to 4 decimal places

#### 8. generate-histogram (6 points)

```typescript
{
  name: "generate-histogram",
  description: "Generates a text-based histogram of data distribution",
  input_schema: {
    type: "object",
    properties: {
      values: {
        type: "array",
        items: { type: "number" },
        description: "Array of numbers to visualize"
      },
      bins: {
        type: "number",
        description: "Number of bins (default: 5)"
      }
    },
    required: ["values"]
  }
}
```

- Divide data into bins (default: 5)
- Count values in each bin
- Return text visualization like:
  ```
  [0-10]:   ##### (5)
  [10-20]:  ########## (10)
  [20-30]:  ### (3)
  ```

---

### Part 4: Agent Integration (20 points)

#### Agent Function (15 points)

```typescript
async function runDataAnalyst(
  userMessage: string,
  config?: Partial<AnalystConfig>
): Promise<string>
```

- Implement complete agent loop
- Use registry for all tool operations
- Handle stop_reason correctly
- Add maxTurns safety (default: 20)
- Include helpful system prompt

#### Configuration (5 points)

```typescript
interface AnalystConfig {
  model: string;
  maxTokens: number;
  maxTurns: number;
  systemPrompt: string;
  registry: ToolRegistry;
}
```

Default system prompt:
```
"You are a data analysis assistant. You can perform statistical calculations, transform data, and create visualizations. When given data, analyze it thoroughly and provide insights. Always show your work by using tools and explaining results."
```

---

### Part 5: Testing and Demo (bonus +10 points)

Create a comprehensive test suite with at least 6 test cases:

```typescript
async function runTests() {
  const testData = [12, 15, 18, 22, 25, 28, 30, 35, 40, 100];

  // Test 1: Basic statistics
  console.log("\n=== Test 1: Basic Statistics ===");
  const result1 = await runDataAnalyst(
    `Analyze this dataset: ${JSON.stringify(testData)}. Calculate the mean, median, and standard deviation.`
  );
  console.log(result1);

  // Test 2: Outlier detection
  // Test 3: Data normalization
  // Test 4: Sorting and range
  // Test 5: Histogram visualization
  // Test 6: Multi-step analysis

  // TODO: Implement remaining tests
}
```

---

## Starter Code Structure

```typescript
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (input: Record<string, unknown>) => Promise<string>;
}

class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    // TODO: Implement with validation
  }

  getDefinitions(): Anthropic.Tool[] {
    // TODO: Implement
  }

  async execute(name: string, input: Record<string, unknown>): Promise<string> {
    // TODO: Implement with try/catch
  }

  has(name: string): boolean {
    // TODO: Implement
  }

  list(): string[] {
    // TODO: Implement
  }

  count(): number {
    return this.tools.size;
  }
}

// Statistical tools
const calculateMeanTool: Tool = {
  // TODO: Implement
};

const calculateMedianTool: Tool = {
  // TODO: Implement
};

// ... implement remaining tools

// Setup registry
const registry = new ToolRegistry();
// TODO: Register all tools

// Agent configuration
interface AnalystConfig {
  model: string;
  maxTokens: number;
  maxTurns: number;
  systemPrompt: string;
  registry: ToolRegistry;
}

// Agent function
async function runDataAnalyst(
  userMessage: string,
  config?: Partial<AnalystConfig>
): Promise<string> {
  // TODO: Implement agent loop
}

// Tests
async function runTests() {
  // TODO: Implement test cases
}

runTests();
```

---

## Grading Rubric

### Tool Registry (25 points)
- [ ] register() with validation (5 pts)
- [ ] getDefinitions() (5 pts)
- [ ] execute() with error handling (10 pts)
- [ ] Utility methods (5 pts)

### Statistical Tools (35 points)
- [ ] calculate-mean (7 pts)
- [ ] calculate-median (7 pts)
- [ ] calculate-range (7 pts)
- [ ] calculate-standard-deviation (7 pts)
- [ ] filter-outliers (7 pts)

### Transformation Tools (20 points)
- [ ] sort-data (7 pts)
- [ ] normalize-data (7 pts)
- [ ] generate-histogram (6 pts)

### Agent Integration (20 points)
- [ ] Agent function (15 pts)
- [ ] Configuration (5 pts)

### Bonus (up to +10 points)
- [ ] Comprehensive test suite (6 tests) (+10 pts)
- [ ] Additional statistical tools (+5 pts per tool)
- [ ] Data export to CSV tool (+5 pts)

---

## Example Usage

```typescript
const testData = [23, 45, 67, 12, 89, 34, 56, 78, 90, 123, 45, 67, 89, 12, 34];

const result = await runDataAnalyst(`
  I have this dataset: ${JSON.stringify(testData)}

  Please:
  1. Calculate the mean and median
  2. Find the range
  3. Filter out outliers
  4. Show me a histogram of the filtered data
`);

console.log(result);
```

**Expected output:** Claude uses multiple tools and provides a comprehensive analysis with all requested statistics and visualization.

---

## Implementation Tips

### For calculate-median:
```typescript
const sorted = [...values].sort((a, b) => a - b);
const mid = Math.floor(sorted.length / 2);
const median = sorted.length % 2 === 0
  ? (sorted[mid - 1] + sorted[mid]) / 2
  : sorted[mid];
```

### For calculate-standard-deviation:
```typescript
const mean = values.reduce((a, b) => a + b) / values.length;
const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
const variance = squaredDiffs.reduce((a, b) => a + b) / values.length;
const stdDev = Math.sqrt(variance);
```

### For generate-histogram:
```typescript
const min = Math.min(...values);
const max = Math.max(...values);
const binWidth = (max - min) / bins;

// Create bins and count
const binCounts = new Array(bins).fill(0);
values.forEach(v => {
  const binIndex = Math.min(Math.floor((v - min) / binWidth), bins - 1);
  binCounts[binIndex]++;
});

// Format output
let result = "";
for (let i = 0; i < bins; i++) {
  const rangeStart = min + i * binWidth;
  const rangeEnd = min + (i + 1) * binWidth;
  const bar = "#".repeat(binCounts[i]);
  result += `[${rangeStart.toFixed(1)}-${rangeEnd.toFixed(1)}]: ${bar} (${binCounts[i]})\n`;
}
```

---

## Common Mistakes to Avoid

1. **Returning non-strings from execute**: Always convert results to strings
2. **Not validating empty arrays**: Check array length before processing
3. **Throwing exceptions**: Return error strings instead
4. **Not using try/catch in registry.execute()**: This is critical for stability
5. **Forgetting to register tools**: Call registry.register() for each tool
6. **Not formatting numbers**: Use .toFixed() for clean output
7. **Mutating input arrays**: Use spread operator to create copies

---

## Extensions (Optional)

1. **Correlation tool**: Calculate correlation coefficient between two datasets
2. **Percentile tool**: Calculate arbitrary percentiles (not just median)
3. **Moving average tool**: Calculate moving average with window size
4. **Data export**: Export results to CSV or JSON file
5. **Batch analysis**: Analyze multiple datasets in one conversation

---

## Submission Checklist

- [ ] ToolRegistry class with all methods
- [ ] All 8 required tools implemented
- [ ] Agent loop integrated with registry
- [ ] Configuration interface defined
- [ ] At least 3 test cases
- [ ] Code runs without errors
- [ ] All tools return strings
- [ ] Error handling in place
- [ ] Comments explaining complex calculations

---

## Testing Your Work

```bash
bun module-3-tools/data-analyst.ts
```

Expected behavior:
1. All tools register successfully
2. Agent responds to analysis requests
3. Multiple tools can be chained together
4. Error messages are clear and helpful
5. Output is well-formatted and readable

Good luck!
