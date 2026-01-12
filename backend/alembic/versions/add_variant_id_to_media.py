"""add variant_id to product_media

Revision ID: add_variant_id_media
Revises: d048331a6f6f
Create Date: 2024-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_variant_id_media'
down_revision = 'd048331a6f6f'
branch_labels = None
depends_on = None


def upgrade():
    # Add variant_id column to product_media table
    op.add_column('product_media', 
        sa.Column('variant_id', sa.Integer(), nullable=True)
    )
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_product_media_variant_id',
        'product_media', 'product_variants',
        ['variant_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade():
    # Remove foreign key constraint
    op.drop_constraint('fk_product_media_variant_id', 'product_media', type_='foreignkey')
    
    # Remove variant_id column
    op.drop_column('product_media', 'variant_id')
