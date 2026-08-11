// Avatar: mostra a foto se houver, senão as iniciais num círculo.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}

export function Avatar({
  name,
  src,
  size = 32,
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const dim = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        style={dim}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      style={dim}
      className={`grid shrink-0 place-items-center rounded-full bg-brand/15 text-brand ${className}`}
    >
      <span style={{ fontSize: size * 0.4 }} className="font-semibold">
        {initials(name)}
      </span>
    </div>
  );
}
