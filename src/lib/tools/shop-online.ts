import { tool } from 'ai';
import { z } from 'zod';

import { getAsyncAuthorizationCredentials } from '@auth0/ai-vercel';
import { withAsyncAuthorization } from '../auth0-ai';

export const shopOnlineTool = withAsyncAuthorization(
  tool({
    description: 'Tool to buy products online',
    inputSchema: z.object({
      product: z.string(),
      qty: z.number(),
      priceLimit: z.number().optional(),
    }),
    execute: async ({ product, qty, priceLimit }) => {
      console.log(`Ordering ${qty} ${product} with price limit ${priceLimit}`);

      const apiUrl = process.env['SHOP_API_URL'];

      if (!apiUrl) {
        // No API set, mock a response
        return {
          orderId: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-DEMO01`,
          product: {
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
          status: 'confirmed',
        };
      }

      const headers = {
        'Content-Type': 'application/json',
        Authorization: '',
      };
      const body = {
        product,
        qty,
        priceLimit,
      };

      const credentials = getAsyncAuthorizationCredentials();
      const accessToken = credentials?.accessToken;

      if (accessToken) {
        headers['Authorization'] = 'Bearer ' + accessToken;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
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
