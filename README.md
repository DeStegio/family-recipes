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

## Φωτογραφίες και παραγωγική λειτουργία

Ο ιδιοκτήτης ή ο διαχειριστής ανεβάζει φωτογραφίες από «Προς έλεγχο» → «Προσθήκη συνταγής», από υπολογιστή ή κινητό. Η εφαρμογή αποθηκεύει τα αρχικά bytes ως ιδιωτικά αντικείμενα S3. Η PostgreSQL καταγράφει το αναγνωριστικό του αντικειμένου, τον τύπο, το μέγεθος, το SHA-256, τη συνταγή, τις μεταγραφές, τις εκδόσεις και τους λογαριασμούς. Στην τοπική εγκατάσταση, το SeaweedFS κρατά τις φωτογραφίες στο Docker volume `family-recipes_originals`. Στο live, τις κρατά το ιδιωτικό bucket που θα δηλωθεί με `S3_BUCKET`. Το S3 και η PostgreSQL λειτουργούν ως ένα αρχείο. Για μεταφορά χρειάζονται και τα δύο αντίγραφα. Οι εικόνες που κοινοποιούνται σε συνομιλία μπαίνουν στο βιβλίο όταν τις εισαγάγει ο διαχειριστής.

Στην παραγωγή ο browser ζητά την πηγή από την εφαρμογή. Ο server ελέγχει τον λογαριασμό και την ορατή έκδοση της συνταγής και εκδίδει υπογεγραμμένο URL 60 δευτερολέπτων. Ο ιδιοκτήτης και ο διαχειριστής έχουν επίσης επιλογή «Λήψη πρωτοτύπου» στην προβολή φωτογραφίας. [Υπογεγραμμένοι σύνδεσμοι S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)

Για το πρώτο live περιβάλλον χρειάζονται ένας Node.js host για το Next.js, PostgreSQL, ιδιωτικό S3 bucket και διεύθυνση HTTPS. Στον host ορίζουμε `RECIPE_MODE=private`, `APP_ORIGIN`, `DATABASE_URL`, `S3_BUCKET`, την περιοχή και τα διαπιστευτήρια S3. Στη συνέχεια εκτελούμε migrations και δημιουργούμε τον πρώτο πραγματικό ιδιοκτήτη με `npm run db:user`. Για υπάρχον τοπικό αρχείο εφαρμόζουμε τη διαδικασία μεταφοράς παρακάτω αντί για seed. Πριν ανοίξει το βιβλίο στην οικογένεια, ελέγχουμε σύνδεση αναγνώστη και διαχειριστή, πρόσβαση σε ένα δημοσιευμένο πρωτότυπο και απόρριψη του ίδιου αρχείου χωρίς υπογραφή. [Ρυθμίσεις ιδιωτικότητας για Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)

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

Η εξαγωγή συγκρίνει μέγεθος, τύπο και SHA-256 με τη βάση και γράφει `manifest.json` με τα αρχικά object keys. Κράτα το dump και τον φάκελο `originals` μαζί, σε ιδιωτικό χώρο αντιγράφων. Για παραγωγή ρύθμισε επίσης snapshots της PostgreSQL και αντίγραφο του bucket με versioning.

### Επαναφορά σε χωριστό τοπικό περιβάλλον

Σε νέο παράθυρο PowerShell, όρισε το `$backup` στον φάκελο αντιγράφου. Χρησιμοποίησε νέο όνομα Compose για κενή βάση και νέο bucket. Τα στοιχεία σύνδεσης S3 διαβάζονται από το `.env.local`.

```powershell
$target = 'family-recipes-restore'
$env:RECIPE_DB_PORT = '55433'
$env:RECIPE_S3_PORT = '54567'
docker compose -p $target up -d --wait
docker compose -p $target cp (Join-Path $backup 'recipes.dump') postgres:/tmp/recipes.dump
docker compose -p $target exec -T postgres pg_restore -U recipes -d recipes --no-owner --no-privileges --single-transaction /tmp/recipes.dump
$env:DATABASE_URL = 'postgresql://recipes:local-only@localhost:55433/recipes'
$env:S3_ENDPOINT = 'http://127.0.0.1:54567'
npm run backup:restore-originals -- (Join-Path $backup 'originals')
```

Συνέχισε μετά από κάθε επιτυχημένη εντολή. Το script ελέγχει ότι το manifest ταιριάζει με τη βάση και επαληθεύει όλα τα τοπικά αρχεία πριν γράψει στο bucket. Σε επανάληψη επαληθεύει τα τυχόν υπάρχοντα αντικείμενα. Στο τέλος διαβάζει κάθε αρχείο από τον προορισμό και ξαναϋπολογίζει το SHA-256. Για δοκιμή στην ανακτημένη επίδειξη, εκτέλεσε `npm run dev` με τις παραπάνω μεταβλητές και άνοιξε ένα δημοσιευμένο πρωτότυπο. Μετά τη δοκιμή, `docker compose -p $target stop` σταματά τις υπηρεσίες και κρατά τα volumes.

Για μεταφορά σε live, επανάφερε μόνο έμπιστο dump με `pg_restore` σε κενή παραγωγική PostgreSQL. Δημιούργησε ιδιωτικό bucket και τρέξε `npm run backup:restore-originals` με τις μεταβλητές του προορισμού πριν δέχεται αιτήματα η εφαρμογή. Καθάρισε τις παλιές συνεδρίες από τον πίνακα `session` του νέου περιβάλλοντος και ζήτησε νέα σύνδεση μετά τη μεταφορά. [Τεκμηρίωση pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html)

## Δομή

- `src/domain` περιέχει τον τύπο συνταγής, την ελληνική αναζήτηση, τα σχήματα εισαγωγής και τους κανόνες δημοσίευσης.
- `src/server` και `migrations` χειρίζονται πρόσβαση, αποθήκευση και εκδόσεις. Η πιστή μεταγραφή και τα θέματα ελέγχου αποθηκεύονται ανά έκδοση, χωριστά από τα δομημένα πεδία.
- `GET /api/recipes?q=...` και `GET /api/recipes/:id` επιστρέφουν τις δημοσιευμένες συνταγές για συνδεδεμένους χρήστες. Οι πηγές ανοίγουν μέσω `/api/recipes/:id/sources/:source`.
- `POST /api/recipes` δέχεται multipart με `id`, JSON `draft` από το `draftSchema` και επαναλαμβανόμενο `photos` στη σειρά των πηγών. `GET/POST /api/review/:id` επιτρέπει έλεγχο και αποφάσεις διαχείρισης. Νεότερη αναθεώρηση προκαλεί HTTP 409 όταν ο editor υποβάλλει παλιό προσχέδιο.
- Μελλοντική μεταγραφή OCR μπορεί να παράγει πρόταση ανά πρωτότυπο μέσω του `draftSchema`. Η εισαγωγή, η ανθρώπινη επιβεβαίωση και η δημοσίευση περνούν από τους ίδιους κανόνες.

[Τεκμηρίωση εγκατάστασης Next.js](https://nextjs.org/docs/app/getting-started/installation) · [Υπογεγραμμένα S3 URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
