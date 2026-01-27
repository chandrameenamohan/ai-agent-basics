"""Module 8: Minimal MCP server (stdin/stdout JSON-RPC)."""
import sys
import json

TOOLS = [
    {
        "name": "get-project-info",
        "description": "Returns information about the current project",
        "inputSchema": {"type": "object", "properties": {}, "required": []},
    },
]


def handle_request(req: dict) -> dict:
    method = req.get("method", "")

    if method == "initialize":
        return {
            "jsonrpc": "2.0", "id": req["id"],
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "ai-agent-basics-mcp", "version": "1.0.0"},
            },
        }

    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": req["id"], "result": {"tools": TOOLS}}

    if method == "tools/call":
        params = req.get("params", {})
        if params.get("name") == "get-project-info":
            return {
                "jsonrpc": "2.0", "id": req["id"],
                "result": {
                    "content": [{
                        "type": "text",
                        "text": json.dumps({
                            "name": "AI Agent Basics",
                            "modules": 12,
                            "language": "TypeScript + Python",
                            "description": "Hands-on curriculum for building coding agents from scratch",
                        }),
                    }],
                },
            }
        return {"jsonrpc": "2.0", "id": req["id"], "error": {"code": -32601, "message": f"Unknown tool: {params.get('name')}"}}

    return {"jsonrpc": "2.0", "id": req.get("id", 0), "error": {"code": -32601, "message": f"Unknown method: {method}"}}


def main():
    print("MCP server started (stdin/stdout)", file=sys.stderr)
    for line in sys.stdin:
        try:
            req = json.loads(line.strip())
            res = handle_request(req)
            print(json.dumps(res), flush=True)
        except Exception:
            pass


if __name__ == "__main__":
    main()
