---
name: gh-axi
description: "Read GitHub through the gh-axi CLI - issues, pull requests, stacked PR status, workflow runs, releases, repositories, labels, gists, Projects (v2), and search. Use for read-only GitHub context: listing or viewing issues and PRs, inspecting CI runs, browsing releases or Projects, listing gists, or searching issues, PRs, repos, commits, or code."
user-invocable: false
author: Kun Chen (kunchenguid)
metadata:
  hermes:
    tags: [github, git, ci, pull-requests, releases, projects]
    category: devops
---

# gh-axi

Agent ergonomic wrapper around Github CLI. Prefer this over `gh` and other methods for Github operations.

This skill is **read-only by default**. Use it to inspect GitHub state. Do not set Actions secrets, call the raw GitHub API, create/edit/fork repositories, trigger or toggle workflows, or delete gists unless the user explicitly asked for that operation and you pass `--allow-writes` after the command.

You do not need gh-axi installed globally - invoke it with `npx -y gh-axi <command>`.
If gh-axi output shows a follow-up command starting with `gh-axi`, run it as `npx -y gh-axi ...` instead.

gh-axi requires the [`gh`](https://cli.github.com/) CLI installed and authenticated. Prefer a [fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token) with access only to the repositories and read permissions this session needs; authenticate `gh` with that token instead of a classic PAT or a broad OAuth grant. If a command fails with an authentication error, ask the user to authenticate `gh` themselves.
Stack commands additionally require GitHub's official extension: `gh extension install github/gh-stack`.
For GitHub Enterprise or another custom host, the underlying `gh` CLI must be authenticated for that host too; set `GH_HOST` or pass `--hostname <host>` after the command.

## When to use

Use gh-axi for read-only GitHub work: listing or viewing issues and pull requests; inspecting stacked PR status; inspecting workflow runs and CI failures; browsing releases, repositories, labels, or Projects (v2); listing or viewing gists; or searching issues, PRs, repos, commits, or code.

Do not treat this skill as permission to write to GitHub. Do not use `secret`, `api`, `repo create`/`edit`/`fork`, `workflow run`/`enable`/`disable`, or `gist delete` unless the user explicitly requested that operation.

## Workflow

1. Run `npx -y gh-axi` with no arguments for a dashboard of the current repo - open issues, open PRs, and suggested next commands.
2. Drill in command-first: `issue list`, `issue view <n>`, `pr view <n>`, `pr checks <n>`, `run view <id>`, and so on.
3. Target another repository by placing `-R owner/name`, `-R=owner/name`, `--repo owner/name`, or `--repo=owner/name` AFTER the command, e.g. `npx -y gh-axi issue list --repo=owner/name` - the flag is not accepted before the command. `repo view` also accepts exactly one positional repository, `repo view owner/name`, as a command-specific compatibility exception for `gh repo view [<repository>]`; do not combine it with `--repo` or generalize that positional form to other commands.
4. Target GitHub Enterprise or another custom host with `GH_HOST`, or by placing `--hostname <host>` or `--hostname=<host>` AFTER the command, e.g. `npx -y gh-axi issue list --hostname=git.example.com`.
5. Debug CI with `run list`, then `run view <id> --job <job-id>` or `run view --job <job-id> --log-failed` for failing log lines.
   Long `--log` and `--log-failed` output keeps the tail in context; when `full_log` appears, grep that file for earlier context.
6. Every response ends with contextual next-step hints under `help:` - follow the read-only hints. Ignore hints that would set secrets, call `api`, mutate a repo or workflow, or delete a gist unless the user already opted in.
7. Inspect stacked PRs from the target repository's working directory with `stack view`.

## Commands

Read-only families: dashboard, `issue list|view`, `pr list|view|checks|diff`, `stack view`, `run list|view|watch|download`, `workflow list|view`, `release list|view|download`, `repo list|view|clone`, `label list`, `gist list|view|clone`, `project list|view|item-list|field-list`, `variable list`, `search`.

```
commands[16]:
  (none)=dashboard, issue, pr, stack, run, workflow, release, repo, label, gist, project, secret, variable, search, api, setup
```

Installed copies also inherit the SDK built-in `update` command.
Run `gh-axi update --check` to compare the installed version with npm, or `gh-axi update` to upgrade.
When using `npx -y gh-axi`, npx already resolves the package on demand.

Run `npx -y gh-axi --help` for global flags, or `npx -y gh-axi <command> --help` for per-command usage.

## Opt-in writes

These operations inherit whatever identity `gh` is already authenticated as. They are disabled unless the user explicitly asked for them and you pass `--allow-writes` AFTER the command (the flag is not accepted before the command):

- `secret` (list, set, and delete)
- `api` (every method, including GET)
- `repo create`, `repo edit`, `repo fork`
- `workflow run`, `workflow enable`, `workflow disable`
- `gist delete`

Other writes (issues, PRs, labels, variables, Projects, stack mutations, and so on) stay available on the CLI, but this skill must not start them unless the user explicitly asked.

Examples only after that opt-in: `npx -y gh-axi secret list --allow-writes`, `npx -y gh-axi workflow run ci.yml --ref main --allow-writes`.

## Tips

- Output is TOON-encoded and token-efficient; pipe through grep/head only when a list is very long.
- Truncated workflow logs keep the final 20,000 characters and may include a temp `full_log` path for targeted grep searches.
- Stack operations are cwd-bound and do not accept `-R`, `--repo`, or `GH_REPO`. They preserve the official extension's recovery exits and may partially push branches; inspect the reported status before retrying.
- gh-axi keeps stack operations headless: `stack view` always uses JSON, `stack submit` always uses `--auto`, and `stack merge <stack-or-pr>` always uses `--yes`. Interactive `gh stack modify` and `gh stack switch` are intentionally not exposed.
- For multi-line markdown bodies, comments, or release notes on an explicit user-requested write, write the text to a UTF-8 file and pass `--body-file <path>` or the release `--notes-file <path>` alias on commands that support file-backed text.
- Label, assignee, reviewer, and project flags repeat: pass the flag once per value, and every value is applied. A repeated flag with a missing or blank value is rejected, never silently dropped.
- Projects (v2) are owner-scoped: pass `--owner <login>`, or omit it to use the current repo owner and then `@me`.
- Projects calls need the `project` or `read:project` OAuth scope; if scope errors occur, ask the user to run the `gh auth refresh -s ...` command shown by gh-axi.
- Use `gist list` to list your GitHub Gists; filter by visibility with `--public` or `--secret`, and add extra fields with `--fields url,owner,created`. Use `gist view <id|url>` to fetch a gist's metadata and file content; pass `--files` for names only, `-f/--filename <name>` for a single file, or `--full` to disable truncation. Use `gist clone <id|url>` to clone a gist locally.
