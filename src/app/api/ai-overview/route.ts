import { NextRequest } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { VertexAI, type GenerateContentRequest } from '@google-cloud/vertexai'

const PROJECT_ID = process.env.GCP_PROJECT_ID ?? ''
const LOCATION = process.env.GCP_LOCATION ?? 'europe-west1'
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

function getMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getVertex() {
  return new VertexAI({ project: PROJECT_ID, location: LOCATION })
}

function buildPrompt(fields: Record<string, string>, lat?: number, lon?: number): string {
  const entries = Object.entries(fields)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join('\n')

  const coordLine = lat && lon ? `\nGPS coordinates: ${lat}, ${lon}` : ''

  return `You are a business intelligence analyst AI. Analyze this French company establishment and produce a rich, structured overview.

## Company data from SIRENE registry
${entries}${coordLine}

## Important rules about the SIRENE data above
- The SIREN number (first 9 digits of the SIRET) identifies the legal entity. If the same SIREN has multiple SIRETs, the company has multiple establishments — mention this.
- The activity code (NAF/APE) tells you the business sector. When searching online and finding results with the same name, ALWAYS cross-reference with the activity sector to discard false matches (e.g. a lodging rental vs. a clothing store).
- The address fields contain the exact street address — USE this address in your Google Maps searches to find the correct listing.
- Do NOT output citation markers like [cite: X], [cite: null], [citation], or any bracketed references. Write clean prose.

## Search strategy (IMPORTANT)
French businesses often operate under shortened, informal, or branded names that differ from their legal name in the SIRENE registry. To maximize the chance of finding information:
1. Search the FULL legal name + city first.
2. Try SHORTENED or partial name variations + city. Drop suffixes, prepositions, or qualifying words. Many businesses are known locally by a simpler name.
3. Search the legal name ALONE (without the city) to check whether the business is part of a chain, franchise, or brand with multiple locations. Cross-reference any results with the activity code to avoid confusing different businesses with the same name.
4. Search Google Maps specifically: try "[full name] [city] google maps", then "[shortened name] [address] google maps". If the SIRENE data includes a street address, use it in the search — this dramatically improves results. Report the listing status (open / temporarily closed / permanently closed), star rating, and review count.
5. Search for social media presence (Instagram, Facebook, LinkedIn, TikTok) using both full and shortened name variations.
6. If you find any website, profile, or listing, follow through and examine what it reveals: products/services, team, contact info, reviews, recent activity. Do not just note the listing exists — extract useful details from it.

## Your task
Research this company thoroughly and produce a structured report with these sections. Use Google Search to find current information.

### 1. Company snapshot
A 2-3 sentence executive summary: what the company does, its size, and notable characteristics. If the business appears to be part of a chain or franchise (same or similar name in multiple cities), mention this.

### 2. Online presence
- Official website (if found)
- Google Maps / Google Business profile — clearly state the business status: **open**, **temporarily closed**, or **permanently closed**. Include star rating, review count, and any notable review themes. If the listing says "Fermé définitivement" or "Permanently closed", this is a major finding — highlight it prominently
- Social media: Instagram, Facebook, LinkedIn, TikTok (search both the full legal name and common shortened versions)
- Notable online reviews or reputation signals

### 3. Leadership & ownership
- CEO / Dirigeant / Gérant name and background (if public)
- Personal contact details of upper management if publicly listed (email, phone, LinkedIn)
- Parent company, group affiliation, or franchise network
- Ownership structure if available (subsidiary of, etc.)

### 4. Contact information
- General company phone number
- General company email / contact email
- Contact form URL (if no direct email found)
- Physical address and opening hours (from Google Maps / website if available)

### 5. Business context
- Whether the business is part of a chain, franchise, or brand with other locations — and if so, how many and where
- Industry positioning and competitors in the area
- Recent news or notable events
- Financial signals if publicly available (revenue class, growth indicators)

### 6. Key insights
2-3 bullet points with actionable intelligence about this establishment. Flag any red flags such as: permanently closed on Google Maps, recent legal issues, very low review scores, signs of inactivity, or discrepancies between the SIRENE status and online presence.

## Rules
- Write in English.
- Be factual. If you cannot find information, say so rather than inventing.
- Use Markdown formatting with headers, bold text, and bullet points.
- Keep the total response under 800 words.
- Do NOT repeat the raw SIRENE data — synthesize it.
- Start DIRECTLY with the first section header. Do NOT include any introductory sentence, preamble, or summary of what you are about to do.
- Do NOT include citation markers like [cite: X], [cite: null], or any bracketed references — just write clean text.`
}

/**
 * GET /api/ai-overview?siret=XXXXX
 * Returns a cached AI overview from Firestore if one exists.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const token = authHeader.slice(7)
    await getAdminAuth().verifyIdToken(token)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
  }

  const siret = req.nextUrl.searchParams.get('siret')
  if (!siret) {
    return new Response(JSON.stringify({ error: 'Missing siret' }), { status: 400 })
  }

  const doc = await getAdminDb().collection('aiOverviews').doc(siret).get()
  if (!doc.exists) {
    return Response.json({ cached: false })
  }

  const data = doc.data()!
  return Response.json({ cached: true, text: data.text, sources: data.sources ?? [], createdAt: data.createdAt })
}

/**
 * POST /api/ai-overview
 * Streams an AI-generated company overview using Gemini with Google Search grounding.
 * Returns Server-Sent Events with agent progress steps and the final markdown result.
 * Saves the completed overview to Firestore keyed by SIRET.
 */
export async function POST(req: NextRequest) {
  if (!PROJECT_ID) {
    return new Response(JSON.stringify({ error: 'AI not configured — GCP_PROJECT_ID missing' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let uid = ''
  try {
    const token = authHeader.slice(7)
    const decoded = await getAdminAuth().verifyIdToken(token)
    uid = decoded.uid
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
  }

  let body: { fields: Record<string, string>; lat?: number; lon?: number }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const { fields, lat, lon } = body
  if (!fields || typeof fields !== 'object') {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 })
  }

  const siret = fields.SIRET || fields.siret || ''

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        send('step', { id: 'analyze', label: 'Analyzing company data', status: 'done' })
        send('step', { id: 'search', label: 'Searching the web for information', status: 'loading' })

        const vertex = getVertex()
        const model = vertex.getGenerativeModel({
          model: MODEL,
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
          tools: [{ googleSearch: {} } as any],
        })

        const request: GenerateContentRequest = {
          contents: [{ role: 'user', parts: [{ text: buildPrompt(fields, lat, lon) }] }],
        }

        send('step', { id: 'search', label: 'Searching the web for information', status: 'done' })
        send('step', { id: 'generate', label: 'Generating overview', status: 'loading' })

        const streamResp = await model.generateContentStream(request)
        let fullText = ''

        for await (const chunk of streamResp.stream) {
          const text = chunk.candidates?.[0]?.content?.parts
            ?.map((p) => p.text ?? '')
            .join('') ?? ''
          if (text) {
            fullText += text
            send('chunk', { text })
          }
        }

        send('step', { id: 'generate', label: 'Generating overview', status: 'done' })

        const resp = await streamResp.response
        const groundingMeta = resp.candidates?.[0]?.groundingMetadata
        const sources = groundingMeta?.webSearchQueries ?? []

        send('done', { text: fullText, sources })

        if (siret && fullText) {
          try {
            const now = new Date().toISOString()
            const adminDb = getAdminDb()
            await adminDb.collection('aiOverviews').doc(siret).set({
              text: fullText,
              sources,
              createdAt: now,
            })
            if (uid) {
              const companyName = fields['Dénomination de l\'unité légale'] || fields.denominationUniteLegale || ''
              const city = fields['Commune de l\'établissement'] || fields.communeEtablissement || ''
              await adminDb.collection('userProfiles').doc(uid).collection('aiOverviews').doc(siret).set({
                companyName,
                city,
                siret,
                createdAt: now,
              })
              const month = getMonthKey()
              const profileRef = adminDb.collection('userProfiles').doc(uid)
              await adminDb.runTransaction(async (tx) => {
                const snap = await tx.get(profileRef)
                const data = snap.exists ? snap.data()! : {}
                const count = data.monthKey === month ? (data.aiOverviewCount ?? 0) : 0
                tx.set(profileRef, { aiOverviewCount: count + 1, monthKey: month }, { merge: true })
              })
            }
          } catch { /* non-critical — overview still delivered to user */ }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        send('error', { message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
