export default function Logo({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/logo.png"
      alt="TaniyAI logo"
      width={size}
      height={size}
      className={`rounded-sm ${className}`}
      style={{ objectFit: "contain" }}
    />
  );
}
