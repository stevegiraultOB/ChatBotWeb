# Base de Connaissances - EcoBot Chatbot

Ce dossier contient les documents qui alimentent les reponses du chatbot.

## Formats supportes

| Extension | Type de fichier | Ce qui est extrait |
|-----------|----------------|-------------------|
| `.txt`, `.md`, `.csv`, `.json` | Textes | Contenu complet |
| `.docx` | Document Word | Texte brut extrait |
| `.pdf` | PDF | Texte extrait des pages |
| `.jpg`, `.jpeg`, `.png`, `.gif` | Images | Metadata (nom, format, taille) |

## Comment ca marche

1. **Deposez** vos fichiers dans ce dossier `docs/`
2. **Redemarrez** le proxy : `node proxy-server.js`
3. **Testez** en posant une question au chatbot

Le proxy charge automatiquement tous les documents et les injecte
dans le contexte du chatbot avant chaque requete a l'API.

## Limites

- **Taille** : 4000 caracteres maximum par fichier
- **Mise a jour** : Le contenu est re-charge toutes les 60 secondes
- **Images** : Seules les metadata sont extraites (pas le contenu de l'image)

## Conseils

- Nommez vos fichiers clairement : `tarifs-2025.txt`, `faq.txt`
- Un fichier par theme : catalogue, FAQ, politique...
- Utilisez des titres et listes pour une meilleure lecture
- Evitez les fichiers de plus de 8000 caracteres
