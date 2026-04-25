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


class CategoryRead(BaseModel):
    id: int
    name: str
    description: str | None = None
    image_url: str | None = None
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class MenuItemVariantRead(BaseModel):
    id: int
    menu_item_id: int
    name: str
    price: Decimal
    weight_grams: int | None = None
    is_default: bool
    is_available: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime


class MenuItemAddonRead(BaseModel):
    id: int
    name: str
    description: str | None = None
    price: Decimal
    is_available: bool
    created_at: datetime
    updated_at: datetime


class MenuItemAddonGroupItemRead(BaseModel):
    id: int
    addon_group_id: int
    addon_id: int
    addon: MenuItemAddonRead
    sort_order: int
    created_at: datetime


class MenuItemAddonGroupRead(BaseModel):
    id: int
    menu_item_id: int
    name: str
    min_select: int
    max_select: int
    is_required: bool
    sort_order: int
    items: list[MenuItemAddonGroupItemRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class MenuItemRead(BaseModel):
    id: int
    category_id: int
    category: CategoryRead
    name: str
    description: str | None = None
    base_price: Decimal
    image_url: str | None = None
    is_available: bool
    is_popular: bool
    is_new: bool
    sort_order: int
    preparation_time_minutes: int | None = None
    calories: int | None = None
    weight_grams: int | None = None
    variants: list[MenuItemVariantRead] = Field(default_factory=list)
    addon_groups: list[MenuItemAddonGroupRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


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
