FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Install deps first (cache layer)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy source
COPY . .
RUN uv sync --frozen --no-dev

# Run migrations then start
CMD ["sh", "-c", "uv run alembic upgrade head && uv run alphaclaw"]
