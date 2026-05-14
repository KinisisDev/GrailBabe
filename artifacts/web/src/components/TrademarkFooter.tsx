export function TrademarkFooter() {
  return (
    <footer className="border-t border-border/60 px-4 md:px-8 py-4 text-[11px] leading-relaxed text-muted-foreground">
      <p>
        © {new Date().getFullYear()} KinisisLabs LLC. KinisisLabs LLC does not own or claim any
        copyright, trademark, or other intellectual-property rights in any trading card games (TCG),
        LEGO products, or sports-related properties referenced on this platform. All product names,
        logos, brands, characters, and related marks are the property of their respective owners.
        Use of these names, logos, and brands does not imply endorsement or affiliation.
      </p>
    </footer>
  );
}
