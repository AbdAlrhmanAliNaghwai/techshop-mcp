import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ── Base URL — swap this to your Render URL once deployed ──────────────
const BASE_URL = process.env.SHOP_URL || "https://techshop-sxdi.onrender.com/";

// ── Helper: make API calls to the TechShop backend ────────────────────
async function shopApi(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return { success: true };

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// ── Create MCP Server ──────────────────────────────────────────────────
const server = new McpServer({
  name: "techshop-mcp",
  version: "1.0.0",
});

// ──────────────────────────────────────────────────────────────────────
// TOOL 1: Get all products (optionally filter by category)
// ──────────────────────────────────────────────────────────────────────
server.tool(
  "get_products",
  "Browse the TechShop product catalogue. Optionally filter by category.",
  {
    category: z
      .string()
      .optional()
      .describe(
        "Optional category filter: Phones, Laptops, Accessories, Tablets, Monitors"
      ),
  },
  async ({ category }) => {
    const path = category
      ? `/api/products?category=${encodeURIComponent(category)}`
      : "/api/products";
    const products = await shopApi("GET", path);

    if (!Array.isArray(products)) {
      return {
        content: [{ type: "text", text: `Error fetching products: ${JSON.stringify(products)}` }],
      };
    }

    const summary = products
      .map(
        (p) =>
          `[ID:${p.id}] ${p.name} | $${p.price} | Category: ${p.category} | Stock: ${p.stock}`
      )
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${products.length} product(s)${category ? ` in "${category}"` : ""}:\n\n${summary}`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────────────────────────────
// TOOL 2: Get a single product by ID
// ──────────────────────────────────────────────────────────────────────
server.tool(
  "get_product",
  "Get details for a single product by its ID.",
  {
    productId: z.number().describe("The product ID to look up"),
  },
  async ({ productId }) => {
    const product = await shopApi("GET", `/api/products/${productId}`);

    if (product?.status === 404 || !product?.id) {
      return {
        content: [{ type: "text", text: `Product ID ${productId} not found.` }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Product Details:\n- Name: ${product.name}\n- Price: $${product.price}\n- Category: ${product.category}\n- Description: ${product.description}\n- Stock: ${product.stock}`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────────────────────────────
// TOOL 3: Add a product to the cart
// ──────────────────────────────────────────────────────────────────────
server.tool(
  "add_to_cart",
  "Add a product to the shopping cart by product ID.",
  {
    productId: z.number().describe("The product ID to add to the cart"),
    quantity: z
      .number()
      .optional()
      .describe("Quantity to add (default: 1)"),
  },
  async ({ productId, quantity = 1 }) => {
    const result = await shopApi("POST", "/api/cart", { productId, quantity });

    if (result?.error) {
      return {
        content: [{ type: "text", text: `Failed to add to cart: ${result.error}` }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully added to cart!\n- Cart Item ID: ${result.id}\n- Product: ${result.product?.name}\n- Quantity: ${result.quantity}\n- Unit Price: $${result.product?.price}`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────────────────────────────
// TOOL 4: View the current cart
// ──────────────────────────────────────────────────────────────────────
server.tool(
  "get_cart",
  "View all items currently in the shopping cart with totals.",
  {},
  async () => {
    const items = await shopApi("GET", "/api/cart");

    if (!Array.isArray(items)) {
      return {
        content: [{ type: "text", text: `Error fetching cart: ${JSON.stringify(items)}` }],
      };
    }

    if (items.length === 0) {
      return {
        content: [{ type: "text", text: "The cart is currently empty." }],
      };
    }

    let total = 0;
    const lines = items.map((item) => {
      const subtotal = item.product.price * item.quantity;
      total += subtotal;
      return `[CartItemID:${item.id}] ${item.product.name} x${item.quantity} = $${subtotal.toFixed(2)}`;
    });

    return {
      content: [
        {
          type: "text",
          text: `Cart Contents (${items.length} item(s)):\n\n${lines.join("\n")}\n\nTotal: $${total.toFixed(2)}`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────────────────────────────
// TOOL 5: Remove a specific item from the cart
// ──────────────────────────────────────────────────────────────────────
server.tool(
  "remove_from_cart",
  "Remove a specific item from the cart using its cart item ID.",
  {
    cartItemId: z
      .number()
      .describe("The cart item ID to remove (get this from get_cart)"),
  },
  async ({ cartItemId }) => {
    const result = await shopApi("DELETE", `/api/cart/${cartItemId}`);

    if (result?.success) {
      return {
        content: [
          {
            type: "text",
            text: `Cart item ID ${cartItemId} successfully removed from the cart.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Could not remove item ${cartItemId}. It may not exist.`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────────────────────────────
// TOOL 6: Clear the entire cart
// ──────────────────────────────────────────────────────────────────────
server.tool(
  "clear_cart",
  "Remove all items from the shopping cart at once.",
  {},
  async () => {
    await shopApi("DELETE", "/api/cart");
    return {
      content: [{ type: "text", text: "Cart has been completely cleared." }],
    };
  }
);

// ──────────────────────────────────────────────────────────────────────
// TOOL 7: Run the full test scenario automatically
// ──────────────────────────────────────────────────────────────────────
server.tool(
  "run_full_test",
  "Runs the complete TechShop test scenario: browse products, add items, verify cart, remove an item, verify again, and clear.",
  {},
  async () => {
    const steps = [];

    // Step 1: Get all products
    steps.push("── STEP 1: Browse all products ──");
    const products = await shopApi("GET", "/api/products");
    if (!Array.isArray(products) || products.length === 0) {
      return {
        content: [{ type: "text", text: "FAIL: Could not load products." }],
      };
    }
    steps.push(`PASS: Found ${products.length} products.`);

    // Step 2: Filter by category
    steps.push("\n── STEP 2: Filter by Phones ──");
    const phones = await shopApi("GET", "/api/products?category=Phones");
    steps.push(`PASS: Found ${phones.length} phone(s).`);

    // Step 3: Clear cart first (clean state)
    steps.push("\n── STEP 3: Clear cart (reset state) ──");
    await shopApi("DELETE", "/api/cart");
    steps.push("PASS: Cart cleared.");

    // Step 4: Add first two products to cart
    steps.push("\n── STEP 4: Add products to cart ──");
    const item1 = await shopApi("POST", "/api/cart", { productId: products[0].id, quantity: 1 });
    steps.push(`PASS: Added "${products[0].name}" → CartItemID: ${item1.id}`);

    const item2 = await shopApi("POST", "/api/cart", { productId: products[1].id, quantity: 2 });
    steps.push(`PASS: Added "${products[1].name}" x2 → CartItemID: ${item2.id}`);

    // Step 5: Verify cart has 2 items
    steps.push("\n── STEP 5: Verify cart contents ──");
    const cartAfterAdd = await shopApi("GET", "/api/cart");
    if (cartAfterAdd.length === 2) {
      const total = cartAfterAdd.reduce((s, i) => s + i.product.price * i.quantity, 0);
      steps.push(`PASS: Cart has ${cartAfterAdd.length} items. Total: $${total.toFixed(2)}`);
    } else {
      steps.push(`FAIL: Expected 2 items, got ${cartAfterAdd.length}`);
    }

    // Step 6: Remove first item
    steps.push("\n── STEP 6: Remove first item ──");
    await shopApi("DELETE", `/api/cart/${item1.id}`);
    steps.push(`PASS: Removed CartItemID ${item1.id}`);

    // Step 7: Verify cart now has 1 item
    steps.push("\n── STEP 7: Verify cart after removal ──");
    const cartAfterRemove = await shopApi("GET", "/api/cart");
    if (cartAfterRemove.length === 1) {
      steps.push(`PASS: Cart correctly has 1 item remaining.`);
    } else {
      steps.push(`FAIL: Expected 1 item, got ${cartAfterRemove.length}`);
    }

    // Step 8: Clear the cart
    steps.push("\n── STEP 8: Clear entire cart ──");
    await shopApi("DELETE", "/api/cart");
    const cartFinal = await shopApi("GET", "/api/cart");
    if (cartFinal.length === 0) {
      steps.push("PASS: Cart is empty after clear.");
    } else {
      steps.push(`FAIL: Cart still has ${cartFinal.length} items.`);
    }

    steps.push("\n══════════════════════════════");
    steps.push("Full test scenario complete!");
    steps.push("══════════════════════════════");

    return {
      content: [{ type: "text", text: steps.join("\n") }],
    };
  }
);

// ── Start the server ───────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);

// ──────────────────────────────────────────────────────────────────────
// TOOL 8: Generate a formatted test report (to be saved via Filesystem MCP)
// ──────────────────────────────────────────────────────────────────────
server.tool(
  "generate_report",
  "Runs the full test scenario and returns a formatted report ready to be saved as a file.",
  {
    format: z
      .enum(["txt", "html"])
      .optional()
      .describe("Report format: txt (default) or html"),
  },
  async ({ format = "txt" }) => {
    const steps = [];
    const startTime = new Date();

    const pass = (msg) => { steps.push({ status: "PASS", msg }); };
    const fail = (msg) => { steps.push({ status: "FAIL", msg }); };

    const products = await shopApi("GET", "/api/products");
    Array.isArray(products) && products.length > 0
      ? pass(`Found ${products.length} products`)
      : fail("Could not load products");

    const phones = await shopApi("GET", "/api/products?category=Phones");
    Array.isArray(phones)
      ? pass(`Filter by Phones returned ${phones.length} result(s)`)
      : fail("Category filter failed");

    await shopApi("DELETE", "/api/cart");
    pass("Cart cleared (reset state)");

    const item1 = await shopApi("POST", "/api/cart", { productId: products[0]?.id, quantity: 1 });
    item1?.id
      ? pass(`Added "${products[0]?.name}" to cart (CartItemID: ${item1.id})`)
      : fail("Failed to add first product");

    const item2 = await shopApi("POST", "/api/cart", { productId: products[1]?.id, quantity: 2 });
    item2?.id
      ? pass(`Added "${products[1]?.name}" x2 to cart (CartItemID: ${item2.id})`)
      : fail("Failed to add second product");

    const cartAfterAdd = await shopApi("GET", "/api/cart");
    cartAfterAdd.length === 2
      ? pass(`Cart has 2 items. Total: $${cartAfterAdd.reduce((s, i) => s + i.product.price * i.quantity, 0).toFixed(2)}`)
      : fail(`Expected 2 cart items, got ${cartAfterAdd.length}`);

    await shopApi("DELETE", `/api/cart/${item1.id}`);
    pass(`Removed item (CartItemID: ${item1.id})`);

    const cartAfterRemove = await shopApi("GET", "/api/cart");
    cartAfterRemove.length === 1
      ? pass("Cart correctly has 1 item after removal")
      : fail(`Expected 1 item, got ${cartAfterRemove.length}`);

    await shopApi("DELETE", "/api/cart");
    const cartFinal = await shopApi("GET", "/api/cart");
    cartFinal.length === 0
      ? pass("Cart empty after clear")
      : fail(`Cart still has ${cartFinal.length} items`);

    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const passed = steps.filter(s => s.status === "PASS").length;
    const failed = steps.filter(s => s.status === "FAIL").length;
    const timestamp = startTime.toISOString().replace("T", " ").substring(0, 19);

    if (format === "html") {
      const rows = steps.map(s =>
        `<tr><td class="${s.status.toLowerCase()}">${s.status}</td><td>${s.msg}</td></tr>`
      ).join("");

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>TechShop Test Report</title>
  <style>
    body { font-family: Segoe UI, sans-serif; max-width: 800px; margin: 40px auto; color: #333; }
    h1 { color: #1a1a2e; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .badge { padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 1.1rem; }
    .pass-badge { background: #e8f5e9; color: #2e7d32; }
    .fail-badge { background: #ffebee; color: #c62828; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #1a1a2e; color: white; padding: 10px; text-align: left; }
    td { padding: 9px 12px; border-bottom: 1px solid #eee; }
    .pass { color: #2e7d32; font-weight: bold; }
    .fail { color: #c62828; font-weight: bold; }
    .meta { color: #777; font-size: 0.9rem; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>TechShop Automated Test Report</h1>
  <div class="meta">Run at: ${timestamp} | Duration: ${duration}s</div>
  <div class="summary">
    <div class="badge pass-badge">Passed: ${passed}</div>
    <div class="badge fail-badge">Failed: ${failed}</div>
  </div>
  <table>
    <tr><th>Result</th><th>Step</th></tr>
    ${rows}
  </table>
  <div class="meta">Site: ${BASE_URL}</div>
</body>
</html>`;
      return { content: [{ type: "text", text: html }] };
    }

    const lines = [
      "===============================================",
      "  TECHSHOP AUTOMATED TEST REPORT",
      "===============================================",
      `  Run at  : ${timestamp}`,
      `  Site    : ${BASE_URL}`,
      `  Duration: ${duration}s`,
      "-----------------------------------------------",
      ...steps.map(s => `  [${s.status}] ${s.msg}`),
      "-----------------------------------------------",
      `  TOTAL: ${passed} passed, ${failed} failed`,
      "===============================================",
    ];

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);
