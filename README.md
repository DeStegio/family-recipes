# Οι Συνταγές της Μαμάς

Ιδιωτικό οικογενειακό βιβλίο συνταγών και αρχείο χειρόγραφων. Δες το [PROGRESS.md](PROGRESS.md) για την κατάσταση και το επόμενο βήμα.

## Γρήγορη επίδειξη στα Windows

Χρειάζεσαι Node.js 22 LTS ή νεότερο και PowerShell. Εκτέλεσε τις εντολές από τον φάκελο που περιέχει το `package.json`.

```powershell
npm ci
$env:RECIPE_MODE = 'demo'
npm run dev
```

Άνοιξε το [http://localhost:3000](http://localhost:3000). Αναζήτησε «μηλοπιτα», άνοιξε τη Μηλόπιτα και πάτησε «Έναρξη μαγειρέματος». Στο δεύτερο βήμα άνοιξε το χειρόγραφο, άλλαξε πηγή και κλείσε την προβολή. Τα στιγμιότυπα χειρόγραφων είναι δοκιμαστικά και προέρχονται από το Figma.

## Ιδιωτική λειτουργία για τοπική δοκιμή

Χρειάζεσαι Docker Desktop με Linux containers. Το Compose ξεκινά PostgreSQL στη θύρα 55432 και ιδιωτικό SeaweedFS S3 στη 54566, δεμένες στο loopback. Σταμάτησε τυχόν ανοιχτό dev server πριν αλλάξεις λειτουργία.

```powershell
Copy-Item .env.example .env.local
$env:RECIPE_MODE = 'private'
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm run dev
```

Το seed δημιουργεί τους ενδεικτικούς λογαριασμούς `owner@recipes.test`, `admin@recipes.test` και `reader@recipes.test` με κοινό δοκιμαστικό κωδικό `LocalRecipeSample2026!`. Η Μηλόπιτα εμφανίζεται ως δημοσιευμένο δείγμα. Τα Σουτζουκάκια περιμένουν έλεγχο, με αντίφαση 500/750 γρ. που δείχνει τι γράφει η κάθε πηγή. Τα αγαπημένα αποθηκεύονται στον συγκεκριμένο browser.

Ο ιδιοκτήτης μπορεί να προσθέσει διαχειριστές και αναγνώστες από το «Προς έλεγχο». Για δημιουργία ή αλλαγή λογαριασμού από PowerShell χρησιμοποίησε μία από τις τιμές `owner`, `admin`, `reader`. Η εντολή τερματίζει τυχόν ενεργές συνεδρίες του λογαριασμού.

```powershell
$credential = Get-Credential -UserName 'person@example.com'
$env:RECIPE_NEW_PASSWORD = $credential.GetNetworkCredential().Password
try { npm run db:user -- $($credential.UserName) reader } finally { Remove-Item Env:RECIPE_NEW_PASSWORD }
```

Εκτέλεσε `npm run db:migrate` μετά την εγκατάσταση νεότερης έκδοσης. Τα migration scripts καταγράφονται στην `schema_migration` και εφαρμόζονται μέσα σε συναλλαγή. Η παραγωγική ιδιωτική λειτουργία χρειάζεται HTTPS, `APP_ORIGIN` ίσο με το ακριβές URL, PostgreSQL, ιδιωτικό bucket S3 και διαπιστευτήρια στο runtime. Για AWS S3 άφησε κενό το `S3_ENDPOINT` και χρησιμοποίησε τον ρόλο IAM της υπηρεσίας. Για συμβατό provider όρισε HTTPS endpoint προσβάσιμο από τους browsers των χρηστών. Το endpoint της εφαρμογής εκδίδει υπογεγραμμένο URL 60 δευτερολέπτων μόνο για εξουσιοδοτημένη πηγή. Όρισε όρια σώματος και ρυθμού αιτημάτων στον reverse proxy. Η εισαγωγή δέχεται έως έξι JPG, PNG ή WebP των 8 MB ανά αίτημα.

## Έλεγχοι

```powershell
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run test:integration
npm run build
```

Το integration suite χρησιμοποιεί το τοπικό seed, PostgreSQL, S3 και Chromium. Προσθέτει δοκιμαστικούς λογαριασμούς και συνταγές και συνδέει μια πηγή στη δοκιμαστική Μηλόπιτα. Εκτέλεσέ το σε δοκιμαστική βάση. Η εγκαταστάσιμη έκδοση δοκιμάζεται με `npm run build` και `npm start` σε localhost ή HTTPS. Ο service worker αποθηκεύει μόνο τη γενική σελίδα εκτός σύνδεσης.

## Εξαγωγή και αντίγραφα ασφαλείας

Σταμάτησε προσωρινά τις εισαγωγές και τις επεξεργασίες, ώστε βάση και πρωτότυπα να αντιστοιχούν στο ίδιο αντίγραφο. Διάλεξε νέο ιδιωτικό φάκελο έξω από το checkout. Το παράδειγμα χρησιμοποιεί `pg_dump` μέσα στο τοπικό Compose και αποφεύγει διοχέτευση δυαδικών δεδομένων μέσω PowerShell.

```powershell
$backup = Join-Path $env:USERPROFILE ("recipe-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $backup
docker compose exec -T postgres pg_dump -U recipes -d recipes -Fc -f /tmp/recipes.dump
docker compose cp postgres:/tmp/recipes.dump (Join-Path $backup 'recipes.dump')
npm run backup:originals -- (Join-Path $backup 'originals')
```

Η εξαγωγή συγκρίνει κάθε πρωτότυπο με το SHA-256 της βάσης και γράφει `manifest.json` με το αρχικό object key και τον τύπο αρχείου. Για δοκιμή επαναφοράς χρησιμοποίησε κενή ιδιωτική βάση και νέο ιδιωτικό bucket. Επανέφερε το dump με `pg_restore`. Ανέβασε κάθε αρχείο του manifest στο `object_key` του, με το αντίστοιχο `content_type` και `Cache-Control: private, no-store`. Έλεγξε την εξαγωγή ξανά από το νέο περιβάλλον. Σε παραγωγή κράτα και snapshots της PostgreSQL και ξεχωριστό αντίγραφο του bucket με versioning. Ανεπιτυχής εισαγωγή μπορεί να αφήσει μη συσχετισμένα αντικείμενα στο bucket. Οι ήδη καταχωρισμένες πηγές διατηρούνται όταν η εγγραφή αλλάζει ή συνδέεται.

## Δομή

- `src/domain` περιέχει τον τύπο συνταγής, την ελληνική αναζήτηση, τα σχήματα εισαγωγής και τους κανόνες δημοσίευσης.
- `src/server` και `migrations` χειρίζονται πρόσβαση, αποθήκευση και εκδόσεις. Η πιστή μεταγραφή και τα θέματα ελέγχου αποθηκεύονται ανά έκδοση, χωριστά από τα δομημένα πεδία.
- `GET /api/recipes?q=...` και `GET /api/recipes/:id` επιστρέφουν τις δημοσιευμένες συνταγές για συνδεδεμένους χρήστες. Οι πηγές ανοίγουν μέσω `/api/recipes/:id/sources/:source`.
- `POST /api/recipes` δέχεται multipart με `id`, JSON `draft` από το `draftSchema` και επαναλαμβανόμενο `photos` στη σειρά των πηγών. `GET/POST /api/review/:id` επιτρέπει έλεγχο και αποφάσεις διαχείρισης. Νεότερη αναθεώρηση προκαλεί HTTP 409 όταν ο editor υποβάλλει παλιό προσχέδιο.
- Μελλοντική μεταγραφή OCR μπορεί να παράγει πρόταση ανά πρωτότυπο μέσω του `draftSchema`. Η εισαγωγή, η ανθρώπινη επιβεβαίωση και η δημοσίευση περνούν από τους ίδιους κανόνες.

[Τεκμηρίωση εγκατάστασης Next.js](https://nextjs.org/docs/app/getting-started/installation) · [Υπογεγραμμένα S3 URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
