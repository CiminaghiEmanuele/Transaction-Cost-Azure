# azure-storage-transaction-calculator

Web app statica, moderna e pronta al deploy su Azure Static Web Apps per stimare in modo piu corretto i costi di Azure Blob Storage e Azure Data Lake Storage Gen2, con focus su transazioni, volume dati, differenze tra Flat Namespace e Hierarchical Namespace e lettura consapevole delle voci tipiche del pricing calculator.

## Perche esiste

Molte stime Azure Storage partono bene sul costo per TB e poi diventano fuorvianti quando il workload reale usa chunk piccoli, upload a blocchi, rename frequenti, list iterative o semantica file system tipica di ADLS Gen2.

Questo progetto nasce per aiutare:

- professionisti Azure e team prevendita
- cloud architect e solution designer
- programmatori e data engineer
- chi deve spiegare a clienti e stakeholder perche le transazioni vanno calcolate bene

## Cosa include

- confronto chiaro tra `Flat Namespace` e `Hierarchical Namespace`
- calcolo delle operazioni per `Put Blob`, `Put Block + Put Block List`, `Append pattern`, `Path Create + Append + Flush`
- stima separata di:
  - write operations
  - read operations
  - list operations
  - iterative read operations
  - iterative write operations
  - data retrieval
  - data write
- warning intelligenti su limiti e pattern incoerenti
- 4 esempi realistici precaricati
- glossario tecnico con definizioni, spiegazioni ed esempi
- sezione fonti Microsoft mantenibile in un file dedicato
- esportazione CSV, copia rapida risultati e stampa PDF tramite browser

## Struttura progetto

```text
.
|-- .github/
|   `-- workflows/
|       `-- azure-static-web-apps.yml
|-- css/
|   `-- styles.css
|-- data/
|   |-- examples.js
|   |-- glossary.js
|   |-- pricingProfiles.js
|   `-- sources.js
|-- js/
|   |-- app.js
|   |-- calculators.js
|   |-- formatters.js
|   `-- ui.js
|-- index.html
|-- README.md
`-- staticwebapp.config.json
```

## Come eseguirlo in locale

Non serve build step.

### Opzione 1: Python

```bash
python -m http.server 4173
```

Poi apri `http://localhost:4173`.

### Opzione 2: VS Code Live Server

Apri la cartella del progetto e avvia Live Server su `index.html`.

## Deploy su Azure Static Web Apps

### Metodo consigliato

1. Pubblica il repository su GitHub.
2. Crea una nuova Azure Static Web App dal portale Azure.
3. Collega il repository GitHub.
4. Usa questi valori:
   - App location: `/`
   - API location: vuoto
   - Output location: vuoto
5. Azure generera o usera il workflow GitHub Actions.

### Metodo via workflow incluso

Nel progetto e presente `.github/workflows/azure-static-web-apps.yml`.

Per usarlo:

1. Crea la Static Web App in Azure.
2. Recupera il deployment token.
3. Salva il secret GitHub `AZURE_STATIC_WEB_APPS_API_TOKEN`.
4. Esegui push su `main`.

## Come aggiornare le fonti Microsoft

Le fonti sono centralizzate in:

- `data/sources.js`

Ogni voce contiene:

- `title`
- `description`
- `url`

Per aggiungere o aggiornare una fonte:

1. Apri `data/sources.js`
2. Modifica l'array `microsoftSources`
3. Aggiorna `sourceCatalogUpdatedAt`

## Come modificare formule e logica di calcolo

La logica principale e in:

- `js/calculators.js`

Funzioni chiave:

- `calculateFlatNamespace()`
- `calculateHierarchicalNamespace()`
- `validateInputs()`
- `calculateScenario()`

Se vuoi cambiare:

- formule upload chunked
- logica HNS per create, append, flush
- warning automatici
- stima costi per meter

agisci principalmente in quel file.

## Come modificare i casi esempio

Gli esempi precaricati sono in:

- `data/examples.js`

Ogni scenario definisce:

- titolo e descrizione
- tag visuali
- nota architetturale
- valori da popolare nel form

## Come modificare i pricing preset

I profili di prezzo di esempio sono in:

- `data/pricingProfiles.js`

Importante:

- i preset attuali sono illustrativi
- servono per rendere immediata la demo
- non sostituiscono il pricing calculator reale

## Note progettuali

- frontend interamente statico
- nessun backend obbligatorio
- compatibile con Azure Static Web Apps
- codice separato per dati, logica e rendering UI
- niente librerie superflue
- adatto a manutenzione reale

## Fonti ufficiali usate per modellare il progetto

- Azure Blob Storage pricing
- Azure pricing calculator
- Microsoft Learn su mapping REST APIs a transaction categories
- Microsoft Learn su hierarchical namespace
- Microsoft Learn su scalability targets e cost estimation examples

## Limiti intenzionali del tool

Il tool e pensato come `technical estimation companion`, non come sostituto del billing ufficiale.

Il costo reale puo cambiare in base a:

- regione
- tier
- redundancy
- offer commerciale
- endpoint usato (`blob` vs `dfs`)
- SDK, parallelismo, retry, segmentazione reale
- dettagli specifici dell'applicazione

Per questo la UI espone anche un badge chiaro che distingue tra:

- stima tecnica del workload
- pricing finale reale Azure
