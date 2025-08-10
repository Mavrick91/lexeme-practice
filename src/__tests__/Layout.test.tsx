import { render, screen } from "@/test-utils";
import { Layout } from "@/components/Layout";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

// Mock next/link
jest.mock("next/link", () => {
  return {
    __esModule: true,
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
  };
});

const mockUsePathname = jest.requireMock("next/navigation").usePathname;

describe("Layout", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    );

    // Check if the layout component is rendered
    const layoutElement = screen.getByRole("main");
    expect(layoutElement).toBeTruthy();
  });

  it("renders children content", () => {
    render(
      <Layout>
        <div data-testid="test-content">Test content</div>
      </Layout>
    );

    const content = screen.getByTestId("test-content");
    expect(content).toBeTruthy();
    expect(content.textContent).toBe("Test content");
  });

  describe("Header", () => {
    it("renders the app title and icon", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText("Lexeme Master")).toBeInTheDocument();
      // Icon is rendered as an SVG
      const header = screen.getByText("Lexeme Master").parentElement;
      expect(header?.querySelector("svg")).toBeInTheDocument();
    });

    it("renders the theme toggle", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      // ThemeToggle should be present
      const header = screen.getByText("Lexeme Master").closest("header");
      expect(header).toBeInTheDocument();
    });

    it("has sticky positioning", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const header = screen.getByText("Lexeme Master").closest("header");
      expect(header).toHaveClass("sticky", "top-0", "z-50");
    });
  });

  describe("Navigation", () => {
    it("renders navigation links", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText("Practice")).toBeInTheDocument();
      expect(screen.getByText("Words")).toBeInTheDocument();
    });

    it("highlights the active Practice link", () => {
      mockUsePathname.mockReturnValue("/");

      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const practiceLink = screen.getByText("Practice");
      const wordsLink = screen.getByText("Words");

      expect(practiceLink).toHaveClass("text-foreground");
      expect(wordsLink).toHaveClass("text-foreground/60");
    });

    it("highlights the active Words link", () => {
      mockUsePathname.mockReturnValue("/words");

      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const practiceLink = screen.getByText("Practice");
      const wordsLink = screen.getByText("Words");

      expect(practiceLink).toHaveClass("text-foreground/60");
      expect(wordsLink).toHaveClass("text-foreground");
    });

    it("has correct href attributes", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const practiceLink = screen.getByText("Practice").closest("a");
      const wordsLink = screen.getByText("Words").closest("a");

      expect(practiceLink).toHaveAttribute("href", "/");
      expect(wordsLink).toHaveAttribute("href", "/words");
    });

    it("applies hover styles", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const practiceLink = screen.getByText("Practice");
      expect(practiceLink).toHaveClass("hover:text-foreground");
    });

    it("hides navigation on mobile by default", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const nav = screen.getByText("Practice").closest("nav");
      expect(nav).toHaveClass("hidden", "sm:flex");
    });
  });

  describe("Layout structure", () => {
    it("applies min-height to ensure full viewport", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const wrapper = screen.getByRole("main").parentElement;
      expect(wrapper).toHaveClass("min-h-screen");
    });

    it("applies background color", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const wrapper = screen.getByRole("main").parentElement;
      expect(wrapper).toHaveClass("bg-background");
    });

    it("main content has flex-1 for proper layout", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const main = screen.getByRole("main");
      expect(main).toHaveClass("flex-1");
    });

    it("header has proper border and backdrop styles", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const header = screen.getByText("Lexeme Master").closest("header");
      expect(header).toHaveClass("border-b", "bg-background/95", "backdrop-blur");
    });
  });
});
