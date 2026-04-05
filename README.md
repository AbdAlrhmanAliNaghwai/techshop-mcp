# TechShop MCP Server

MCP server for automating test scenarios on the TechShop Angular + ASP.NET Core app.

---

## Setup Instructions

### Step 1 — Install dependencies
```bash
cd C:\Projects\techshop-mcp
npm install
```

### Step 2 — Copy the config to Claude Desktop
Copy the contents of `claude_desktop_config.json` into:
```
C:\Users\YOUR_WINDOWS_USERNAME\AppData\Roaming\Claude\claude_desktop_config.json
```
Replace `YOUR_WINDOWS_USERNAME` with your actual Windows username.

> Tip: Open File Explorer, paste this in the address bar and press Enter:
> `%APPDATA%\Claude\`

### Step 3 — Update the path in the config
Open `claude_desktop_config.json` and make sure the path matches where you placed this folder:
```json
"args": ["C:\\Projects\\techshop-mcp\\server.js"]
```

### Step 4 — Update the shop URL
Once your site is live on Render, update the SHOP_URL in the config:
```json
"env": {
  "SHOP_URL": "https://your-actual-render-url.onrender.com"
}
```
For local testing use: `"SHOP_URL": "http://localhost:5000"`

### Step 5 — Restart Claude Desktop
Fully quit Claude Desktop (right-click tray icon → Exit) and reopen it.
You should see a 🔨 hammer icon at the bottom of the chat input.

---

## Available Tools

| Tool | What it does |
|---|---|
| `get_products` | Browse all products, optionally filter by category |
| `get_product` | Get a single product by ID |
| `add_to_cart` | Add a product to the cart |
| `get_cart` | View current cart contents and total |
| `remove_from_cart` | Remove a specific item from the cart |
| `clear_cart` | Empty the entire cart |
| `run_full_test` | Runs the complete automated test scenario |

---

## Example prompts to use in Claude Desktop

- "Run the full TechShop test scenario"
- "Show me all products in the Phones category"
- "Add product ID 3 to the cart"
- "What's currently in the cart?"
- "Remove cart item 2 from the cart"
- "Clear the cart and verify it's empty"
