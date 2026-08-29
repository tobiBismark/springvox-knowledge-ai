export function AppPageHeader({
  title,
  subtitle,
  aside,
}: {
  // `eyebrow` is intentionally ignored: the top bar already shows the page
  // name, so rendering it again here created a duplicate title on every page.
  eyebrow?: string;
  title: string;
  subtitle: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="admin-hero-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="admin-hero-title wrap-anywhere">{title}</h1>
          <p className="admin-hero-copy max-w-full wrap-anywhere">{subtitle}</p>
        </div>
        {aside ? (
          <div className="w-full shrink-0 lg:w-auto">{aside}</div>
        ) : null}
      </div>
    </div>
  );
}
