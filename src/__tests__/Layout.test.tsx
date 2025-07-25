import { render, screen } from "@/test-utils";
import { Layout } from "@/components/Layout";

describe("Layout", () => {
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
});
