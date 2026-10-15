import os
import sqlite3
import secrets
from pathlib import Path
from flask import Flask, render_template, request, send_from_directory, session

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32)

DATABASE = Path(__file__).resolve().parent / "data" / "sentinel.db"


def init_database():
    DATABASE.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(DATABASE) as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS player_progress (
                player_id TEXT PRIMARY KEY,
                completed INTEGER NOT NULL DEFAULT 0,
                total_penalty INTEGER NOT NULL DEFAULT 0
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS hint_usage (
                player_id TEXT NOT NULL,
                hint_number INTEGER NOT NULL,
                PRIMARY KEY (player_id, hint_number),
                FOREIGN KEY (player_id)
                    REFERENCES player_progress(player_id)
            )
        """)


init_database()


def get_db_connection():
    connection = sqlite3.connect(DATABASE)
    connection.execute("PRAGMA foreign_keys = ON")
    return connection

def get_player_id():
    if "player_id" not in session:
        session["player_id"] = secrets.token_hex(16)

    player_id = session["player_id"]

    with get_db_connection() as connection:
        connection.execute(
            """
            INSERT OR IGNORE INTO player_progress (player_id)
            VALUES (?)
            """,
            (player_id,)
        )

    return player_id

@app.route("/")
def home():
    get_player_id()
    incident = request.args.get("incident")
    ticket = None
    error = None

    if incident:
        if incident.upper() == "INC-4721":
            ticket = {
                "reference": "INC-4721",
                "requester": "R. Perera",
                "category": "Network Monitoring",
                "status": "Closed",
                "attachment": "maintenance-note.txt"
            }
        else:
            error = "Incident not found"

    return render_template(
        "index.html",
        incident=incident,
        ticket=ticket,
        error=error
    )


@app.route("/attachments/<filename>")
def download_attachment(filename):
    return send_from_directory(
        "attachments",
        filename,
        as_attachment=True
    )

@app.route("/use-hint/<int:hint_number>", methods=["POST"])
def use_hint(hint_number):
    if hint_number not in (1, 2, 3):
        return "Invalid hint", 400

    player_id = get_player_id()

    penalties = {1: 0, 2: 5, 3: 10}

    with get_db_connection() as connection:
        connection.execute(
            """
            INSERT OR IGNORE INTO hint_usage (player_id, hint_number)
            VALUES (?, ?)
            """,
            (player_id, hint_number)
        )

        used_hints = [
            row[0]
            for row in connection.execute(
                "SELECT hint_number FROM hint_usage WHERE player_id = ?",
                (player_id,)
            ).fetchall()
        ]

        total_penalty = sum(penalties[hint] for hint in used_hints)

        connection.execute(
            """
            UPDATE player_progress
            SET total_penalty = ?
            WHERE player_id = ?
            """,
            (total_penalty, player_id)
        )

    if hint_number not in used_hints:
        used_hints.append(hint_number)
        session["used_hints"] = used_hints

    penalties = {1: 0, 2: 5, 3: 10}
    total_penalty = sum(penalties[hint] for hint in used_hints)

    if hint_number == 2:
        return (
        f"Hint 2 recorded. Total penalty: {total_penalty} points. "
        "Hint: Search for INC-4721 and check the attachment in the incident ticket."
        )

    if hint_number == 3:
        return (
        f"Hint 3 recorded. Total penalty: {total_penalty} points. "
        "Hint: Open maintenance-note.txt and look for the Stage Verification entry."
        )

    return f"Hint {hint_number} recorded. Total penalty: {total_penalty} points."

@app.route("/submit-flag", methods=["POST"])
def submit_flag():
    submitted_flag = request.form.get("flag", "").strip()

    flag_file = Path(__file__).resolve().parents[3] / "organizer" / "flags" / "os02_flag.txt"
    expected_flag = flag_file.read_text(encoding="utf-8").strip()

    if submitted_flag == expected_flag:
        player_id = get_player_id()

        with get_db_connection() as connection:
            connection.execute(
            """
            UPDATE player_progress
            SET completed = 1
            WHERE player_id = ?
            """,
            (player_id,)
            )

        return "Correct flag! OS-02 completed."

    return "Incorrect flag."

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)