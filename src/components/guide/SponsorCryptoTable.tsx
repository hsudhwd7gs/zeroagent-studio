import { useState } from 'react'
import { SPONSOR_COINS } from '../../lib/sponsorAddresses'

export default function SponsorCryptoTable() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyAddress = async (id: string, address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(null), 1600)
    } catch {
      // Addresses remain selectable if clipboard is denied.
    }
  }

  return (
    <div className="guide-crypto-table-wrap">
      <table className="guide-crypto-table">
        <thead>
          <tr>
            <th scope="col">Coin</th>
            <th scope="col">Address</th>
            <th scope="col">
              <span className="sr-only">Copy</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {SPONSOR_COINS.map((coin) => (
            <tr key={coin.id}>
              <td>{coin.label}</td>
              <td>
                <code className="guide-crypto-address">{coin.address}</code>
              </td>
              <td>
                <button
                  type="button"
                  className={`guide-crypto-copy ${copiedId === coin.id ? 'is-copied' : ''}`}
                  onClick={() => void copyAddress(coin.id, coin.address)}
                  aria-label={`Copy ${coin.label} address`}
                >
                  {copiedId === coin.id ? 'Copied!' : 'Copy'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="guide-muted">
        Block explorer links:{' '}
        <a
          href="https://github.com/sakurablush/brainwire/blob/main/.github/FUNDING.yml"
          target="_blank"
          rel="noopener noreferrer"
        >
          FUNDING.yml
        </a>
      </p>
    </div>
  )
}
