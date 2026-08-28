"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowLeft, ExternalLink, FileText, FolderKanban, Link2, ListChecks, MoreHorizontal, Pencil, Pin, Plus, RefreshCw, Repeat2, Trash2, Unlink } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { areaKeys, useAreaMutation, useAreaQuery } from "../queries/area-query";
import { areaService } from "../services/area-service";
import type { ApiResponse, AreaInput, Goal, GoalInput, Habit, HabitInput, Note, NoteInput, Paginated, Project, Resource } from "../type";
import { AreaFormDialog, DEFAULT_AREA_BACKGROUND } from "./area-form-dialog";
import { AreaIcon, areaBadgeStyle } from "./area-icons";
import { RecordFormSheet } from "./record-form-sheet";

type Tab = "projects" | "goals" | "habits" | "notes" | "resources";
type EditableRecord = Goal | Habit | Note;

const tabs: { value: Tab; label: string; icon: typeof FolderKanban }[] = [
  { value: "projects", label: "Projects", icon: FolderKanban },
  { value: "goals", label: "Goals", icon: ListChecks },
  { value: "habits", label: "Habits", icon: Repeat2 },
  { value: "notes", label: "Notes", icon: FileText },
  { value: "resources", label: "Resources", icon: Link2 },
];

export function AreaDetail() {
  const params = useParams<{ uuid: string }>();
  const uuid = params.uuid;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("projects");
  const [page, setPage] = useState(1);
  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<"archive" | "delete">();
  const [recordForm, setRecordForm] = useState<{ kind: "goal" | "habit" | "note"; value?: EditableRecord }>();
  const { data: areaResponse, isLoading, isError, refetch } = useAreaQuery(uuid);
  const area = areaResponse?.data;
  const archived = Boolean(area?.archived_at);
  const updateArea = useAreaMutation("update", uuid);
  const archiveArea = useAreaMutation("archive", uuid);
  const restoreArea = useAreaMutation("restore", uuid);
  const removeArea = useAreaMutation("remove", uuid);
  const areaActionPending = archiveArea.isPending || removeArea.isPending;
  const isDeletingArea = confirmationAction === "delete";

  const sectionQuery = useQuery<ApiResponse<Paginated<Goal | Habit | Note | Project | Resource>>>({
    queryKey: areaKeys.section(uuid, activeTab, page),
    queryFn: () => {
      if (activeTab === "projects") return areaService.projects(uuid, page) as Promise<ApiResponse<Paginated<Goal | Habit | Note | Project | Resource>>>;
      if (activeTab === "goals") return areaService.goals(uuid, page) as Promise<ApiResponse<Paginated<Goal | Habit | Note | Project | Resource>>>;
      if (activeTab === "habits") return areaService.habits(uuid, page) as Promise<ApiResponse<Paginated<Goal | Habit | Note | Project | Resource>>>;
      if (activeTab === "notes") return areaService.notes(uuid, page) as Promise<ApiResponse<Paginated<Goal | Habit | Note | Project | Resource>>>;
      return areaService.resources(uuid, page) as Promise<ApiResponse<Paginated<Goal | Habit | Note | Project | Resource>>>;
    },
    enabled: Boolean(area),
  });

  const invalidateSection = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: ["areas", "detail", uuid] });
    toast.add({ type: "success", description: message });
  };

  const recordMutation = useMutation({
    mutationFn: async (input: GoalInput | HabitInput | NoteInput) => {
      if (!recordForm) throw new Error("No record selected.");
      if (recordForm.kind === "goal") return recordForm.value
        ? areaService.updateGoal(uuid, recordForm.value.uuid, input as GoalInput)
        : areaService.createGoal(uuid, input as GoalInput);
      if (recordForm.kind === "habit") return recordForm.value
        ? areaService.updateHabit(uuid, recordForm.value.uuid, input as HabitInput)
        : areaService.createHabit(uuid, input as HabitInput);
      return recordForm.value
        ? areaService.updateNote(uuid, recordForm.value.uuid, input as NoteInput)
        : areaService.createNote(uuid, input as NoteInput);
    },
    onSuccess: (response) => invalidateSection(response.message),
  });

  const deleteRecord = useMutation({
    mutationFn: ({ kind, uuid: recordUuid }: { kind: "goal" | "habit" | "note"; uuid: string }) => {
      if (kind === "goal") return areaService.removeGoal(uuid, recordUuid);
      if (kind === "habit") return areaService.removeHabit(uuid, recordUuid);
      return areaService.removeNote(uuid, recordUuid);
    },
    onSuccess: (response) => invalidateSection(response.message),
  });

  if (isLoading) return <div className="grid gap-4"><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>;
  if (isError || !area) return <Card className="items-center py-14 text-center"><CardTitle>Area could not be loaded</CardTitle><Button variant="outline" onClick={() => refetch()}><RefreshCw />Try again</Button></Card>;

  const changeTab = (tab: Tab) => { setActiveTab(tab); setPage(1); };

  const confirmAreaAction = async () => {
    if (confirmationAction === "archive") {
      await archiveArea.mutateAsync();
      setConfirmationAction(undefined);
      return;
    }

    if (confirmationAction === "delete") {
      await removeArea.mutateAsync();
      setConfirmationAction(undefined);
      router.replace("/areas");
    }
  };

  return (
    <div className="grid gap-5">
      <div><Button render={<Link href={archived ? "/archives" : "/areas"} />} variant="ghost" size="sm"><ArrowLeft />Back to {archived ? "archives" : "areas"}</Button></div>
      <Card className="gap-0 py-0">
        <div
          className="h-40 bg-cover bg-center sm:h-48"
          style={{
            backgroundImage: `url('${area.background_image_url || DEFAULT_AREA_BACKGROUND}')`,
          }}
          role="img"
          aria-label={`${area.name} background`}
        />
        <CardHeader className="py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <div className="flex size-12 items-center justify-center rounded-xl" style={areaBadgeStyle(area.background)}><AreaIcon name={area.icon} className="size-5" /></div>
          <div><div className="flex flex-wrap items-center gap-2"><CardTitle className="text-xl">{area.name}</CardTitle>{archived && <Badge variant="secondary">Archived</Badge>}</div><CardDescription className="mt-1">{area.description || "No description yet."}</CardDescription></div>
          <CardAction className="flex gap-2">
            {archived ? (
              <Button variant="outline" onClick={() => restoreArea.mutate()} disabled={restoreArea.isPending}>Restore</Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label={`Actions for ${area.name}`} />}><MoreHorizontal /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setAreaFormOpen(true)}><Pencil />Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConfirmationAction("archive")}><Archive />Archive</DropdownMenuItem>
                  <DropdownMenuItem destructive onClick={() => setConfirmationAction("delete")}><Trash2 />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardAction>
        </CardHeader>
        {archived && <CardContent className="pb-6"><p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">This Area is read-only. Restore it before making changes.</p></CardContent>}
      </Card>

      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" role="tablist">
        {tabs.map(({ value, label, icon: Icon }) => <Button key={value} variant={activeTab === value ? "secondary" : "ghost"} className="flex-1" onClick={() => changeTab(value)}><Icon />{label}</Button>)}
      </div>

      <SectionContent
        tab={activeTab}
        data={sectionQuery.data?.data}
        loading={sectionQuery.isLoading}
        error={sectionQuery.isError}
        archived={archived}
        areaUuid={uuid}
        page={page}
        setPage={setPage}
        refetch={() => sectionQuery.refetch()}
        onAdd={(kind) => setRecordForm({ kind })}
        onEdit={(kind, value) => setRecordForm({ kind, value })}
        onDelete={(kind, recordUuid) => { if (window.confirm("Delete this record?")) deleteRecord.mutate({ kind, uuid: recordUuid }); }}
        onChanged={invalidateSection}
      />

      <AreaFormDialog open={areaFormOpen} onOpenChange={setAreaFormOpen} area={area} isPending={updateArea.isPending} onSubmit={(input: AreaInput) => updateArea.mutateAsync(input).then(() => undefined)} />
      {recordForm && <RecordFormSheet kind={recordForm.kind} value={recordForm.value} open={Boolean(recordForm)} onOpenChange={(open) => { if (!open) setRecordForm(undefined); }} isPending={recordMutation.isPending} onSubmit={(input) => recordMutation.mutateAsync(input).then(() => undefined)} />}

      <Dialog
        open={Boolean(confirmationAction)}
        onOpenChange={(open) => {
          if (!open && !areaActionPending) setConfirmationAction(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isDeletingArea ? "Delete area?" : "Archive area?"}</DialogTitle>
            <DialogDescription>
              {isDeletingArea
                ? `“${area.name}” will be permanently deleted. This action cannot be undone.`
                : `“${area.name}” will be moved to your archived areas. You can restore it later.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={areaActionPending} onClick={() => setConfirmationAction(undefined)}>Cancel</Button>
            <Button variant={isDeletingArea ? "destructive" : "default"} disabled={areaActionPending} onClick={confirmAreaAction}>
              {areaActionPending ? (isDeletingArea ? "Deleting…" : "Archiving…") : (isDeletingArea ? "Delete area" : "Archive area")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionContent({ tab, data, loading, error, archived, areaUuid, page, setPage, refetch, onAdd, onEdit, onDelete, onChanged }: {
  tab: Tab;
  data?: Paginated<Goal | Habit | Note | Project | Resource>;
  loading: boolean;
  error: boolean;
  archived: boolean;
  areaUuid: string;
  page: number;
  setPage: (page: number) => void;
  refetch: () => void;
  onAdd: (kind: "goal" | "habit" | "note") => void;
  onEdit: (kind: "goal" | "habit" | "note", value: EditableRecord) => void;
  onDelete: (kind: "goal" | "habit" | "note", uuid: string) => void;
  onChanged: (message: string) => Promise<void>;
}) {
  if (loading) return <Skeleton className="h-64 rounded-xl" />;
  if (error) return <Card className="items-center py-12"><CardTitle>Could not load {tab}</CardTitle><Button variant="outline" onClick={refetch}>Try again</Button></Card>;
  const records = data?.data ?? [];
  const singular = tab === "habits" ? "habit" : tab === "goals" ? "goal" : "note";

  return <div className="grid gap-4">
    <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold capitalize">{tab}</h2><p className="text-sm text-muted-foreground">{data?.total ?? 0} connected</p></div>{!archived && (tab === "goals" || tab === "habits" || tab === "notes") && <Button size="sm" onClick={() => onAdd(singular)}><Plus />Add {singular}</Button>}{!archived && (tab === "projects" || tab === "resources") && <LinkPicker areaUuid={areaUuid} kind={tab} linked={records} onChanged={onChanged} />}</div>
    {records.length === 0 ? <Card className="items-center py-12 text-center"><CardTitle>No {tab} yet</CardTitle><CardDescription>Add or link one when you are ready.</CardDescription></Card> : <div className="grid gap-3 md:grid-cols-2">{records.map((record) => <RecordCard key={record.uuid} tab={tab} record={record} archived={archived} areaUuid={areaUuid} onEdit={onEdit} onDelete={onDelete} onChanged={onChanged} />)}</div>}
    {data && data.last_page > 1 && <div className="flex items-center justify-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page} of {data.last_page}</span><Button variant="outline" size="sm" disabled={page >= data.last_page} onClick={() => setPage(page + 1)}>Next</Button></div>}
  </div>;
}

function RecordCard({ tab, record, archived, areaUuid, onEdit, onDelete, onChanged }: { tab: Tab; record: Goal | Habit | Note | Project | Resource; archived: boolean; areaUuid: string; onEdit: (kind: "goal" | "habit" | "note", value: EditableRecord) => void; onDelete: (kind: "goal" | "habit" | "note", uuid: string) => void; onChanged: (message: string) => Promise<void> }) {
  const queryClient = useQueryClient();
  const detach = useMutation({ mutationFn: () => tab === "projects" ? areaService.detachProject(areaUuid, record.uuid) : areaService.detachResource(areaUuid, record.uuid), onSuccess: async (response) => { await queryClient.invalidateQueries({ queryKey: ["areas", "detail", areaUuid] }); await onChanged(response.message); }, onError: (error) => toast.add({ type: "error", description: error.message }) });
  let title = ""; let description: ReactNode = null; let badge: string | undefined;
  if (tab === "projects") { const item = record as Project; title = item.name; description = item.description || "No description."; badge = item.status; }
  if (tab === "resources") { const item = record as Resource; title = item.title; description = item.author || item.source || item.description || "No details."; badge = item.type || undefined; }
  if (tab === "goals") { const item = record as Goal; title = item.title; description = item.description || (item.due_date ? `Due ${formatDate(item.due_date)}` : "No due date."); badge = item.status.replace("_", " "); }
  if (tab === "habits") { const item = record as Habit; title = item.name; description = item.description || "No description."; badge = `${item.frequency}${item.is_active ? "" : " · paused"}`; }
  if (tab === "notes") { const item = record as Note; title = item.title; description = <span className="line-clamp-3 whitespace-pre-wrap">{item.content}</span>; badge = item.is_pinned ? "Pinned" : undefined; }
  const nested = tab === "goals" || tab === "habits" || tab === "notes";
  return <Card size="sm"><CardHeader><CardTitle className="flex items-center gap-2">{tab === "notes" && (record as Note).is_pinned && <Pin className="size-3" />}{title}</CardTitle><CardDescription>{description}</CardDescription>{badge && <CardAction><Badge variant="secondary" className="capitalize">{badge}</Badge></CardAction>}</CardHeader>{!archived && <CardContent className="flex-row justify-end">{nested ? <><Button variant="ghost" size="sm" onClick={() => onEdit(tab.slice(0, -1) as "goal" | "habit" | "note", record as EditableRecord)}><Pencil />Edit</Button><Button variant="destructive" size="sm" onClick={() => onDelete(tab.slice(0, -1) as "goal" | "habit" | "note", record.uuid)}><Trash2 />Delete</Button></> : <Button variant="ghost" size="sm" disabled={detach.isPending} onClick={() => detach.mutate()}><Unlink />Detach</Button>}{tab === "resources" && (record as Resource).url && <Button render={<a href={(record as Resource).url!} target="_blank" rel="noreferrer" />} variant="ghost" size="icon-sm" aria-label="Open resource"><ExternalLink /></Button>}</CardContent>}</Card>;
}

function LinkPicker({ areaUuid, kind, linked, onChanged }: { areaUuid: string; kind: "projects" | "resources"; linked: (Goal | Habit | Note | Project | Resource)[]; onChanged: (message: string) => Promise<void> }) {
  const [selected, setSelected] = useState("");
  const query = useQuery<ApiResponse<(Project | Resource)[]>>({ queryKey: [kind, "available"], queryFn: () => kind === "projects" ? areaService.allProjects() as Promise<ApiResponse<(Project | Resource)[]>> : areaService.allResources() as Promise<ApiResponse<(Project | Resource)[]>> });
  const linkedIds = new Set(linked.map((item) => item.uuid));
  const options = (query.data?.data ?? []).filter((item) => !linkedIds.has(item.uuid));
  const mutation = useMutation<ApiResponse<Project | Resource>>({ mutationFn: () => kind === "projects" ? areaService.linkProject(areaUuid, selected) as Promise<ApiResponse<Project | Resource>> : areaService.linkResource(areaUuid, selected) as Promise<ApiResponse<Project | Resource>>, onSuccess: async (response) => { setSelected(""); await onChanged(response.message); }, onError: (error) => toast.add({ type: "error", description: error.message }) });
  return <div className="flex max-w-md flex-1 justify-end gap-2"><select aria-label={`Select ${kind}`} className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm" value={selected} onChange={(event) => setSelected(event.target.value)} disabled={query.isLoading}><option value="">{query.isLoading ? "Loading…" : `Select ${kind === "projects" ? "a project" : "a resource"}`}</option>{options.map((item) => <option key={item.uuid} value={item.uuid}>{"name" in item ? item.name : item.title}{kind === "projects" && "area" in item && item.area ? ` (move from ${item.area.name})` : ""}</option>)}</select><Button size="sm" disabled={!selected || mutation.isPending} onClick={() => mutation.mutate()}><Link2 />Link</Button></div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)); }
