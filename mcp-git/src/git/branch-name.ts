export function slugifyBranchName(task: string, prefix = "feature"): string {
  const slug = task
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${prefix}/${slug || "change"}`;
}

export function branchPrefixForKind(kind: "test" | "feature" | "fix"): string {
  switch (kind) {
    case "test":
      return "test";
    case "fix":
      return "fix";
    default:
      return "feature";
  }
}
