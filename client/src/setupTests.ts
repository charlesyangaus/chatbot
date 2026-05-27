import "@testing-library/jest-dom";

if (typeof globalThis.fetch !== "function") {
  globalThis.fetch = jest.fn() as typeof fetch;
}
