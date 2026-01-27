/**
 * Module 8: Minimal MCP server
 * Exposes a custom tool over the Model Context Protocol.
 *
 * This is a simplified MCP server that responds to JSON-RPC over stdin/stdout.
 * In production, use the @modelcontextprotocol/sdk package.
 */
import * as readline from "readline";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

const TOOLS = [
  {
    name: "get-project-info",
    description: "Returns information about the current project",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

function handleRequest(req: JsonRpcRequest): JsonRpcResponse {
  switch (req.method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id: req.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "ai-agent-basics-mcp", version: "1.0.0" },
        },
      };

    case "tools/list":
      return { jsonrpc: "2.0", id: req.id, result: { tools: TOOLS } };

    case "tools/call": {
      const params = req.params as { name: string; arguments?: Record<string, unknown> };
      if (params.name === "get-project-info") {
        return {
          jsonrpc: "2.0",
          id: req.id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  name: "AI Agent Basics",
                  modules: 12,
                  language: "TypeScript",
                  description: "Hands-on curriculum for building coding agents from scratch",
                }),
              },
            ],
          },
        };
      }
      return {
        jsonrpc: "2.0",
        id: req.id,
        error: { code: -32601, message: `Unknown tool: ${params.name}` },
      };
    }

    default:
      return {
        jsonrpc: "2.0",
        id: req.id,
        error: { code: -32601, message: `Unknown method: ${req.method}` },
      };
  }
}

// Read JSON-RPC messages from stdin
const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  try {
    const req: JsonRpcRequest = JSON.parse(line);
    const res = handleRequest(req);
    process.stdout.write(JSON.stringify(res) + "\n");
  } catch {
    // Ignore malformed input
  }
});

console.error("MCP server started (stdin/stdout)");
