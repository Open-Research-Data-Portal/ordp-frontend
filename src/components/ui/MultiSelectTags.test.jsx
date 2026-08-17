import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MultiSelectTags from "./MultiSelectTags";

describe("MultiSelectTags", () => {
  it("adds a typed tag with Enter and removes it from the chip", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    const { rerender } = render(
      <MultiSelectTags
        id="keywords"
        label="Keyword Tags"
        value={[]}
        onChange={handleChange}
        options={[]}
        placeholder="Type a keyword and press Enter"
      />
    );

    await user.type(screen.getByLabelText(/keyword tags/i), "soil{Enter}");
    expect(handleChange).toHaveBeenLastCalledWith(["soil"]);

    rerender(
      <MultiSelectTags
        id="keywords"
        label="Keyword Tags"
        value={["soil"]}
        onChange={handleChange}
        options={[]}
      />
    );

    await user.click(screen.getByRole("button", { name: /remove soil/i }));
    expect(handleChange).toHaveBeenLastCalledWith([]);
  });
});
