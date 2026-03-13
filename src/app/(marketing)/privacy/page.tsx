import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Public Data Maps',
}

export default function PrivacyPolicy() {
  return (
    <div className="bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-6 pt-28 pb-16">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: March 12, 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Who we are</h2>
            <p className="mt-2">
              Public Data Maps (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website{' '}
              <strong>publicdatamaps.com</strong>. This policy explains how we collect, use, and
              protect your personal data when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Data we collect</h2>

            <h3 className="mt-3 font-medium text-gray-900">Account information</h3>
            <p className="mt-1">
              When you create an account we store your <strong>email address</strong>,{' '}
              <strong>display name</strong>, and <strong>profile photo URL</strong> (if you sign in
              with Google). This data is managed by Firebase Authentication and stored in Google
              Cloud Firestore.
            </p>

            <h3 className="mt-4 font-medium text-gray-900">Subscription &amp; billing</h3>
            <p className="mt-1">
              If you subscribe to a paid plan, payment is processed by{' '}
              <strong>Stripe</strong>. We store your Stripe customer ID and subscription metadata
              (plan tier, seat count, billing interval) in Firestore. We do <strong>not</strong>{' '}
              store credit card numbers, bank details, or any raw payment credentials — those are
              held exclusively by Stripe under their{' '}
              <a
                href="https://stripe.com/privacy"
                className="underline hover:text-gray-900"
                target="_blank"
                rel="noopener noreferrer"
              >
                privacy policy
              </a>
              .
            </p>

            <h3 className="mt-4 font-medium text-gray-900">User preferences &amp; saved data</h3>
            <p className="mt-1">
              Your theme preference, selected columns, saved searches, saved areas, quick filters,
              and other UI settings are stored in <strong>Firestore</strong> (synced across devices)
              and in your browser&apos;s <strong>localStorage</strong> (for instant restore on page
              load).
            </p>

            <h3 className="mt-4 font-medium text-gray-900">Organization data</h3>
            <p className="mt-1">
              If you create or join an organization, we store the organization name, member list
              (user IDs, emails, roles), invitations, connectors (uploaded CSV data including
              latitude/longitude and any columns present in your file), and shared quick filters.
            </p>

            <h3 className="mt-4 font-medium text-gray-900">Company data (SIRENE)</h3>
            <p className="mt-1">
              The company establishment data displayed in the application comes from the{' '}
              <strong>SIRENE v3 dataset</strong> published by INSEE (Institut National de la
              Statistique et des Études Économiques). This is publicly available open data. We do
              not collect this data from you.
            </p>

            <h3 className="mt-4 font-medium text-gray-900">Usage &amp; analytics</h3>
            <p className="mt-1">
              We track search counts per user for quota enforcement (stored in Firestore). We do
              not use third-party analytics trackers. Server logs may temporarily record IP
              addresses and request metadata for debugging purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. How we use your data</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>To authenticate you and maintain your session</li>
              <li>To process subscriptions and enforce usage quotas</li>
              <li>To sync your preferences and saved searches across devices</li>
              <li>To send transactional emails (account verification, organization invitations, billing notifications)</li>
              <li>To provide AI-generated company overviews (queries are sent to Google Vertex AI with only the company&apos;s public SIRENE data)</li>
              <li>To improve and debug the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Third-party services</h2>
            <p className="mt-2">We rely on the following processors:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Google Cloud Platform / Firebase</strong> — authentication, database, hosting, AI (Vertex AI), file storage</li>
              <li><strong>Stripe</strong> — payment processing</li>
              <li><strong>Resend</strong> — transactional email delivery</li>
              <li><strong>Nominatim (OpenStreetMap)</strong> — geocoding search (your search queries are sent to their public API)</li>
            </ul>
            <p className="mt-2">
              Each processor has its own privacy policy. We encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Data retention</h2>
            <p className="mt-2">
              Account data and preferences are retained for as long as your account exists. If you
              delete your account, your Firestore profile, preferences, and saved searches are
              deleted. Organization data is retained until the organization is dissolved by its
              owner. Stripe retains billing records independently per their policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Cookies &amp; local storage</h2>
            <p className="mt-2">
              We use <strong>localStorage</strong> to persist your UI preferences (theme, columns,
              filters) for a faster loading experience. Firebase Authentication uses cookies and
              IndexedDB to maintain your session. We do not use advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. Your rights</h2>
            <p className="mt-2">
              Under the GDPR and French data protection law (Loi Informatique et Libertés), you
              have the right to access, rectify, delete, and port your personal data. You may also
              object to or restrict processing. To exercise these rights, contact us at{' '}
              <a href="mailto:wintgensromain@gmail.com" className="underline hover:text-gray-900">
                romainwintgens@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Security</h2>
            <p className="mt-2">
              All traffic is encrypted via TLS. Secrets (API keys, database credentials) are stored
              in Google Cloud Secret Manager. Authentication tokens are short-lived and validated
              server-side on every API request. Database access is restricted to authenticated
              server-side routes only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Changes to this policy</h2>
            <p className="mt-2">
              We may update this policy from time to time. Material changes will be communicated
              via email or an in-app notice. The &quot;Last updated&quot; date at the top reflects
              the most recent revision.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">10. Contact</h2>
            <p className="mt-2">
              For any privacy-related questions, reach us at{' '}
              <a href="mailto:wintgensromain@gmail.com" className="underline hover:text-gray-900">
                wintgensromain@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
