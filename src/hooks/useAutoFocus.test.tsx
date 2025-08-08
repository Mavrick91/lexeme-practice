import { useRef } from "react";
import { render } from "@/test-utils";
import { useAutoFocus } from "./useAutoFocus";

const rafOrig = globalThis.requestAnimationFrame;
const cancelRafOrig = globalThis.cancelAnimationFrame;

beforeEach(() => {
  // Make RAF immediate to stabilize tests
  globalThis.requestAnimationFrame = (cb: any) => {
    cb(0);
    return 1 as any;
  };
  globalThis.cancelAnimationFrame = jest.fn();
});

afterEach(() => {
  globalThis.requestAnimationFrame = rafOrig;
  globalThis.cancelAnimationFrame = cancelRafOrig;
});

const TestComp = ({ shouldFocus }: { shouldFocus: boolean }) => {
  const ref = useRef<HTMLInputElement | null>(null);
  useAutoFocus(ref, shouldFocus);
  return <input ref={ref} data-testid="focus-target" />;
};

describe("useAutoFocus", () => {
  it("focuses the element when shouldFocus is true", () => {
    const focusSpy = jest.spyOn(HTMLInputElement.prototype, "focus").mockImplementation();
    render(<TestComp shouldFocus={true} />);
    expect(focusSpy).toHaveBeenCalled();
    focusSpy.mockRestore();
  });

  it("does not focus when shouldFocus is false", () => {
    const focusSpy = jest.spyOn(HTMLInputElement.prototype, "focus").mockImplementation();
    render(<TestComp shouldFocus={false} />);
    expect(focusSpy).not.toHaveBeenCalled();
    focusSpy.mockRestore();
  });
});
