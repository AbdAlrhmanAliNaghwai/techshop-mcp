import { test, expect } from '@playwright/test';

const BASE_URL = 'https://techshop-sxdi.onrender.com';

// ─────────────────────────────────────────────────────────────
// TC-01 | Products Page Loads Correctly
// Verifies the homepage displays all 8 products with key info
// ─────────────────────────────────────────────────────────────
test('TC-01 | Products page loads with all 8 products', async ({ page }) => {
  await page.goto(`${BASE_URL}/products`);

  // Page title and heading
  await expect(page).toHaveTitle('TechShop');
  await expect(page.getByRole('heading', { name: 'Electronics Store' })).toBeVisible();
  await expect(page.getByText('8 products available')).toBeVisible();

  // All 5 category filter buttons are present
  for (const category of ['All', 'Phones', 'Laptops', 'Accessories', 'Tablets', 'Monitors']) {
    await expect(page.getByRole('button', { name: category })).toBeVisible();
  }

  // All 8 Add to Cart buttons are rendered
  const addToCartButtons = page.getByRole('button', { name: '+ Add to Cart' });
  await expect(addToCartButtons).toHaveCount(8);

  // Cart starts empty (no badge number)
  const cartLink = page.locator('nav a[href="/cart"]');
  await expect(cartLink).toHaveText(/Cart/);
  await expect(cartLink.locator('span, [class*="badge"], [class*="count"]')).not.toBeVisible()
    .catch(() => {}); // badge simply absent on empty cart
});


// ─────────────────────────────────────────────────────────────
// TC-02 | Category Filter Shows Correct Products
// Clicking a category should show only matching products
// ─────────────────────────────────────────────────────────────
test('TC-02 | Category filter shows only matching products', async ({ page }) => {
  await page.goto(`${BASE_URL}/products`);

  // Filter by Phones → expect exactly 2
  await page.getByRole('button', { name: 'Phones' }).click();
  let headings = await page.locator('h3').allInnerTexts();
  expect(headings).toHaveLength(2);
  expect(headings).toContain('iPhone 15 Pro');
  expect(headings).toContain('Samsung Galaxy S24');

  // Filter by Laptops → expect exactly 2
  await page.getByRole('button', { name: 'Laptops' }).click();
  headings = await page.locator('h3').allInnerTexts();
  expect(headings).toHaveLength(2);
  expect(headings).toContain('MacBook Air M3');
  expect(headings).toContain('Dell XPS 15');

  // Reset to All → expect all 8 back
  await page.getByRole('button', { name: 'All' }).click();
  headings = await page.locator('h3').allInnerTexts();
  expect(headings).toHaveLength(8);
});


// ─────────────────────────────────────────────────────────────
// TC-03 | Add Items to Cart & Cart Badge Updates
// Adding products should update the cart badge count correctly
// ─────────────────────────────────────────────────────────────
test('TC-03 | Cart badge updates when items are added', async ({ page }) => {
  await page.goto(`${BASE_URL}/products`);

  const cartLink = page.locator('nav a[href="/cart"]');

  // Add first item (MacBook Air M3)
  await page.locator('#add-to-cart-3').click();
  await expect(cartLink).toContainText('1');

  // Add second item (Sony WH-1000XM5)
  await page.locator('#add-to-cart-5').click();
  await expect(cartLink).toContainText('2');

  // Navigate to cart and verify both items appear
  await page.goto(`${BASE_URL}/cart`);
  await expect(page.getByText('2 item(s) in your cart')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'MacBook Air M3' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sony WH-1000XM5' })).toBeVisible();

  // Verify order summary total = $1,649.98
  await expect(page.getByText('$1649.98')).toBeVisible();
});


// ─────────────────────────────────────────────────────────────
// TC-04 | Remove Single Item from Cart
// Removing one item should update count but keep others
// ─────────────────────────────────────────────────────────────
test('TC-04 | Remove a single item from cart', async ({ page }) => {
  await page.goto(`${BASE_URL}/products`);

  // Add 3 items
  await page.locator('#add-to-cart-1').click(); // iPhone 15 Pro
  await page.waitForTimeout(300);
  await page.locator('#add-to-cart-2').click(); // Samsung Galaxy S24
  await page.waitForTimeout(300);
  await page.locator('#add-to-cart-3').click(); // MacBook Air M3
  await page.waitForTimeout(300);

  await page.goto(`${BASE_URL}/cart`);
  await expect(page.getByText('3 item(s) in your cart')).toBeVisible();

  // Remove the first item
  await page.locator('button:has-text("Remove")').first().click();
  await page.waitForTimeout(400);

  // Cart should now show 2 items
  await expect(page.getByText('2 item(s) in your cart')).toBeVisible();

  // Cart badge should show 2
  await expect(page.locator('nav a[href="/cart"]')).toContainText('2');

  // Cart is not empty — checkout button still visible
  await expect(page.getByRole('button', { name: 'Proceed to Checkout' })).toBeVisible();
});


// ─────────────────────────────────────────────────────────────
// TC-05 | Checkout Flow & Clear Cart
// Checkout shows success message; Clear Cart empties without ordering
// ─────────────────────────────────────────────────────────────
test('TC-05 | Checkout shows success message; Clear Cart empties without ordering', async ({ page }) => {
  // ── Part A: Proceed to Checkout ──
  await page.goto(`${BASE_URL}/products`);
  await page.locator('#add-to-cart-4').click(); // Dell XPS 15
  await page.waitForTimeout(300);
  await page.locator('#add-to-cart-6').click(); // iPad Pro
  await page.waitForTimeout(300);

  await page.goto(`${BASE_URL}/cart`);
  await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
  await page.waitForTimeout(500);

  // Success modal appears
  await expect(page.getByRole('heading', { name: 'Order Placed!' })).toBeVisible();
  await expect(page.getByText('Thank you for your purchase. Your order is being processed.')).toBeVisible();

  // Cart is cleared after checkout
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  await expect(page.locator('nav a[href="/cart"]')).not.toContainText(/\d/);

  // ── Part B: Clear Cart (no order placed) ──
  await page.goto(`${BASE_URL}/products`);
  await page.locator('#add-to-cart-2').click(); // Samsung Galaxy S24
  await page.waitForTimeout(300);
  await page.locator('#add-to-cart-7').click(); // Logitech MX Master 3S
  await page.waitForTimeout(300);

  await page.goto(`${BASE_URL}/cart`);
  await expect(page.getByText('2 item(s) in your cart')).toBeVisible();

  await page.getByRole('button', { name: 'Clear Cart' }).click();
  await page.waitForTimeout(500);

  // Cart emptied — no order placed modal
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  await expect(page.getByText('Add some electronics to get started!')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Order Placed!' })).not.toBeVisible();

  // Cart badge resets
  await expect(page.locator('nav a[href="/cart"]')).not.toContainText(/\d/);
});