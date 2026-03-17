"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { DashboardPage } from "@/components/layout/dashboard-page";
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
    <DashboardPage.Root>
      <DashboardPage.Header title="Edit Role" actions={headerActions} />
      <DashboardPage.Body>
        <DashboardPage.Content className="overflow-x-hidden overflow-y-auto overscroll-none px-6 py-6 sm:px-8 sm:py-8">
          {state.status === "loading" ? (
            <div className="flex min-h-full items-center justify-center">
              <p className="text-muted-foreground">Loading role...</p>
            </div>
          ) : null}

          {state.status === "notFound" ? (
            <div className="flex min-h-full">
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
            <div className="flex min-h-full">
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
            <div className="flex min-h-full">
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
            <div>
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
        </DashboardPage.Content>
      </DashboardPage.Body>
    </DashboardPage.Root>
  );
}
