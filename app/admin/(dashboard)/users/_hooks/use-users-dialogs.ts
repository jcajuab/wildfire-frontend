"use client";

import { useCallback, useState } from "react";
import type { User } from "@/types/user";

export function useUsersDialogs() {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<{
    userId: string;
    password: string;
  } | null>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] =
    useState(false);

  const handleEdit = useCallback((user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  }, []);

  const handleRequestBanUser = useCallback((user: User) => {
    setUserToBan(user);
    setIsBanDialogOpen(true);
  }, []);

  const handleRequestUnbanUser = useCallback((user: User) => {
    setUserToBan(user);
    setIsBanDialogOpen(true);
  }, []);

  const handleRequestDeleteUser = useCallback((user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  }, []);

  return {
    isInviteDialogOpen,
    setIsInviteDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    selectedUser,
    setSelectedUser,
    userToBan,
    setUserToBan,
    isBanDialogOpen,
    setIsBanDialogOpen,
    userToDelete,
    setUserToDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    resetPasswordResult,
    setResetPasswordResult,
    isResetPasswordDialogOpen,
    setIsResetPasswordDialogOpen,
    handleEdit,
    handleRequestBanUser,
    handleRequestUnbanUser,
    handleRequestDeleteUser,
  };
}
