/**
 * Centralized copy for the arctl UI.
 * All user-facing strings live here — import COPY wherever text is rendered.
 */

export const COPY = {
  brand: {
    name: "arctl",
    logo: "> ./arctl",
    tagline: "Command the swarm.",
  },

  auth: {
    heading: "> ./arctl",
    subheading: "Command the swarm.",
    signIn: "Authenticate via Netlify",
    signOut: "Disconnect",
    comingSoon: {
      heading: "Access Restricted",
      greeting: (name: string) => `Identified: ${name}`,
      message:
        "This terminal is not yet authorized for your credentials. Standby for clearance.",
      signOut: "Disconnect",
    },
  },

  nav: {
    board: "Active Ops",
    archive: "Archive",
    keys: "Credentials",
    settings: "Config",
    collapse: "Collapse",
    expand: "Expand menu",
  },

  columns: {
    new: { title: "QUEUED" },
    running: { title: "IN PROGRESS" },
    done: { title: "REVIEW" },
    pr_open: { title: "PR OPEN" },
    pr_merged: { title: "PR MERGED" },
    error: { title: "FAULT" },
  } as Record<string, { title: string }>,

  board: {
    newRun: "New Operation",
    noRuns: "No active operations.",
    unknownSite: "Unknown Target",
    untitledRun: "Untitled Operation",
    allSites: "All Targets",
    clearFilter: "Clear target filter",
    filterLabel: "Filter by target",
  },

  card: {
    checksPass: "Checks passed",
    checksFail: "Checks failing",
    checksRunning: "Checks in progress",
    prOutdated: "PR stale",
  },

  detail: {
    loading: "Loading...",
    viewOnNetlify: "View on Netlify",
    site: "Target",
    branch: "Branch",
    created: "Created",
    updated: "Updated",
    links: "Links",
    viewPr: "View Pull Request",
    deployPreview: "Deploy Preview",
    sessions: (count: number) => `Directives (${count})`,
    loadingSessions: "Loading directives...",
    noSessions: "No directives issued.",
    addSession: "+ Add Follow-up Directive",
    notes: (count: number) => `Field Notes (${count})`,
    addNote: "+ Log Note",
    showMore: "Show more",
    showLess: "Show less",
    notInPr: "Not in PR",
    createPr: "Open PR",
    creatingPr: "Opening PR...",
    prCreated: "PR Opened",
    updatePr: "Update PR",
    updatingPr: "Updating PR...",
    prUpdated: "PR Updated",
    archive: "Archive",
    mergePr: "Merge PR",
    mergingPr: "Merging...",
    prMerged: "PR Merged",
    failedMergePr: "Failed to merge PR",
    mergeDisabledChecks: "Checks must pass before merging",
    mergeDisabledConflicts: "Resolve conflicts before merging",
    failedCreatePr: "Failed to open PR",
    failedUpdatePr: "Failed to update PR",
  },

  prStatus: {
    heading: "PR Status",
    loading: "Checking PR status...",
    readyToMerge: "Ready to merge",
    checksFailing: "Checks failing",
    checksRunning: "Checks in progress",
    changesRequested: "Changes requested",
    checksPassing: "Checks passed",
    approved: "Approved",
    reviewPending: "Review pending",
    noConflicts: "No conflicts",
    hasConflicts: "Has conflicts",
    viewAll: "View all",
    passing: (n: number) => `${n} passing`,
    failing: (n: number) => `, ${n} failing`,
    pending: (n: number) => `, ${n} pending`,
    details: "Details",
  },

  states: {
    NEW: { label: "Queued" },
    RUNNING: { label: "Active" },
    DONE: { label: "Complete" },
    ERROR: { label: "Fault" },
  } as Record<string, { label: string }>,

  createRun: {
    title: "New Operation",
    branch: "Branch (optional)",
    branchPlaceholder: "e.g., feature/my-branch",
    agent: "Agent",
    prompt: "Directive",
    promptPlaceholder: "Describe the operation...",
    submit: "Create",
    submitting: "Creating...",
    cancel: "Cancel",
    error: "Failed to create operation",
  },

  addSession: {
    placeholder: "Enter follow-up directive...",
    submit: "Transmit",
    submitting: "Transmitting...",
    cancel: "Cancel",
    error: "Failed to transmit directive",
  },

  addNote: {
    placeholder: "Log a field note...",
    submit: "Log Note",
    submitting: "Logging...",
    cancel: "Cancel",
    error: "Failed to log note",
  },

  archive: {
    emptyTitle: "Archive Empty",
    emptyMessage: "Archived operations will appear here.",
    colTitle: "Title",
    colSite: "Target",
    colState: "State",
    colCreated: "Created",
    colArchived: "Archived",
    colLinks: "Links",
    colActions: "Actions",
    restore: "Restore",
    pr: "PR",
    preview: "Preview",
    untitled: "Untitled Operation",
    unknownSite: "Unknown",
  },

  settings: {
    heading: "Sync Configuration",
    description:
      "Enable targets for operational sync. Only active targets will be scanned during sweep cycles.",
    siteCount: (enabled: number, total: number) =>
      `${enabled} of ${total} targets active`,
    noSites: "No targets found. Targets will appear here after loading.",
  },

  sync: {
    lastSync: "Last sweep:",
    nextSync: "Next:",
    refresh: "Force sweep (resets backoff)",
  },

  apiKeys: {
    heading: "Credentials",
    description: "Scoped credentials for agent access to the Netlify API",
    newKey: "Issue Credential",
    createTitle: "Issue New Credential",
    noKeys: "No credentials issued. Create one to get started.",
    keyName: "Credential Name",
    keyNamePlaceholder: "e.g. CI Agent Key",
    site: "Target",
    sitePlaceholder: "Select a target...",
    scopes: "Scopes",
    scopeRead: "Read",
    scopeReadDesc: "List and view runners, sessions, and diffs",
    scopeWrite: "Write",
    scopeWriteDesc: "Create, update, and stop runners and sessions",
    scopeDeploy: "Deploy",
    scopeDeployDesc: "Create PRs, commit to branches, redeploy",
    riskLow: "Low",
    riskMed: "Medium",
    riskHigh: "High",
    expiration: "Expiration",
    createSubmit: "Issue Credential",
    creating: "Issuing...",
    statusActive: "Active",
    statusRevoked: "Revoked",
    statusExpired: "Expired",
    revoke: "Revoke",
    revoking: "Revoking...",
    revealTitle: "Credential Issued",
    revealWarning: "Copy this credential now. You won't be able to see it again.",
    copy: "Copy Credential",
    copied: "Copied",
    done: "Done",
    created: (date: string) => `Created ${date}`,
    lastUsed: (date: string) => `Last used ${date}`,
  },

  session: {
    viewDiff: "View Diff",
    hideDiff: "Hide Diff",
    loadingDiff: "Loading diff...",
    noDiff: "No diff available",
    result: "Result",
    hideResult: "Hide result",
    duration: (seconds: number) => {
      if (seconds < 60) return `${seconds}s`;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    },
  },

  generic: {
    cancel: "Cancel",
    loading: "Loading...",
    error: "Something went wrong.",
    close: "Close",
    never: "Never",
  },
} as const;
