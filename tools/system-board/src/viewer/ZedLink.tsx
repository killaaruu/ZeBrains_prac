type Props = { path: string; line?: number; label: string };

/** Builds a zed://file/<abs-path>[:line] deep link. */
export function zedHref(path: string, line?: number): string {
  if (!path.startsWith("/")) {
    console.warn(`[ZedLink] expected absolute path, got: ${path}`);
  }
  const normalized = path.replace(/^\//, "");
  return `zed://file/${normalized}${line != null ? `:${line}` : ""}`;
}

export function ZedLink({ path, line, label }: Props) {
  return (
    <a className="sb-zed" href={zedHref(path, line)} title={path}>
      {label} ↗
    </a>
  );
}
