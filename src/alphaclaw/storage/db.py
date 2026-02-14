from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from alphaclaw.config import settings


def _async_url(url: str) -> str:
    """Ensure the URL uses the asyncpg driver."""
    return url.replace("postgresql://", "postgresql+asyncpg://", 1)


engine = create_async_engine(_async_url(settings.database_url), echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
