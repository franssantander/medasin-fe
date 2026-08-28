"use client";

import { Layers3, Plus } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAreaFormDialog } from "../hooks/use-area-form-dialog";
import { useAreasQuery } from "../queries/area-query";
import { AreaCard } from "./area-card";
import { AreaFormDialog } from "./area-form-dialog";

export function AreaList() {
  const { data, isLoading, isError, refetch } = useAreasQuery("active");
  const areaForm = useAreaFormDialog();

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Areas"
        action={<Button onClick={areaForm.openCreate}><Plus />New area</Button>}
      />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-48 rounded-xl" />)}
        </div>
      )}

      {isError && (
        <Card className="items-center py-12 text-center">
          <CardTitle>Areas could not be loaded</CardTitle>
          <CardDescription>Check your connection and try again.</CardDescription>
          <Button variant="outline" onClick={() => refetch()}>Try again</Button>
        </Card>
      )}

      {data?.data.length === 0 && (
        <Card className="items-center py-14 text-center">
          <div className="rounded-full bg-muted p-3"><Layers3 className="size-6" /></div>
          <CardTitle>Create your first area</CardTitle>
          <CardDescription className="max-w-sm">Group the goals, habits, projects, notes, and resources that support an ongoing part of your life.</CardDescription>
          <Button onClick={areaForm.openCreate}><Plus />New area</Button>
        </Card>
      )}

      {data && data.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.data.map((area) => (
            <AreaCard key={area.uuid} area={area} onEdit={() => areaForm.openEdit(area)} />
          ))}
        </div>
      )}

      <AreaFormDialog
        open={areaForm.isOpen}
        onOpenChange={areaForm.setIsOpen}
        area={areaForm.area}
        isPending={areaForm.isPending}
        onSubmit={areaForm.submit}
      />
    </div>
  );
}
