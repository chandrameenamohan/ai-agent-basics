"""Module 8: Progress tracking tool."""


def create_progress_tools() -> tuple[list[dict], dict]:
    state = {"items": []}

    def _format():
        if not state["items"]:
            return "(no items)"
        done = sum(1 for i in state["items"] if i["done"])
        lines = [f"{idx}. [{'x' if item['done'] else ' '}] {item['text']}" for idx, item in enumerate(state["items"])]
        return f"Progress: {done}/{len(state['items'])}\n" + "\n".join(lines)

    def add_item(inp):
        state["items"].append({"text": str(inp["text"]), "done": False})
        return _format()

    def complete_item(inp):
        idx = int(inp["index"])
        if idx < 0 or idx >= len(state["items"]):
            return "Error: index out of range"
        state["items"][idx]["done"] = True
        return _format()

    def show_progress(_):
        return _format()

    tools = [
        {"name": "progress-add", "description": "Add a subtask to the progress checklist",
         "input_schema": {"type": "object", "properties": {"text": {"type": "string", "description": "Subtask description"}}, "required": ["text"]},
         "execute": add_item},
        {"name": "progress-complete", "description": "Mark a subtask as completed (by index, 0-based)",
         "input_schema": {"type": "object", "properties": {"index": {"type": "number", "description": "Index of the subtask to complete"}}, "required": ["index"]},
         "execute": complete_item},
        {"name": "progress-show", "description": "Show the current progress checklist",
         "input_schema": {"type": "object", "properties": {}, "required": []},
         "execute": show_progress},
    ]
    return tools, state
