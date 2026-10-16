import os
from pathlib import Path
from flask import Flask, render_template, request, send_from_directory

app = Flask(__name__)

@app.route("/")
def home():
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

@app.route("/verify-evidence", methods=["POST"])
def verify_evidence():
    window = request.form.get("maintenance_window", "").strip()
    account = request.form.get("maintenance_account", "").strip()

    if window != "23:30-00:15" or account.lower() != "ops_readonly":
        return "Evidence verification failed. Review the maintenance record.", 400

    flag_file = (
        Path(__file__).resolve().parents[3]
        / "organizer" / "flags" / "os02_flag.txt"
    )

    if not flag_file.is_file():
        return "Challenge not configured. Run setup_flags.py first.", 503

    flag = flag_file.read_text(encoding="utf-8").strip()
    return (
        "Evidence verified successfully! "
        f"OS-02 Flag: {flag} "
        "Submit this flag on the main Sentinel dashboard."
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)