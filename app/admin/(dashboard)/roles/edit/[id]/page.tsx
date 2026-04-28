"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { RoleForm, type RoleFormState } from "@/components/roles/role-form";
import { Button } from "@/components/ui/button";
import { ROLE_INDEX_PATH } from "@/lib/role-paths";
import { useEditRolePage } from "./use-edit-role-page";

export default function EditRolePage(): ReactElement {
  const params = useParams<{ id: string }>();
  const { state, canReadUsers, isSaving, handleCancel, handleSave } =
    useEditRolePage(params?.id);
  const [formState, setFormState] = useState<RoleFormState | null>(null);

  const headerActions =
    state.status === "ready" ? (
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
          disabled={!formState?.canSubmit || formState.isSubmitting || isSaving}
        >
          {formState?.isSubmitting || isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    ) : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PageHeader title="Edit Role">{headerActions}</PageHeader>
      <div className="min-h-0 flex-1 overflow-auto">
          {state.status === "loading" ? (
            <div className="flex items-center justify-center px-6 py-16 sm:px-8">
              <p className="text-muted-foreground">Loading role...</p>
            </div>
          ) : null}

          {state.status === "notFound" ? (
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <EmptyState
                title="Role not found"
                description={state.message}
                action={
                  <Button asChild>
                    <Link href={ROLE_INDEX_PATH}>Back to Roles</Link>
                  </Button>
                }
              />
            </div>
          ) : null}

          {state.status === "error" ? (
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <EmptyState
                title="Unable to load role"
                description={state.message}
                action={
                  <Button asChild>
                    <Link href={ROLE_INDEX_PATH}>Back to Roles</Link>
                  </Button>
                }
              />
            </div>
          ) : null}

          {state.status === "nonEditable" ? (
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <EmptyState
                title="System role cannot be edited"
                description={state.message}
                action={
                  <Button asChild>
                    <Link href={ROLE_INDEX_PATH}>Back to Roles</Link>
                  </Button>
                }
              />
            </div>
          ) : null}

          {state.status === "ready" ? (
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <RoleForm
                mode="edit"
                initialRole={state.role}
                permissions={state.permissions}
                initialUsers={state.initialUsers}
                canReadUsers={canReadUsers}
                initialPermissionIds={state.initialPermissionIds}
                onSubmit={handleSave}
                onStateChange={setFormState}
              />
            </div>
          ) : null}
      </div>
    </div>
  );
}
