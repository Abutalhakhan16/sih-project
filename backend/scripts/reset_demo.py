"""Safe, development-only reset command: deletes the configured demo database then reseeds it."""
import asyncio
from backend.app.database import Base, engine, async_session_factory
from backend.app.services.seed import seed_demo_data

async def reset_demo():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with async_session_factory() as session:
        await seed_demo_data(session)
        await session.commit()
    print("Demo database reset and seeded.")

if __name__ == "__main__": asyncio.run(reset_demo())
