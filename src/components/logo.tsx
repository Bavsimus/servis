/**
 * Geçici logo: kırmızı CANTÜRK yazısı.
 * Gerçek logo dosyası gelince public/logo.svg olarak ekleyip burada <img> ile değiştirin.
 */
export function Logo({ className = "", withTagline = false }: { className?: string; withTagline?: boolean }) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className="font-display text-[1.35em] font-extrabold tracking-[0.08em] text-brand">CANTÜRK</span>
      {withTagline && (
        <span className="mt-1 text-[0.55em] font-medium tracking-[0.32em] text-muted">TURİZM · TAŞIMACILIK</span>
      )}
    </span>
  );
}
