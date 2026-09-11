"use client";

import React from "react";
import {
  Calendar,
  Button,
  toast,
  Tooltip,
  Avatar,
  Chip,
  Alert,
  CloseButton,
  Spinner,
  AlertDialog,
} from "@heroui/react";
import {
  HardDrive,
  Persons,
  CircleCheckFill,
  CircleQuestion,
  Envelope,
  Globe,
  Plus,
  TrashBin,
} from "@gravity-ui/icons";

/**
 * 1. Calendar & YearPicker Demo
 */
export function YearPicker() {
  return (
    <Calendar aria-label="Event date">
      <Calendar.Header>
        <Calendar.YearPickerTrigger>
          <Calendar.YearPickerTriggerHeading />
          <Calendar.YearPickerTriggerIndicator />
        </Calendar.YearPickerTrigger>
        <Calendar.NavButton slot="previous" />
        <Calendar.NavButton slot="next" />
      </Calendar.Header>
      <Calendar.Grid>
        <Calendar.GridHeader>
          {(day) => <Calendar.HeaderCell key={day}>{day}</Calendar.HeaderCell>}
        </Calendar.GridHeader>
        <Calendar.GridBody>{(date) => <Calendar.Cell key={date.toISOString()} date={date} />}</Calendar.GridBody>
      </Calendar.Grid>
      <Calendar.YearPickerGrid>
        <Calendar.YearPickerGridBody>
          {({year}) => <Calendar.YearPickerCell key={year} year={year} />}
        </Calendar.YearPickerGridBody>
      </Calendar.YearPickerGrid>
    </Calendar>
  );
}

/**
 * 2. Toast Variants Demo
 */
export function Variants() {
  return (
    <div className="flex h-full max-w-xl flex-col items-center justify-center">
      <div className="flex w-full flex-wrap items-center justify-center gap-4">
        <Button
          size="sm"
          variant="tertiary"
          onPress={() => {
            const id = toast("You have been invited to join a team", {
              actionProps: {
                children: "Dismiss",
                onPress: () => toast.close(id),
                variant: "tertiary",
              },
              description: "Bob sent you an invitation to join HeroUI team",
              indicator: <Persons />,
              variant: "default",
            });
          }}
        >
          Default toast
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            const id = toast.info("You have 2 credits left", {
              actionProps: {children: "Upgrade", onPress: () => toast.close(id)},
              description: "Get a paid plan for more credits",
            });
          }}
        >
          Accent toast
        </Button>
        <Button
          className="text-success-soft-foreground"
          size="sm"
          variant="tertiary"
          onPress={() => {
            const id = toast.success("You have upgraded your plan", {
              actionProps: {
                children: "Billing",
                className: "bg-success text-success-foreground",
                onPress: () => toast.close(id),
              },
              description: "You can continue using HeroUI Chat",
            });
          }}
        >
          Success toast
        </Button>
        <Button
          className="text-warning-soft-foreground"
          size="sm"
          variant="tertiary"
          onPress={() => {
            const id = toast.warning("You have no credits left", {
              actionProps: {
                children: "Upgrade",
                className: "bg-warning text-warning-foreground",
                onPress: () => toast.close(id),
              },
              description: "Upgrade to a paid plan to continue",
            });
          }}
        >
          Warning toast
        </Button>
        <Button
          size="sm"
          variant="danger-soft"
          onPress={() => {
            const id = toast.danger("Storage is full", {
              actionProps: {children: "Remove", onPress: () => toast.close(id), variant: "danger"},
              description:
                "Remove files to release space. Adding more text to demonstrate longer content display",
              indicator: <HardDrive />,
            });
          }}
        >
          Danger toast
        </Button>
      </div>
    </div>
  );
}

/**
 * 3. Toast Promise Demo
 */
const uploadFile = (): Promise<{filename: string; size: number}> => {
  return new Promise<{filename: string; size: number}>((resolve) => {
    setTimeout(() => resolve({filename: "document.pdf", size: 1024}), 2000);
  });
};

const createEvent = (): Promise<never> => {
  return new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Network error. Please try again.")), 2000);
  });
};

const saveData = (): Promise<{count: number}> => {
  return new Promise<{count: number}>((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.5) {
        resolve({count: 42});
      } else {
        reject(new Error("Failed to save data"));
      }
    }, 2000);
  });
};

const fetchUser = (): Promise<{name: string; email: string}> => {
  return new Promise<{name: string; email: string}>((resolve) => {
    setTimeout(() => resolve({email: "john@example.com", name: "John Doe"}), 2000);
  });
};

export function PromiseDemo() {
  return (
    <div className="flex h-full max-w-2xl flex-col items-center justify-center gap-8">
      {/* Promise API Section */}
      <div className="w-full space-y-3">
        <div className="text-center">
          <h3 className="text-sm font-medium">Using toast.promise()</h3>
          <p className="text-xs text-muted-foreground">
            Automatically handles loading, success, and error states
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-center gap-4">
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              toast.promise(uploadFile(), {
                error: "Failed to upload file",
                loading: "Uploading file...",
                success: (data) => `File ${data.filename} uploaded (${data.size}KB)`,
              });
            }}
          >
            Upload file
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              toast.promise(createEvent(), {
                error: (err) => err.message,
                loading: "Creating event...",
                success: "Event created",
              });
            }}
          >
            Create event (error)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              toast.promise(saveData(), {
                error: (err) => err.message,
                loading: "Saving changes...",
                success: (data) => `Saved ${data.count} items`,
              });
            }}
          >
            Save data (random)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              toast.promise(fetchUser(), {
                error: "Failed to fetch user",
                loading: "Loading user...",
                success: (data) => `Welcome back, ${data.name}!`,
              });
            }}
          >
            Fetch user
          </Button>
        </div>
      </div>

      {/* Manual Loading Section */}
      <div className="w-full space-y-3">
        <div className="text-center">
          <h3 className="text-sm font-medium">Manual Loading State</h3>
          <p className="text-xs text-muted-foreground">Manually control loading state with isLoading prop</p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-center gap-4">
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              const loadingId = toast("Uploading file...", {
                description: "Please wait while we upload your file",
                isLoading: true,
                timeout: 0,
              });

              setTimeout(() => {
                toast.update(loadingId, "File uploaded", {
                  description: "Your file has been uploaded successfully",
                  variant: "success",
                });
              }, 3000);
            }}
          >
            Upload with loading
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              const loadingId = toast("Processing payment...", {
                isLoading: true,
                timeout: 0,
              });

              setTimeout(() => {
                toast.update(loadingId, "Payment processed", {
                  description: "Your payment has been processed successfully",
                  variant: "success",
                });
              }, 2500);
            }}
          >
            Payment processing
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              const loadingId = toast("Saving changes...", {
                isLoading: true,
                timeout: 0,
              });

              setTimeout(() => {
                toast.update(loadingId, "Failed to save", {
                  description: "Please try again",
                  variant: "danger",
                });
              }, 2000);
            }}
          >
            Loading to error
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * 4. Tooltip Placement Demo
 */
export function TooltipPlacement() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div />
      <Tooltip delay={0}>
        <Button className="w-full" variant="tertiary">
          Top
        </Button>
        <Tooltip.Content showArrow placement="top">
          <Tooltip.Arrow />
          <p>Top placement</p>
        </Tooltip.Content>
      </Tooltip>
      <div />

      <Tooltip delay={0}>
        <Button className="w-full" variant="tertiary">
          Left
        </Button>
        <Tooltip.Content showArrow placement="left">
          <Tooltip.Arrow />
          <p>Left placement</p>
        </Tooltip.Content>
      </Tooltip>

      <div className="flex items-center justify-center">
        <span className="text-sm text-slate-400">Hover buttons</span>
      </div>

      <Tooltip delay={0}>
        <Button className="w-full" variant="tertiary">
          Right
        </Button>
        <Tooltip.Content showArrow placement="right">
          <Tooltip.Arrow />
          <p>Right placement</p>
        </Tooltip.Content>
      </Tooltip>

      <div />
      <Tooltip delay={0}>
        <Button className="w-full" variant="tertiary">
          Bottom
        </Button>
        <Tooltip.Content showArrow placement="bottom">
          <Tooltip.Arrow />
          <p>Bottom placement</p>
        </Tooltip.Content>
      </Tooltip>
      <div />
    </div>
  );
}

/**
 * 5. Tooltip Custom Trigger Demo
 */
export function TooltipCustomTrigger() {
  return (
    <div className="flex items-center gap-6">
      <Tooltip delay={0}>
        <Tooltip.Trigger aria-label="User avatar">
          <Avatar size="sm">
            <Avatar.Image
              alt="Jane Doe"
              src="https://img.heroui.chat/image/avatar?w=400&h=400&u=4"
            />
            <Avatar.Fallback>JD</Avatar.Fallback>
          </Avatar>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow>
          <Tooltip.Arrow />
          <div className="flex flex-col gap-0 py-1">
            <p className="font-semibold">Jane Doe</p>
            <p className="text-xs text-slate-400">jane@example.com</p>
          </div>
        </Tooltip.Content>
      </Tooltip>

      <Tooltip delay={0}>
        <Tooltip.Trigger aria-label="Status chip">
          <Chip color="success">
            <CircleCheckFill className="w-3 h-3" />
            <Chip.Label>Active</Chip.Label>
          </Chip>
        </Tooltip.Trigger>
        <Tooltip.Content className="flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <p>Jane is currently online</p>
        </Tooltip.Content>
      </Tooltip>

      <Tooltip delay={0}>
        <Tooltip.Trigger aria-label="Info icon">
          <div className="rounded-full bg-blue-50 dark:bg-blue-950 p-2">
            <CircleQuestion className="text-blue-600 dark:text-blue-400" />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow>
          <Tooltip.Arrow />
          <div className="max-w-xs px-1 py-1.5">
            <p className="mb-1 font-semibold">Help Information</p>
            <p className="text-sm text-slate-400">
              This is a helpful tooltip with more detailed information about this feature.
            </p>
          </div>
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}

/**
 * 6. Alert Basic Demo
 */
export function Basic() {
  return (
    <div className="grid w-full max-w-xl gap-4">
      {/* Default - General information */}
      <Alert>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>New features available</Alert.Title>
          <Alert.Description>
            Check out our latest updates including dark mode support and improved accessibility
            features.
          </Alert.Description>
        </Alert.Content>
      </Alert>

      {/* Accent - Important information with action */}
      <Alert status="accent">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Update available</Alert.Title>
          <Alert.Description>
            A new version of the application is available. Please refresh to get the latest features
            and bug fixes.
          </Alert.Description>
          <Button className="mt-2 sm:hidden" size="sm" variant="primary">
            Refresh
          </Button>
        </Alert.Content>
        <Button className="hidden sm:block" size="sm" variant="primary">
          Refresh
        </Button>
      </Alert>

      {/* Danger - Error with detailed steps */}
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Unable to connect to server</Alert.Title>
          <Alert.Description>
            We&apos;re experiencing connection issues. Please try the following:
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              <li>Check your internet connection</li>
              <li>Refresh the page</li>
              <li>Clear your browser cache</li>
            </ul>
          </Alert.Description>
          <Button className="mt-2 sm:hidden" size="sm" variant="danger">
            Retry
          </Button>
        </Alert.Content>
        <Button className="hidden sm:block" size="sm" variant="danger">
          Retry
        </Button>
      </Alert>

      {/* Without description */}
      <Alert status="success">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Profile updated successfully</Alert.Title>
        </Alert.Content>
        <CloseButton />
      </Alert>

      {/* Custom indicator - Loading state */}
      <Alert status="accent">
        <Alert.Indicator>
          <Spinner size="sm" />
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Title>Processing your request</Alert.Title>
          <Alert.Description>
            Please wait while we sync your data. This may take a few moments.
          </Alert.Description>
        </Alert.Content>
      </Alert>

      {/* Without close button */}
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Scheduled maintenance</Alert.Title>
          <Alert.Description>
            Our services will be unavailable on Sunday, March 15th from 2:00 AM to 6:00 AM UTC for
            scheduled maintenance.
          </Alert.Description>
        </Alert.Content>
      </Alert>
    </div>
  );
}

/**
 * 7. Statuses AlertDialog Demo
 */
export function Statuses() {
  const examples = [
    {
      actions: {
        cancel: "Stay Signed In",
        confirm: "Sign Out",
      },
      body: "You'll need to sign in again to access your account. Any unsaved changes will be lost.",
      classNames: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
      header: "Sign out of your account?",
      status: "accent",
      trigger: "Sign Out",
    },
    {
      actions: {
        cancel: "Not Yet",
        confirm: "Mark Complete",
      },
      body: "This will mark the task as complete and notify all team members. The task will be moved to your completed list.",
      classNames: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      header: "Complete this task?",
      status: "success",
      trigger: "Complete Task",
    },
    {
      actions: {
        cancel: "Keep Editing",
        confirm: "Discard",
      },
      body: "You have unsaved changes that will be permanently lost. Are you sure you want to discard them?",
      classNames: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      header: "Discard unsaved changes?",
      status: "warning",
      trigger: "Discard Changes",
    },
    {
      actions: {
        cancel: "Cancel",
        confirm: "Delete Account",
      },
      body: "This will permanently delete your account and remove all your data from our servers. This action is irreversible.",
      classNames: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
      header: "Delete your account?",
      status: "danger",
      trigger: "Delete Account",
    },
  ] as const;

  return (
    <div className="flex flex-wrap gap-4">
      {examples.map(({actions, body, classNames, header, status, trigger}) => (
        <AlertDialog key={status}>
          <Button className={classNames}>{trigger}</Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status={status as any} />
                  <AlertDialog.Heading>{header}</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>{body}</p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">
                    {actions.cancel}
                  </Button>
                  <Button slot="close" variant={status === "danger" ? "danger" : "primary"}>
                    {actions.confirm}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      ))}
    </div>
  );
}

/**
 * 8. Button WithIcons Demo
 */
export function WithIcons() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button>
        <Globe />
        <span>Search</span>
      </Button>
      <Button variant="secondary">
        <Plus />
        <span>Add Member</span>
      </Button>
      <Button variant="tertiary">
        <Envelope />
        <span>Email</span>
      </Button>
      <Button variant="danger">
        <TrashBin />
        <span>Delete</span>
      </Button>
    </div>
  );
}
