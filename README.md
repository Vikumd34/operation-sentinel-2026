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