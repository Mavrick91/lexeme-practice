import { render, type RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import React, { type ReactElement } from "react";

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <ThemeProvider>{children}</ThemeProvider>;
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
