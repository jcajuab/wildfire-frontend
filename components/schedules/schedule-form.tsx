"use client";

import type { ReactElement } from "react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { RequiredLabel } from "@/components/common/required-label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxInput,
  ComboboxVirtualList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListContentQuery } from "@/lib/api/content-api";
import { useListPlaylistsQuery } from "@/lib/api/playlists-api";
import { cn } from "@/lib/utils";
import type { ScheduleFormData, ScheduleKind } from "@/types/schedule";
import { IconCalendar } from "@tabler/icons-react";

interface DisplayPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  options: readonly { id: string; name: string }[];
  disabled?: boolean;
}

export type ScheduleDisplayGroupOption = {
  readonly id: string;
  readonly name: string;
  readonly displayIds: readonly string[];
};

interface DisplayGroupPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  options: readonly ScheduleDisplayGroupOption[];
  disabled?: boolean;
}

function DisplayGroupPicker({
  value,
  onChange,
  options,
  disabled = false,
}: DisplayGroupPickerProps): ReactElement {
  const [inputValue, setInputValue] = useState("");
  const anchorRef = useComboboxAnchor();

  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );

  const trimmed = inputValue.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmed) return options;
    return options.filter((option) =>
      option.name.toLowerCase().includes(trimmed),
    );
  }, [options, trimmed]);

  return (
    <Combobox
      multiple
      value={value}
      items={options.map((option) => option.id)}
      filteredItems={filtered.map((option) => option.id)}
      onValueChange={(next) => {
        onChange(Array.isArray(next) ? (next as string[]) : []);
        setInputValue("");
      }}
      inputValue={inputValue}
      onInputValueChange={(v) => setInputValue(v ?? "")}
      disabled={disabled}
    >
      <ComboboxChips ref={anchorRef}>
        {value.map((id) => (
          <ComboboxChip key={id} showRemove={!disabled}>
            {optionsById.get(id)?.name ?? id}
          </ComboboxChip>
        ))}
        <ComboboxChipsInput
          placeholder={value.length === 0 ? "Search display groups…" : ""}
          disabled={disabled}
        />
      </ComboboxChips>
      <ComboboxContent
        anchor={anchorRef}
        className="min-w-(--anchor-width)"
        collisionAvoidance={DROPDOWN_COLLISION_AVOIDANCE}
        matchTriggerWidth
      >
        <ComboboxVirtualList
          items={filtered}
          getItemKey={(option) => option.id}
          renderItem={(option) => (
            <ComboboxItem value={option.id}>
              <span className="flex flex-col gap-0.5">
                <span>{option.name}</span>
                <span className="text-xs text-muted-foreground">
                  {option.displayIds.length}{" "}
                  {option.displayIds.length === 1 ? "display" : "displays"}
                </span>
              </span>
            </ComboboxItem>
          )}
        />
        <ComboboxEmpty>No display groups found.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}

function DisplayPicker({
  value,
  onChange,
  options,
  disabled = false,
}: DisplayPickerProps): ReactElement {
  const [inputValue, setInputValue] = useState("");
  const anchorRef = useComboboxAnchor();

  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );

  const trimmed = inputValue.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmed) return options;
    return options.filter((option) =>
      option.name.toLowerCase().includes(trimmed),
    );
  }, [options, trimmed]);

  return (
    <Combobox
      multiple
      value={value}
      items={options.map((option) => option.id)}
      filteredItems={filtered.map((option) => option.id)}
      onValueChange={(next) => {
        onChange(Array.isArray(next) ? (next as string[]) : []);
        setInputValue("");
      }}
      inputValue={inputValue}
      onInputValueChange={(v) => setInputValue(v ?? "")}
      disabled={disabled}
    >
      <ComboboxChips ref={anchorRef}>
        {value.map((id) => (
          <ComboboxChip key={id} showRemove={!disabled}>
            {optionsById.get(id)?.name ?? id}
          </ComboboxChip>
        ))}
        <ComboboxChipsInput
          placeholder={value.length === 0 ? "Search displays…" : ""}
          disabled={disabled}
        />
      </ComboboxChips>
      <ComboboxContent
        anchor={anchorRef}
        className="min-w-(--anchor-width)"
        collisionAvoidance={DROPDOWN_COLLISION_AVOIDANCE}
        matchTriggerWidth
      >
        <ComboboxVirtualList
          items={filtered}
          getItemKey={(option) => option.id}
          renderItem={(option) => (
            <ComboboxItem value={option.id}>{option.name}</ComboboxItem>
          )}
        />
        <ComboboxEmpty>No displays found.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}

type ScheduleResourceOption = {
  readonly id: string;
  readonly label: string;
};

const RESOURCE_OPTION_PAGE_SIZE = 20;
const DROPDOWN_COLLISION_AVOIDANCE = {
  side: "shift",
  align: "shift",
  fallbackAxisSide: "none",
} as const;

function mergeResourceOptions(
  existing: readonly ScheduleResourceOption[],
  incoming: readonly ScheduleResourceOption[],
): ScheduleResourceOption[] {
  const seen = new Set<string>();
  const merged: ScheduleResourceOption[] = [];
  for (const option of [...existing, ...incoming]) {
    if (seen.has(option.id)) continue;
    seen.add(option.id);
    merged.push(option);
  }
  return merged;
}

function haveSameResourceOptionIds(
  left: readonly ScheduleResourceOption[],
  right: readonly ScheduleResourceOption[],
): boolean {
  return (
    left.length === right.length &&
    left.every((option, index) => option.id === right[index]?.id)
  );
}

function useInfinitePlaylistScheduleOptions({
  enabled,
  search,
  initialOptions,
}: {
  readonly enabled: boolean;
  readonly search: string;
  readonly initialOptions: readonly { id: string; name: string }[];
}): {
  readonly options: readonly ScheduleResourceOption[];
  readonly isFetching: boolean;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
  readonly loadMore: () => void;
} {
  const normalizedSearch = search.trim();
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState<readonly ScheduleResourceOption[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset loaded pages when the server-side playlist option query changes.
    setPage(1);
    setOptions([]);
  }, [enabled, normalizedSearch]);

  const { data, isFetching } = useListPlaylistsQuery(
    {
      page,
      pageSize: RESOURCE_OPTION_PAGE_SIZE,
      search: normalizedSearch.length > 0 ? normalizedSearch : undefined,
      sortBy: "name",
      sortDirection: "asc",
    },
    { skip: !enabled },
  );

  useEffect(() => {
    if (!enabled || data == null) return;
    const incoming = data.items.map((playlist) => ({
      id: playlist.id,
      label: playlist.name,
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Accumulate paginated RTK Query results for infinite scrolling.
    setOptions((current) => {
      const next =
        data.page <= 1 ? incoming : mergeResourceOptions(current, incoming);
      return haveSameResourceOptionIds(current, next) ? current : next;
    });
  }, [data, enabled]);

  const fallbackOptions = useMemo(
    () =>
      initialOptions
        .filter((playlist) =>
          normalizedSearch.length === 0
            ? true
            : playlist.name
                .toLowerCase()
                .includes(normalizedSearch.toLowerCase()),
        )
        .map((playlist) => ({
          id: playlist.id,
          label: playlist.name,
        })),
    [initialOptions, normalizedSearch],
  );
  const visibleOptions = useMemo(
    () => mergeResourceOptions(options, fallbackOptions),
    [fallbackOptions, options],
  );
  const hasMore = data != null ? data.page * data.pageSize < data.total : false;
  const loadMore = useCallback(() => {
    if (!enabled || isFetching || !hasMore) return;
    setPage((currentPage) => currentPage + 1);
  }, [enabled, hasMore, isFetching]);

  return {
    options: visibleOptions,
    isFetching,
    isLoadingMore: isFetching && page > 1,
    hasMore,
    loadMore,
  };
}

function useInfiniteFlashScheduleOptions({
  enabled,
  search,
  initialOptions,
}: {
  readonly enabled: boolean;
  readonly search: string;
  readonly initialOptions: readonly { id: string; title: string }[];
}): {
  readonly options: readonly ScheduleResourceOption[];
  readonly isFetching: boolean;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
  readonly loadMore: () => void;
} {
  const normalizedSearch = search.trim();
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState<readonly ScheduleResourceOption[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset loaded pages when the server-side flash content option query changes.
    setPage(1);
    setOptions([]);
  }, [enabled, normalizedSearch]);

  const { data, isFetching } = useListContentQuery(
    {
      page,
      pageSize: RESOURCE_OPTION_PAGE_SIZE,
      search: normalizedSearch.length > 0 ? normalizedSearch : undefined,
      sortBy: "title",
      sortDirection: "asc",
      status: "READY",
      type: "FLASH",
    },
    { skip: !enabled },
  );

  useEffect(() => {
    if (!enabled || data == null) return;
    const incoming = data.items.map((content) => ({
      id: content.id,
      label: content.title,
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Accumulate paginated RTK Query results for infinite scrolling.
    setOptions((current) => {
      const next =
        data.page <= 1 ? incoming : mergeResourceOptions(current, incoming);
      return haveSameResourceOptionIds(current, next) ? current : next;
    });
  }, [data, enabled]);

  const fallbackOptions = useMemo(
    () =>
      initialOptions
        .filter((content) =>
          normalizedSearch.length === 0
            ? true
            : content.title
                .toLowerCase()
                .includes(normalizedSearch.toLowerCase()),
        )
        .map((content) => ({
          id: content.id,
          label: content.title,
        })),
    [initialOptions, normalizedSearch],
  );
  const visibleOptions = useMemo(
    () => mergeResourceOptions(options, fallbackOptions),
    [fallbackOptions, options],
  );
  const hasMore = data != null ? data.page * data.pageSize < data.total : false;
  const loadMore = useCallback(() => {
    if (!enabled || isFetching || !hasMore) return;
    setPage((currentPage) => currentPage + 1);
  }, [enabled, hasMore, isFetching]);

  return {
    options: visibleOptions,
    isFetching,
    isLoadingMore: isFetching && page > 1,
    hasMore,
    loadMore,
  };
}

function ResourceCombobox({
  id,
  value,
  options,
  placeholder,
  emptyMessage,
  loadingMessage,
  disabled = false,
  isFetching = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onSearchChange,
  onValueChange,
}: {
  readonly id: string;
  readonly value: string | null;
  readonly options: readonly ScheduleResourceOption[];
  readonly placeholder: string;
  readonly emptyMessage: string;
  readonly loadingMessage: string;
  readonly disabled?: boolean;
  readonly isFetching?: boolean;
  readonly isLoadingMore?: boolean;
  readonly hasMore?: boolean;
  readonly onLoadMore?: () => void;
  readonly onSearchChange: (value: string) => void;
  readonly onValueChange: (value: string) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const anchorRef = useComboboxAnchor();
  const [selectedOptionFallback, setSelectedOptionFallback] =
    useState<ScheduleResourceOption | null>(null);
  const selectedOption =
    options.find((option) => option.id === value) ??
    (selectedOptionFallback?.id === value ? selectedOptionFallback : undefined);
  const visibleInputValue = open ? inputValue : (selectedOption?.label ?? "");
  const itemValues = useMemo(
    () => options.map((option) => option.id),
    [options],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setInputValue("");
      onSearchChange("");
    }
  };

  const handleInputValueChange = (nextValue: string | null) => {
    const normalizedValue = nextValue ?? "";
    setInputValue(normalizedValue);
    onSearchChange(normalizedValue);
  };

  const handleValueChange = (nextValue: string | null) => {
    if (!nextValue) return;
    setSelectedOptionFallback(
      options.find((option) => option.id === nextValue) ?? null,
    );
    onValueChange(nextValue);
    setInputValue("");
    onSearchChange("");
    setOpen(false);
  };

  return (
    <Combobox
      open={open}
      onOpenChange={handleOpenChange}
      value={value ?? ""}
      items={itemValues}
      filteredItems={itemValues}
      inputValue={visibleInputValue}
      onInputValueChange={handleInputValueChange}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        anchorRef={anchorRef}
        className="w-full"
        placeholder={placeholder}
        disabled={disabled}
      />
      <ComboboxContent
        anchor={anchorRef}
        collisionAvoidance={DROPDOWN_COLLISION_AVOIDANCE}
        matchTriggerWidth
      >
        <ComboboxVirtualList
          items={options}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
          getItemKey={(option) => option.id}
          renderItem={(option) => (
            <ComboboxItem value={option.id}>
              <span className="truncate pr-5">{option.label}</span>
            </ComboboxItem>
          )}
        />
        {isFetching && !isLoadingMore ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {loadingMessage}
          </div>
        ) : (
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        )}
      </ComboboxContent>
    </Combobox>
  );
}

function ScheduleTimeInput({
  id,
  value,
  min,
  max,
  disabled = false,
  invalid = false,
  onChange,
}: {
  readonly id: string;
  readonly value: string;
  readonly min?: string;
  readonly max?: string;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly onChange: (value: string) => void;
}): ReactElement {
  return (
    <Input
      id={id}
      type="time"
      value={value}
      min={min}
      max={max}
      step={60}
      disabled={disabled}
      aria-invalid={invalid}
      className="tabular-nums"
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function parseDateString(value: string): Date | undefined {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDateForDisplay(value: string): string {
  const date = parseDateString(value);
  if (!date) return "Select date";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function ScheduleDatePicker({
  id,
  value,
  min,
  disabled = false,
  invalid = false,
  onChange,
}: {
  readonly id: string;
  readonly value: string;
  readonly min?: string;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly onChange: (value: string) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateString(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "h-8 w-full justify-between px-2 text-left font-normal tabular-nums",
            !selectedDate && "text-muted-foreground",
          )}
          disabled={disabled}
          aria-invalid={invalid}
        >
          <span>{formatDateForDisplay(value)}</span>
          <IconCalendar className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
        side="bottom"
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          className="w-full"
          classNames={{
            root: "w-full",
            months: "w-full",
            month: "w-full",
            month_grid: "w-full",
          }}
          disabled={(date) => {
            if (!min) return false;
            return getTodayDateString(date) < min;
          }}
          onSelect={(date) => {
            if (!date) return;
            onChange(getTodayDateString(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// EmptyResourceCta
// ---------------------------------------------------------------------------

function EmptyResourceCta({
  message,
  href,
  onNavigate,
  disabled = false,
}: {
  message: string;
  href: string;
  onNavigate: () => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <p className="text-xs text-muted-foreground">
      {message}{" "}
      <Link
        href={href}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onNavigate();
        }}
        aria-disabled={disabled || undefined}
        className={
          disabled
            ? "pointer-events-none text-muted-foreground no-underline"
            : "text-blue-500 underline underline-offset-2 hover:text-blue-600"
        }
      >
        Create one here.
      </Link>
    </p>
  );
}

// ---------------------------------------------------------------------------
// ScheduleFormFrame
// ---------------------------------------------------------------------------

interface ScheduleFormProps {
  readonly initialData: ScheduleFormData;
  readonly availablePlaylists: readonly { id: string; name: string }[];
  readonly availableFlashContents: readonly { id: string; title: string }[];
  readonly availableDisplays: readonly { id: string; name: string }[];
  readonly availableDisplayGroups?: readonly ScheduleDisplayGroupOption[];
  readonly onSubmit: (data: ScheduleFormData) => Promise<void> | void;
  readonly onCancel: () => void;
  readonly submitLabel: string;
  readonly isCreate?: boolean;
  readonly lockedKind?: "PLAYLIST" | "FLASH";
  /** Notifies parent dialogs when a save/create request is in flight (for close guards). */
  readonly onSubmittingChange?: (submitting: boolean) => void;
}

function resolveDisplayIdsFromGroups(
  groupIds: readonly string[],
  groups: readonly ScheduleDisplayGroupOption[],
): string[] {
  const byId = new Map(groups.map((g) => [g.id, g]));
  const out = new Set<string>();
  for (const gid of groupIds) {
    const g = byId.get(gid);
    if (!g) continue;
    for (const id of g.displayIds) {
      out.add(id);
    }
  }
  return [...out];
}

function getTodayDateString(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentTimeString(now = new Date()): string {
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function addOneMinute(value: string): string | undefined {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number.parseInt(hourRaw ?? "", 10);
  const minute = Number.parseInt(minuteRaw ?? "", 10);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return undefined;
  const total = hour * 60 + minute + 1;
  if (total >= 24 * 60) return undefined;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60,
  ).padStart(2, "0")}`;
}

function isScheduleStartBeforeNow(
  data: Pick<ScheduleFormData, "startDate" | "startTime">,
  now = new Date(),
): boolean {
  return (
    `${data.startDate}T${data.startTime}` <
    `${getTodayDateString(now)}T${getCurrentTimeString(now)}`
  );
}

// Defaults end time to 3 hours after the current local time. Clamps at 23:59
// because the schedule model rejects endTime <= startTime, so wrapping past
// midnight would produce an invalid form on open.
function getDefaultEndTimeString(now = new Date()): string {
  const totalMinutes = now.getHours() * 60 + now.getMinutes() + 3 * 60;
  const clamped = Math.min(totalMinutes, 23 * 60 + 59);
  const hours = String(Math.floor(clamped / 60)).padStart(2, "0");
  const minutes = String(clamped % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function ScheduleFormFrame({
  initialData,
  availablePlaylists,
  availableFlashContents,
  availableDisplays,
  availableDisplayGroups = [],
  onSubmit,
  onCancel,
  submitLabel,
  isCreate = false,
  lockedKind,
  onSubmittingChange,
}: ScheduleFormProps): ReactElement {
  const [formData, setFormData] = useState<ScheduleFormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetMode, setTargetMode] = useState<"displays" | "display-groups">(
    "displays",
  );
  const [targetDisplayGroupIds, setTargetDisplayGroupIds] = useState<string[]>(
    [],
  );
  const [currentMinute, setCurrentMinute] = useState(() => new Date());
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [flashContentSearch, setFlashContentSearch] = useState("");
  const deferredPlaylistSearch = useDeferredValue(playlistSearch);
  const deferredFlashContentSearch = useDeferredValue(flashContentSearch);

  const playlistOptions = useInfinitePlaylistScheduleOptions({
    enabled: formData.kind === "PLAYLIST",
    search: deferredPlaylistSearch,
    initialOptions: availablePlaylists,
  });
  const flashContentOptions = useInfiniteFlashScheduleOptions({
    enabled: formData.kind === "FLASH",
    search: deferredFlashContentSearch,
    initialOptions: availableFlashContents,
  });
  const showPlaylistEmptyCta =
    isCreate &&
    availablePlaylists.length === 0 &&
    playlistOptions.options.length === 0 &&
    !playlistOptions.isFetching;
  const showFlashContentEmptyCta =
    isCreate &&
    availableFlashContents.length === 0 &&
    flashContentOptions.options.length === 0 &&
    !flashContentOptions.isFetching;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentMinute(new Date());
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const resolvedTargetDisplayIds = useMemo(() => {
    if (!isCreate || targetMode === "displays") {
      return formData.targetDisplayIds;
    }
    return resolveDisplayIdsFromGroups(
      targetDisplayGroupIds,
      availableDisplayGroups,
    );
  }, [
    isCreate,
    targetMode,
    formData.targetDisplayIds,
    targetDisplayGroupIds,
    availableDisplayGroups,
  ]);

  const isEndTimeBeforeStartTime = useMemo(() => {
    if (!formData.startTime || !formData.endTime) return false;
    if (formData.endDate !== formData.startDate) return false;
    return formData.endTime <= formData.startTime;
  }, [
    formData.endDate,
    formData.endTime,
    formData.startDate,
    formData.startTime,
  ]);
  const isEndDateBeforeStartDate = formData.endDate < formData.startDate;

  const isStartTimeBeforeNow = isScheduleStartBeforeNow(
    formData,
    currentMinute,
  );

  const canSubmit = useMemo(() => {
    const hasTargets =
      isCreate && targetMode === "display-groups"
        ? targetDisplayGroupIds.length > 0 &&
          resolvedTargetDisplayIds.length > 0
        : formData.targetDisplayIds.length > 0;
    if (!formData.name.trim() || !hasTargets) {
      return false;
    }
    if (isEndTimeBeforeStartTime) {
      return false;
    }
    if (isEndDateBeforeStartDate) {
      return false;
    }
    if (isStartTimeBeforeNow) {
      return false;
    }
    if (formData.kind === "PLAYLIST") {
      return Boolean(formData.playlistId);
    }
    return Boolean(formData.contentId);
  }, [
    formData,
    isEndTimeBeforeStartTime,
    isEndDateBeforeStartDate,
    isStartTimeBeforeNow,
    isCreate,
    targetMode,
    targetDisplayGroupIds.length,
    resolvedTargetDisplayIds.length,
  ]);

  async function handleSubmit(): Promise<void> {
    if (!canSubmit || isSubmitting) return;
    if (isScheduleStartBeforeNow(formData)) return;
    setIsSubmitting(true);
    onSubmittingChange?.(true);
    try {
      const payload: ScheduleFormData =
        isCreate && targetMode === "display-groups"
          ? { ...formData, targetDisplayIds: resolvedTargetDisplayIds }
          : formData;
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
      onSubmittingChange?.(false);
    }
  }

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {!lockedKind && (
          <div className="space-y-2">
            <RequiredLabel>Schedule Type</RequiredLabel>
            <Tabs
              value={formData.kind}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  kind: value as ScheduleKind,
                  playlistId: value === "PLAYLIST" ? prev.playlistId : null,
                  contentId: value === "FLASH" ? prev.contentId : null,
                }))
              }
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="PLAYLIST" disabled={isSubmitting}>
                  Playlist
                </TabsTrigger>
                <TabsTrigger value="FLASH" disabled={isSubmitting}>
                  Flash
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        <div className="space-y-2">
          <RequiredLabel htmlFor="schedule-name">Name</RequiredLabel>
          <Input
            id="schedule-name"
            placeholder="Lobby daytime"
            value={formData.name}
            disabled={isSubmitting}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, name: event.target.value }))
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <RequiredLabel htmlFor="schedule-start-date">
              Start Date
            </RequiredLabel>
            <ScheduleDatePicker
              id="schedule-start-date"
              value={formData.startDate}
              min={getTodayDateString(currentMinute)}
              disabled={isSubmitting}
              invalid={isStartTimeBeforeNow}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  startDate: value,
                  endDate: prev.endDate < value ? value : prev.endDate,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="schedule-end-date">End Date</RequiredLabel>
            <ScheduleDatePicker
              id="schedule-end-date"
              value={formData.endDate}
              min={formData.startDate}
              disabled={isSubmitting}
              invalid={isEndDateBeforeStartDate}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  endDate: value,
                }))
              }
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <RequiredLabel htmlFor="schedule-start-time">
              Start Time
            </RequiredLabel>
            <ScheduleTimeInput
              id="schedule-start-time"
              value={formData.startTime}
              min={
                formData.startDate === getTodayDateString(currentMinute)
                  ? getCurrentTimeString(currentMinute)
                  : undefined
              }
              disabled={isSubmitting}
              invalid={isStartTimeBeforeNow}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  startTime: value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="schedule-end-time">End Time</RequiredLabel>
            <ScheduleTimeInput
              id="schedule-end-time"
              value={formData.endTime}
              min={
                formData.endDate === formData.startDate
                  ? addOneMinute(formData.startTime)
                  : undefined
              }
              disabled={isSubmitting}
              invalid={isEndTimeBeforeStartTime}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  endTime: value,
                }))
              }
            />
          </div>
        </div>
        {isEndDateBeforeStartDate ? (
          <p className="text-xs text-destructive">
            End date must be on or after start date.
          </p>
        ) : null}
        {isEndTimeBeforeStartTime ? (
          <p className="text-xs text-destructive">
            End time must be later than start time.
          </p>
        ) : null}
        {isStartTimeBeforeNow ? (
          <p className="text-xs text-destructive">
            Start time must be now or later.
          </p>
        ) : null}

        {formData.kind === "PLAYLIST" ? (
          <div className="space-y-2">
            <RequiredLabel htmlFor="schedule-playlist">Playlist</RequiredLabel>
            {showPlaylistEmptyCta ? (
              <EmptyResourceCta
                message="No playlists yet."
                href="/admin/playlists/create"
                onNavigate={onCancel}
                disabled={isSubmitting}
              />
            ) : (
              <ResourceCombobox
                id="schedule-playlist"
                value={formData.playlistId}
                options={playlistOptions.options}
                placeholder="Search playlists..."
                emptyMessage="No playlists found."
                loadingMessage="Loading playlists..."
                disabled={isSubmitting}
                isFetching={playlistOptions.isFetching}
                isLoadingMore={playlistOptions.isLoadingMore}
                hasMore={playlistOptions.hasMore}
                onLoadMore={playlistOptions.loadMore}
                onSearchChange={setPlaylistSearch}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    playlistId: value,
                    contentId: null,
                  }))
                }
              />
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <RequiredLabel htmlFor="schedule-flash-content">
              Flash Content
            </RequiredLabel>
            {showFlashContentEmptyCta ? (
              <EmptyResourceCta
                message="No flash content yet."
                href="/admin/content?create=flash"
                onNavigate={onCancel}
                disabled={isSubmitting}
              />
            ) : (
              <ResourceCombobox
                id="schedule-flash-content"
                value={formData.contentId ?? ""}
                options={flashContentOptions.options}
                placeholder="Search flash content..."
                emptyMessage="No ready flash content found."
                loadingMessage="Loading flash content..."
                disabled={isSubmitting}
                isFetching={flashContentOptions.isFetching}
                isLoadingMore={flashContentOptions.isLoadingMore}
                hasMore={flashContentOptions.hasMore}
                onLoadMore={flashContentOptions.loadMore}
                onSearchChange={setFlashContentSearch}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    contentId: value,
                    playlistId: null,
                  }))
                }
              />
            )}
          </div>
        )}

        <div className="space-y-2">
          <RequiredLabel>Target</RequiredLabel>
          {isCreate ? (
            <>
              <Tabs
                value={targetMode}
                onValueChange={(value) => {
                  const mode = value as "displays" | "display-groups";
                  setTargetMode(mode);
                  setTargetDisplayGroupIds([]);
                  setFormData((prev) => ({ ...prev, targetDisplayIds: [] }));
                }}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="displays" disabled={isSubmitting}>
                    Displays
                  </TabsTrigger>
                  <TabsTrigger value="display-groups" disabled={isSubmitting}>
                    Display groups
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {targetMode === "displays" ? (
                <DisplayPicker
                  value={formData.targetDisplayIds}
                  onChange={(ids) =>
                    setFormData((prev) => ({ ...prev, targetDisplayIds: ids }))
                  }
                  options={availableDisplays}
                  disabled={isSubmitting}
                />
              ) : availableDisplayGroups.length === 0 ? (
                <EmptyResourceCta
                  message="No display groups yet."
                  href="/admin/displays"
                  onNavigate={onCancel}
                  disabled={isSubmitting}
                />
              ) : (
                <DisplayGroupPicker
                  value={targetDisplayGroupIds}
                  onChange={setTargetDisplayGroupIds}
                  options={availableDisplayGroups}
                  disabled={isSubmitting}
                />
              )}
              {targetMode === "display-groups" &&
              targetDisplayGroupIds.length > 0 &&
              resolvedTargetDisplayIds.length === 0 ? (
                <p className="text-xs text-destructive">
                  Selected groups have no displays. Add displays to those groups
                  first.
                </p>
              ) : null}
            </>
          ) : (
            <Select
              value={formData.targetDisplayIds[0] ?? ""}
              disabled={isSubmitting}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, targetDisplayIds: [value] }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a display" />
              </SelectTrigger>
              <SelectContent>
                {availableDisplays.map((display) => (
                  <SelectItem key={display.id} value={display.id}>
                    {display.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={() => void handleSubmit()}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

type CreateScheduleFormProps = Omit<
  ScheduleFormProps,
  "initialData" | "submitLabel" | "isCreate" | "lockedKind"
> & {
  readonly kind?: "PLAYLIST" | "FLASH";
};

interface EditScheduleFormProps extends Omit<ScheduleFormProps, "submitLabel"> {
  readonly initialData: ScheduleFormData;
}

export function CreateScheduleForm({
  kind,
  ...props
}: CreateScheduleFormProps): ReactElement {
  return (
    <ScheduleFormFrame
      initialData={{
        name: "",
        kind: kind ?? "PLAYLIST",
        startDate: getTodayDateString(),
        endDate: getTodayDateString(),
        startTime: getCurrentTimeString(),
        endTime: getDefaultEndTimeString(),
        playlistId: null,
        contentId: null,
        targetDisplayIds: [],
      }}
      submitLabel="Create"
      isCreate={true}
      lockedKind={kind}
      {...props}
    />
  );
}

export function EditScheduleForm(props: EditScheduleFormProps): ReactElement {
  return (
    <ScheduleFormFrame
      submitLabel="Save"
      lockedKind={props.initialData.kind}
      {...props}
    />
  );
}
