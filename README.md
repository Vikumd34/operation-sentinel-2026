# Operation Sentinel 2026

## Project Overview
Operation Sentinel 2026 is a six-stage cybersecurity Capture the Flag (CTF) project developed for IE3132 Penetration Testing.

Players investigate a simulated security incident by completing six connected challenges.

## CTF Challenges
- OS-01: Initial investigation
- OS-02: Helpdesk ticket investigation
- OS-03: Security event investigation
- OS-04: Missing network packet
- OS-05: Backup system investigation
- OS-06: Final Sentinel investigation

## Web Platform
The platform is built with Node.js and includes:
- Player registration and login
- Logout and persistent login sessions
- Six challenge stages
- Flag validation
- Automatic scoring
- Hints and point penalties
- Challenge progression
- Player progress saving
- Player and administrator reset functions

## How to Run
Requirements: Node.js 18 or newer.

Open PowerShell:

    cd platform\sentinel-web
    node server.js

Open the website:

    http://127.0.0.1:8080

## Run Tests
From the platform\sentinel-web folder:

    npm test

The existing automated test suite contains 8 tests.

## Project Folders
- challenges/ - CTF challenge materials
- platform/ - Web platform
- organizer/ - Organizer resources
- testing/ - Testing materials
- docs/ - Project documentation

## Current Integration Status
- Member 02 and Member 03 challenge folders are available.
- Member 04 Node.js platform is merged into main.
- The existing 8 platform tests pass.
- Docker configuration has not yet been found in the repository.
- Final challenge integration and end-to-end testing are pending.

## Security Notes
Keep real challenge flags, account data, passwords, and administrator secrets out of GitHub.

## Team Project
IE3132 Penetration Testing - SLIIT

## Docker Deployment (Member 01)

Requirements:
- Docker Desktop with Docker Engine running

Build and start from the repository root:

docker compose -f platform/sentinel-web/compose.yaml up -d --build

Open:
http://127.0.0.1:8081

Health check:
http://127.0.0.1:8081/api/health

Expected: ok=true, stages=6, flagsLoaded=true.

The local organiser_only/flags.json file must exist before starting.
It is mounted read-only and is not included in the Docker image.

Security configuration:
- Container runs as non-root user "node"
- Host port is bound to 127.0.0.1:8081
- Linux capabilities are dropped
- Privilege escalation is disabled
- Organizer flags are mounted read-only

Restart:
docker compose -f platform/sentinel-web/compose.yaml restart

Stop:
docker compose -f platform/sentinel-web/compose.yaml down

Player reset:
Use the platform's authenticated player reset feature.
Stopping or restarting Docker does not intentionally reset player progress.

Note: This Docker setup runs the Node.js CTF web platform.
Full isolation of any separate challenge services must be verified independently.
## Fresh Clone Setup (Organizer / Lecturer)

Requirements: Node.js 18+, Python 3.

From the repository root:

1. Run: python setup_flags.py
2. Run: cd platform/sentinel-web
3. Run: node server.js
4. Open: http://127.0.0.1:8080

Docker alternative (from repository root, after step 1):
docker compose -f platform/sentinel-web/compose.yaml up -d --build
Open: http://127.0.0.1:8081

Keep generated private flags secret. Do not commit them.
Players should access the hosted challenges, not organizer files.

## OS-02 Sentinel Helpdesk Setup

OS-02 requires a separate local Flask Helpdesk service.

Requirements: Python 3 and Flask.

First, run python setup_flags.py from the repository root.

Terminal 1 - Start the main Sentinel dashboard:

    cd platform\sentinel-web
    node server.js

Dashboard URL: http://127.0.0.1:8080

Terminal 2 - Start the Helpdesk from the repository root:

    python -m pip install flask
    python .\challenges\os02_ticket_4721\helpdesk_web\app.py

Helpdesk URL: http://127.0.0.1:5000

After unlocking OS-02, click OPEN SENTINEL HELPDESK
on the main dashboard.

Investigate the ticket, verify the evidence, and submit
the recovered flag on the main dashboard.

Docker Compose currently starts only the Node.js dashboard.
The Flask Helpdesk must be started separately.
