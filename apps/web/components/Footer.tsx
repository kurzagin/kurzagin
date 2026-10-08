export default function Footer({ visits = 0 }: { visits?: number }) {
  const displayVisits = String(visits).padStart(6, '0');

  return (
    <footer>
      <div className="footer-left">kurzagin — 2026</div>
      <div className="retro-counter" aria-label={`${visits} total visits`}>
        <span className="retro-counter-label">VISITORS</span>
        <span className="retro-counter-number">{displayVisits}</span>
        <span className="retro-counter-since">SINCE 2026</span>
      </div>
      <div className="footer-right">クルザギン</div>
    </footer>
  );
}
