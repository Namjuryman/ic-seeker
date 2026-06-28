# SiliconScope Port Policy

SiliconScope intentionally uses different ports for local development and container production.

## Canonical ports

| Surface | Local development | Docker/container internal | Public production |
| --- | ---: | ---: | --- |
| Backend API | `127.0.0.1:8751` | `siliconscope-api:8750` | `https://api.<domain>` |
| Public frontend | `localhost:5173` | static files served by Caddy/Nginx/CDN | `https://www.<domain>` or root |
| Admin frontend | `localhost:5176` | static files served by Caddy/Nginx/CDN | `https://admin.<domain>` |

## Rules

- Local `start-dev.ps1` and Vite proxy targets use backend `8751`.
- Docker images expose API port `8750` inside the container.
- Host-level Caddy/Nginx examples should reverse proxy to the actual host API port. If you run the backend with `npm start`, that is usually `127.0.0.1:8751`.
- Docker Compose production uses Caddy to talk to `siliconscope-api:8750` inside the Docker network.
- Public users should never be asked to open raw `:8750` or `:8751` URLs; they should use HTTPS domains.

## Why this split exists

The split keeps local development from colliding with old v1 prototypes and keeps Docker images simple. The important thing is to document which layer owns which port instead of mixing them in deployment notes.
