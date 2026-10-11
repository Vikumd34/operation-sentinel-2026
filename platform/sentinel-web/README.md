# Operation Sentinel 2026 — CTF Lab Front-End & Platform Layer
IE3132 Penetration Testing · SLIIT. Dependency-free (Node ≥ 18).

## Run
    cp .env.example .env   # optional; export ADMIN_TOKEN=... to enable admin endpoints
    node server.js         # http://127.0.0.1:8080
    npm test               # 8 API tests (progression, bypass, wrong flags, hints, reset, admin auth, rate limit)

## What is implemented (verified by `npm test`)
- Six stages (IDs, titles, domains, difficulty, points, hints, penalties) taken from the four Assignment 01 reports.
- Server-side flag check (trimmed, constant-time). Flags live only in `organiser_only/flags.json` (git-ignored); never sent to the browser.
- Prerequisites enforced on the server (locked stages return 403 and leak no objective text), hints must be unlocked in order, duplicate solves score once.
- Player reset (own progress); admin reset (`POST /api/admin/reset`, header `x-admin-token`) and `GET /api/admin/status` (activity log). Admin is disabled unless ADMIN_TOKEN is set. Binds to 127.0.0.1 by default.
- Front-end: animated mesh background (mouse parallax, hue/density change with scroll), tilt cards, terminal intro, colour-match game (Euclidean RGB), reduced-motion support.

## NOT implemented / out of scope
- The challenge artefacts and containers (screenshot, helpdesk portal, logs, PCAP, OS-05/06 Linux nodes), Docker Compose, Nginx, network zones, Redis/MariaDB: none were in the uploads. This app only records progress.
- "Reset" here resets platform progress, not challenge containers/evidence. Wire your own reset scripts in later.
- OS-01 documents only two hint texts (third hint penalty exists in Member 4's table but no text); hint wording is paraphrased from the specs.
- No React/GSAP/Three.js (no network when built); canvas + CSS only. Admin has a single shared token, not production auth.

## Acknowledge in your demo/README
Design from the four IE3132 Assignment 01 reports. Built with AI assistance; check your course's AI rules before using it in the recorded demonstration.
