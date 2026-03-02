# Why MySQL (TiDB) for AlphaClaw

## Decision

We use MySQL 8.4 locally and TiDB (MySQL-compatible) in production. TiDB offers a generous free tier, and our workload has no PostgreSQL-specific requirements.

## What we need from the database

| Requirement | MySQL/TiDB support |
|---|---|
| CRUD on 4 tables (users, watchlists, conversations, briefs) | Full |
| JSON columns (preferences, messages, tickers) | Native JSON type since MySQL 5.7 |
| UUID primary keys | `CHAR(32)` via SQLAlchemy `Uuid` type |
| Foreign keys and relationships | Full |
| Timestamps with server defaults | Full |
| Async driver | `aiomysql` |

## PostgreSQL features we do NOT need

- **`LISTEN/NOTIFY`** — real-time push to clients. We use WebSockets via the channel adapters instead.
- **`JSONB` with GIN indexes** — efficient queries *inside* JSON documents. We only store and retrieve whole JSON blobs (chat history, user preferences), never query into them.
- **`ARRAY` columns** — native array type with operators. We store ticker lists as JSON arrays, which works identically.
- **Advanced full-text search** — we use external APIs (Yahoo Finance, SEC EDGAR) for search, not the database.
- **PostGIS / geospatial** — not applicable.
- **Recursive CTEs / advanced window functions** — not used in our queries.

## TiDB compatibility notes

TiDB is wire-compatible with MySQL 5.7/8.0. Relevant differences:

- Foreign key constraints are enforced since TiDB 6.6 (earlier versions parsed but ignored them).
- `AUTO_INCREMENT` behaves differently (non-contiguous). Not relevant since we use application-generated UUIDs.
- Transaction isolation default is Snapshot Isolation (stricter than MySQL's Repeatable Read). No issues for our workload.

## Revisit if

- We need to query deeply into JSON columns (e.g. filter conversations by message content) — PostgreSQL `JSONB` with GIN indexes would be significantly faster.
- We add real-time database-driven push notifications — PostgreSQL `LISTEN/NOTIFY` avoids polling.
- We add full-text search over stored data rather than external APIs.
