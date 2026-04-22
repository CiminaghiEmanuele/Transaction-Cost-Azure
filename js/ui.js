import { sourceCatalogUpdatedAt } from "../data/sources.js";
import {
  formatCurrency,
  formatInteger,
  formatNumber,
} from "./formatters.js";

const METRIC_DEFINITIONS = [
  {
    key: "writeOps",
    label: "Totale write operations",
    caption: "Logical write calls for the modeled scenario",
    termId: "write-operations",
  },
  {
    key: "readOps",
    label: "Totale read operations",
    caption: "Logical read calls or path reads",
    termId: "read-operations",
  },
  {
    key: "listOps",
    label: "Totale list operations",
    caption: "Separate from reads because list behavior matters",
    termId: "path-list",
  },
  {
    key: "iterativeReadOps",
    label: "Iterative read operations",
    caption: "Especially relevant in HNS mode",
    termId: "iterative-read-operations",
  },
  {
    key: "iterativeWriteOps",
    label: "Iterative write operations",
    caption: "Rename and recursive style operations",
    termId: "iterative-write-operations",
  },
  {
    key: "dataRetrievalGiB",
    label: "Data retrieval",
    caption: "Monthly volume used for retrieval meter",
    termId: "data-retrieval",
    format: (value) => `${formatNumber(value)} GiB`,
  },
  {
    key: "dataWriteGiB",
    label: "Data write",
    caption: "Monthly written volume used for data write meter",
    termId: "data-write",
    format: (value) => `${formatNumber(value)} GiB`,
  },
];

export function renderPricingProfileOptions(selectElement, profiles) {
  selectElement.innerHTML = profiles
    .map(
      (profile) =>
        `<option value="${profile.id}">${profile.label}</option>`
    )
    .join("");
}

export function renderExamples(container, examples, activeExampleId) {
  container.innerHTML = examples
    .map(
      (example) => `
        <button
          type="button"
          class="example-card ${example.id === activeExampleId ? "active" : ""}"
          data-example-id="${example.id}"
        >
          <div class="example-meta">
            ${example.tags.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
          <strong>${example.title}</strong>
          <p>${example.subtitle}</p>
        </button>
      `
    )
    .join("");
}

export function renderExampleNarrative(container, example) {
  if (!example) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <strong>${example.title}</strong>
    <p>${example.architectureNote}</p>
  `;
}

export function renderUploadHelper(container, state) {
  const helperLookup = {
    putBlob: {
      title: "Put Blob model",
      bullets: [
        "Write operations = number of files.",
        "Adatto a file piccoli o medi caricati in singola richiesta.",
        "Se la dimensione media file cresce troppo, il modello single upload potrebbe non essere piu realistico.",
      ],
    },
    putBlockList: {
      title: "Put Block + Put Block List model",
      bullets: [
        "Blocks per file = ceil(avg file size / chunk size).",
        "Total write operations = all Put Block calls + one Put Block List per file.",
        "E il pattern tipico da usare quando vuoi mostrare come il chunk size amplifica i costi.",
      ],
    },
    appendPattern: {
      title: "Append pattern model",
      bullets: [
        "Write operations = blob create + append calls.",
        "Utile per stream, log e workload append-heavy.",
        "Valida con attenzione il chunk size perche gli append hanno limiti specifici di API e service version.",
      ],
    },
    dataLakePath: {
      title: "Data Lake Path Create + Append + Flush model",
      bullets: [
        "Logical write formula = Path Create + Append + Flush.",
        "In HNS le letture e scritture dati sono spesso osservate anche in ottica di blocchi fatturabili da 4 MiB.",
        "E il modello piu parlante per ETL, lakehouse, staging e curation zone.",
      ],
    },
  };

  const helper = helperLookup[state.uploadMethod];
  const namespaceHint =
    state.namespaceMode === "hierarchical"
      ? "Namespace gerarchico selezionato: list e rename diventano parte esplicita della stima."
      : "Namespace flat selezionato: la gerarchia e principalmente convenzionale e il focus resta sulle REST call tipiche del blob service.";

  container.innerHTML = `
    <strong>${helper.title}</strong>
    <ul>
      ${helper.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
      <li>${namespaceHint}</li>
    </ul>
  `;
}

export function renderGlossary(container, glossaryTerms) {
  container.innerHTML = glossaryTerms
    .map(
      (term) => `
        <article class="glossary-card">
          <strong>${term.label}</strong>
          <p>${term.simple}</p>
          <button type="button" class="glossary-link" data-term="${term.id}">
            Apri spiegazione
          </button>
        </article>
      `
    )
    .join("");
}

export function renderSources(container, sources) {
  container.innerHTML = sources
    .map(
      (source) => `
        <article class="source-card">
          <span class="source-tag">Official Microsoft source</span>
          <strong>${source.title}</strong>
          <p>${source.description}</p>
          <a
            class="source-link"
            href="${source.url}"
            target="_blank"
            rel="noreferrer"
          >
            Apri documentazione
          </a>
        </article>
      `
    )
    .join("");

  const timestamp = document.createElement("p");
  timestamp.className = "section-note";
  timestamp.textContent = `Catalog last checked: ${sourceCatalogUpdatedAt}`;
  container.appendChild(timestamp);
}

export function applyFieldValidation(form, fieldErrors) {
  form.querySelectorAll(".field").forEach((field) => {
    field.dataset.invalid = "false";

    const existingError = field.querySelector(".field-error");
    if (existingError) {
      existingError.remove();
    }
  });

  Object.entries(fieldErrors).forEach(([fieldName, message]) => {
    const field = form.querySelector(`[data-field="${fieldName}"]`);

    if (!field) {
      return;
    }

    field.dataset.invalid = "true";
    const error = document.createElement("span");
    error.className = "field-error";
    error.textContent = message;
    field.appendChild(error);
  });
}

export function renderResults(result, dom) {
  const { metrics, costs, formulas, architectureNotes, warnings, errors, billableContext } = result;
  const allMessages = [...errors, ...warnings];

  dom.resultModeSummary.innerHTML = `
    <strong>${result.namespaceLabel} · ${billableContext.pricingProfileLabel}</strong>
    <p>${result.summary}</p>
  `;

  dom.metricsGrid.innerHTML = METRIC_DEFINITIONS.map((metric) => {
    const value = metrics[metric.key] ?? 0;
    const formattedValue = metric.format
      ? metric.format(value)
      : formatInteger(value);

    return `
      <article class="metric-card">
        <div class="metric-title">
          <strong>${metric.label}</strong>
          <button
            type="button"
            class="info-button"
            data-term="${metric.termId}"
            aria-label="Open ${metric.label} explanation"
          >
            i
          </button>
        </div>
        <div class="metric-value">${formattedValue}</div>
        <div class="metric-caption">${metric.caption}</div>
      </article>
    `;
  }).join("");

  dom.formulaList.innerHTML = formulas.map((formula) => `<li>${formula}</li>`).join("");

  const costRows = [
    {
      label: "Storage estimate",
      helper: `Average billable storage: ${formatNumber(
        billableContext.averageStoredGiB
      )} GiB`,
      value: costs.storageCost,
    },
    {
      label: "Write-side transaction estimate",
      helper: `Includes modeled upload pattern and namespace semantics`,
      value: costs.writeCost,
    },
    {
      label: "Read-side transaction estimate",
      helper: `Logical reads or HNS billable read units`,
      value: costs.readCost,
    },
    {
      label: "List or iterative read estimate",
      helper:
        result.namespaceMode === "hierarchical"
          ? "Iterative reads from list-like traversal"
          : "Flat list or container operations",
      value:
        result.namespaceMode === "hierarchical" ? costs.iterativeReadCost : costs.listCost,
    },
    {
      label: "Iterative write estimate",
      helper: "Rename and recursive style operations",
      value: costs.iterativeWriteCost,
    },
    {
      label: "Data movement estimate",
      helper: `Retrieval ${formatNumber(metrics.dataRetrievalGiB)} GiB + write ${formatNumber(
        metrics.dataWriteGiB
      )} GiB`,
      value: costs.dataMovementCost,
    },
    {
      label: "Estimated total",
      helper: `Projected end-of-month stored data: ${formatNumber(
        billableContext.projectedEndOfMonthGiB
      )} GiB`,
      value: costs.totalCost,
    },
  ];

  dom.costBreakdown.innerHTML = costRows
    .map(
      (row) => `
        <div class="cost-row">
          <div>
            <strong>${row.label}</strong>
            <small>${row.helper}</small>
          </div>
          <span class="cost-value">${formatCurrency(row.value)}</span>
        </div>
      `
    )
    .join("");

  dom.architectureNotes.innerHTML = architectureNotes.map((note) => `<li>${note}</li>`).join("");

  if (allMessages.length === 0) {
    dom.warningsList.innerHTML =
      '<div class="info-item">Nessun warning attivo. La stima appare coerente con i parametri attuali.</div>';
  } else {
    dom.warningsList.innerHTML = allMessages
      .map((message, index) => {
        const className = index < errors.length ? "warning-item" : "info-item";
        return `<div class="${className}">${message}</div>`;
      })
      .join("");
  }
}

export function openTermDialog(dialog, term) {
  const title = dialog.querySelector("#termDialogTitle");
  const simple = dialog.querySelector("#termDialogSimple");
  const technical = dialog.querySelector("#termDialogTechnical");
  const example = dialog.querySelector("#termDialogExample");

  title.textContent = term.label;
  simple.textContent = term.simple;
  technical.textContent = term.technical;
  example.textContent = term.example;

  if (dialog.open) {
    dialog.close();
  }

  dialog.showModal();
}

export function buildShareableReport(result) {
  const lines = [
    "Azure Storage Transaction Calculator",
    `Namespace: ${result.namespaceLabel}`,
    `Pricing profile: ${result.billableContext.pricingProfileLabel}`,
    "",
    "Key metrics",
    `Write operations: ${formatInteger(result.metrics.writeOps)}`,
    `Read operations: ${formatInteger(result.metrics.readOps)}`,
    `List operations: ${formatInteger(result.metrics.listOps)}`,
    `Iterative read operations: ${formatInteger(result.metrics.iterativeReadOps)}`,
    `Iterative write operations: ${formatInteger(result.metrics.iterativeWriteOps)}`,
    `Data retrieval: ${formatNumber(result.metrics.dataRetrievalGiB)} GiB`,
    `Data write: ${formatNumber(result.metrics.dataWriteGiB)} GiB`,
    "",
    "Cost estimate",
    `Storage estimate: ${formatCurrency(result.costs.storageCost)}`,
    `Transaction estimate: ${formatCurrency(result.costs.transactionCost)}`,
    `Data movement estimate: ${formatCurrency(result.costs.dataMovementCost)}`,
    `Estimated total: ${formatCurrency(result.costs.totalCost)}`,
    "",
    "Formula",
    ...result.formulas.map((formula) => `- ${formula}`),
    "",
    "Architecture notes",
    ...result.architectureNotes.map((note) => `- ${note}`),
    "",
    "Warnings",
    ...(result.errors.length || result.warnings.length
      ? [...result.errors, ...result.warnings].map((warning) => `- ${warning}`)
      : ["- No warnings"]),
  ];

  return lines.join("\n");
}

export function buildCsv(result) {
  const rows = [
    ["Section", "Metric", "Value"],
    ["Summary", "Namespace", result.namespaceLabel],
    ["Summary", "Pricing profile", result.billableContext.pricingProfileLabel],
    ["Metrics", "Write operations", result.metrics.writeOps],
    ["Metrics", "Read operations", result.metrics.readOps],
    ["Metrics", "List operations", result.metrics.listOps],
    ["Metrics", "Iterative read operations", result.metrics.iterativeReadOps],
    ["Metrics", "Iterative write operations", result.metrics.iterativeWriteOps],
    ["Metrics", "Data retrieval GiB", formatNumber(result.metrics.dataRetrievalGiB)],
    ["Metrics", "Data write GiB", formatNumber(result.metrics.dataWriteGiB)],
    ["Cost", "Storage estimate", formatCurrency(result.costs.storageCost)],
    ["Cost", "Transaction estimate", formatCurrency(result.costs.transactionCost)],
    ["Cost", "Data movement estimate", formatCurrency(result.costs.dataMovementCost)],
    ["Cost", "Estimated total", formatCurrency(result.costs.totalCost)],
  ];

  return rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
}

export function formatStateSnapshot(state) {
  return [
    `Dataset: ${state.totalDataValue} ${state.totalDataUnit}`,
    `Chunk: ${state.chunkSizeValue} ${state.chunkSizeUnit}`,
    `Files: ${state.fileCount}`,
    `Upload method: ${state.uploadMethod}`,
    `Reads: ${state.expectedReads}`,
    `Lists: ${state.expectedLists}`,
    `Renames: ${state.expectedRenames}`,
    `Iterative operations: ${state.iterativeOperations}`,
  ].join(" | ");
}
