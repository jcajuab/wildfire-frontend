import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxVirtualList,
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

  test("keeps wheel scrolling inside virtualized option lists", () => {
    const options = Array.from({ length: 30 }, (_, index) => `Option ${index}`);
    render(
      <Combobox items={options} filteredItems={options} defaultOpen>
        <ComboboxInput aria-label="Display" />
        <ComboboxContent>
          <ComboboxVirtualList
            items={options}
            estimateSize={32}
            getItemKey={(option) => option}
            renderItem={(option) => (
              <ComboboxItem value={option}>{option}</ComboboxItem>
            )}
          />
        </ComboboxContent>
      </Combobox>,
    );

    const list = document.querySelector<HTMLElement>(
      "[data-slot='combobox-list']",
    );
    expect(list).not.toBeNull();
    if (list == null) return;

    Object.defineProperty(list, "clientHeight", {
      configurable: true,
      value: 96,
    });
    Object.defineProperty(list, "scrollHeight", {
      configurable: true,
      value: 960,
    });

    fireEvent.wheel(list, { deltaY: 64 });

    expect(list.scrollTop).toBe(64);
  });
});
