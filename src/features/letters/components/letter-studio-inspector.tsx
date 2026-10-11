"use client";

import { AlignLeft, Quote, Type } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { LetterPage, LetterPageLayout, LetterSignature } from "../type";
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
  onLayoutChange,
  onSignatureChange,
}: {
  page: LetterPage;
  isLastPage: boolean;
  textSize: StudioTextSize;
  onLayoutChange: (layout: LetterPageLayout) => void;
  onSignatureChange: (signature: LetterSignature) => void;
}) {
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

      {isLastPage ? (
        <fieldset className="flex flex-col gap-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">Signature</legend>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Author name
            <Input
              value={page.signature?.name ?? ""}
              maxLength={120}
              onChange={(event) =>
                onSignatureChange({
                  name: event.target.value,
                  handle: page.signature?.handle ?? "",
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Username
            <Input
              value={page.signature?.handle ?? ""}
              maxLength={80}
              onChange={(event) =>
                onSignatureChange({
                  name: page.signature?.name ?? "",
                  handle: event.target.value,
                })
              }
            />
          </label>
          <FieldHint>
            Shown at the end of the last page. Leave either field blank to hide
            it; the username appears exactly as entered.
          </FieldHint>
        </fieldset>
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
