"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RoleForm, type RoleFormState } from "@/components/roles/role-form";
import { Button } from "@/components/ui/button";
import { useCreateRolePage } from "./use-create-role-page";

export default function CreateRolePage(): ReactElement {
  const {
    permissions,
    canReadUsers,
    initialUsers,
    handleCancel,
    handleCreateRole,
  } = useCreateRolePage();
  const [formState, setFormState] = useState<RoleFormState | null>(null);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PageHeader title="Create Role">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={formState?.isSubmitting ?? false}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              void formState?.submit();
            }}
            disabled={!formState?.canSubmit || formState.isSubmitting}
          >
            {formState?.isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </PageHeader>
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 overflow-auto overscroll-none px-6 py-6 sm:px-8 sm:py-8">
            <RoleForm
              mode="create"
              permissions={permissions}
              initialUsers={initialUsers}
              canReadUsers={canReadUsers}
              initialPermissionIds={[]}
              onSubmit={handleCreateRole}
              onStateChange={setFormState}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
