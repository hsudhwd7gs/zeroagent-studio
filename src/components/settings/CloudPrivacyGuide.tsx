import {
  CLOUD_PROVIDER_GUIDES,
  LOCAL_PRIVACY_SUMMARY,
  BRAINWIRE_PRIVACY_TRUTH,
} from '../../lib/cloudPrivacy'

export function CloudPrivacyGuide() {
  return (
    <section className="settings-section settings-privacy" aria-labelledby="settings-privacy-title">
      <h3 id="settings-privacy-title">Privacy &amp; cloud providers — read this</h3>
      <p className="settings-privacy-lead">
        Brainwire is static code in your browser. <strong>We never receive your chat.</strong>{' '}
        If you paste a cloud API key, your browser talks <strong>directly</strong> to that company.
        What they do with your data is governed by <em>their</em> policies and the settings{' '}
        <em>you</em> control on their websites — verify the links below yourself.
      </p>

      <div className="settings-privacy-card settings-privacy-card--truth">
        <h4>{BRAINWIRE_PRIVACY_TRUTH.title}</h4>
        <ul>
          {BRAINWIRE_PRIVACY_TRUTH.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <p className="settings-hint">{BRAINWIRE_PRIVACY_TRUTH.chatWarning}</p>
      </div>

      <div className="settings-privacy-card settings-privacy-card--local">
        <h4>{LOCAL_PRIVACY_SUMMARY.title}</h4>
        <p>{LOCAL_PRIVACY_SUMMARY.body}</p>
        <p className="settings-hint">
          {LOCAL_PRIVACY_SUMMARY.links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          ))}
        </p>
      </div>

      {CLOUD_PROVIDER_GUIDES.map((guide) => (
        <details key={guide.id} className="settings-privacy-provider" open={guide.id === 'openrouter'}>
          <summary>
            <strong>{guide.name}</strong>
            <span className="settings-privacy-provider-tag">cloud API</span>
          </summary>
          <div className="settings-privacy-provider-body">
            <h5>What leaves your browser</h5>
            <ul>
              {guide.whatWeSend.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h5>Risks (plain language)</h5>
            <ul className="settings-privacy-risks">
              {guide.risks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h5>Configure privacy on their site</h5>
            <ul className="settings-privacy-links">
              {guide.settingsToCheck.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <h5>Official policies</h5>
            <ul className="settings-privacy-links">
              {guide.policyLinks.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ))}

      <p className="settings-privacy-footer">
        Provider rules change. If something here disagrees with their docs, <strong>trust their docs</strong>.
        Full security model:{' '}
        <a
          href="https://github.com/sakurablush/brainwire/blob/main/docs/SECURITY.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          docs/SECURITY.md
        </a>
        {' · '}
        <a
          href="https://github.com/sakurablush/brainwire/blob/main/docs/TOOL-SAFETY.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          docs/TOOL-SAFETY.md
        </a>
      </p>
    </section>
  )
}
