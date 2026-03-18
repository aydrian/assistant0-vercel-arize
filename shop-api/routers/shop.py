import json
import random
import string
from datetime import datetime, timedelta
from pathlib import Path
from fastapi import APIRouter, HTTPException
from rapidfuzz import fuzz

from models import ProductInfo, OrderRequest, OrderResponse, ErrorResponse

router = APIRouter()

# Load catalog at module level
CATALOG_PATH = Path(__file__).parent.parent / "data" / "catalog.json"
with open(CATALOG_PATH, "r") as f:
    CATALOG = json.load(f)

# Build a searchable index
CATALOG_INDEX = {item["id"]: item for item in CATALOG}


def fuzzy_match_product(query: str, threshold: int = 60) -> dict | None:
    """Find product using fuzzy matching."""
    best_match = None
    best_score = threshold

    for product in CATALOG:
        name_score = fuzz.token_set_ratio(query.lower(), product["name"].lower())
        id_score = fuzz.token_set_ratio(query.lower(), product["id"].lower())
        max_score = max(name_score, id_score)

        if max_score > best_score:
            best_score = max_score
            best_match = product

    return best_match


def generate_order_id() -> str:
    """Generate order ID: ORD-YYYYMMDD-XXXXXX"""
    date_str = datetime.now().strftime("%Y%m%d")
    random_str = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"ORD-{date_str}-{random_str}"


@router.post("/shop", response_model=OrderResponse)
async def create_order(request: OrderRequest):
    """
    Process an order request.

    - Fuzzy match product by name or ID (threshold >= 60)
    - If no match: return 404 with suggestions
    - If priceLimit set and total exceeds it: return 422 with price details
    - Apply 8% tax and return OrderResponse
    """
    product = fuzzy_match_product(request.product)

    if not product:
        # No match found - return suggestions
        suggestions = [p["name"] for p in CATALOG[:3]]
        raise HTTPException(
            status_code=404,
            detail={
                "error": "Product not found",
                "query": request.product,
                "suggestion": suggestions,
            },
        )

    # Calculate totals
    price_per_unit = product["price"]
    subtotal = price_per_unit * request.qty
    tax = subtotal * 0.08
    total = subtotal + tax

    # Check price limit
    if request.priceLimit and total > request.priceLimit:
        product_info = ProductInfo(
            id=product["id"],
            name=product["name"],
            category=product["category"],
            price=product["price"],
            image=f"/static/images/{product['image']}",
        )
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Order exceeds price limit",
                "product": product_info.model_dump(),
                "qty": request.qty,
                "subtotal": round(subtotal, 2),
                "tax": round(tax, 2),
                "total": round(total, 2),
                "priceLimit": request.priceLimit,
            },
        )

    # Generate order response
    product_info = ProductInfo(
        id=product["id"],
        name=product["name"],
        category=product["category"],
        price=product["price"],
        image=f"/static/images/{product['image']}",
    )

    estimated_delivery = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")

    return OrderResponse(
        orderId=generate_order_id(),
        product=product_info,
        qty=request.qty,
        subtotal=round(subtotal, 2),
        tax=round(tax, 2),
        total=round(total, 2),
        estimatedDelivery=estimated_delivery,
        status="confirmed",
    )
