import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Public Data Maps',
}

export default function TermsOfService() {
  return (
    <div className="bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-6 pt-28 pb-16">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: March 12, 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Acceptance of terms</h2>
            <p className="mt-2">
              By accessing or using Public Data Maps (&quot;the Service&quot;), available at{' '}
              <strong>publicdatamaps.com</strong>, you agree to be bound by these Terms of Service.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Description of the Service</h2>
            <p className="mt-2">
              Public Data Maps is a web application that lets users draw areas on an interactive
              map and retrieve French company establishment data from the SIRENE v3 dataset
              published by INSEE. The Service provides tools for filtering, exporting, and
              organizing this publicly available data. Additional features include AI-generated
              company overviews, organization management, and custom data connectors.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Accounts</h2>
            <p className="mt-2">
              You may browse company data without an account, subject to limited quotas. To access
              full features (saved searches, exports, preferences sync), you must create an account
              using a valid email address or Google sign-in. You are responsible for maintaining the
              confidentiality of your account credentials and for all activity under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Plans and billing</h2>

            <h3 className="mt-3 font-medium text-gray-900">Free tier</h3>
            <p className="mt-1">
              Unregistered and free-tier users have access to basic search functionality with
              limited daily queries and a reduced result cap.
            </p>

            <h3 className="mt-4 font-medium text-gray-900">Paid plans</h3>
            <p className="mt-1">
              Individual and Enterprise plans are billed monthly or yearly through Stripe. Prices
              are displayed at checkout and may be updated with 30 days&apos; notice. Enterprise
              plans use per-seat billing — seats are allocated when members join and released when
              they leave, with prorated charges.
            </p>

            <h3 className="mt-4 font-medium text-gray-900">Cancellation</h3>
            <p className="mt-1">
              You may cancel your subscription at any time via the billing portal. Access to paid
              features continues until the end of the current billing period. No refunds are issued
              for partial billing periods.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Acceptable use</h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the Service, other accounts, or underlying systems</li>
              <li>Scrape, crawl, or programmatically extract data from the Service beyond the provided API and export features</li>
              <li>Resell access to the Service or its data without prior written consent</li>
              <li>Upload malicious files, viruses, or harmful content through connectors or any other feature</li>
              <li>Circumvent usage quotas or rate limits through any technical means</li>
            </ul>
            <p className="mt-2">
              We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Data and intellectual property</h2>

            <h3 className="mt-3 font-medium text-gray-900">SIRENE data</h3>
            <p className="mt-1">
              Company establishment data originates from the SIRENE v3 dataset, published by INSEE
              under the{' '}
              <a
                href="https://www.etalab.gouv.fr/licence-ouverte-open-licence/"
                className="underline hover:text-gray-900"
                target="_blank"
                rel="noopener noreferrer"
              >
                Licence Ouverte / Open Licence
              </a>
              . This data is freely reusable. We do not claim ownership over it.
            </p>

            <h3 className="mt-4 font-medium text-gray-900">Your data</h3>
            <p className="mt-1">
              You retain ownership of any data you upload (e.g. CSV connectors). By uploading, you
              grant us a limited license to store and process it for the purpose of providing the
              Service. We do not share your uploaded data with third parties.
            </p>

            <h3 className="mt-4 font-medium text-gray-900">Service</h3>
            <p className="mt-1">
              The Service&apos;s code, design, and branding are proprietary. You may not copy,
              modify, or redistribute any part of the Service without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. AI-generated content</h2>
            <p className="mt-2">
              The Service may provide AI-generated company overviews powered by Google Vertex AI.
              These are generated from publicly available data and may contain inaccuracies. AI
              outputs are provided &quot;as is&quot; for informational purposes and should not be
              relied upon as the sole basis for business decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Organizations</h2>
            <p className="mt-2">
              Organization owners are responsible for managing their members, invitations, and
              billing. Dissolving an organization permanently removes all associated data
              (members, connectors, quick filters) and cancels the Stripe subscription. This
              action is irreversible.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Availability and warranties</h2>
            <p className="mt-2">
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without
              warranties of any kind, express or implied. We do not guarantee uninterrupted
              access, data accuracy, or fitness for a particular purpose. We may modify,
              suspend, or discontinue any part of the Service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">10. Limitation of liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law, Public Data Maps shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising from your
              use of the Service, including but not limited to loss of profits, data, or business
              opportunities. Our total liability for any claim shall not exceed the amount you paid
              us in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">11. Governing law</h2>
            <p className="mt-2">
              These terms are governed by and construed in accordance with the laws of France. Any
              disputes shall be submitted to the exclusive jurisdiction of the courts of Paris,
              France.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">12. Changes to these terms</h2>
            <p className="mt-2">
              We may revise these terms at any time. Material changes will be communicated via
              email or an in-app notice at least 30 days before they take effect. Continued use of
              the Service after changes become effective constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">13. Contact</h2>
            <p className="mt-2">
              Questions about these terms? Contact us at{' '}
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
