# 🤖 Chatbot Web - EcoVert Solutions

Chatbot conversationnel integre a une page web d'entreprise fictive, alimente par une base de connaissances documentaire.

## 🚀 Lancement rapide

### 1. Lancer le proxy (obligatoire)
```powershell
cd c:\Users\DNCV6498\Documents\Dev\ChatbotWeb
node proxy-server.js
```
Le proxy utilise le SDK OpenAI officiel + votre cle Orange Live Intelligence.

### 2. Ouvrir la page web
- Via VS Code Live Server : clic droit sur `index.html` → "Open with Live Server"
- Ou ouvrez `index.html` directement dans votre navigateur

### 3. Tester le chatbot
- Cliquez sur le bouton 💬 en bas a droite
- Envoyez un message !

## 📚 Base de connaissances

### Ajouter des documents
Deposez vos fichiers dans le dossier `docs/` :
- **`.txt` / `.md`** : Fichiers texte
- **`.docx`** : Documents Word (le texte est extrait automatiquement)
- **`.pdf`** : Fichiers PDF (le texte est extrait automatiquement)
- **`.jpg` / `.png` / `.gif`** : Images (seules les metadata sont extraites)

### Comment ca marche
Le proxy charge automatiquement tous les documents et les injecte dans le contexte du chatbot. Les reponses sont donc enrichies avec les informations contenues dans vos fichiers.

### Exemples de documents
- `docs/catalogue-produits.txt` : Catalogue de produits
- `docs/faq.txt` : Questions frecuentes
- `docs/politique-livraison.pdf` : Politique de livraison
- `docs/presentations.docx` : Documents Word

## ⚙️ Configuration

### Changer le prompt du chatbot
Editez `proxy-server.js` → `systemPrompt` (lignes 14-18)

### Changer la cle API
Editez `proxy-server.js` → `apiKey` (ligne 11)

### Changer l'apparence
Editez `js/config.js` → `appearance` (lignes 81-92)

## 📁 Structure du projet
```
ChatbotWeb/
├── index.html          # Page d'entreprise avec le chatbot
├── css/
│   ├── style.css       # Styles de la page
│   └── chatbot.css     # Styles du chatbot
├── js/
│   ├── config.js       # Configuration du chatbot
│   ├── chatbot.js      # Logique du chatbot (frontend)
│   └── knowledge-base.js # Lecteur de documents (backend)
├── docs/               # 🔵 Base de connaissances (ajoutez vos documents ici)
│   ├── README.md       # Documentation de la base de connaissances
│   ├── catalogue-produits.txt
│   └── faq.txt
├── proxy-server.js     # Proxy local (contourne CORS + proxy corporate)
├── package.json        # Dependances Node.js
└── README.md           # Ce fichier
```

## 🔧 Depannage

### "Script terminated by timeout"
- Ouvrez la console (F12)
- Tapez : `localStorage.removeItem('chatbot_history');`
- Rechargez la page (F5)

### Erreur reseau / CORS
- Assurez-vous que le proxy tourne : `node proxy-server.js`
- Le proxy doit afficher : "Proxy Chatbot -> http://localhost:3456/ai"

### Erreur 403 / 422 API
- Votre cle API Orange est peut-etre expiriee ou sans budget
- Verifiez sur le portail Orange Live Intelligence

### Les documents ne sont pas pris en compte
- Redemarrez le proxy : `node proxy-server.js`
- Les documents sont mis en cache pendant 60 secondes
- Verifiez les logs : `[KB] Documents trouves: X`
