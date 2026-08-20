import { describe, expect, it } from "vitest";
import { AxiError } from "../src/errors.js";
import {
  ALLOW_WRITES_FLAG,
  assertWritesAllowed,
  firstPositional,
  gatedKind,
} from "../src/writeGuard.js";

describe("firstPositional", () => {
  it("returns the first non-flag token", () => {
    expect(firstPositional(["delete", "abc123"])).toBe("delete");
    expect(firstPositional(["--public", "create", "demo"])).toBe("create");
  });

  it("honors an explicit -- terminator", () => {
    expect(firstPositional(["--", "run", "ci.yml"])).toBe("run");
  });

  it("returns undefined when only flags are present", () => {
    expect(firstPositional(["--public"])).toBeUndefined();
    expect(firstPositional([])).toBeUndefined();
  });
});

describe("gatedKind", () => {
  it("gates every secret invocation", () => {
    expect(gatedKind("secret", ["list"])).toBe("secret");
    expect(gatedKind("secret", ["set", "NAME"])).toBe("secret");
    expect(gatedKind("secret", ["delete", "NAME"])).toBe("secret");
    expect(gatedKind("secret", [])).toBe("secret");
  });

  it("gates every api invocation", () => {
    expect(gatedKind("api", ["GET", "/repos/{owner}/{repo}"])).toBe("api");
    expect(gatedKind("api", ["/repos/{owner}/{repo}"])).toBe("api");
    expect(gatedKind("api", [])).toBe("api");
  });

  it("gates repo create, edit, and fork only", () => {
    expect(gatedKind("repo", ["create", "demo"])).toBe("repo-mutate");
    expect(gatedKind("repo", ["edit"])).toBe("repo-mutate");
    expect(gatedKind("repo", ["fork"])).toBe("repo-mutate");
    expect(gatedKind("repo", ["view"])).toBeUndefined();
    expect(gatedKind("repo", ["list"])).toBeUndefined();
    expect(gatedKind("repo", ["clone", "owner/name"])).toBeUndefined();
  });

  it("gates workflow run, enable, and disable only", () => {
    expect(gatedKind("workflow", ["run", "ci.yml"])).toBe("workflow-mutate");
    expect(gatedKind("workflow", ["enable", "ci.yml"])).toBe("workflow-mutate");
    expect(gatedKind("workflow", ["disable", "ci.yml"])).toBe(
      "workflow-mutate",
    );
    expect(gatedKind("workflow", ["list"])).toBeUndefined();
    expect(gatedKind("workflow", ["view", "ci.yml"])).toBeUndefined();
  });

  it("gates gist delete only", () => {
    expect(gatedKind("gist", ["delete", "abc123"])).toBe("gist-delete");
    expect(gatedKind("gist", ["list"])).toBeUndefined();
    expect(gatedKind("gist", ["view", "abc123"])).toBeUndefined();
    expect(gatedKind("gist", ["create", "notes.md", "--public"])).toBeUndefined();
  });

  it("does not gate ordinary reads or writes", () => {
    expect(gatedKind("issue", ["create", "--title", "x"])).toBeUndefined();
    expect(gatedKind("pr", ["merge", "1"])).toBeUndefined();
    expect(gatedKind("search", ["issues", "bug"])).toBeUndefined();
    expect(gatedKind(undefined, [])).toBeUndefined();
  });
});

describe("assertWritesAllowed", () => {
  it("is a no-op when the operation is not gated or the flag is present", () => {
    expect(() => assertWritesAllowed("issue", ["list"], false)).not.toThrow();
    expect(() => assertWritesAllowed("secret", ["list"], true)).not.toThrow();
    expect(() =>
      assertWritesAllowed("api", ["/user"], true),
    ).not.toThrow();
  });

  it("throws VALIDATION_ERROR with a fine-grained PAT hint", () => {
    try {
      assertWritesAllowed("secret", ["list"], false);
      throw new Error("expected assertWritesAllowed to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AxiError);
      const err = error as AxiError;
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.message).toContain(ALLOW_WRITES_FLAG);
      expect(err.suggestions.some((line) => line.includes(ALLOW_WRITES_FLAG))).toBe(
        true,
      );
      expect(
        err.suggestions.some((line) =>
          line.includes("fine-grained personal access token"),
        ),
      ).toBe(true);
    }
  });
});
