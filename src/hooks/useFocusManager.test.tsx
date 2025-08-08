import { render, fireEvent } from "@/test-utils";
import { useFocusManager } from "./useFocusManager";

const rafOrig = globalThis.requestAnimationFrame;

beforeEach(() => {
  globalThis.requestAnimationFrame = (cb: any) => {
    cb(0);
    return 1 as any;
  };
});

afterEach(() => {
  globalThis.requestAnimationFrame = rafOrig;
});

const TestComp = () => {
  const { ref, focus, maintainFocus, releaseFocus } = useFocusManager();
  return (
    <div>
      <textarea ref={ref} data-testid="ta" />
      <button onClick={focus}>focus</button>
      <button onClick={maintainFocus}>maintain</button>
      <button onClick={releaseFocus}>release</button>
    </div>
  );
};

describe("useFocusManager", () => {
  it("focus() focuses the element", () => {
    const { getByText } = render(<TestComp />);
    const focusSpy = jest.spyOn(HTMLTextAreaElement.prototype, "focus").mockImplementation();

    fireEvent.click(getByText("focus"));
    expect(focusSpy).toHaveBeenCalled();

    focusSpy.mockRestore();
  });

  it("maintains focus on blur when maintainFocus was called", () => {
    const { getByText, getByTestId } = render(<TestComp />);
    const focusSpy = jest.spyOn(HTMLTextAreaElement.prototype, "focus").mockImplementation();

    fireEvent.click(getByText("maintain"));
    // trigger blur which should re-focus
    fireEvent.blur(getByTestId("ta"));

    expect(focusSpy).toHaveBeenCalled();
    focusSpy.mockRestore();
  });

  it("does not re-focus after releaseFocus on blur", () => {
    const { getByText, getByTestId } = render(<TestComp />);
    const focusSpy = jest.spyOn(HTMLTextAreaElement.prototype, "focus").mockImplementation();

    fireEvent.click(getByText("release"));
    fireEvent.blur(getByTestId("ta"));

    expect(focusSpy).not.toHaveBeenCalled();
    focusSpy.mockRestore();
  });
});
