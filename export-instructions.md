# Guide d'exportation de Golf Performance Tracker en local

Ce guide vous explique comment exporter et exécuter l'application Golf Performance Tracker sur votre machine locale.

## Prérequis

- Node.js (version 18 ou supérieure)
- npm (inclus avec Node.js)
- Git (optionnel, pour le versionnement)
- Un compte Supabase (gratuit) pour la base de données

## Étape 1 : Télécharger le code source

Vous pouvez télécharger le code source de l'application de deux façons :

1. **Via l'interface StackBlitz** : Cliquez sur le bouton "Download Project" dans le menu de StackBlitz.
2. **Via le terminal** : Si vous avez Git installé, vous pouvez cloner le dépôt.

## Étape 2 : Configurer Supabase

1. Créez un compte sur [Supabase](https://supabase.com/) si vous n'en avez pas déjà un.
2. Créez un nouveau projet dans Supabase.
3. Notez l'URL de votre projet et la clé API anonyme (anon key).
4. Dans le répertoire du projet téléchargé, créez un fichier `.env` à la racine avec le contenu suivant :

```
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon_supabase
```

## Étape 3 : Configurer la base de données

1. Dans l'interface Supabase, allez dans l'onglet "SQL Editor".
2. Exécutez les scripts de migration qui se trouvent dans le dossier `supabase/migrations` de votre projet.
3. Exécutez les scripts dans l'ordre chronologique (selon les dates dans les noms de fichiers).

## Étape 4 : Installer les dépendances et démarrer l'application

1. Ouvrez un terminal dans le répertoire du projet.
2. Installez les dépendances :

```bash
npm install
```

3. Démarrez l'application en mode développement :

```bash
npm run dev
```

4. Votre application devrait maintenant être accessible à l'adresse `http://localhost:5173`.

## Étape 5 : Construire pour la production (optionnel)

Si vous souhaitez déployer l'application en production :

1. Construisez l'application :

```bash
npm run build
```

2. Le résultat de la construction se trouvera dans le dossier `dist`.
3. Vous pouvez servir ce dossier avec n'importe quel serveur web statique.

## Dépannage

### Problèmes de connexion à Supabase

Si vous rencontrez des erreurs de connexion à Supabase :

1. Vérifiez que les variables d'environnement dans le fichier `.env` sont correctes.
2. Assurez-vous que votre projet Supabase est actif.
3. Vérifiez que les scripts de migration ont été exécutés correctement.

### Problèmes d'authentification

Si vous rencontrez des problèmes d'authentification :

1. Dans l'interface Supabase, allez dans Authentication > Settings.
2. Assurez-vous que "Email auth" est activé.
3. Ajoutez votre domaine local (http://localhost:5173) dans la liste des URL de redirection.

## Personnalisation

Vous pouvez personnaliser l'application en modifiant les fichiers suivants :

- `src/App.tsx` : Composant principal de l'application
- `src/components/` : Dossier contenant tous les composants de l'interface
- `tailwind.config.js` : Configuration des styles Tailwind CSS