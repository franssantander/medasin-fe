"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Crop,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Trash2,
  Type,
  UserRound,
} from "lucide-react";
import type { RefObject } from "react";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  LETTER_COVER_FONT_SCALE_DEFAULT,
  LETTER_COVER_FONT_SCALE_MAX,
  LETTER_COVER_FONT_SCALE_MIN,
  LETTER_COVER_FONT_SCALE_STEP,
  LETTER_COVER_HERO_CAPTION_MAX_LENGTH,
  LETTER_COVER_SECTION_LABELS,
  normalizeLetterCover,
  normalizeLetterCoverFontScale,
} from "../letter-cover";
import type {
  LetterCover,
  LetterCoverCaptionPlacement,
  LetterCoverSection,
  LetterCoverTextAlignment,
  LetterPage,
} from "../type";
import {
  FieldHint,
  InspectorSection,
  InspectorSlider,
  ResetButton,
} from "./letter-studio-fields";

export type CoverImageKind = "avatar" | "hero";

export type StudioTextSize = {
  percent: number;
  auto: boolean;
  min: number;
  max: number;
  step: number;
  onChange: (percent: number) => void;
  onReset: () => void;
};

const ALIGNMENTS: {
  value: LetterCoverTextAlignment;
  label: string;
  icon: typeof AlignLeft;
}[] = [
  { value: "left", label: "Left", icon: AlignLeft },
  { value: "center", label: "Center", icon: AlignCenter },
  { value: "right", label: "Right", icon: AlignRight },
];

export function LetterCoverInspector({
  page,
  textSize,
  uploading,
  avatarInputRef,
  heroInputRef,
  imageErrors,
  onTitleChange,
  onCoverChange,
  onImageChange,
  onCropCoverImage,
  onRemoveCoverImage,
}: {
  page: LetterPage;
  textSize: StudioTextSize;
  uploading: CoverImageKind | null;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  heroInputRef: RefObject<HTMLInputElement | null>;
  imageErrors: Partial<Record<CoverImageKind, string>>;
  onTitleChange: (value: string) => void;
  onCoverChange: (update: Partial<LetterCover>) => void;
  onImageChange: (kind: CoverImageKind, file?: File) => void;
  onCropCoverImage: () => void;
  onRemoveCoverImage: () => void;
}) {
  const cover = normalizeLetterCover(page.cover);
  const reorderableSections = cover.section_order.filter(
    (section) => section !== "author",
  );
  const coverSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const reorderSections = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = reorderableSections.findIndex(
      (section) => section === active.id,
    );
    const newIndex = reorderableSections.findIndex(
      (section) => section === over.id,
    );
    if (oldIndex < 0 || newIndex < 0) return;
    onCoverChange({
      section_order: [
        ...arrayMove(reorderableSections, oldIndex, newIndex),
        "author",
      ],
    });
  };
  const coverSizesAreDefault =
    cover.subheader_font_scale === LETTER_COVER_FONT_SCALE_DEFAULT &&
    cover.title_font_scale === LETTER_COVER_FONT_SCALE_DEFAULT &&
    cover.body_font_scale === LETTER_COVER_FONT_SCALE_DEFAULT;

  return (
    <Accordion multiple defaultValue={["text", "style"]}>
      <InspectorSection value="text" title="Text">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Subheader
          <Input
            value={cover.subheader}
            maxLength={80}
            placeholder="A LETTER"
            onChange={(event) => onCoverChange({ subheader: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Title
          <Textarea
            value={page.title ?? ""}
            maxLength={120}
            rows={2}
            className="min-h-0 resize-none"
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Author name
            <Input
              value={cover.author_name}
              maxLength={120}
              onChange={(event) => onCoverChange({ author_name: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Date label
            <Input
              value={cover.date_label}
              maxLength={80}
              placeholder="September 10 at 10:35 PM"
              onChange={(event) => onCoverChange({ date_label: event.target.value })}
            />
          </label>
        </div>
        <FieldHint>
          The cover body text is edited directly on the page. Click it to
          start typing.
        </FieldHint>
      </InspectorSection>

      <InspectorSection value="style" title="Style">
        <div className="flex flex-col gap-2">
          <p id={`cover-theme-${page.uuid}`} className="text-sm font-medium">
            Background
          </p>
          <ToggleGroup
            aria-labelledby={`cover-theme-${page.uuid}`}
            className="grid w-full grid-cols-2 gap-2"
            value={[cover.theme]}
            onValueChange={(value) => {
              const theme = value[0] as LetterCover["theme"] | undefined;
              if (theme) onCoverChange({ theme });
            }}
          >
            {(["light", "dark"] as const).map((theme) => (
              <ToggleGroupItem
                key={theme}
                value={theme}
                className="h-auto justify-start gap-2.5 rounded-lg border p-2 text-left aria-pressed:border-foreground aria-pressed:bg-transparent"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-8 items-end justify-start rounded-md border p-1",
                    theme === "light"
                      ? "border-zinc-200 bg-white"
                      : "border-zinc-800 bg-zinc-950",
                  )}
                >
                  <span
                    className={cn(
                      "h-1 w-4 rounded-full",
                      theme === "light" ? "bg-zinc-300" : "bg-zinc-600",
                    )}
                  />
                </span>
                {theme === "light" ? "Light" : "Dark"}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`cover-logo-${page.uuid}`} className="text-sm font-medium">
            Show Medasin logo
          </label>
          <Switch
            id={`cover-logo-${page.uuid}`}
            checked={cover.show_logo}
            onCheckedChange={(checked) => onCoverChange({ show_logo: checked })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p id={`cover-text-alignment-${page.uuid}`} className="text-sm font-medium">
            Text alignment
          </p>
          <AlignmentToggle
            labelledBy={`cover-text-alignment-${page.uuid}`}
            value={cover.text_alignment}
            onChange={(text_alignment) => onCoverChange({ text_alignment })}
          />
          <FieldHint>Applies to the cover subheader, title, and body text.</FieldHint>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3">
          <InspectorSlider
            id={`letter-page-text-scale-${page.uuid}`}
            label="Overall text size"
            icon={<Type aria-hidden="true" className="size-4" />}
            percent={textSize.percent}
            valueLabel={`${textSize.auto ? "Auto · " : ""}${textSize.percent}%`}
            valueText={`${textSize.percent}%${textSize.auto ? " automatic" : " manual"}`}
            min={textSize.min}
            max={textSize.max}
            step={textSize.step}
            onChange={textSize.onChange}
          />
          <ResetButton disabled={textSize.auto} onClick={textSize.onReset}>
            Reset to auto
          </ResetButton>
          <div className="mt-1 flex flex-col gap-3 border-t pt-3">
            {([
              ["subheader_font_scale", "Subheader size"],
              ["title_font_scale", "Title size"],
              ["body_font_scale", "Cover body text size"],
            ] as const).map(([key, label]) => (
              <InspectorSlider
                key={key}
                id={`cover-${key}-${page.uuid}`}
                label={label}
                percent={Math.round(cover[key] * 100)}
                min={LETTER_COVER_FONT_SCALE_MIN * 100}
                max={LETTER_COVER_FONT_SCALE_MAX * 100}
                step={LETTER_COVER_FONT_SCALE_STEP * 100}
                onChange={(percent) =>
                  onCoverChange({
                    [key]: normalizeLetterCoverFontScale(percent / 100),
                  })
                }
              />
            ))}
            <ResetButton
              disabled={coverSizesAreDefault}
              onClick={() =>
                onCoverChange({
                  subheader_font_scale: LETTER_COVER_FONT_SCALE_DEFAULT,
                  title_font_scale: LETTER_COVER_FONT_SCALE_DEFAULT,
                  body_font_scale: LETTER_COVER_FONT_SCALE_DEFAULT,
                })
              }
            >
              Reset cover sizes
            </ResetButton>
          </div>
          <FieldHint>
            Overall size scales every cover section; the sliders below it
            fine-tune each one. Oversized covers shrink to fit. Branding and
            signatures stay fixed.
          </FieldHint>
        </div>
      </InspectorSection>

      <InspectorSection value="images" title="Images">
        <CoverImageControl
          kind="avatar"
          label="Avatar image"
          imageUrl={cover.avatar_url}
          uploading={uploading === "avatar"}
          error={imageErrors.avatar}
          inputRef={avatarInputRef}
          onFile={(file) => onImageChange("avatar", file)}
          onRemove={() => onCoverChange({ avatar_url: null })}
        />
        <CoverImageControl
          kind="hero"
          label="Cover image"
          imageUrl={cover.hero_image_url}
          uploading={uploading === "hero"}
          error={imageErrors.hero}
          inputRef={heroInputRef}
          onFile={(file) => onImageChange("hero", file)}
          onCrop={onCropCoverImage}
          onRemove={onRemoveCoverImage}
        />
        {cover.hero_image_url ? (
          <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`cover-image-caption-${page.uuid}`}
                className="text-sm font-medium"
              >
                Cover image caption
              </label>
              <Input
                id={`cover-image-caption-${page.uuid}`}
                value={cover.hero_image_caption}
                maxLength={LETTER_COVER_HERO_CAPTION_MAX_LENGTH}
                placeholder="Add an optional caption"
                onChange={(event) =>
                  onCoverChange({ hero_image_caption: event.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <p
                id={`cover-caption-placement-${page.uuid}`}
                className="text-sm font-medium"
              >
                Caption placement
              </p>
              <ToggleGroup
                aria-labelledby={`cover-caption-placement-${page.uuid}`}
                className="w-full"
                value={[cover.hero_image_caption_placement]}
                variant="outline"
                size="sm"
                spacing={0}
                onValueChange={(value) => {
                  const placement = value[0] as LetterCoverCaptionPlacement | undefined;
                  if (placement) onCoverChange({ hero_image_caption_placement: placement });
                }}
              >
                <ToggleGroupItem className="flex-1" value="overlay">
                  On image
                </ToggleGroupItem>
                <ToggleGroupItem className="flex-1" value="below">
                  Below image
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex flex-col gap-2">
              <p
                id={`cover-caption-alignment-${page.uuid}`}
                className="text-sm font-medium"
              >
                Caption alignment
              </p>
              <AlignmentToggle
                labelledBy={`cover-caption-alignment-${page.uuid}`}
                value={cover.hero_image_caption_alignment}
                onChange={(hero_image_caption_alignment) =>
                  onCoverChange({ hero_image_caption_alignment })
                }
              />
            </div>
          </div>
        ) : null}
      </InspectorSection>

      <InspectorSection value="arrange" title="Arrange">
        <FieldHint>
          Drag to reorder the cover content. Author details and the Medasin
          logo stay at the bottom.
        </FieldHint>
        <DndContext sensors={coverSensors} collisionDetection={closestCenter} onDragEnd={reorderSections}>
          <SortableContext items={reorderableSections} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1.5">
              {reorderableSections.map((section) => (
                <SortableCoverSection key={section} section={section} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </InspectorSection>
    </Accordion>
  );
}

function AlignmentToggle({
  labelledBy,
  value,
  onChange,
}: {
  labelledBy: string;
  value: LetterCoverTextAlignment;
  onChange: (value: LetterCoverTextAlignment) => void;
}) {
  return (
    <ToggleGroup
      aria-labelledby={labelledBy}
      className="w-full"
      value={[value]}
      variant="outline"
      size="sm"
      spacing={0}
      onValueChange={(next) => {
        const alignment = next[0] as LetterCoverTextAlignment | undefined;
        if (alignment) onChange(alignment);
      }}
    >
      {ALIGNMENTS.map(({ value: alignment, label, icon: Icon }) => (
        <ToggleGroupItem key={alignment} className="flex-1" value={alignment}>
          <Icon aria-hidden="true" />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function CoverImageControl({
  kind,
  label,
  imageUrl,
  uploading,
  error,
  inputRef,
  onFile,
  onCrop,
  onRemove,
}: {
  kind: CoverImageKind;
  label: string;
  imageUrl: string | null;
  uploading: boolean;
  error?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (file?: File) => void;
  onCrop?: () => void;
  onRemove: () => void;
}) {
  const hasImage = Boolean(imageUrl);

  return (
    <div className="flex flex-col gap-2" data-cover-image-control={kind}>
      <p className="text-sm font-medium">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className={cn("flex gap-3", kind === "hero" ? "flex-col" : "items-center")}>
        {kind === "avatar" ? (
          <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-muted-foreground">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user media from the API proxy
              <img src={imageUrl} alt="" className="size-full object-cover" />
            ) : (
              <UserRound className="size-5" aria-hidden="true" />
            )}
          </span>
        ) : imageUrl ? (
          <div className="overflow-hidden rounded-lg border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- user media from the API proxy */}
            <img src={imageUrl} alt="" className="aspect-video w-full object-cover" />
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            className="flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground transition-colors outline-none hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="size-5" aria-hidden="true" />
            )}
            {uploading ? "Uploading…" : "Add a cover image"}
          </button>
        )}
        {(kind === "avatar" || hasImage) && (
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <LoaderCircle className="animate-spin" data-icon="inline-start" />
              ) : (
                <ImagePlus data-icon="inline-start" />
              )}
              {uploading ? "Uploading…" : hasImage ? "Replace" : "Upload"}
            </Button>
            {hasImage ? (
              <>
                {onCrop ? (
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={onCrop}>
                    <Crop data-icon="inline-start" />
                    Crop
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={onRemove}>
                  <Trash2 data-icon="inline-start" />
                  Remove
                </Button>
              </>
            ) : null}
          </div>
        )}
      </div>
      <FieldHint>
        JPG, PNG, GIF, WebP, or AVIF · max 8 MB.
        {!hasImage ? " Hidden until an image is provided." : ""}
      </FieldHint>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SortableCoverSection({ section }: { section: LetterCoverSection }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex min-h-10 items-center gap-2 rounded-md border bg-background pr-3 text-sm",
        isDragging && "z-10 opacity-60 shadow-sm",
      )}
    >
      <button
        type="button"
        className="flex size-11 touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:size-9"
        aria-label={`Reorder ${LETTER_COVER_SECTION_LABELS[section]}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </button>
      <span>{LETTER_COVER_SECTION_LABELS[section]}</span>
    </div>
  );
}
