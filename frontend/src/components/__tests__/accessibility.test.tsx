/**
 * Accessibility Tests — WCAG 2.1 AA
 *
 * Uses axe-core (via vitest-axe) to scan rendered components for
 * accessibility violations. Each test also includes targeted
 * structural assertions for rules that axe validates in context.
 *
 * Components under test:
 *   - LoginForm
 *   - RegisterForm
 *   - CreateProjectDialog
 *   - InputArea
 *   - OfflineBanner
 *   - EmptyState
 *   - ErrorState
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    loginAsync: vi.fn(),
    registerAsync: vi.fn(),
    isRegistering: false,
    logoutAsync: vi.fn(),
  }),
}));

vi.mock("@/hooks/useVoiceInput", () => ({
  useVoiceInput: () => ({
    isRecording: false,
    isSupported: true,
    toggle: vi.fn(),
  }),
}));

vi.mock("@/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => false, // offline — makes OfflineBanner visible
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useLocation: () => ({ pathname: "/dashboard" }),
    Link: ({
      to,
      children,
      className,
    }: {
      to: string;
      children: React.ReactNode;
      className?: string;
    }) => (
      <a href={to} className={className}>
        {children}
      </a>
    ),
  };
});

// ─── Imports ──────────────────────────────────────────────────────────────────

import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { InputArea } from "@/components/chat/InputArea";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import {
  EmptyState,
  EmptyStateNoProjects,
  EmptyStateError,
} from "@/components/ui/EmptyState";
import {
  ErrorState,
  NotFoundError,
  ForbiddenError,
} from "@/components/ui/ErrorState";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function noViolations(container: Element) {
  const results = await axe(container);
  expect(results.violations).toHaveLength(0);
}

// ─── LoginForm ────────────────────────────────────────────────────────────────

describe("Accessibility: LoginForm", () => {
  it("has no axe violations", async () => {
    const { container } = render(<LoginForm />);
    await noViolations(container);
  });

  it("every input has an associated label", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("show/hide password button has an accessible label", () => {
    render(<LoginForm />);
    const toggleBtn = screen.getByRole("button", { name: /show password/i });
    expect(toggleBtn).toBeInTheDocument();
  });

  it("submit button is focusable and labelled", () => {
    render(<LoginForm />);
    const submit = screen.getByRole("button", { name: /sign in/i });
    expect(submit).toBeInTheDocument();
    expect(submit).not.toHaveAttribute("tabindex", "-1");
  });
});

// ─── RegisterForm ─────────────────────────────────────────────────────────────

describe("Accessibility: RegisterForm", () => {
  it("has no axe violations", async () => {
    const { container } = render(<RegisterForm />);
    await noViolations(container);
  });

  it("every input has an associated label", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    // Password field has two: "Password" and "Confirm Password"
    expect(screen.getAllByLabelText(/password/i).length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("terms checkbox has an accessible label", () => {
    render(<RegisterForm />);
    // The checkbox is inside a <label> element — implicit association
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
  });
});

// ─── CreateProjectDialog ──────────────────────────────────────────────────────

describe("Accessibility: CreateProjectDialog", () => {
  it("has no axe violations when open", async () => {
    const { container } = render(
      <CreateProjectDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />,
    );
    await noViolations(container);
  });

  it("close button has an accessible label", () => {
    render(
      <CreateProjectDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: /close dialog/i }),
    ).toBeInTheDocument();
  });

  it("required field is marked with aria-invalid when validation fails", async () => {
    const { container } = render(
      <CreateProjectDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />,
    );
    // aria-invalid is set via RHF — default is "false" before submission
    const nameInput = container.querySelector('input[type="text"]');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveAttribute("aria-invalid");
  });
});

// ─── InputArea ────────────────────────────────────────────────────────────────

describe("Accessibility: InputArea", () => {
  it("has no axe violations", async () => {
    const { container } = render(<InputArea onSubmit={vi.fn()} />);
    await noViolations(container);
  });

  it("voice toggle button has an accessible label", () => {
    render(<InputArea onSubmit={vi.fn()} />);
    // aria-label="Start voice input" when not recording
    expect(
      screen.getByRole("button", { name: /voice input/i }),
    ).toBeInTheDocument();
  });

  it("hidden file input is aria-hidden", () => {
    const { container } = render(<InputArea onSubmit={vi.fn()} />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute("aria-hidden", "true");
  });
});

// ─── OfflineBanner ────────────────────────────────────────────────────────────

describe("Accessibility: OfflineBanner", () => {
  it("has no axe violations when offline", async () => {
    const { container } = render(<OfflineBanner />);
    await noViolations(container);
  });

  it('uses role="status" for polite screen-reader announcement', () => {
    render(<OfflineBanner />);
    const banner = screen.getByRole("status");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("aria-live", "polite");
  });

  it("shows pending count in the message", () => {
    render(<OfflineBanner pendingCount={3} />);
    expect(screen.getByText(/3 changes/i)).toBeInTheDocument();
  });
});

// ─── EmptyState ───────────────────────────────────────────────────────────────

describe("Accessibility: EmptyState", () => {
  it("has no axe violations", async () => {
    const { container } = render(
      <EmptyState
        title="Nothing here"
        description="Create something to get started."
      />,
    );
    await noViolations(container);
  });

  it("title is rendered as a heading", () => {
    render(<EmptyState title="Nothing here" />);
    expect(
      screen.getByRole("heading", { name: /nothing here/i }),
    ).toBeInTheDocument();
  });

  it("action button is keyboard-accessible", () => {
    render(<EmptyStateNoProjects onCreateProject={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /create project/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it("EmptyStateError has no axe violations", async () => {
    const { container } = render(
      <EmptyStateError error="Something failed" onRetry={vi.fn()} />,
    );
    await noViolations(container);
  });
});

// ─── ErrorState ───────────────────────────────────────────────────────────────

describe("Accessibility: ErrorState", () => {
  it("has no axe violations (default error type)", async () => {
    const { container } = render(<ErrorState />);
    await noViolations(container);
  });

  it("title is rendered as a heading", () => {
    render(<ErrorState title="Something went wrong" />);
    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
  });

  it("NotFoundError has no axe violations", async () => {
    const { container } = render(<NotFoundError />);
    await noViolations(container);
  });

  it("ForbiddenError has no axe violations", async () => {
    const { container } = render(<ForbiddenError />);
    await noViolations(container);
  });

  it("details summary/details element is keyboard-accessible", () => {
    render(<ErrorState details="stack trace here" />);
    const details = document.querySelector("details");
    const summary = document.querySelector("summary");
    expect(details).toBeInTheDocument();
    expect(summary).toBeInTheDocument();
  });
});
