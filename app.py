from flask import Flask, request, jsonify, render_template, redirect, send_from_directory
import sqlite3
import os
from functools import wraps

app = Flask(__name__, template_folder=".")

DB_PATH = "database.db"
MAINTENANCE_FILE = "maintenance.flag"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def is_maintenance_mode():
    """Controlla se il file di manutenzione esiste"""
    return os.path.exists(MAINTENANCE_FILE)

def maintenance_check(f):
    """Decorator per controllare la modalità manutenzione"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Permetti sempre l'accesso agli endpoint di controllo manutenzione
        if request.endpoint in ['toggle_maintenance', 'maintenance_status', 'maintenance_page']:
            return f(*args, **kwargs)
        
        # Permetti l'accesso ai file statici
        if request.endpoint == 'static_files':
            return f(*args, **kwargs)
            
        # Se siamo in manutenzione, reindirizza alla pagina di manutenzione
        if is_maintenance_mode():
            return render_template('maintenance.html'), 503
            
        return f(*args, **kwargs)
    return decorated_function

# Applica il controllo manutenzione a tutte le route
@app.before_request
def check_maintenance():
    # Permetti sempre l'accesso agli endpoint di controllo manutenzione
    if request.endpoint in ['toggle_maintenance', 'maintenance_status', 'maintenance_page']:
        return
    
    # Permetti l'accesso ai file statici
    if request.endpoint == 'static_files':
        return
        
    # Se siamo in manutenzione, mostra la pagina di manutenzione
    if is_maintenance_mode():
        return render_template('maintenance.html'), 503

# Assicuriamoci che esista la tabella
def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS utenti (
            nome TEXT PRIMARY KEY,
            messaggio TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

# === ROUTE DI CONTROLLO MANUTENZIONE ===
@app.route("/maintenance/toggle", methods=["POST"])
def toggle_maintenance():
    """Attiva/disattiva la modalità manutenzione"""
    if is_maintenance_mode():
        # Disattiva manutenzione
        try:
            os.remove(MAINTENANCE_FILE)
            return jsonify({"status": "disabled", "message": "Modalità manutenzione disattivata"})
        except OSError:
            return jsonify({"error": "Impossibile disattivare la manutenzione"}), 500
    else:
        # Attiva manutenzione
        try:
            with open(MAINTENANCE_FILE, 'w') as f:
                f.write("maintenance mode enabled")
            return jsonify({"status": "enabled", "message": "Modalità manutenzione attivata"})
        except OSError:
            return jsonify({"error": "Impossibile attivare la manutenzione"}), 500

@app.route("/maintenance/status")
def maintenance_status():
    """Controlla lo status della manutenzione"""
    return jsonify({
        "maintenance_mode": is_maintenance_mode(),
        "status": "enabled" if is_maintenance_mode() else "disabled"
    })

@app.route("/maintenance")
def maintenance_page():
    """Mostra la pagina di manutenzione (sempre accessibile)"""
    return render_template('maintenance.html'), 503

# === ROUTE ORIGINALI ===
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/admin")
def admin():
    return render_template("admin.html")

@app.route("/admin/all", methods=["GET"])
def get_all_messages():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT nome, messaggio FROM utenti ORDER BY nome")
    messages = [{"nome": row["nome"], "messaggio": row["messaggio"]} for row in cur.fetchall()]
    conn.close()
    return jsonify(messages)

@app.route("/admin/delete", methods=["POST"])
def delete_message():
    data = request.get_json()
    nome = data.get("nome", "").strip()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM utenti WHERE nome = ?", (nome,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route("/admin/update", methods=["POST"])
def update_message():
    data = request.get_json()
    old_nome = data.get("old_nome", "").strip()
    new_nome = data.get("new_nome", "").strip()
    new_messaggio = data.get("new_messaggio", "").strip()
    
    conn = get_db()
    cur = conn.cursor()
    
    if old_nome != new_nome:
        cur.execute("DELETE FROM utenti WHERE nome = ?", (old_nome,))
    
    cur.execute("INSERT OR REPLACE INTO utenti (nome, messaggio) VALUES (?, ?)", (new_nome, new_messaggio))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route("/cerca", methods=["POST"])
def cerca():
    data = request.get_json()
    nome = data.get("nome", "").strip()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT messaggio FROM utenti WHERE nome = ?", (nome,))
    row = cur.fetchone()
    conn.close()
    if row:
        return jsonify({"messaggio": row["messaggio"]})
    else:
        return jsonify({"messaggio": f"Nessun messaggio trovato per {nome}."})

@app.route("/nomi")
def nomi():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT nome FROM utenti ORDER BY rowid")
    nomi = [row["nome"] for row in cur.fetchall()]
    conn.close()
    return jsonify(nomi)

@app.route("/admin/add", methods=["POST"])
def add():
    nome = request.form["nome"].strip()
    messaggio = request.form["messaggio"].strip()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("INSERT OR REPLACE INTO utenti (nome, messaggio) VALUES (?, ?)", (nome, messaggio))
    conn.commit()
    conn.close()
    print(f"[DB] Salvato: {nome} → {messaggio}")
    return jsonify({"success": True})

@app.route('/static/<filename>')
def static_files(filename):
    return send_from_directory('static', filename)
    
if __name__ == "__main__":
    print(">>> Avvio server Flask...")
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)