const BASE = "https://techshop-sxdi.onrender.com";

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return { success: true };
  return res.json();
}

console.log("🌐 Connecting to https://techshop-sxdi.onrender.com ...\n");

// Step 1: Browse products
console.log("── STEP 1: Browse all products ──");
const products = await api("GET", "/api/products");
console.log(products);

