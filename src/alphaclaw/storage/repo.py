import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from alphaclaw.storage.models import Brief, Conversation, User, Watchlist


class Repository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # --- Users ---

    async def get_or_create_user(self, channel: str, channel_user_id: str) -> User:
        stmt = select(User).where(User.channel_user_id == channel_user_id)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None:
            user = User(channel=channel, channel_user_id=channel_user_id)
            self.session.add(user)
            await self.session.commit()
            await self.session.refresh(user)
        return user

    # --- Watchlists ---

    async def get_watchlist(self, user_id: uuid.UUID, name: str = "default") -> Watchlist | None:
        stmt = select(Watchlist).where(Watchlist.user_id == user_id, Watchlist.name == name)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert_watchlist(self, user_id: uuid.UUID, tickers: list[str], name: str = "default") -> Watchlist:
        wl = await self.get_watchlist(user_id, name)
        if wl is None:
            wl = Watchlist(user_id=user_id, name=name, tickers=tickers)
            self.session.add(wl)
        else:
            wl.tickers = tickers
        await self.session.commit()
        await self.session.refresh(wl)
        return wl

    # --- Conversations ---

    async def get_conversation(self, user_id: uuid.UUID, channel: str) -> Conversation | None:
        stmt = (
            select(Conversation)
            .where(Conversation.user_id == user_id, Conversation.channel == channel)
            .order_by(Conversation.updated_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_conversation(self, user_id: uuid.UUID, channel: str, messages: list[dict]) -> Conversation:
        conv = await self.get_conversation(user_id, channel)
        if conv is None:
            conv = Conversation(user_id=user_id, channel=channel, messages=messages)
            self.session.add(conv)
        else:
            conv.messages = messages
        await self.session.commit()
        await self.session.refresh(conv)
        return conv

    # --- Briefs ---

    async def save_brief(self, content: str) -> Brief:
        brief = Brief(content=content)
        self.session.add(brief)
        await self.session.commit()
        await self.session.refresh(brief)
        return brief

    async def get_latest_brief(self) -> Brief | None:
        stmt = select(Brief).order_by(Brief.generated_at.desc()).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
