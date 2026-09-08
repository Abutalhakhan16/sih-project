"""initial Co-opServe relational schema

Revision ID: 0001_initial_schema
"""
from alembic import op
from backend.app.database import Base
from backend.app.models import entities  # noqa: F401
revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None
def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    Base.metadata.create_all(bind=bind)
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE workers ADD COLUMN IF NOT EXISTS location geography(Point, 4326)")
        op.execute("UPDATE workers SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE location IS NULL")
        op.execute("CREATE INDEX IF NOT EXISTS ix_workers_location_geography ON workers USING GIST (location)")
def downgrade(): Base.metadata.drop_all(bind=op.get_bind())
