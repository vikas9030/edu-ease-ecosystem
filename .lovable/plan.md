

# Fix: Use IST (Indian Standard Time) for All Notification Timestamps

## Current State
- **NotificationsPage** (`src/components/notifications/NotificationsPage.tsx`): Already uses IST via `toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })` — no change needed.
- **NotificationBell** (`src/components/NotificationBell.tsx`): Uses raw `Date.now()` without IST conversion — needs fix.

## Changes

### 1. Update `NotificationBell.tsx` — `timeAgo` function (line ~118-123)

Replace the current `timeAgo` function with IST-aware logic matching `NotificationsPage`:

```typescript
const timeAgo = (dateStr: string) => {
  const istDate = new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const seconds = Math.floor((nowIST.getTime() - istDate.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(dateStr).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
};
```

This is a single-file, single-function change.

