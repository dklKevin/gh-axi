import { AxiError } from "./errors.js";

/** Global opt-in for gated write, secret, API, mutate, and gist-delete operations. */
export const ALLOW_WRITES_FLAG = "--allow-writes";

export type GatedKind =
  | "secret"
  | "api"
  | "repo-mutate"
  | "workflow-mutate"
  | "gist-delete";

const REPO_MUTATE = new Set(["create", "edit", "fork"]);
const WORKFLOW_MUTATE = new Set(["run", "enable", "disable"]);

const MESSAGES: Record<GatedKind, string> = {
  secret: "Actions secrets require an explicit --allow-writes flag",
  api: "Raw GitHub API access requires an explicit --allow-writes flag",
  "repo-mutate":
    "Repository create, edit, and fork require an explicit --allow-writes flag",
  "workflow-mutate":
    "Workflow run, enable, and disable require an explicit --allow-writes flag",
  "gist-delete": "gist delete requires an explicit --allow-writes flag",
};

const SUGGESTIONS = [
  "Pass --allow-writes after the command if you intend this operation",
  "Authenticate gh with a fine-grained personal access token that grants only the repositories and permissions you need",
];

/**
 * First non-flag token. Global flags are already stripped before this runs,
 * so the subcommand is the first positional for repo/workflow/gist.
 */
export function firstPositional(args: string[]): string | undefined {
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--") {
      return args[index + 1];
    }
    if (!arg.startsWith("-")) {
      return arg;
    }
  }
  return undefined;
}

/** Classify a command invocation that must not run without --allow-writes. */
export function gatedKind(
  command: string | undefined,
  args: string[],
): GatedKind | undefined {
  if (command === "secret") {
    return "secret";
  }
  if (command === "api") {
    return "api";
  }
  if (command === "repo") {
    const sub = firstPositional(args);
    if (sub !== undefined && REPO_MUTATE.has(sub)) {
      return "repo-mutate";
    }
    return undefined;
  }
  if (command === "workflow") {
    const sub = firstPositional(args);
    if (sub !== undefined && WORKFLOW_MUTATE.has(sub)) {
      return "workflow-mutate";
    }
    return undefined;
  }
  if (command === "gist" && firstPositional(args) === "delete") {
    return "gist-delete";
  }
  return undefined;
}

export function assertWritesAllowed(
  command: string | undefined,
  args: string[],
  allowWrites: boolean,
): void {
  const kind = gatedKind(command, args);
  if (kind === undefined || allowWrites) {
    return;
  }
  throw new AxiError(MESSAGES[kind], "VALIDATION_ERROR", SUGGESTIONS);
}
