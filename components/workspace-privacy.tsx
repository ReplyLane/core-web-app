import Link from "next/link";

export function WorkspacePrivacy() {
  return (
    <section className="panel" style={{ marginTop: 22 }} aria-labelledby="workspace-privacy-title">
      <h2 id="workspace-privacy-title">Your data and privacy</h2>
      <p>Read how Replylane uses your Instagram information, manage access, or request deletion.</p>
      <nav aria-label="Privacy and support" style={{ display: "flex", flexWrap: "wrap", gap: 20, margin: "18px 0" }}>
        <Link className="text-btn" href="/privacy">Privacy notice</Link>
        <Link className="text-btn" href="/data-deletion">Data deletion instructions</Link>
        <a className="text-btn" href="mailto:hello@replylane.si">Contact support</a>
      </nav>
      <p>Disconnecting Instagram removes the connection and pauses automations. To delete your workspace and stored activity, follow the data deletion instructions or contact hello@replylane.si.</p>
    </section>
  );
}
