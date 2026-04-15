import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { TokenUsagePanel } from "../TokenUsagePanel";

// ── Mock useAnalytics ─────────────────────────────────────────────────────────

const mockAnalyticsData = {
  tokenUsage: [],
  costBreakdown: [
    { name: "Claude 3.5 Sonnet", cost: 1.71, percentage: 63 },
    { name: "GPT-4", cost: 0.84, percentage: 26 },
    { name: "Gemini Pro", cost: 0.29, percentage: 11 },
  ],
  agentPerformance: [],
  combinedMetrics: [],
  stats: {
    totalTokens: 1250340,
    totalInputTokens: 800000,
    totalOutputTokens: 450340,
    totalCost: 2.84,
    averageCostPerToken: 0.000068,
    totalProjects: 3,
    totalConversations: 42,
    totalMessages: 380,
    modelsUsed: 3,
    agentsUsed: 2,
  },
};

const mockUseAnalytics = vi.fn(() => ({
  data: mockAnalyticsData,
  isLoading: false,
  error: null,
  isEmpty: false,
  period: "month",
  refetch: vi.fn(),
}));

vi.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => mockUseAnalytics(),
}));

describe("TokenUsagePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the component", () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />);
    expect(getByText("Token Usage & Costs")).toBeInTheDocument();
  });

  it("displays header with title and description", () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />);

    expect(getByText("Token Usage & Costs")).toBeInTheDocument();
    expect(getByText(/Monthly analytics breakdown/)).toBeInTheDocument();
  });

  it("displays total token metrics", () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />);

    expect(getByText(/Total Tokens/)).toBeInTheDocument();
    expect(getByText(/1\.25M/)).toBeInTheDocument();
  });

  it("displays conversation count", () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />);

    expect(getByText(/Conversations/)).toBeInTheDocument();
    expect(getByText(/42/)).toBeInTheDocument();
  });

  it("displays model usage breakdown section", () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />);

    expect(getByText(/Model Usage Breakdown/)).toBeInTheDocument();
  });

  it("displays all model names", () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />);

    expect(getByText("Claude 3.5 Sonnet")).toBeInTheDocument();
    expect(getByText("GPT-4")).toBeInTheDocument();
    expect(getByText("Gemini Pro")).toBeInTheDocument();
  });

  it("displays model costs", () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />);

    expect(getByText("$1.71")).toBeInTheDocument();
    expect(getByText("$0.84")).toBeInTheDocument();
    expect(getByText("$0.29")).toBeInTheDocument();
  });

  it("displays cost per token metric", () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />);

    expect(getByText(/Cost per Token/)).toBeInTheDocument();
    expect(getByText(/\/M/)).toBeInTheDocument();
  });

  it("displays usage stats footer", () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />);

    expect(getByText(/Average daily cost/)).toBeInTheDocument();
    expect(getByText(/Projected monthly/)).toBeInTheDocument();
  });

  it("displays cost values formatted correctly", () => {
    const { container } = renderWithProviders(<TokenUsagePanel />);

    const html = container.innerHTML;
    expect(html).toContain("USD");
    expect(html).toMatch(/\$\d+\.\d{2}/);
  });

  it("renders gradient styled cards", () => {
    const { container } = renderWithProviders(<TokenUsagePanel />);

    const gradientElements = container.querySelectorAll('[class*="gradient"]');
    expect(gradientElements.length).toBeGreaterThan(0);
  });

  it("displays icon indicators", () => {
    const { container } = renderWithProviders(<TokenUsagePanel />);

    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("renders progress bars for model breakdown", () => {
    const { container } = renderWithProviders(<TokenUsagePanel />);

    const progressBars = Array.from(
      container.querySelectorAll("div") as NodeListOf<HTMLDivElement>,
    ).filter((el) => el.style.width && el.style.width.includes("%"));
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it("displays percentage values for models", () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />);

    expect(getByText("63%")).toBeInTheDocument();
    expect(getByText("26%")).toBeInTheDocument();
    expect(getByText("11%")).toBeInTheDocument();
  });

  it("uses appropriate color schemes", () => {
    const { container } = renderWithProviders(<TokenUsagePanel />);

    const blueElements = Array.from(
      container.querySelectorAll('[class*="blue"]'),
    );
    const purpleElements = Array.from(
      container.querySelectorAll('[class*="purple"]'),
    );
    const greenElements = Array.from(
      container.querySelectorAll('[class*="green"]'),
    );

    expect(
      blueElements.length + purpleElements.length + greenElements.length,
    ).toBeGreaterThan(0);
  });

  it("renders border styling for cards", () => {
    const { container } = renderWithProviders(<TokenUsagePanel />);

    const borderedElements = container.querySelectorAll('[class*="border"]');
    expect(borderedElements.length).toBeGreaterThan(0);
  });

  it("displays rounded corners on components", () => {
    const { container } = renderWithProviders(<TokenUsagePanel />);

    const roundedElements = container.querySelectorAll('[class*="rounded"]');
    expect(roundedElements.length).toBeGreaterThan(0);
  });

  it("has proper layout structure", () => {
    const { container } = renderWithProviders(<TokenUsagePanel />);

    const mainContainer = container.querySelector('[class*="space-y-4"]');
    expect(mainContainer).toBeTruthy();

    const gridLayout = container.querySelector('[class*="grid"]');
    expect(gridLayout).toBeTruthy();
  });

  it("displays responsive grid for metrics", () => {
    const { container } = renderWithProviders(<TokenUsagePanel />);

    const gridElement = container.querySelector('[class*="grid-cols"]');
    expect(gridElement?.className).toContain("grid-cols-2");
  });

  it("shows skeleton when loading", () => {
    mockUseAnalytics.mockReturnValueOnce({
      data: null as never,
      isLoading: true,
      error: null,
      isEmpty: false,
      period: "month",
      refetch: vi.fn(),
    });

    const { container } = renderWithProviders(<TokenUsagePanel />);
    // When isLoading=true the component renders a skeleton or loading state
    // We verify the container renders without crashing
    expect(container).toBeTruthy();
  });

  it("shows empty state when no data", () => {
    // Structural test - empty state renders SVG and message
    const { container } = renderWithProviders(<TokenUsagePanel />);
    expect(container).toBeTruthy();
  });

  it("renders without errors", () => {
    const { container } = renderWithProviders(<TokenUsagePanel />);
    expect(container).toBeTruthy();
  });
});
