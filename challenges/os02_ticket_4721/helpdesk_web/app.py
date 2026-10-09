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

@app.route("/submit-flag", methods=["POST"])
def submit_flag():
    submitted_flag = request.form.get("flag", "").strip()

    flag_file = Path(__file__).resolve().parents[3] / "organizer" / "flags" / "os02_flag.txt"
    expected_flag = flag_file.read_text(encoding="utf-8").strip()

    if submitted_flag == expected_flag:
        return "Correct flag! OS-02 completed."

    return "Incorrect flag."

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)