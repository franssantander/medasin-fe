"use client";

import { AlignLeft, PenLine, Quote, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { LetterCover, LetterPage, LetterPageLayout } from "../type";
import type { StudioTextSize } from "./letter-cover-inspector";
import {
  FieldHint,
  InspectorSlider,
  ResetButton,
} from "./letter-studio-fields";

export function LetterBodyPageInspector({
  page,
  isLastPage,
  textSize,
  cover,
  onLayoutChange,
  onCoverChange,
  onEditAuthor,
}: {
  page: LetterPage;
  isLastPage: boolean;
  textSize: StudioTextSize;
  cover: LetterCover;
  onLayoutChange: (layout: LetterPageLayout) => void;
  onCoverChange: (update: Partial<LetterCover>) => void;
  onEditAuthor: () => void;
}) {
  const signedAs = [cover.author_name.trim(), cover.author_handle.trim()]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="flex flex-col gap-2">
        <p id={`page-layout-${page.uuid}`} className="text-sm font-medium">
          Page layout
        </p>
        <ToggleGroup
          aria-labelledby={`page-layout-${page.uuid}`}
          className="grid w-full grid-cols-2 gap-2"
          value={[page.layout]}
          onValueChange={(value) => {
            const layout = value[0] as LetterPageLayout | undefined;
            if (layout) onLayoutChange(layout);
          }}
        >
          <ToggleGroupItem
            value="body"
            className="h-auto flex-col items-start gap-1 rounded-lg border p-3 text-left whitespace-normal aria-pressed:border-foreground aria-pressed:bg-transparent"
          >
            <AlignLeft aria-hidden="true" />
            <span>Body text</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="quote"
            className="h-auto flex-col items-start gap-1 rounded-lg border p-3 text-left whitespace-normal aria-pressed:border-foreground aria-pressed:bg-transparent"
          >
            <Quote aria-hidden="true" />
            <span>Featured quote</span>
          </ToggleGroupItem>
        </ToggleGroup>
        <FieldHint>
          Featured quotes are set large and centered in the serif typeface.
        </FieldHint>
      </div>

      <TextSizePanel textSize={textSize} id={`letter-page-text-scale-${page.uuid}`} />

      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`page-numbers-${page.uuid}`} className="text-sm font-medium">
          Show page numbers
        </label>
        <Switch
          id={`page-numbers-${page.uuid}`}
          checked={cover.show_page_numbers}
          onCheckedChange={(show_page_numbers) => onCoverChange({ show_page_numbers })}
        />
      </div>

      {isLastPage ? (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={`page-signature-${page.uuid}`} className="text-sm font-medium">
              Show closing signature
            </label>
            <Switch
              id={`page-signature-${page.uuid}`}
              checked={cover.show_signature}
              onCheckedChange={(show_signature) => onCoverChange({ show_signature })}
            />
          </div>
          <FieldHint>
            {signedAs
              ? `Signed as ${signedAs}.`
              : "Add your name on the cover to sign off this page."}
          </FieldHint>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={onEditAuthor}
          >
            <PenLine data-icon="inline-start" />
            Edit author
          </Button>
        </div>
      ) : null}

      <FieldHint>
        Select text on the page to format headings, emphasis, alignment, and
        links.
      </FieldHint>
    </div>
  );
}

export function TextSizePanel({
  id,
  textSize,
}: {
  id: string;
  textSize: StudioTextSize;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3">
      <InspectorSlider
        id={id}
        label="Text size for all pages"
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
      <FieldHint>
        Applies to every page after the cover, including quotes and cover entry
        continuations. Text flows onto more pages as needed.
      </FieldHint>
    </div>
  );
}
