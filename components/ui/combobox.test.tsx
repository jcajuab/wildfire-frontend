import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

describe("Combobox", () => {
  test("does not render empty text when filtered items exist", () => {
    render(
      <Combobox items={["lobby"]} filteredItems={["lobby"]} defaultOpen>
        <ComboboxInput aria-label="Display" />
        <ComboboxContent>
          <ComboboxEmpty>No displays found.</ComboboxEmpty>
          <ComboboxList>
            <ComboboxItem value="lobby">Lobby</ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );

    expect(screen.getByRole("option", { name: "Lobby" })).toBeInTheDocument();
    expect(screen.queryByText("No displays found.")).not.toBeInTheDocument();
  });

  test("renders empty text when no filtered items exist", () => {
    render(
      <Combobox items={["lobby"]} filteredItems={[]} defaultOpen>
        <ComboboxInput aria-label="Display" />
        <ComboboxContent>
          <ComboboxEmpty>No displays found.</ComboboxEmpty>
          <ComboboxList />
        </ComboboxContent>
      </Combobox>,
    );

    expect(screen.getByText("No displays found.")).toBeInTheDocument();
  });
});
