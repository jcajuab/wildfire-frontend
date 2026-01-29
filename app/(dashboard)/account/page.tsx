"use client";

import { useState } from "react";
import { IconUserSquareRounded, IconUser } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout";

// Common timezones
const timezones = [
  "Asia - Taipei",
  "Asia - Tokyo",
  "Asia - Singapore",
  "Asia - Hong Kong",
  "America - New York",
  "America - Los Angeles",
  "America - Chicago",
  "Europe - London",
  "Europe - Paris",
  "Europe - Berlin",
  "Australia - Sydney",
  "Pacific - Auckland",
] as const;

// Mock user data - will be replaced with actual auth context
const mockUser = {
  firstName: "Admin",
  lastName: "",
  email: "john.doe@example.com",
  timezone: "Asia - Taipei",
  avatar: null as string | null,
};

export default function AccountPage(): React.ReactElement {
  const [firstName, setFirstName] = useState(mockUser.firstName);
  const [lastName, setLastName] = useState(mockUser.lastName);
  const [timezone, setTimezone] = useState(mockUser.timezone);

  const handleChangeProfilePicture = (): void => {
    // TODO: Implement file upload
    console.log("Change profile picture");
  };

  const handleChangePassword = (): void => {
    // TODO: Implement password change dialog
    console.log("Change password");
  };

  const handleLogOut = (): void => {
    // TODO: Implement logout
    console.log("Log out");
  };

  const handleDeleteAccount = (): void => {
    // TODO: Implement account deletion with confirmation
    console.log("Delete account");
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Account" />

      <div className="flex flex-1 flex-col overflow-auto">
        {/* Account Information Section */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <IconUserSquareRounded className="size-5" />
            <h2 className="text-base font-semibold">Account Information</h2>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-6 px-6 py-6">
          {/* Profile Picture */}
          <div className="grid grid-cols-[180px_1fr] items-start gap-4">
            <Label className="pt-2 text-right text-sm font-medium text-muted-foreground">
              Profile Picture
            </Label>
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <IconUser className="size-6 text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleChangeProfilePicture}
                >
                  Change Profile Picture
                </Button>
                <p className="text-xs text-muted-foreground">
                  Recommended size: 320 × 320 pixels
                </p>
              </div>
            </div>
          </div>

          {/* First Name */}
          <div className="grid grid-cols-[180px_1fr] items-center gap-4">
            <Label
              htmlFor="firstName"
              className="text-right text-sm font-medium text-muted-foreground"
            >
              First Name
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="max-w-lg"
            />
          </div>

          {/* Last Name */}
          <div className="grid grid-cols-[180px_1fr] items-center gap-4">
            <Label
              htmlFor="lastName"
              className="text-right text-sm font-medium text-muted-foreground"
            >
              Last Name
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="max-w-lg"
            />
          </div>

          {/* Email (read-only) */}
          <div className="grid grid-cols-[180px_1fr] items-center gap-4">
            <Label className="text-right text-sm font-medium text-muted-foreground">
              Email
            </Label>
            <p className="text-sm">{mockUser.email}</p>
          </div>

          {/* Password */}
          <div className="grid grid-cols-[180px_1fr] items-center gap-4">
            <Label className="text-right text-sm font-medium text-muted-foreground">
              Password
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleChangePassword}
              className="w-fit"
            >
              Change Password
            </Button>
          </div>

          {/* Time Zone */}
          <div className="grid grid-cols-[180px_1fr] items-center gap-4">
            <Label className="text-right text-sm font-medium text-muted-foreground">
              Time Zone
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="max-w-lg">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-[180px_1fr] items-center gap-4 px-6 pb-6">
          <div />
          <div className="flex justify-end gap-2 max-w-lg">
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={handleLogOut}
            >
              Log Out
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
