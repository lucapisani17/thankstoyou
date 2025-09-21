from flask import Flask, request, jsonify, render_template, redirect, send_from_directory
import sqlite3
import os

app = Flask(__name__, template_folder=".")

DB_PATH = "database.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

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
    
    # Se il nome è cambiato, elimina il vecchio e crea il nuovo
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
    cur.execute("SELECT nome FROM utenti")
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
    return jsonify({"success": True})  # Cambia questo

@app.route('/static/<filename>')
def static_files(filename):
    return send_from_directory('static', filename)
    
if __name__ == "__main__":
    print(">>> Avvio server Flask...")
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)

