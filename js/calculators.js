import { pricingProfiles } from "../data/pricingProfiles.js";
import {
  FOUR_MIB,
  bytesToGiB,
  formatBytesShort,
  formatInteger,
  round,
  safeDivide,
  toBytes,
} from "./formatters.js";

const DEFAULT_FALLBACK_STATE = {
  namespaceMode: "flat",
  uploadMethod: "putBlockList",
  totalDataValue: 1,
  totalDataUnit: "TiB",
  chunkSizeValue: 8,
  chunkSizeUnit: "MiB",
  fileCount: 1024,
  expectedReads: 1500,
  expectedLists: 36,
  expectedRenames: 0,
  iterativeOperations: 0,
  monthlyRetrievalValue: 450,
  monthlyRetrievalUnit: "GiB",
  monthlyWriteValue: 120,
  monthlyWriteUnit: "GiB",
  monthlyGrowthValue: 256,
  monthlyGrowthUnit: "GiB",
  pricingProfileId: "blob-hot-sample",
  storagePerGiB: 0.0208,
  writePer10k: 0.055,
  readPer10k: 0.0044,
  listPer10k: 0.055,
  iterativeReadPer10k: 0,
  iterativeWritePer100: 0,
  dataRetrievalPerGiB: 0,
  dataWritePerGiB: 0,
  metadataOverheadPercent: 0,
};

export function getPricingProfile(profileId) {
  return pricingProfiles.find((profile) => profile.id === profileId) ?? pricingProfiles[0];
}

export function getProfileValues(profileId) {
  const profile = getPricingProfile(profileId);

  return {
    pricingProfileId: profile.id,
    storagePerGiB: profile.storagePerGiB,
    writePer10k: profile.writePer10k,
    readPer10k: profile.readPer10k,
    listPer10k: profile.listPer10k,
    iterativeReadPer10k: profile.iterativeReadPer10k,
    iterativeWritePer100: profile.iterativeWritePer100,
    dataRetrievalPerGiB: profile.dataRetrievalPerGiB,
    dataWritePerGiB: profile.dataWritePerGiB,
    metadataOverheadPercent: profile.metadataOverheadPercent,
  };
}

export function getRecommendedProfileId(namespaceMode, currentProfileId) {
  if (currentProfileId === "manual") {
    return "manual";
  }

  const map = {
    flat: {
      "adls-hot-sample": "blob-hot-sample",
      "adls-cool-sample": "blob-cool-sample",
    },
    hierarchical: {
      "blob-hot-sample": "adls-hot-sample",
      "blob-cool-sample": "adls-cool-sample",
    },
  };

  return map[namespaceMode]?.[currentProfileId] ?? currentProfileId;
}

export function getDefaultState(overrides = {}) {
  return {
    ...DEFAULT_FALLBACK_STATE,
    ...overrides,
  };
}

export function normalizeState(rawState) {
  const numeric = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const fileCount = Math.max(1, Math.round(numeric(rawState.fileCount, 1)));
  const totalDataBytes = toBytes(numeric(rawState.totalDataValue), rawState.totalDataUnit);
  const chunkBytes = toBytes(numeric(rawState.chunkSizeValue), rawState.chunkSizeUnit);
  const retrievalBytes = toBytes(
    numeric(rawState.monthlyRetrievalValue),
    rawState.monthlyRetrievalUnit
  );
  const writeBytes = toBytes(numeric(rawState.monthlyWriteValue), rawState.monthlyWriteUnit);
  const growthBytes = toBytes(numeric(rawState.monthlyGrowthValue), rawState.monthlyGrowthUnit);

  return {
    ...rawState,
    totalDataValue: numeric(rawState.totalDataValue),
    chunkSizeValue: numeric(rawState.chunkSizeValue),
    fileCount,
    expectedReads: Math.max(0, Math.round(numeric(rawState.expectedReads))),
    expectedLists: Math.max(0, Math.round(numeric(rawState.expectedLists))),
    expectedRenames: Math.max(0, Math.round(numeric(rawState.expectedRenames))),
    iterativeOperations: Math.max(0, Math.round(numeric(rawState.iterativeOperations))),
    monthlyRetrievalValue: numeric(rawState.monthlyRetrievalValue),
    monthlyWriteValue: numeric(rawState.monthlyWriteValue),
    monthlyGrowthValue: numeric(rawState.monthlyGrowthValue),
    storagePerGiB: Math.max(0, numeric(rawState.storagePerGiB)),
    writePer10k: Math.max(0, numeric(rawState.writePer10k)),
    readPer10k: Math.max(0, numeric(rawState.readPer10k)),
    listPer10k: Math.max(0, numeric(rawState.listPer10k)),
    iterativeReadPer10k: Math.max(0, numeric(rawState.iterativeReadPer10k)),
    iterativeWritePer100: Math.max(0, numeric(rawState.iterativeWritePer100)),
    dataRetrievalPerGiB: Math.max(0, numeric(rawState.dataRetrievalPerGiB)),
    dataWritePerGiB: Math.max(0, numeric(rawState.dataWritePerGiB)),
    metadataOverheadPercent: Math.max(0, numeric(rawState.metadataOverheadPercent)),
    totalDataBytes,
    chunkBytes,
    retrievalBytes,
    writeBytes,
    growthBytes,
  };
}

export function validateInputs(state) {
  const errors = [];
  const warnings = [];
  const fieldErrors = {};

  if (state.totalDataValue <= 0) {
    errors.push("Inserisci una dimensione dati iniziale maggiore di zero.");
    fieldErrors.totalDataValue = "Required and greater than zero.";
  }

  if (state.chunkSizeValue <= 0) {
    errors.push("Inserisci una dimensione chunk maggiore di zero.");
    fieldErrors.chunkSizeValue = "Chunk size must be greater than zero.";
  }

  if (state.fileCount <= 0) {
    errors.push("Il numero di file deve essere almeno 1.");
    fieldErrors.fileCount = "File count must be at least 1.";
  }

  if (state.namespaceMode === "flat" && state.uploadMethod === "dataLakePath") {
    warnings.push(
      "Hai selezionato Path Create + Append + Flush in Flat Namespace. Questo pattern e tipico del dfs endpoint su account con Hierarchical Namespace."
    );
  }

  if (state.namespaceMode === "hierarchical" && state.metadataOverheadPercent === 0) {
    warnings.push(
      "Con Hierarchical Namespace spesso esiste overhead metadata su directory e path. Valuta se mantenere 0% e davvero corretto per il tuo caso."
    );
  }

  return { errors, warnings, fieldErrors };
}

function calculateFileDistribution(totalDataBytes, fileCount, chunkBytes) {
  const safeChunkBytes = Math.max(chunkBytes, 1);
  const averageFileBytes = safeDivide(totalDataBytes, fileCount, totalDataBytes);
  const blocksPerFile = Math.max(1, Math.ceil(averageFileBytes / safeChunkBytes));
  const totalBlocks = blocksPerFile * fileCount;

  return {
    averageFileBytes,
    blocksPerFile,
    totalBlocks,
  };
}

function calculateUploadPattern(state) {
  const distribution = calculateFileDistribution(
    state.totalDataBytes,
    state.fileCount,
    state.chunkBytes
  );

  const base = {
    ...distribution,
    writeOps: state.fileCount,
    createOps: 0,
    appendOps: 0,
    flushOps: 0,
    commitOps: 0,
    appendChargeUnits: 0,
    methodLabel: "",
    formulaLines: [],
    uploadSummary: "",
  };

  switch (state.uploadMethod) {
    case "putBlob":
      return {
        ...base,
        methodLabel: "Put Blob",
        writeOps: state.fileCount,
        formulaLines: [
          `Average file size = total data / file count = ${formatBytesShort(
            distribution.averageFileBytes
          )}`,
          "Write operations = number of files",
          `Write operations = ${formatInteger(state.fileCount)}`,
        ],
        uploadSummary: "Single-request upload model where each file maps to one write.",
      };

    case "putBlockList":
      return {
        ...base,
        methodLabel: "Put Block + Put Block List",
        writeOps: distribution.totalBlocks + state.fileCount,
        commitOps: state.fileCount,
        formulaLines: [
          `Blocks per file = ceil(avg file size / chunk size) = ${formatInteger(
            distribution.blocksPerFile
          )}`,
          `Total Put Block calls = blocks per file x file count = ${formatInteger(
            distribution.totalBlocks
          )}`,
          `Write operations = Put Block calls + Put Block List per file = ${formatInteger(
            distribution.totalBlocks
          )} + ${formatInteger(state.fileCount)}`,
        ],
        uploadSummary:
          "Chunked block blob upload where every block is a write and each file adds one commit write.",
      };

    case "appendPattern":
      return {
        ...base,
        methodLabel: "Append pattern",
        createOps: state.fileCount,
        appendOps: distribution.totalBlocks,
        writeOps: state.fileCount + distribution.totalBlocks,
        formulaLines: [
          `Append calls per file = ceil(avg file size / chunk size) = ${formatInteger(
            distribution.blocksPerFile
          )}`,
          `Write operations = blob create + append calls = ${formatInteger(
            state.fileCount
          )} + ${formatInteger(distribution.totalBlocks)}`,
        ],
        uploadSummary:
          "Append-oriented model where a file is created and then extended chunk by chunk.",
      };

    case "dataLakePath":
      return {
        ...base,
        methodLabel: "Data Lake Path Create + Append + Flush",
        createOps: state.fileCount,
        appendOps: distribution.totalBlocks,
        flushOps: state.fileCount,
        writeOps: state.fileCount + distribution.totalBlocks + state.fileCount,
        appendChargeUnits:
          Math.max(1, Math.ceil(distribution.averageFileBytes / FOUR_MIB)) * state.fileCount,
        formulaLines: [
          `Append calls per file = ceil(avg file size / chunk size) = ${formatInteger(
            distribution.blocksPerFile
          )}`,
          `Write calls = Path Create + Append + Flush = ${formatInteger(
            state.fileCount
          )} + ${formatInteger(distribution.totalBlocks)} + ${formatInteger(state.fileCount)}`,
          "For hierarchical namespace billing, data reads and writes can also scale with 4 MiB billable blocks.",
        ],
        uploadSummary:
          "Native dfs endpoint pattern used for file-system semantics on ADLS Gen2.",
      };

    default:
      return base;
  }
}

function buildSharedWarnings(state, upload, validationWarnings) {
  const warnings = [...validationWarnings];
  const averageFileBytes = upload.averageFileBytes;
  const averageFileMiB = averageFileBytes / (1_024 ** 2);
  const chunkMiB = state.chunkBytes / (1_024 ** 2);

  if (state.uploadMethod === "putBlob" && averageFileMiB > 5_000) {
    warnings.push(
      "Put Blob e selezionato ma la dimensione media file supera 5,000 MiB. Verifica la service version o valuta Put Block + Put Block List."
    );
  }

  if (state.uploadMethod === "appendPattern" && chunkMiB > 4) {
    warnings.push(
      "Append pattern con chunk oltre 4 MiB richiede molta attenzione: storicamente il limite conservativo per Append Block e 4 MiB, anche se esistono versioni piu recenti e preview con limiti diversi."
    );
  }

  if (state.chunkBytes > 4_000 * 1_024 ** 2) {
    warnings.push(
      "Il chunk supera 4,000 MiB, oltre il limite massimo documentato per Put Block nelle service version recenti."
    );
  }

  if (chunkMiB > 0 && chunkMiB < 1) {
    warnings.push(
      "Chunk molto piccolo: utile per parallelismo estremo ma potenzialmente costoso in termini di write amplification."
    );
  }

  if (upload.blocksPerFile > 50_000) {
    warnings.push(
      "Il numero stimato di blocchi per file supera 50,000: verifica il design, perche il block blob ha limiti tecnici da rispettare."
    );
  }

  if (state.namespaceMode === "hierarchical") {
    warnings.push(
      "Hierarchical Namespace non e reversibile una volta abilitato sullo storage account: conferma la scelta con workload, toolchain e cost model."
    );
  }

  if (state.expectedLists > 10_000 || state.expectedRenames > 10_000) {
    warnings.push(
      "Molte list o rename previste: presta attenzione ai meter iterativi e al tempo di job, non solo al costo storage per GiB."
    );
  }

  if (state.namespaceMode === "flat" && state.expectedRenames > 0) {
    warnings.push(
      "In Flat Namespace il rename non ha la stessa semantica nativa di HNS. In workload reali puo tradursi in copy + delete o logica applicativa aggiuntiva."
    );
  }

  return warnings;
}

function buildStorageProjection(state) {
  const baseStorageGiB = bytesToGiB(state.totalDataBytes);
  const monthlyGrowthGiB = bytesToGiB(state.growthBytes);
  const endOfMonthGiB = baseStorageGiB + monthlyGrowthGiB;
  const averageMonthGiB = baseStorageGiB + monthlyGrowthGiB / 2;
  const effectiveAverageGiB = averageMonthGiB * (1 + state.metadataOverheadPercent / 100);

  return {
    baseStorageGiB,
    monthlyGrowthGiB,
    endOfMonthGiB,
    averageMonthGiB,
    effectiveAverageGiB,
  };
}

function buildBaseResult(state, upload, validation, sharedWarnings) {
  const profile = getPricingProfile(state.pricingProfileId);
  const storageProjection = buildStorageProjection(state);

  return {
    profile,
    validation,
    storageProjection,
    upload,
    warnings: sharedWarnings,
    errors: validation.errors,
    monthlyRetrievalGiB: bytesToGiB(state.retrievalBytes),
    monthlyWriteGiB: bytesToGiB(state.writeBytes),
  };
}

export function calculateFlatNamespace(state, validation) {
  const upload = calculateUploadPattern(state);
  const sharedWarnings = buildSharedWarnings(state, upload, validation.warnings);
  const base = buildBaseResult(state, upload, validation, sharedWarnings);

  const readOps = state.expectedReads;
  const listOps = state.expectedLists;
  const writeOps = upload.writeOps;
  const iterativeReadOps = 0;
  const iterativeWriteOps = 0;

  const transactionCost =
    (writeOps / 10_000) * state.writePer10k +
    (readOps / 10_000) * state.readPer10k +
    (listOps / 10_000) * state.listPer10k;

  const dataMovementCost =
    base.monthlyRetrievalGiB * state.dataRetrievalPerGiB +
    base.monthlyWriteGiB * state.dataWritePerGiB;

  const storageCost = base.storageProjection.effectiveAverageGiB * state.storagePerGiB;

  const formulas = [
    ...upload.formulaLines,
    `Read operations = input reads = ${formatInteger(readOps)}`,
    `List operations = input lists = ${formatInteger(listOps)}`,
    "Iterative read and iterative write are not billed as separate namespace-specific meters in the flat model used here.",
  ];

  return {
    namespaceLabel: "Flat Namespace",
    summary:
      "Object storage semantics with direct focus on Put Blob, Put Block, Put Block List, standard reads and list operations.",
    metrics: {
      writeOps,
      readOps,
      listOps,
      iterativeReadOps,
      iterativeWriteOps,
      dataRetrievalGiB: base.monthlyRetrievalGiB,
      dataWriteGiB: base.monthlyWriteGiB,
    },
    costs: {
      transactionCost,
      dataMovementCost,
      storageCost,
      totalCost: transactionCost + dataMovementCost + storageCost,
      writeCost: (writeOps / 10_000) * state.writePer10k,
      readCost: (readOps / 10_000) * state.readPer10k,
      listCost: (listOps / 10_000) * state.listPer10k,
      iterativeReadCost: 0,
      iterativeWriteCost: 0,
    },
    formulas,
    architectureNotes: [
      "Flat namespace e ideale quando il workload ragiona in termini di oggetti e non richiede rename atomico su directory.",
      upload.uploadSummary,
      "Per workload con rename frequenti o scansioni gerarchiche profonde, il costo reale puo essere influenzato da logica applicativa extra non modellata come meter HNS.",
      `Storage medio del mese stimato su ${round(base.storageProjection.averageMonthGiB, 2)} GiB, senza overhead metadata aggiuntivo oltre al valore configurato.`,
    ],
    billableContext: {
      averageStoredGiB: base.storageProjection.effectiveAverageGiB,
      projectedEndOfMonthGiB: base.storageProjection.endOfMonthGiB,
      pricingProfileLabel: base.profile.label,
    },
    warnings: base.warnings,
    errors: base.errors,
    namespaceMode: "flat",
  };
}

export function calculateHierarchicalNamespace(state, validation) {
  const upload = calculateUploadPattern(state);
  const sharedWarnings = buildSharedWarnings(state, upload, validation.warnings);
  const base = buildBaseResult(state, upload, validation, sharedWarnings);

  const readOps = state.expectedReads;
  const listOps = state.expectedLists;
  const iterativeReadOps = state.expectedLists;
  const iterativeWriteOps = state.expectedRenames + state.iterativeOperations;
  const writeOps = upload.writeOps;

  // For HNS, a useful estimation is to surface logical calls and approximate billable units.
  const billableWriteUnits =
    state.uploadMethod === "dataLakePath"
      ? upload.createOps + upload.flushOps + upload.appendChargeUnits
      : upload.writeOps;
  const billableReadUnits = Math.max(readOps, Math.ceil(state.retrievalBytes / FOUR_MIB));

  const transactionCost =
    (billableWriteUnits / 10_000) * state.writePer10k +
    (billableReadUnits / 10_000) * state.readPer10k +
    (iterativeReadOps / 10_000) * state.iterativeReadPer10k +
    (iterativeWriteOps / 100) * state.iterativeWritePer100;

  const dataMovementCost =
    base.monthlyRetrievalGiB * state.dataRetrievalPerGiB +
    base.monthlyWriteGiB * state.dataWritePerGiB;

  const storageCost = base.storageProjection.effectiveAverageGiB * state.storagePerGiB;

  const formulas = [
    ...upload.formulaLines,
    `Logical write formula = create + append + flush = ${formatInteger(
      upload.createOps
    )} + ${formatInteger(upload.appendOps)} + ${formatInteger(upload.flushOps)}`,
    `Iterative read operations = list = ${formatInteger(iterativeReadOps)}`,
    `Iterative write operations = rename + other iterative = ${formatInteger(
      state.expectedRenames
    )} + ${formatInteger(state.iterativeOperations)}`,
    `Approximate billable read units = max(logical reads, retrieval / 4 MiB) = ${formatInteger(
      billableReadUnits
    )}`,
    `Approximate billable write units = ${formatInteger(billableWriteUnits)}`,
  ];

  return {
    namespaceLabel: "Hierarchical Namespace",
    summary:
      "File-system semantics with explicit create, append, flush, list and rename considerations for ADLS Gen2 style workloads.",
    metrics: {
      writeOps,
      readOps,
      listOps,
      iterativeReadOps,
      iterativeWriteOps,
      dataRetrievalGiB: base.monthlyRetrievalGiB,
      dataWriteGiB: base.monthlyWriteGiB,
      billableWriteUnits,
      billableReadUnits,
    },
    costs: {
      transactionCost,
      dataMovementCost,
      storageCost,
      totalCost: transactionCost + dataMovementCost + storageCost,
      writeCost: (billableWriteUnits / 10_000) * state.writePer10k,
      readCost: (billableReadUnits / 10_000) * state.readPer10k,
      listCost: 0,
      iterativeReadCost: (iterativeReadOps / 10_000) * state.iterativeReadPer10k,
      iterativeWriteCost: (iterativeWriteOps / 100) * state.iterativeWritePer100,
    },
    formulas,
    architectureNotes: [
      "HNS e pensato per analytics e workflow con directory reali, rename atomico e path semantics.",
      upload.uploadSummary,
      "Il costo non dipende solo dal numero di file: list, traversal, rename e metadata overhead possono diventare determinanti.",
      `Lo storage medio del mese include overhead metadata configurato al ${round(
        state.metadataOverheadPercent,
        1
      )}% e produce ${round(base.storageProjection.effectiveAverageGiB, 2)} GiB medi fatturabili.`,
    ],
    billableContext: {
      averageStoredGiB: base.storageProjection.effectiveAverageGiB,
      projectedEndOfMonthGiB: base.storageProjection.endOfMonthGiB,
      pricingProfileLabel: base.profile.label,
    },
    warnings: base.warnings,
    errors: base.errors,
    namespaceMode: "hierarchical",
  };
}

export function calculateScenario(rawState) {
  const normalizedState = normalizeState(rawState);
  const validation = validateInputs(normalizedState);

  const result =
    normalizedState.namespaceMode === "hierarchical"
      ? calculateHierarchicalNamespace(normalizedState, validation)
      : calculateFlatNamespace(normalizedState, validation);

  return {
    ...result,
    normalizedState,
    validation,
  };
}
