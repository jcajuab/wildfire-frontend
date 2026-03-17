"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { DashboardPage } from "@/components/layout/dashboard-page";
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
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Create Role"
        actions={
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
        }
      />
      <DashboardPage.Body>
        <DashboardPage.Content className="overflow-x-hidden overflow-y-auto overscroll-none px-6 py-6 sm:px-8 sm:py-8">
          <RoleForm
            mode="create"
            permissions={permissions}
            initialUsers={initialUsers}
            canReadUsers={canReadUsers}
            initialPermissionIds={[]}
            onSubmit={handleCreateRole}
            onStateChange={setFormState}
          />
        </DashboardPage.Content>
      </DashboardPage.Body>
    </DashboardPage.Root>
  );
}
