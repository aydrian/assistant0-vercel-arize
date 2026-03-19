import { tool } from 'ai';
import { z } from 'zod';

export const shopSearchTool = tool({
  description:
    'Search for a product and get pricing details before purchasing. Use this before shopOnlineTool to look up real product info.',
  inputSchema: z.object({
    product: z.string(),
    qty: z.number(),
  }),
  execute: async ({ product, qty }) => {
    const apiUrl = process.env['SHOP_API_URL'];

    if (!apiUrl) {
      // Mock fallback for demo mode
      return {
        product: {
          id: 'demo-product',
          name: product,
          category: 'General',
          imageUrl: '',
          pricePerUnit: 29.99,
        },
        qty,
        subtotal: 29.99 * qty,
        tax: +(29.99 * qty * 0.08).toFixed(2),
        total: +(29.99 * qty * 1.08).toFixed(2),
        estimatedDelivery: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      };
    }

    const params = new URLSearchParams({ product, qty: String(qty) });
    const url = new URL(apiUrl);
    url.pathname = url.pathname.replace(/\/shop\/?$/, '/shop/search');
    url.search = params.toString();
    const response = await fetch(url);

    let data;
    try {
      data = await response.json();
    } catch {
      return { error: `Shop API error: ${response.status} ${response.statusText}` };
    }

    if (!response.ok) {
      return data?.detail ?? data;
    }

    // Convert relative image URL to absolute
    const baseUrl = new URL(apiUrl).origin;
    if (data.product?.imageUrl && typeof data.product.imageUrl === 'string') {
      data.product.imageUrl = `${baseUrl}${data.product.imageUrl}`;
    }

    return data;
  },
});
