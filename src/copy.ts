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
    board: "Ops Board",
    archive: "Cold Storage",
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
    newRun: "Deploy Asset",
    noRuns: "No active operations.",
    unknownSite: "Unknown Target",
    untitledRun: "Untitled Operation",
    allSites: "All Targets",
    clearFilter: "Clear target filter",
    filterLabel: "Filter by target",
  },

  card: {
    checksPass: "Checks nominal",
    checksFail: "Checks failing",
    checksRunning: "Checks in progress",
    prOutdated: "PR stale",
  },

  detail: {
    loading: "Establishing uplink...",
    viewOnNetlify: "View on Netlify",
    site: "Target",
    branch: "Branch",
    created: "Deployed",
    updated: "Last Signal",
    links: "Uplinks",
    viewPr: "View Pull Request",
    deployPreview: "Deploy Preview",
    sessions: (count: number) => `Directives (${count})`,
    loadingSessions: "Loading directives...",
    noSessions: "No directives issued.",
    addSession: "+ Issue Follow-up Directive",
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
    archive: "Decommission",
    failedCreatePr: "Failed to open PR",
    failedUpdatePr: "Failed to update PR",
  },

  prStatus: {
    heading: "PR Status",
    loading: "Checking PR status...",
    readyToMerge: "Clear for merge",
    checksFailing: "Checks failing",
    checksRunning: "Checks in progress",
    changesRequested: "Changes requested",
    checksPassing: "Checks nominal",
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
    title: "Deploy New Asset",
    branch: "Branch (optional)",
    branchPlaceholder: "e.g., feature/my-branch",
    agent: "Agent",
    prompt: "Directive",
    promptPlaceholder: "Describe the operation...",
    submit: "Deploy",
    submitting: "Deploying...",
    cancel: "Abort",
    error: "Failed to deploy asset",
  },

  addSession: {
    placeholder: "Enter follow-up directive...",
    submit: "Transmit",
    submitting: "Transmitting...",
    cancel: "Abort",
    error: "Failed to transmit directive",
  },

  addNote: {
    placeholder: "Log a field note...",
    submit: "Log Note",
    submitting: "Logging...",
    cancel: "Abort",
    error: "Failed to log note",
  },

  archive: {
    emptyTitle: "Cold Storage Empty",
    emptyMessage: "Decommissioned assets will appear here.",
    colTitle: "Title",
    colSite: "Target",
    colState: "State",
    colCreated: "Deployed",
    colArchived: "Decommissioned",
    colLinks: "Uplinks",
    colActions: "Actions",
    restore: "Reactivate",
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

  generic: {
    abort: "Abort",
    loading: "Establishing uplink...",
    error: "Connection severed.",
    close: "Close",
    never: "Never",
  },
} as const;
