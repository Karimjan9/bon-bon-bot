"""Add menu addon schema.

Revision ID: 20260425_0003
Revises: 20260425_0002
Create Date: 2026-04-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260425_0003"
down_revision: str | None = "20260425_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "menu_item_addons",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ),
    )

    op.create_table(
        "menu_item_addon_groups",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("menu_item_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("min_select", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("max_select", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["menu_item_id"], ["menu_items.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_menu_item_addon_groups_menu_item_id",
        "menu_item_addon_groups",
        ["menu_item_id"],
    )

    op.create_table(
        "menu_item_addon_group_items",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("addon_group_id", sa.BigInteger(), nullable=False),
        sa.Column("addon_id", sa.BigInteger(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["addon_group_id"],
            ["menu_item_addon_groups.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["addon_id"], ["menu_item_addons.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_menu_item_addon_group_items_addon_group_id",
        "menu_item_addon_group_items",
        ["addon_group_id"],
    )
    op.create_index(
        "ix_menu_item_addon_group_items_addon_id",
        "menu_item_addon_group_items",
        ["addon_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_menu_item_addon_group_items_addon_id",
        table_name="menu_item_addon_group_items",
    )
    op.drop_index(
        "ix_menu_item_addon_group_items_addon_group_id",
        table_name="menu_item_addon_group_items",
    )
    op.drop_table("menu_item_addon_group_items")
    op.drop_index(
        "ix_menu_item_addon_groups_menu_item_id",
        table_name="menu_item_addon_groups",
    )
    op.drop_table("menu_item_addon_groups")
    op.drop_table("menu_item_addons")
