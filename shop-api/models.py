from pydantic import BaseModel
from typing import Optional


class ProductInfo(BaseModel):
    id: str
    name: str
    category: str
    price: float
    image: str


class OrderRequest(BaseModel):
    product: str
    qty: int
    priceLimit: Optional[float] = None


class OrderResponse(BaseModel):
    orderId: str
    product: ProductInfo
    qty: int
    subtotal: float
    tax: float
    total: float
    estimatedDelivery: str
    status: str


class ErrorResponse(BaseModel):
    error: str
    query: Optional[str] = None
    suggestion: Optional[list[str]] = None
    product: Optional[ProductInfo] = None
