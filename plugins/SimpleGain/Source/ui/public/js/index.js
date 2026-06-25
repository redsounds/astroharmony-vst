// SimpleGain — JUCE WebView UI bridge
// Wires the HTML controls to JUCE parameter relays and receives meter data
// from the C++ Editor's 30 Hz timer via window.updateMeters().

import * as Juce from "./juce/index.js";
import "./juce/check_native_interop.js";

const PARAM_MIN = -60;
const PARAM_MAX = 12;
const PARAM_RANGE = PARAM_MAX - PARAM_MIN;

const ARC_CIRCUMFERENCE = 201.062;
const SWEEP_RATIO = 0.75;
const FULL_SWEEP = ARC_CIRCUMFERENCE * SWEEP_RATIO;

function dBToNorm(dB) {
  return (Math.max(PARAM_MIN, Math.min(PARAM_MAX, dB)) - PARAM_MIN) / PARAM_RANGE;
}

function normToDB(norm) {
  return PARAM_MIN + Math.max(0, Math.min(1, norm)) * PARAM_RANGE;
}

function paintKnob(el, dB) {
  const arc = el.querySelector(".value-arc");
  const norm = dBToNorm(dB);
  arc.setAttribute(
    "stroke-dasharray",
    `${(FULL_SWEEP * norm).toFixed(3)} ${ARC_CIRCUMFERENCE.toFixed(3)}`
  );
  el.setAttribute("aria-valuenow", String(dB.toFixed(2)));
  el.classList.toggle("active", dB > PARAM_MIN);
}

function bindRotaryParam(paramId) {
  const knob = document.getElementById(`${paramId}-knob`);
  const valueEl = document.getElementById(`${paramId}-value`);
  const state = Juce.getSliderState(paramId);

  const updateUIFromBackend = () => {
    const norm = state.getNormalisedValue();
    const dB = normToDB(norm);
    paintKnob(knob, dB);
    valueEl.textContent = dB.toFixed(1);
  };

  // Initial paint
  updateUIFromBackend();
  state.valueChangedEvent.addListener(updateUIFromBackend);

  // Drag interaction
  let dragging = false;
  let startY = 0;
  let startNorm = 0;

  knob.addEventListener("mousedown", (e) => {
    dragging = true;
    startY = e.clientY;
    startNorm = state.getNormalisedValue();
    state.sliderDragStarted();
    document.body.style.cursor = "ns-resize";
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dy = startY - e.clientY;
    // Step in dB per pixel; Shift = fine
    const dBPerPixel = e.shiftKey ? 0.05 : 0.5;
    const dDb = dy * dBPerPixel;
    const dNorm = dDb / PARAM_RANGE;
    const next = Math.max(0, Math.min(1, startNorm + dNorm));
    state.setNormalisedValue(next);
  });

  window.addEventListener("mouseup", () => {
    if (dragging) {
      dragging = false;
      document.body.style.cursor = "";
      state.sliderDragEnded();
    }
  });

  knob.addEventListener("dblclick", () => {
    state.sliderDragStarted();
    state.setNormalisedValue(dBToNorm(0));
    state.sliderDragEnded();
  });

  knob.addEventListener("wheel", (e) => {
    e.preventDefault();
    const stepDb = e.deltaY < 0 ? 1 : -1;
    const currentDb = normToDB(state.getNormalisedValue());
    state.sliderDragStarted();
    state.setNormalisedValue(dBToNorm(currentDb + stepDb));
    state.sliderDragEnded();
  }, { passive: false });
}

function bindBypassToggle(paramId) {
  const plugin = document.getElementById("plugin");
  const btn = document.getElementById("bypass-toggle");
  const state = Juce.getToggleState(paramId);

  const updateUIFromBackend = () => {
    const on = state.getValue();
    plugin.classList.toggle("bypassed", on);
    btn.setAttribute("aria-pressed", String(on));
  };

  updateUIFromBackend();
  state.valueChangedEvent.addListener(updateUIFromBackend);

  btn.addEventListener("click", () => {
    state.setValue(!state.getValue());
  });
}

// Meter rendering — fed from C++ via window.updateMeters(peakL, peakR)
// where values are in dBFS (clamped to -60..0).
const meterL = document.getElementById("meter-l-fill");
const meterR = document.getElementById("meter-r-fill");
const holdL = document.getElementById("meter-l-hold");
const holdR = document.getElementById("meter-r-hold");
const readout = document.getElementById("meter-readout");

let holdLval = -60;
let holdRval = -60;
let holdLts = 0;
let holdRts = 0;

function dbToPct(db) {
  const clamped = Math.max(-60, Math.min(0, db));
  return ((clamped + 60) / 60) * 100;
}

window.updateMeters = function (peakL, peakR) {
  const now = performance.now();

  meterL.style.height = dbToPct(peakL) + "%";
  meterR.style.height = dbToPct(peakR) + "%";

  if (peakL >= holdLval) { holdLval = peakL; holdLts = now; }
  if (peakR >= holdRval) { holdRval = peakR; holdRts = now; }
  if (now - holdLts > 1500) holdLval = Math.max(-60, holdLval - 0.3);
  if (now - holdRts > 1500) holdRval = Math.max(-60, holdRval - 0.3);

  holdL.style.bottom = dbToPct(holdLval) + "%";
  holdR.style.bottom = dbToPct(holdRval) + "%";
  holdL.classList.toggle("visible", holdLval > -60);
  holdR.classList.toggle("visible", holdRval > -60);

  const peak = Math.max(peakL, peakR);
  if (peak <= -60) {
    readout.textContent = "PEAK: -inf dB";
    readout.classList.remove("over");
  } else {
    readout.textContent = `PEAK: ${peak.toFixed(1)} dB`;
    readout.classList.toggle("over", peak > -3);
  }
};

function _initBindings() {
  bindRotaryParam("input_gain");
  bindRotaryParam("output_trim");
  bindBypassToggle("bypass");
}

if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", _initBindings);
} else {
  _initBindings();
}
