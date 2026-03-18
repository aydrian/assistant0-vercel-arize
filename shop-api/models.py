from pydantic import BaseModel, Field


class ProductInfo(BaseModel):
    id: str
    name: str
    category: str
    pricePerUnit: float
    imageUrl: str


class OrderRequest(BaseModel):
    product: str = Field(..., min_length=1)
    qty: int = Field(..., gt=0)
    priceLimit: float | None = Field(None, gt=0)


class OrderResponse(BaseModel):
    orderId: str
    product: ProductInfo
    qty: int
    subtotal: float
    tax: float
    total: float
    estimatedDelivery: str
    status: str
