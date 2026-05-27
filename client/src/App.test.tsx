import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./api/chat", () => ({
  fetchHealth: jest.fn().mockResolvedValue({ mode: "demo", rag: { enabled: false } }),
  sendChat: jest.fn(),
  uid: () => "test-id",
}));

describe("App", () => {
  it("renders the support header and initial assistant message", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /support/i })).toBeInTheDocument();
    expect(
      await screen.findByText(/virtual assistant/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/demo mode/i)).toBeInTheDocument();
  });
});
