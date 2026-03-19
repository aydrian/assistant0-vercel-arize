import { tool } from 'ai';
import { z } from 'zod';

import { getAsyncAuthorizationCredentials } from '@auth0/ai-vercel';
import { withAsyncAuthorization } from '../auth0-ai';

export const shopOnlineTool = withAsyncAuthorization(
  tool({
    description:
      'Place an order for a product. Use shopSearchTool first to look up the product, then pass the resolved details here.',
    inputSchema: z.object({
      productId: z.string().describe('Exact product ID from search results'),
      productName: z.string().describe('Product name from search results'),
      qty: z.number(),
      unitPrice: z.number().describe('Price per unit from search results'),
      total: z.number().describe('Total including tax from search results'),
      imageUrl: z.string().optional().describe('Product image URL from search results'),
    }),
    execute: async ({ productId, productName, qty, unitPrice, total, imageUrl }) => {
      console.log(`Ordering ${qty} ${productName} (${productId}) — total $${total}`);

      const apiUrl = process.env['SHOP_API_URL'];

      if (!apiUrl) {
        // No API set, mock a response
        return {
          orderId: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-DEMO01`,
          product: {
            name: productName,
            category: 'General',
            imageUrl: imageUrl || '',
            pricePerUnit: unitPrice,
          },
          qty,
          subtotal: unitPrice * qty,
          tax: +(unitPrice * qty * 0.08).toFixed(2),
          total: +(unitPrice * qty * 1.08).toFixed(2),
          estimatedDelivery: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
          status: 'confirmed',
        };
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const credentials = getAsyncAuthorizationCredentials();
      const accessToken = credentials?.accessToken;

      if (accessToken) {
        headers['Authorization'] = 'Bearer ' + accessToken;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ productId, qty }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        return { error: `Shop API error: ${response.status} ${response.statusText}` };
      }

      if (!response.ok) {
        return data?.detail ?? data;
      }

      const baseUrl = new URL(apiUrl).origin;
      if (data.product?.imageUrl && typeof data.product.imageUrl === 'string') {
        data.product.imageUrl = `${baseUrl}${data.product.imageUrl}`;
      }

      return data;
    },
  }),
);
