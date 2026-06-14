# ChipSeeker Private Web MVP

This version turns IC Seeker into a private paper search and reading-management website.

## Scope

Included in the first private MVP:

- Private admin login with an HTTP-only signed cookie
- Login gate on every page load before the main app is shown
- Local SQLite database with startup migrations
- Paper import by DOI through Crossref metadata
- Manual paper import for private notes or missing metadata
- SQLite FTS5 search with IC-domain alias expansion for lightweight semantic search
- Paper detail page with DOI/source/PDF metadata
- Favorites, reading status, notes, and tags
- Mobile-friendly web layout
- Backend API-key storage with masked display
- Docker and Docker Compose deployment

Deferred for later:

- Public registration
- Multi-user collaboration
- Paid subscriptions
- Team workspaces
- Large crawler operations
- Complex recommendation models

## Local Run

Copy `.env.example` to `.env`, then change `ADMIN_PASSWORD` and `COOKIE_SECRET`.

```powershell
npm start
```

Open `http://127.0.0.1:8750`.

The browser entry page always shows the password screen first. A stale session cookie is cleared on page load, so the main app is shown only after the password is submitted.

## Docker Run

```powershell
copy .env.example .env
notepad .env
npm run docker:up
```

For a server, point your reverse proxy at port `8750` and use HTTPS. Keep `ADMIN_PASSWORD` and `COOKIE_SECRET` private.

## API Surface

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/search`
- `GET /api/papers/:id`
- `PUT /api/private/papers/:id/state`
- `POST /api/import/doi`
- `POST /api/import/manual`
- `GET /api/admin/api-keys`
- `PUT /api/admin/api-keys/:provider`

All data APIs except auth require login.

## Next Serious Upgrades

- Add embedding-backed semantic search using a local vector table or OpenAI embeddings.
- Add ORCID, DBLP, OpenAlex author IDs, and institution normalization before using professor scores seriously.
- Add local PDF parsing with DOI extraction, abstract extraction, and paper-to-note linking.
- Add scheduled new-paper monitoring for IEEE/OpenAlex/Crossref metadata only.
- Add Chinese/English UI toggle and mobile daily-circuit learning cards.
