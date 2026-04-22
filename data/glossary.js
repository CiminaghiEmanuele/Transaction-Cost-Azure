export const glossaryTerms = [
  {
    id: "write-operations",
    label: "Write Operations",
    simple:
      "Sono le operazioni che modificano o creano dati o metadata nel servizio storage.",
    technical:
      "Nel mondo Blob includono operazioni come Put Blob, Put Block, Put Block List, AppendBlock e update di metadata. In ADLS Gen2 includono anche CreatePath, Append e Flush, con addebito spesso allineato a blocchi fatturabili da 4 MiB per i dati letti o scritti.",
    example:
      "Caricare un file da 5 GiB con chunk da 8 MiB tramite Put Block + Put Block List genera molte write: una per ogni blocco piu una commit finale per file.",
  },
  {
    id: "read-operations",
    label: "Read Operations",
    simple:
      "Sono le richieste che leggono contenuto o metadata dal servizio storage.",
    technical:
      "In Blob Storage i read meter riflettono tipicamente le chiamate di lettura verso blob e relative properties. In ADLS Gen2 le letture sul dfs endpoint possono essere fatturate in unita coerenti con blocchi da 4 MiB, quindi volume e pattern di lettura contano quanto il numero di chiamate logiche.",
    example:
      "Se un motore analytics legge piu volte gli stessi file per validazione e processing, il numero di read puo salire velocemente anche senza crescita del dataset.",
  },
  {
    id: "iterative-read-operations",
    label: "Iterative Read Operations",
    simple:
      "Sono operazioni di lettura che esplorano file system o directory e spesso crescono con la profondita e cardinalita della struttura.",
    technical:
      "Nel namespace gerarchico operazioni come Path List rientrano nelle iterative read operations. Sono molto rilevanti quando il workload scansiona directory, esegue discovery di partizioni o traversal frequenti.",
    example:
      "Un job che lista migliaia di directory partizionate ogni esecuzione puo avere un costo iterativo percepibile anche se legge pochi dati effettivi.",
  },
  {
    id: "iterative-write-operations",
    label: "Iterative Write Operations",
    simple:
      "Sono operazioni di scrittura il cui costo cresce con il numero di elementi o percorsi coinvolti.",
    technical:
      "Nel pricing ADLS Gen2 rename di directory e operazioni ricorsive sono trattate come iterative write meters separati. Sono diverse dalle semplici write lineari di upload dati.",
    example:
      "Se un processo ETL rinomina molti folder di staging in publishing, il meter iterative write puo diventare molto piu importante di quanto sembri dal volume dati.",
  },
  {
    id: "data-retrieval",
    label: "Data Retrieval",
    simple:
      "E il volume dati letto o scaricato che puo avere un costo specifico, soprattutto fuori dall'hot tier.",
    technical:
      "Alcuni tier applicano un prezzo per GiB recuperato. Questo meter e diverso dal count delle read operations: puoi avere sia costi per le richieste sia costi per il volume recuperato.",
    example:
      "Un archivio in cool tier con 30 TB letti al mese puo avere costi di retrieval significativi anche se il numero di richieste e moderato.",
  },
  {
    id: "data-write",
    label: "Data Write",
    simple:
      "E il volume dati scritto nel mese, separato dal semplice numero di richieste.",
    technical:
      "Nel pricing Blob spesso il meter Data Write e zero o trascurabile, ma tenerlo esplicito aiuta a confrontare i profili dei calculator e distinguere bytes movimentati da count di transazioni.",
    example:
      "Due workload con lo stesso numero di write possono avere volumi mensili scritti molto diversi e quindi profili di costo o throughput completamente differenti.",
  },
  {
    id: "put-blob",
    label: "Put Blob",
    simple:
      "Upload del blob in una singola richiesta.",
    technical:
      "E il pattern piu diretto per caricare un oggetto intero in un'unica operazione, finche la dimensione del blob rientra nei limiti del servizio e della service version. E utile per file piccoli o medi e per workload semplici.",
    example:
      "Se carichi 10.000 file piccoli con Put Blob, il numero di write coincide grossomodo con il numero di file.",
  },
  {
    id: "put-block",
    label: "Put Block",
    simple:
      "Upload di un singolo blocco che verra poi committato nel blob finale.",
    technical:
      "Ogni Put Block e una write distinta. Questo approccio e ideale per upload paralleli e grandi oggetti, ma amplifica le transazioni perche ogni blocco ha una propria chiamata REST.",
    example:
      "Un file da 1 GiB con chunk da 8 MiB genera molte Put Block, quindi molte write, prima della commit finale.",
  },
  {
    id: "put-block-list",
    label: "Put Block List",
    simple:
      "Commit finale dei blocchi precedentemente caricati con Put Block.",
    technical:
      "Dopo aver inviato i singoli blocchi, il client invia Put Block List per assemblare il blob. Anche questa operazione conta come write aggiuntiva per file.",
    example:
      "Se carichi 1.000 file chunked, avrai 1.000 Put Block List in piu oltre a tutte le write dei blocchi.",
  },
  {
    id: "path-create",
    label: "Path Create",
    simple:
      "Crea file o directory nel namespace gerarchico.",
    technical:
      "Nel dfs endpoint di ADLS Gen2 l'operazione Path Create fa parte della semantica file system. Rientra nelle write operations e abilita workflow che trattano path e directory come entita native.",
    example:
      "Ogni nuovo file creato in un processo di ingest su ADLS Gen2 puo generare una Path Create prima degli append successivi.",
  },
  {
    id: "path-read",
    label: "Path Read",
    simple:
      "Lettura di file o path nel namespace gerarchico.",
    technical:
      "Path Read usa l'interfaccia dfs e rientra nei read meters. Quando il volume dati letto e grande, il costo puo essere influenzato dalla granularita di fatturazione per blocchi da 4 MiB.",
    example:
      "Un processo Spark che legge grandi parquet dal dfs endpoint puo accumulare molte unita di read anche con poche chiamate logiche.",
  },
  {
    id: "path-list",
    label: "Path List",
    simple:
      "Lista file e directory in una gerarchia HNS.",
    technical:
      "Path List e generalmente classificata come iterative read. Il costo cresce con il numero di directory e oggetti attraversati, non solo con la dimensione dei file.",
    example:
      "Una discovery giornaliera delle partizioni per data puo generare migliaia di iterative read senza trasferire grandi volumi di dati.",
  },
  {
    id: "rename-path",
    label: "RenamePath",
    simple:
      "Rinomina file o directory nel namespace gerarchico in modo nativo.",
    technical:
      "Con HNS il rename e un'operazione di file system molto piu efficiente di un copy+delete. Nel billing model viene trattata come iterative write quando coinvolge path e directory.",
    example:
      "Un job che promuove cartelle da /staging a /published con rename atomico puo ridurre il tempo di job ma introdurre meter iterative write da considerare.",
  },
  {
    id: "append",
    label: "Append",
    simple:
      "Aggiunge dati a un file o blob esistente.",
    technical:
      "Nel modello append, i dati vengono inviati a segmenti successivi. Per append blob e per ADLS Gen2 Append File, la dimensione dei segmenti incide sia sulle write logiche sia sul numero di unita fatturabili.",
    example:
      "Un logger che scrive continuamente piccoli record in append puo generare molte piu write rispetto a un batching piu largo.",
  },
  {
    id: "flush",
    label: "Flush",
    simple:
      "Conferma il contenuto appendato rendendolo coerente nel file system HNS.",
    technical:
      "Nelle API Data Lake, Flush completa o sincronizza i dati appendati. Anche questa chiamata rientra nelle write operations e va conteggiata quando modelli Path Create + Append + Flush.",
    example:
      "Se ogni file ingestito viene appendato e poi flushato, hai almeno una write aggiuntiva oltre alla create e agli append.",
  },
  {
    id: "object-storage-semantics",
    label: "Object storage vs file system semantics",
    simple:
      "Object storage tratta gli oggetti come blob indipendenti; file system semantics introducono path, directory e rename nativi.",
    technical:
      "Flat namespace usa un modello object-oriented, dove la gerarchia e per convenzione nei nomi. HNS aggiunge directory reali, rename atomico e comportamento piu simile a un file system, con vantaggi funzionali ma anche meter e metadata aggiuntivi.",
    example:
      "Rinominare una directory in flat spesso significa copy+delete a livello applicativo; in HNS puo diventare un'operazione nativa molto piu rapida.",
  },
];
