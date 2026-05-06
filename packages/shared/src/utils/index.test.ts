import {
  slugify,
  paginate,
  pick,
  omit,
  isValidEmail,
  isValidUsername,
  truncate,
  formatBytes,
} from "./index";

// ─── slugify ──────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("lowercases the text", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("foo bar baz")).toBe("foo-bar-baz");
  });

  it("removes non-word characters except hyphens", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("collapses multiple hyphens/spaces", () => {
    expect(slugify("foo   bar---baz")).toBe("foo-bar-baz");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("-hello-")).toBe("hello");
  });

  it("handles underscores as separators", () => {
    expect(slugify("foo_bar")).toBe("foo-bar");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });

  it("handles already-slugified input unchanged", () => {
    expect(slugify("already-slug")).toBe("already-slug");
  });
});

// ─── paginate ─────────────────────────────────────────────────────────────────

describe("paginate", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("returns the first page", () => {
    const result = paginate(items, 1, 3);
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(3);
    expect(result.total).toBe(10);
    expect(result.totalPages).toBe(4);
  });

  it("returns a middle page", () => {
    const result = paginate(items, 2, 3);
    expect(result.items).toEqual([4, 5, 6]);
  });

  it("returns a partial last page", () => {
    const result = paginate(items, 4, 3);
    expect(result.items).toEqual([10]);
    expect(result.totalPages).toBe(4);
  });

  it("returns empty items for a page beyond the data", () => {
    const result = paginate(items, 5, 3);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(10);
  });

  it("handles an empty array", () => {
    const result = paginate([], 1, 10);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("calculates totalPages correctly when items divide evenly", () => {
    const result = paginate([1, 2, 3, 4], 1, 2);
    expect(result.totalPages).toBe(2);
  });
});

// ─── pick ─────────────────────────────────────────────────────────────────────

describe("pick", () => {
  it("picks the specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ["a", "c"])).toEqual({ a: 1, c: 3 });
  });

  it("returns an empty object when keys array is empty", () => {
    expect(pick({ a: 1 }, [])).toEqual({});
  });

  it("does not include keys not in the object (undefined values)", () => {
    const obj = { a: 1 } as { a: number; b?: number };
    const result = pick(obj, ["a", "b"]);
    expect(result).toEqual({ a: 1, b: undefined });
  });
});

// ─── omit ─────────────────────────────────────────────────────────────────────

describe("omit", () => {
  it("omits the specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ["b"])).toEqual({ a: 1, c: 3 });
  });

  it("returns a copy of the original when keys array is empty", () => {
    const obj = { a: 1, b: 2 };
    expect(omit(obj, [])).toEqual({ a: 1, b: 2 });
  });

  it("does not mutate the original object", () => {
    const obj = { a: 1, b: 2 };
    omit(obj, ["a"]);
    expect(obj).toEqual({ a: 1, b: 2 });
  });
});

// ─── isValidEmail ─────────────────────────────────────────────────────────────

describe("isValidEmail", () => {
  it("returns true for a valid email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("returns true for emails with subdomains", () => {
    expect(isValidEmail("user@mail.example.co.uk")).toBe(true);
  });

  it("returns false when there is no @", () => {
    expect(isValidEmail("notanemail")).toBe(false);
  });

  it("returns false when there is no domain part", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("returns false when there is a space in the email", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
  });
});

// ─── isValidUsername ──────────────────────────────────────────────────────────

describe("isValidUsername", () => {
  it("returns true for a valid alphanumeric username", () => {
    expect(isValidUsername("JohnDoe")).toBe(true);
  });

  it("returns true for a username with underscores and hyphens", () => {
    expect(isValidUsername("john_doe-99")).toBe(true);
  });

  it("returns false for a username that is too short (< 3 chars)", () => {
    expect(isValidUsername("ab")).toBe(false);
  });

  it("returns false for a username that is too long (> 32 chars)", () => {
    expect(isValidUsername("a".repeat(33))).toBe(false);
  });

  it("returns false for a username with spaces", () => {
    expect(isValidUsername("john doe")).toBe(false);
  });

  it("returns false for a username with special characters", () => {
    expect(isValidUsername("john@doe")).toBe(false);
  });

  it("returns true for minimum-length username (3 chars)", () => {
    expect(isValidUsername("abc")).toBe(true);
  });

  it("returns true for maximum-length username (32 chars)", () => {
    expect(isValidUsername("a".repeat(32))).toBe(true);
  });
});

// ─── truncate ─────────────────────────────────────────────────────────────────

describe("truncate", () => {
  it("returns the original string when shorter than maxLength", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns the original string when equal to maxLength", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates and appends '...' when longer than maxLength", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });

  it("returns only '...' when maxLength is 3", () => {
    expect(truncate("hello", 3)).toBe("...");
  });

  it("handles empty string", () => {
    expect(truncate("", 5)).toBe("");
  });
});

// ─── formatBytes ──────────────────────────────────────────────────────────────

describe("formatBytes", () => {
  it("returns '0 B' for 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes under 1 KB", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
  });

  it("formats fractional values with up to 2 decimal places", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });
});
