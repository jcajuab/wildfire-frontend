"use client";

import type { ChatStatus, FileUIPart, SourceDocumentUIPart } from "ai";
import type {
  ChangeEvent,
  ChangeEventHandler,
  ClipboardEventHandler,
  ComponentProps,
  FormEvent,
  FormEventHandler,
  HTMLAttributes,
  KeyboardEventHandler,
  PropsWithChildren,
  ReactNode,
  RefObject,
} from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  IconCornerDownLeft,
  IconSquare,
  IconX,
} from "@tabler/icons-react";
import { nanoid } from "nanoid";
import {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const convertBlobUrlToDataUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    // oxlint-disable-next-line eslint-plugin-promise(avoid-new)
    return new Promise((resolve) => {
      const reader = new FileReader();
      // oxlint-disable-next-line eslint-plugin-unicorn(prefer-add-event-listener)
      reader.onloadend = () => resolve(reader.result as string);
      // oxlint-disable-next-line eslint-plugin-unicorn(prefer-add-event-listener)
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export interface AttachmentsContext {
  files: (FileUIPart & { id: string })[];
  add: (files: File[] | FileList) => void;
  remove: (id: string) => void;
  clear: () => void;
  openFileDialog: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export interface TextInputContext {
  value: string;
  setInput: (v: string) => void;
  clear: () => void;
}

export interface PromptInputControllerProps {
  textInput: TextInputContext;
  attachments: AttachmentsContext;
  __registerFileInput: (
    ref: RefObject<HTMLInputElement | null>,
    open: () => void,
  ) => void;
}

const PromptInputController = createContext<PromptInputControllerProps | null>(
  null,
);
const ProviderAttachmentsContext = createContext<AttachmentsContext | null>(
  null,
);

export const usePromptInputController = () => {
  const ctx = useContext(PromptInputController);
  if (!ctx) {
    throw new Error(
      "Wrap your component inside <PromptInputProvider> to use usePromptInputController().",
    );
  }
  return ctx;
};

const useOptionalPromptInputController = () =>
  useContext(PromptInputController);

export const useProviderAttachments = () => {
  const ctx = useContext(ProviderAttachmentsContext);
  if (!ctx) {
    throw new Error(
      "Wrap your component inside <PromptInputProvider> to use useProviderAttachments().",
    );
  }
  return ctx;
};

const useOptionalProviderAttachments = () =>
  useContext(ProviderAttachmentsContext);

export type PromptInputProviderProps = PropsWithChildren<{
  initialInput?: string;
}>;

export const PromptInputProvider = ({
  initialInput: initialTextInput = "",
  children,
}: PromptInputProviderProps) => {
  const [textInput, setTextInput] = useState(initialTextInput);
  const clearInput = useCallback(() => setTextInput(""), []);

  const [attachmentFiles, setAttachmentFiles] = useState<
    (FileUIPart & { id: string })[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // oxlint-disable-next-line eslint(no-empty-function)
  const openRef = useRef<() => void>(() => {});

  const add = useCallback((files: File[] | FileList) => {
    const incoming = [...files];
    if (incoming.length === 0) {
      return;
    }

    setAttachmentFiles((prev) => [
      ...prev,
      ...incoming.map((file) => ({
        filename: file.name,
        id: nanoid(),
        mediaType: file.type,
        type: "file" as const,
        url: URL.createObjectURL(file),
      })),
    ]);
  }, []);

  const remove = useCallback((id: string) => {
    setAttachmentFiles((prev) => {
      const found = prev.find((f) => f.id === id);
      if (found?.url) {
        URL.revokeObjectURL(found.url);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setAttachmentFiles((prev) => {
      for (const f of prev) {
        if (f.url) {
          URL.revokeObjectURL(f.url);
        }
      }
      return [];
    });
  }, []);

  const attachmentsRef = useRef(attachmentFiles);

  useEffect(() => {
    attachmentsRef.current = attachmentFiles;
  }, [attachmentFiles]);

  useEffect(
    () => () => {
      for (const f of attachmentsRef.current) {
        if (f.url) {
          URL.revokeObjectURL(f.url);
        }
      }
    },
    [],
  );

  const openFileDialog = useCallback(() => {
    openRef.current?.();
  }, []);

  const attachments = useMemo<AttachmentsContext>(
    () => ({
      add,
      clear,
      fileInputRef,
      files: attachmentFiles,
      openFileDialog,
      remove,
    }),
    [attachmentFiles, add, remove, clear, openFileDialog],
  );

  const __registerFileInput = useCallback(
    (ref: RefObject<HTMLInputElement | null>, open: () => void) => {
      fileInputRef.current = ref.current;
      openRef.current = open;
    },
    [],
  );

  const controller = useMemo<PromptInputControllerProps>(
    () => ({
      __registerFileInput,
      attachments,
      textInput: {
        clear: clearInput,
        setInput: setTextInput,
        value: textInput,
      },
    }),
    [textInput, clearInput, attachments, __registerFileInput],
  );

  return (
    <PromptInputController.Provider value={controller}>
      <ProviderAttachmentsContext.Provider value={attachments}>
        {children}
      </ProviderAttachmentsContext.Provider>
    </PromptInputController.Provider>
  );
};

const LocalAttachmentsContext = createContext<AttachmentsContext | null>(null);

export const usePromptInputAttachments = () => {
  const provider = useOptionalProviderAttachments();
  const local = useContext(LocalAttachmentsContext);
  const context = local ?? provider;
  if (!context) {
    throw new Error(
      "usePromptInputAttachments must be used within a PromptInput or PromptInputProvider",
    );
  }
  return context;
};

export interface ReferencedSourcesContext {
  sources: (SourceDocumentUIPart & { id: string })[];
  add: (sources: SourceDocumentUIPart[] | SourceDocumentUIPart) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const LocalReferencedSourcesContext =
  createContext<ReferencedSourcesContext | null>(null);

export const usePromptInputReferencedSources = () => {
  const ctx = useContext(LocalReferencedSourcesContext);
  if (!ctx) {
    throw new Error(
      "usePromptInputReferencedSources must be used within a LocalReferencedSourcesContext.Provider",
    );
  }
  return ctx;
};

export interface PromptInputMessage {
  text: string;
  files: FileUIPart[];
}

export type PromptInputProps = Omit<
  HTMLAttributes<HTMLFormElement>,
  "onSubmit" | "onError"
> & {
  accept?: string;
  multiple?: boolean;
  globalDrop?: boolean;
  syncHiddenInput?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  onError?: (err: {
    code: "max_files" | "max_file_size" | "accept";
    message: string;
  }) => void;
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
};

export const PromptInput = ({
  className,
  accept,
  multiple,
  globalDrop,
  syncHiddenInput,
  maxFiles,
  maxFileSize,
  onError,
  onSubmit,
  children,
  ...props
}: PromptInputProps) => {
  const controller = useOptionalPromptInputController();
  const usingProvider = !!controller;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [items, setItems] = useState<(FileUIPart & { id: string })[]>([]);
  const files = usingProvider ? controller.attachments.files : items;

  const [referencedSources, setReferencedSources] = useState<
    (SourceDocumentUIPart & { id: string })[]
  >([]);

  const filesRef = useRef(files);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const openFileDialogLocal = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const matchesAccept = useCallback(
    (f: File) => {
      if (!accept || accept.trim() === "") {
        return true;
      }

      const patterns = accept
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      return patterns.some((pattern) => {
        if (pattern.endsWith("/*")) {
          const prefix = pattern.slice(0, -1);
          return f.type.startsWith(prefix);
        }
        return f.type === pattern;
      });
    },
    [accept],
  );

  const addLocal = useCallback(
    (fileList: File[] | FileList) => {
      const incoming = [...fileList];
      const accepted = incoming.filter((f) => matchesAccept(f));
      if (incoming.length && accepted.length === 0) {
        onError?.({
          code: "accept",
          message: "No files match the accepted types.",
        });
        return;
      }
      const withinSize = (f: File) =>
        maxFileSize ? f.size <= maxFileSize : true;
      const sized = accepted.filter(withinSize);
      if (accepted.length > 0 && sized.length === 0) {
        onError?.({
          code: "max_file_size",
          message: "All files exceed the maximum size.",
        });
        return;
      }

      setItems((prev) => {
        const capacity =
          typeof maxFiles === "number"
            ? Math.max(0, maxFiles - prev.length)
            : undefined;
        const capped =
          typeof capacity === "number" ? sized.slice(0, capacity) : sized;
        if (typeof capacity === "number" && sized.length > capacity) {
          onError?.({
            code: "max_files",
            message: "Too many files. Some were not added.",
          });
        }
        const next: (FileUIPart & { id: string })[] = [];
        for (const file of capped) {
          next.push({
            filename: file.name,
            id: nanoid(),
            mediaType: file.type,
            type: "file",
            url: URL.createObjectURL(file),
          });
        }
        return [...prev, ...next];
      });
    },
    [matchesAccept, maxFiles, maxFileSize, onError],
  );

  const removeLocal = useCallback(
    (id: string) =>
      setItems((prev) => {
        const found = prev.find((file) => file.id === id);
        if (found?.url) {
          URL.revokeObjectURL(found.url);
        }
        return prev.filter((file) => file.id !== id);
      }),
    [],
  );

  const addWithProviderValidation = useCallback(
    (fileList: File[] | FileList) => {
      const incoming = [...fileList];
      const accepted = incoming.filter((f) => matchesAccept(f));
      if (incoming.length && accepted.length === 0) {
        onError?.({
          code: "accept",
          message: "No files match the accepted types.",
        });
        return;
      }
      const withinSize = (f: File) =>
        maxFileSize ? f.size <= maxFileSize : true;
      const sized = accepted.filter(withinSize);
      if (accepted.length > 0 && sized.length === 0) {
        onError?.({
          code: "max_file_size",
          message: "All files exceed the maximum size.",
        });
        return;
      }

      const currentCount = files.length;
      const capacity =
        typeof maxFiles === "number"
          ? Math.max(0, maxFiles - currentCount)
          : undefined;
      const capped =
        typeof capacity === "number" ? sized.slice(0, capacity) : sized;
      if (typeof capacity === "number" && sized.length > capacity) {
        onError?.({
          code: "max_files",
          message: "Too many files. Some were not added.",
        });
      }

      if (capped.length > 0) {
        controller?.attachments.add(capped);
      }
    },
    [matchesAccept, maxFileSize, maxFiles, onError, files.length, controller],
  );

  const clearAttachments = useCallback(
    () =>
      usingProvider
        ? controller?.attachments.clear()
        : setItems((prev) => {
            for (const file of prev) {
              if (file.url) {
                URL.revokeObjectURL(file.url);
              }
            }
            return [];
          }),
    [usingProvider, controller],
  );

  const clearReferencedSources = useCallback(
    () => setReferencedSources([]),
    [],
  );

  const add = usingProvider ? addWithProviderValidation : addLocal;
  const remove = usingProvider ? controller.attachments.remove : removeLocal;
  const openFileDialog = usingProvider
    ? controller.attachments.openFileDialog
    : openFileDialogLocal;

  const clear = useCallback(() => {
    clearAttachments();
    clearReferencedSources();
  }, [clearAttachments, clearReferencedSources]);

  useEffect(() => {
    if (!usingProvider) {
      return;
    }
    controller.__registerFileInput(inputRef, () => inputRef.current?.click());
  }, [usingProvider, controller]);

  useEffect(() => {
    if (syncHiddenInput && inputRef.current && files.length === 0) {
      inputRef.current.value = "";
    }
  }, [files, syncHiddenInput]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }
    if (globalDrop) {
      return;
    }

    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        add(e.dataTransfer.files);
      }
    };
    form.addEventListener("dragover", onDragOver);
    form.addEventListener("drop", onDrop);
    return () => {
      form.removeEventListener("dragover", onDragOver);
      form.removeEventListener("drop", onDrop);
    };
  }, [add, globalDrop]);

  useEffect(() => {
    if (!globalDrop) {
      return;
    }

    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        add(e.dataTransfer.files);
      }
    };
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
    };
  }, [add, globalDrop]);

  useEffect(
    () => () => {
      if (!usingProvider) {
        for (const f of filesRef.current) {
          if (f.url) {
            URL.revokeObjectURL(f.url);
          }
        }
      }
    },
    [usingProvider],
  );

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (event.currentTarget.files) {
        add(event.currentTarget.files);
      }
      event.currentTarget.value = "";
    },
    [add],
  );

  const attachmentsCtx = useMemo<AttachmentsContext>(
    () => ({
      add,
      clear: clearAttachments,
      fileInputRef: inputRef,
      files: files.map((item) => ({ ...item, id: item.id })),
      openFileDialog,
      remove,
    }),
    [files, add, remove, clearAttachments, openFileDialog],
  );

  const refsCtx = useMemo<ReferencedSourcesContext>(
    () => ({
      add: (incoming: SourceDocumentUIPart[] | SourceDocumentUIPart) => {
        const array = Array.isArray(incoming) ? incoming : [incoming];
        setReferencedSources((prev) => [
          ...prev,
          ...array.map((s) => ({ ...s, id: nanoid() })),
        ]);
      },
      clear: clearReferencedSources,
      remove: (id: string) => {
        setReferencedSources((prev) => prev.filter((s) => s.id !== id));
      },
      sources: referencedSources,
    }),
    [referencedSources, clearReferencedSources],
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      const text = usingProvider
        ? controller.textInput.value
        : (() => {
            const formData = new FormData(form);
            return (formData.get("message") as string) || "";
          })();

      if (!usingProvider) {
        form.reset();
      }

      try {
        const convertedFiles: FileUIPart[] = await Promise.all(
          files.map(async (file): Promise<FileUIPart> => {
            if (file.url?.startsWith("blob:")) {
              const dataUrl = await convertBlobUrlToDataUrl(file.url);
              return {
                type: file.type,
                mediaType: file.mediaType,
                url: dataUrl ?? file.url,
              };
            }
            return {
              type: file.type,
              mediaType: file.mediaType,
              url: file.url,
            };
          }),
        );

        const result = onSubmit({ files: convertedFiles, text }, event);

        if (result instanceof Promise) {
          try {
            await result;
            clear();
            if (usingProvider) {
              controller.textInput.clear();
            }
          } catch {
            // retry path
          }
        } else {
          clear();
          if (usingProvider) {
            controller.textInput.clear();
          }
        }
      } catch {
        // retry path
      }
    },
    [usingProvider, controller, files, onSubmit, clear],
  );

  const inner = (
    <>
      <input
        accept={accept}
        aria-label="Upload files"
        className="hidden"
        multiple={multiple}
        onChange={handleChange}
        ref={inputRef}
        title="Upload files"
        type="file"
      />
      <form
        className={cn("w-full", className)}
        onSubmit={handleSubmit}
        ref={formRef}
        {...props}
      >
        <InputGroup className="overflow-hidden">{children}</InputGroup>
      </form>
    </>
  );

  const withReferencedSources = (
    <LocalReferencedSourcesContext.Provider value={refsCtx}>
      {inner}
    </LocalReferencedSourcesContext.Provider>
  );

  return (
    <LocalAttachmentsContext.Provider value={attachmentsCtx}>
      {withReferencedSources}
    </LocalAttachmentsContext.Provider>
  );
};

export type PromptInputBodyProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputBody = ({
  className,
  ...props
}: PromptInputBodyProps) => (
  <div className={cn("contents", className)} {...props} />
);

export type PromptInputTextareaProps = ComponentProps<
  typeof InputGroupTextarea
>;

export const PromptInputTextarea = ({
  onChange,
  onKeyDown,
  className,
  placeholder = "What would you like to know?",
  ...props
}: PromptInputTextareaProps) => {
  const controller = useOptionalPromptInputController();
  const attachments = usePromptInputAttachments();
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      onKeyDown?.(e);

      if (e.defaultPrevented) {
        return;
      }

      if (e.key === "Enter") {
        if (isComposing || e.nativeEvent.isComposing) {
          return;
        }
        if (e.shiftKey) {
          return;
        }
        e.preventDefault();

        const { form } = e.currentTarget;
        const submitButton = form?.querySelector(
          'button[type="submit"]',
        ) as HTMLButtonElement | null;
        if (submitButton?.disabled) {
          return;
        }

        form?.requestSubmit();
      }

      if (
        e.key === "Backspace" &&
        e.currentTarget.value === "" &&
        attachments.files.length > 0
      ) {
        e.preventDefault();
        const lastAttachment = attachments.files.at(-1);
        if (lastAttachment) {
          attachments.remove(lastAttachment.id);
        }
      }
    },
    [onKeyDown, isComposing, attachments],
  );

  const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      const items = event.clipboardData?.items;

      if (!items) {
        return;
      }

      const files: File[] = [];

      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        event.preventDefault();
        attachments.add(files);
      }
    },
    [attachments],
  );

  const handleCompositionEnd = useCallback(() => setIsComposing(false), []);
  const handleCompositionStart = useCallback(() => setIsComposing(true), []);

  const controlledProps = controller
    ? {
        onChange: (e: ChangeEvent<HTMLTextAreaElement>) => {
          controller.textInput.setInput(e.currentTarget.value);
          onChange?.(e);
        },
        value: controller.textInput.value,
      }
    : {
        onChange,
      };

  return (
    <InputGroupTextarea
      className={cn("field-sizing-content max-h-48 min-h-16", className)}
      name="message"
      onCompositionEnd={handleCompositionEnd}
      onCompositionStart={handleCompositionStart}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      {...props}
      {...controlledProps}
    />
  );
};

export type PromptInputHeaderProps = Omit<
  ComponentProps<typeof InputGroupAddon>,
  "align"
>;

export const PromptInputHeader = ({
  className,
  ...props
}: PromptInputHeaderProps) => (
  <InputGroupAddon
    align="block-end"
    className={cn("order-first flex-wrap gap-1", className)}
    {...props}
  />
);

export type PromptInputFooterProps = Omit<
  ComponentProps<typeof InputGroupAddon>,
  "align"
>;

export const PromptInputFooter = ({
  className,
  ...props
}: PromptInputFooterProps) => (
  <InputGroupAddon
    align="block-end"
    className={cn("justify-between gap-1", className)}
    {...props}
  />
);

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputTools = ({
  className,
  ...props
}: PromptInputToolsProps) => (
  <div
    className={cn("flex min-w-0 items-center gap-1", className)}
    {...props}
  />
);

export type PromptInputButtonTooltip =
  | string
  | {
      content: ReactNode;
      shortcut?: string;
      side?: ComponentProps<typeof TooltipContent>["side"];
    };

export type PromptInputButtonProps = ComponentProps<typeof InputGroupButton> & {
  tooltip?: PromptInputButtonTooltip;
};

export const PromptInputButton = ({
  variant = "ghost",
  className,
  size,
  tooltip,
  ...props
}: PromptInputButtonProps) => {
  const newSize =
    size ?? (Children.count(props.children) > 1 ? "sm" : "icon-sm");

  const button = (
    <InputGroupButton
      className={cn(className)}
      size={newSize}
      type="button"
      variant={variant}
      {...props}
    />
  );

  if (!tooltip) {
    return button;
  }

  const tooltipContent =
    typeof tooltip === "string" ? tooltip : tooltip.content;
  const shortcut = typeof tooltip === "string" ? undefined : tooltip.shortcut;
  const side = typeof tooltip === "string" ? "top" : (tooltip.side ?? "top");

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side={side}>
        {tooltipContent}
        {shortcut && (
          <span className="ml-2 text-muted-foreground">{shortcut}</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export type PromptInputSubmitProps = ComponentProps<typeof InputGroupButton> & {
  status?: ChatStatus;
  onStop?: () => void;
};

export const PromptInputSubmit = ({
  className,
  variant = "default",
  size = "icon-sm",
  status,
  onStop,
  onClick,
  children,
  ...props
}: PromptInputSubmitProps) => {
  const isGenerating = status === "submitted" || status === "streaming";

  let Icon = <IconCornerDownLeft className="size-4" />;

  if (status === "submitted") {
    Icon = <Spinner />;
  } else if (status === "streaming") {
    Icon = <IconSquare className="size-4" />;
  } else if (status === "error") {
    Icon = <IconX className="size-4" />;
  }

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isGenerating && onStop) {
        e.preventDefault();
        onStop();
        return;
      }
      onClick?.(e);
    },
    [isGenerating, onStop, onClick],
  );

  return (
    <InputGroupButton
      aria-label={isGenerating ? "Stop" : "Submit"}
      className={cn(className)}
      onClick={handleClick}
      size={size}
      type={isGenerating && onStop ? "button" : "submit"}
      variant={variant}
      {...props}
    >
      {children ?? Icon}
    </InputGroupButton>
  );
};

export type PromptInputSelectProps = ComponentProps<typeof Select>;

export const PromptInputSelect = (props: PromptInputSelectProps) => (
  <Select {...props} />
);

export type PromptInputSelectTriggerProps = ComponentProps<
  typeof SelectTrigger
>;

export const PromptInputSelectTrigger = ({
  className,
  ...props
}: PromptInputSelectTriggerProps) => (
  <SelectTrigger
    className={cn(
      "border-none bg-transparent font-medium text-muted-foreground shadow-none transition-colors",
      "hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground",
      className,
    )}
    {...props}
  />
);

export type PromptInputSelectContentProps = ComponentProps<
  typeof SelectContent
>;

export const PromptInputSelectContent = ({
  className,
  ...props
}: PromptInputSelectContentProps) => (
  <SelectContent className={cn(className)} {...props} />
);

export type PromptInputSelectItemProps = ComponentProps<typeof SelectItem>;

export const PromptInputSelectItem = ({
  className,
  ...props
}: PromptInputSelectItemProps) => (
  <SelectItem className={cn(className)} {...props} />
);

export type PromptInputSelectValueProps = ComponentProps<typeof SelectValue>;

export const PromptInputSelectValue = ({
  className,
  ...props
}: PromptInputSelectValueProps) => (
  <SelectValue className={cn(className)} {...props} />
);
