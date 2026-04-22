import { scenarioExamples } from "../data/examples.js";
import { glossaryTerms } from "../data/glossary.js";
import { pricingProfiles } from "../data/pricingProfiles.js";
import { microsoftSources } from "../data/sources.js";
import {
  calculateScenario,
  getDefaultState,
  getProfileValues,
  getRecommendedProfileId,
} from "./calculators.js";
import { downloadTextFile } from "./formatters.js";
import {
  applyFieldValidation,
  buildCsv,
  buildShareableReport,
  formatStateSnapshot,
  openTermDialog,
  renderExampleNarrative,
  renderExamples,
  renderGlossary,
  renderPricingProfileOptions,
  renderResults,
  renderSources,
  renderUploadHelper,
} from "./ui.js";

const form = document.querySelector("#calculatorForm");
const termDialog = document.querySelector("#termDialog");
const pricingProfileSelect = document.querySelector("#pricingProfileId");
const examplesGrid = document.querySelector("#examplesGrid");
const exampleNarrative = document.querySelector("#exampleNarrative");
const uploadMethodHelper = document.querySelector("#uploadMethodHelper");
const copyResultsButton = document.querySelector("#copyResultsButton");
const exportResultsButton = document.querySelector("#exportResultsButton");
const printResultsButton = document.querySelector("#printResultsButton");
const resetButton = document.querySelector("#resetButton");
const actionFeedback = document.querySelector("#actionFeedback");

const dom = {
  resultModeSummary: document.querySelector("#resultModeSummary"),
  metricsGrid: document.querySelector("#metricsGrid"),
  formulaList: document.querySelector("#formulaList"),
  costBreakdown: document.querySelector("#costBreakdown"),
  architectureNotes: document.querySelector("#architectureNotes"),
  warningsList: document.querySelector("#warningsList"),
};

renderPricingProfileOptions(pricingProfileSelect, pricingProfiles);
renderGlossary(document.querySelector("#glossaryGrid"), glossaryTerms);
renderSources(document.querySelector("#sourcesGrid"), microsoftSources);

const exampleById = new Map(scenarioExamples.map((example) => [example.id, example]));
const glossaryById = new Map(glossaryTerms.map((term) => [term.id, term]));

let activeExampleId = "massive-upload";
let state = initializeStateFromExample(activeExampleId);
let lastResult = null;

function initializeStateFromExample(exampleId) {
  const example = exampleById.get(exampleId);
  const exampleValues = example?.values ?? {};
  const profileValues = getProfileValues(exampleValues.pricingProfileId ?? "manual");

  return getDefaultState({
    ...exampleValues,
    ...profileValues,
  });
}

function setFeedback(message) {
  actionFeedback.textContent = message;
  window.clearTimeout(setFeedback.timeoutId);
  setFeedback.timeoutId = window.setTimeout(() => {
    actionFeedback.textContent = "";
  }, 2600);
}

function syncFormFromState() {
  const elements = form.elements;

  Object.entries(state).forEach(([key, value]) => {
    const field = elements.namedItem(key);

    if (!field) {
      return;
    }

    if (field instanceof RadioNodeList) {
      Array.from(field).forEach((radio) => {
        radio.checked = radio.value === String(value);
      });
      return;
    }

    field.value = String(value);
  });
}

function readStateFromForm() {
  const formData = new FormData(form);
  const nextState = { ...state };

  for (const [key, value] of formData.entries()) {
    nextState[key] = value;
  }

  return nextState;
}

function applyPricingProfile(profileId) {
  state = {
    ...state,
    ...getProfileValues(profileId),
  };
}

function applyExample(exampleId) {
  const example = exampleById.get(exampleId);

  if (!example) {
    return;
  }

  activeExampleId = exampleId;
  const profileValues = getProfileValues(example.values.pricingProfileId);

  state = getDefaultState({
    ...example.values,
    ...profileValues,
  });

  syncFormFromState();
  renderApp();
}

function renderApp() {
  const activeExample = exampleById.get(activeExampleId);
  const result = calculateScenario(state);

  lastResult = result;

  renderExamples(examplesGrid, scenarioExamples, activeExampleId);
  renderExampleNarrative(exampleNarrative, activeExample);
  renderUploadHelper(uploadMethodHelper, result.normalizedState);
  applyFieldValidation(form, result.validation.fieldErrors);
  renderResults(result, dom);
}

function handleFormMutation(event) {
  const target = event.target;

  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
    return;
  }

  const previousNamespaceMode = state.namespaceMode;
  state = readStateFromForm();

  if (target.name === "pricingProfileId") {
    applyPricingProfile(state.pricingProfileId);
    syncFormFromState();
  }

  if (target.name === "namespaceMode" && state.namespaceMode !== previousNamespaceMode) {
    const recommendedProfileId = getRecommendedProfileId(state.namespaceMode, state.pricingProfileId);

    if (recommendedProfileId !== state.pricingProfileId) {
      state = {
        ...state,
        ...getProfileValues(recommendedProfileId),
      };
      syncFormFromState();
    }
  }

  renderApp();
}

form.addEventListener("input", handleFormMutation);
form.addEventListener("change", handleFormMutation);

examplesGrid.addEventListener("click", (event) => {
  const button = event.target instanceof HTMLElement ? event.target.closest("[data-example-id]") : null;

  if (!button) {
    return;
  }

  applyExample(button.dataset.exampleId);
});

document.addEventListener("click", (event) => {
  const trigger = event.target instanceof HTMLElement ? event.target.closest("[data-term]") : null;

  if (!trigger) {
    return;
  }

  const term = glossaryById.get(trigger.dataset.term);

  if (!term) {
    return;
  }

  openTermDialog(termDialog, term);
});

copyResultsButton.addEventListener("click", async () => {
  if (!lastResult) {
    return;
  }

  const report = buildShareableReport(lastResult);
  const context = formatStateSnapshot(state);

  try {
    await navigator.clipboard.writeText(`${report}\n\nScenario snapshot\n${context}`);
    setFeedback("Risultati copiati negli appunti.");
  } catch (error) {
    setFeedback("Clipboard non disponibile. Riprova dal browser.");
  }
});

exportResultsButton.addEventListener("click", () => {
  if (!lastResult) {
    return;
  }

  downloadTextFile("azure-storage-estimate.csv", buildCsv(lastResult), "text/csv;charset=utf-8");
  setFeedback("Riepilogo esportato in CSV.");
});

printResultsButton.addEventListener("click", () => {
  window.print();
});

resetButton.addEventListener("click", () => {
  activeExampleId = "massive-upload";
  state = initializeStateFromExample(activeExampleId);
  syncFormFromState();
  renderApp();
  setFeedback("Scenario riportato al default.");
});

termDialog.addEventListener("click", (event) => {
  const rect = termDialog.getBoundingClientRect();
  const clickedOutside =
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom;

  if (clickedOutside) {
    termDialog.close();
  }
});

syncFormFromState();
renderApp();
