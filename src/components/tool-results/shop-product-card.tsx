'use client';

import { useState } from 'react';
import { Search, ShoppingBag } from 'lucide-react';

import { registerToolRenderer, type ToolResultProps } from './registry';

interface ProductInfo {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  pricePerUnit: number;
}

interface SearchResult {
  product: ProductInfo;
  qty: number;
  subtotal: number;
  tax: number;
  total: number;
  estimatedDelivery: string;
  error?: string;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function ShopProductCardContent({ result }: { result: SearchResult }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-card border rounded-lg p-4 mb-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b">
        <Search className="w-5 h-5 text-blue-600" />
        <h3 className="font-medium text-sm text-card-foreground">Product Found</h3>
      </div>

      {/* Product Row */}
      <div className="flex gap-3 mb-4">
        {/* Product Image */}
        <div className="w-16 h-16 shrink-0 rounded overflow-hidden bg-secondary flex items-center justify-center">
          {!imageError && result.product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.product.imageUrl}
              alt={result.product.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <ShoppingBag className="w-6 h-6 text-muted-foreground" />
          )}
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{result.product.name}</p>
          <p className="text-xs text-muted-foreground">{result.product.category}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(result.product.pricePerUnit)} x {result.qty}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-b my-3" />

      {/* Price Breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatCurrency(result.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span className="font-medium">{formatCurrency(result.tax)}</span>
        </div>
        <div className="flex justify-between font-medium text-base">
          <span>Total</span>
          <span>{formatCurrency(result.total)}</span>
        </div>
      </div>
    </div>
  );
}

export function ShopProductCard({ result }: ToolResultProps) {
  if (!result || result.error) {
    return null;
  }

  if (!result.product) {
    return null;
  }

  return <ShopProductCardContent result={result} />;
}

registerToolRenderer('shopSearchTool', ShopProductCard);
