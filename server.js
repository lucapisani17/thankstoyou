const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessioni
app.use(
  session({
    secret: "supersegreto",
    resave: false,
    saveUninitialized: true,
  })
);

// CSS inline condiviso
const cssInline = `
<style>
  body {
    font-family: 'Poppins', sans-serif;
    margin: 0;
    padding: 0;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #ff9a9e, #fad0c4);
    animation: bgShift 10s ease infinite alternate;
  }
  @keyframes bgShift {
    0% {background-position: 0% 50%;}
    50% {background-position: 100% 50%;}
    100% {background-position: 0% 50%;}
  }
  .container {
    background: rgba(255,255,255,0.95);
    padding: 40px;
    border-radius: 20px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.15);
    text-align: center;
    width: 90%;
    max-width: 400px;
    transition: transform 0.3s;
  }
  .container:hover { transform: scale(1.05); }
  input[type="text"], input[type="password"] {
    padding: 12px;
    font-size: 16px;
    border-radius: 10px;
    border: 1px solid #ccc;
    width: 100%;
    margin-bottom: 20px;
    box-sizing: border-box;
  }
  button {
    padding: 12px 20px;
    font-size: 16px;
    border-radius: 10px;
    border: none;
    background: #6c63ff;
    color: white;
    cursor: pointer;
    width: 100%;
    transition: background 0.3s, transform 0.2s;
    margin-top: 10px;
    box-sizing: border-box;
  }
  button:hover { background: #574fd6; transform: scale(1.05); }
  button:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }
  .test-btn {
    background: #ff6b6b !important;
  }
  .test-btn:hover {
    background: #ff5252 !important;
  }
  #elencoNomi {
    margin-top: 15px;
    transition: all 0.4s ease;
    opacity: 0;
    max-height: 0;
    overflow: hidden;
  }
  #elencoNomi.visible {
    opacity: 1;
    max-height: 500px;
  }
  #elencoNomi ul { 
    padding-left: 20px; 
    text-align: left;
    margin: 10px 0;
  }
  #elencoNomi li {
    margin: 5px 0;
    padding: 5px;
    background: rgba(108, 99, 255, 0.1);
    border-radius: 5px;
  }
  .loading, .error {
    margin: 10px 0;
    padding: 10px;
    border-radius: 5px;
  }
  .loading {
    color: #6c63ff;
    font-style: italic;
    background: rgba(108, 99, 255, 0.1);
  }
  .error {
    color: #ff4444;
    background: rgba(255, 68, 68, 0.1);
  }
  a { color: #6c63ff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .footer { margin-top: 20px; font-size: 14px; color: #555; }
  .debug {
    margin-top: 15px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 5px;
    font-size: 12px;
    text-align: left;
  }
</style>
`;

// Admin credentials
const ADMIN_USER = "admin";
const ADMIN_PASS = "password123";

// DB setup
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) console.error(err.message);
  console.log("✅ Database connesso");
});

// Crea tabella se non esiste
db.run(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  message TEXT
)`);

// Dati iniziali
db.get("SELECT COUNT(*) AS count FROM messages", (err, row) => {
  if (row && row.count === 0) {
    db.run(`INSERT INTO messages (name, message) VALUES
      ('Alice', 'Ciao Alice! Benvenuta nella web app.'),
      ('Marco', 'Hey Marco, buon lavoro!'),
      ('Giulia', 'Bentornata Giulia, che bello rivederti!')`);
  }
});

// Middleware admin
function requireLogin(req, res, next) {
  if (req.session.loggedIn) next();
  else res.redirect("/login");
}

// ------------------ Pagine ------------------

// Index con pulsante elenco
// Index con pulsante elenco
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Messaggi Personalizzati</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
      ${cssInline}
    </head>
    <body>
      <div class="container">
        <h1>Inserisci il tuo nome</h1>
        <form id="nomeForm" action="/cerca" method="post">
          <input type="text" name="nome" id="nome" placeholder="Es. Marco" required>
          <button type="submit">Mostra il messaggio</button>
        </form>

        <button id="mostraElenco" type="button">📋 Elenco ringraziati</button>
        <div id="elencoNomi"></div>

        <div class="footer">💌 Divertiti a scoprire il tuo messaggio personalizzato!</div>
      </div>

      <script>
        const form = document.getElementById("nomeForm");
        const input = document.getElementById("nome");
        const btnElenco = document.getElementById("mostraElenco");
        const divElenco = document.getElementById("elencoNomi");

        let elencoVisibile = false;
        let nomiCache = null;

        form.addEventListener("submit", (e) => {
          if(input.value.trim() === "") {
            e.preventDefault();
            alert("Inserisci prima un nome valido!");
          }
        });

        function mostraLista() {
          divElenco.classList.add('visible');
          btnElenco.textContent = "❌ Nascondi elenco";
          elencoVisibile = true;
        }

        function nascondiLista() {
          divElenco.classList.remove('visible');
          btnElenco.textContent = "📋 Elenco ringraziati";
          elencoVisibile = false;
        }

        btnElenco.addEventListener("click", () => {
          if (!elencoVisibile) {
            if (!nomiCache) {
              divElenco.innerHTML = '<div class="loading">⏳ Caricamento nomi...</div>';
              divElenco.classList.add('visible');
              fetch("/nomi")
                .then(res => res.json())
                .then(data => {
                  if (Array.isArray(data) && data.length > 0) {
                    nomiCache = data;
                    divElenco.innerHTML = "<ul>" + data.map(nome => \`<li>\${nome}</li>\`).join("") + "</ul>";
                  } else {
                    divElenco.innerHTML = '<div class="error">❌ Nessun nome nel database</div>';
                  }
                  mostraLista();
                })
                .catch(err => {
                  divElenco.innerHTML = \`<div class="error">❌ Errore: \${err.message}</div>\`;
                  mostraLista();
                });
            } else {
              divElenco.innerHTML = "<ul>" + nomiCache.map(nome => \`<li>\${nome}</li>\`).join("") + "</ul>";
              mostraLista();
            }
          } else {
            nascondiLista();
          }
        });

        // Animazione sfondo dinamico
        let hue = 0;
        setInterval(() => {
          document.body.style.background = \`linear-gradient(135deg, hsl(\${hue}, 80%, 70%), hsl(\${(hue+60)%360}, 80%, 65%))\`;
          hue = (hue + 1) % 360;
        }, 100);
      </script>
    </body>
    </html>
  `);
});

// Ricerca messaggio
app.post("/cerca", (req, res) => {
  const nome = req.body.nome;
  db.get("SELECT message FROM messages WHERE name = ?", [nome], (err, row) => {
    const messaggio = row ? row.message : `Nessun messaggio trovato per ${nome}`;
    res.send(`
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <title>Messaggio</title>
        ${cssInline}
      </head>
      <body>
        <div class="container">
          <h1>${messaggio}</h1>
          <a href="/">Torna indietro</a>
        </div>
      </body>
      </html>
    `);
  });
});

// Login
app.get("/login", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <title>Login Admin</title>
      ${cssInline}
    </head>
    <body>
      <div class="container">
        <h1>Login Admin</h1>
        <form action="/login" method="post">
          <input type="text" name="username" placeholder="Username" required>
          <input type="password" name="password" placeholder="Password" required>
          <button type="submit">Accedi</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.loggedIn = true;
    res.redirect("/admin");
  } else {
    res.send(`
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <title>Login fallito</title>
        ${cssInline}
      </head>
      <body>
        <div class="container">
          <h1>❌ Credenziali errate</h1>
          <a href="/login">Riprova</a>
        </div>
      </body>
      </html>
    `);
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// Admin panel
app.get("/admin", requireLogin, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <title>Admin</title>
      ${cssInline}
    </head>
    <body>
      <div class="container">
        <h1>Admin Panel</h1>
        <form action="/admin/add" method="post">
          <input type="text" name="nome" placeholder="Nome" required>
          <input type="text" name="messaggio" placeholder="Messaggio" required>
          <button type="submit">Aggiungi / Aggiorna</button>
        </form>
        <a href="/">Vai alla pagina principale</a>
        <a href="/logout">Logout</a>
      </div>
    </body>
    </html>
  `);
});

// Inserimento / aggiornamento messaggio
app.post("/admin/add", requireLogin, (req, res) => {
  const { nome, messaggio } = req.body;
  db.run(
    "INSERT OR REPLACE INTO messages (name, message) VALUES (?, ?)",
    [nome, messaggio],
    (err) => {
      if (err) {
        res.send(`
          <!DOCTYPE html>
          <html lang="it">
          <head><meta charset="UTF-8"><title>Errore</title>${cssInline}</head>
          <body>
            <div class="container">
              <h1>❌ Errore durante l'inserimento!</h1>
              <a href="/admin">Torna indietro</a>
            </div>
          </body>
          </html>
        `);
      } else {
        res.send(`
          <!DOCTYPE html>
          <html lang="it">
          <head><meta charset="UTF-8"><title>Successo</title>${cssInline}</head>
          <body>
            <div class="container">
              <h1>✅ Messaggio per ${nome} salvato con successo!</h1>
              <a href="/admin">Torna indietro</a>
              <a href="/logout">Logout</a>
            </div>
          </body>
          </html>
        `);
      }
    }
  );
});

// Route JSON nomi
app.get("/nomi", (req, res) => {
  // Disabilita cache per evitare problemi 304
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  db.all("SELECT name FROM messages", (err, rows) => {
    if (err) return res.json({ error: "Errore DB" });
    const nomi = rows.map(r => r.name);
    console.log('🔍 Invio nomi:', nomi); // Debug lato server
    res.json(nomi);
  });
});

// Avvio server
app.listen(PORT, () => {
  console.log(`🚀 Server avviato su http://localhost:${PORT}`);
});