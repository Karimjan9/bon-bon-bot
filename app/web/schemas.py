from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

OrderStatus = Literal["new", "processing", "done", "cancelled"]


class OrderCreate(BaseModel):
    product: str = Field(min_length=1, max_length=120)
    quantity: int = Field(default=1, ge=1)
    note: str = ""
    customer_name: str | None = None
    customer_phone: str | None = None
    delivery_address: str | None = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class UserRead(BaseModel):
    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None


class ProductCategoryRead(BaseModel):
    id: int
    title: str
    slug: str


class ProductRead(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    price: Decimal
    currency: str
    image_url: str | None = None
    category: ProductCategoryRead | None = None


class OrderItemRead(BaseModel):
    product_title: str
    product_slug: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal


class OrderRead(BaseModel):
    id: int
    status: str
    note: str
    customer_name: str | None = None
    customer_phone: str | None = None
    delivery_address: str | None = None
    total_amount: Decimal
    currency: str
    created_at: datetime
    items: list[OrderItemRead]
    user: UserRead | None = None


class MeRead(BaseModel):
    is_admin: bool
    user: UserRead | None = None


class AdminStatsRead(BaseModel):
    total_orders: int
    new_orders: int
    processing_orders: int
    done_orders: int
    revenue: str
