export function NusaLogo({ className = "h-9 w-9", alt = "Logo NUSA" }) {
  return (
    <img
      src="/nusa-logo.png"
      alt={alt}
      data-testid="nusa-logo-img"
      className={`${className} shrink-0 select-none object-contain`}
      draggable="false"
    />
  );
}
