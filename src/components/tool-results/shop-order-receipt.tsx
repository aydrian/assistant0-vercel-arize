'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Package, ShoppingBag, AlertCircle } from 'lucide-react';

import { registerToolRenderer, type ToolResultProps } from './registry';

interface ProductInfo {
  name: string;
  category: string;
  imageUrl: string;
  pricePerUnit: number;
}

interface OrderResult {
  orderId: string;
  product: ProductInfo;
  qty: number;
  subtotal: number;
  tax: number;
  total: number;
  estimatedDelivery: string;
  status: string;
  error?: string;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDeliveryDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'EEEE, MMM d, yyyy');
  } catch {
    return dateString;
  }
}

function ShopOrderReceiptContent({ order }: { order: OrderResult }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-card border rounded-lg p-4 mb-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b">
        <CheckCircle2 className="w-5 h-5 text-green-600" />
        <h3 className="font-medium text-sm text-card-foreground">Order Confirmed</h3>
      </div>

      {/* Product Row */}
      <div className="flex gap-3 mb-4">
        {/* Product Image */}
        <div className="w-16 h-16 shrink-0 rounded overflow-hidden bg-secondary flex items-center justify-center">
          {!imageError && order.product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={order.product.imageUrl}
              alt={order.product.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <ShoppingBag className="w-6 h-6 text-muted-foreground" />
          )}
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{order.product.name}</p>
          <p className="text-xs text-muted-foreground">{order.product.category}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(order.product.pricePerUnit)} x {order.qty}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-b my-3" />

      {/* Price Breakdown */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatCurrency(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span className="font-medium">{formatCurrency(order.tax)}</span>
        </div>
        <div className="flex justify-between font-medium text-base">
          <span>Total</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-b my-3" />

      {/* Footer Info */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Package className="w-3.5 h-3.5 shrink-0" />
          <span>Est. delivery: {formatDeliveryDate(order.estimatedDelivery)}</span>
        </div>
        <p className="text-muted-foreground">Order #{order.orderId}</p>
      </div>
    </div>
  );
}

export function ShopOrderReceipt({ result }: ToolResultProps) {
  if (!result) {
    return (
      <div className="bg-card border rounded-lg p-4 mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-muted-foreground">No order information available</p>
        </div>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="bg-card border border-red-200 rounded-lg p-4 mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-600">{result.error}</p>
        </div>
      </div>
    );
  }

  return <ShopOrderReceiptContent order={result} />;
}

registerToolRenderer('shopOnlineTool', ShopOrderReceipt);
