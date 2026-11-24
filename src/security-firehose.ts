import * as dotenv from 'dotenv';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as process from 'process';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

dotenv.config();

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Jetstream WebSocket endpoint
const JETSTREAM_URL =
  'wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post';

// Fast regex pattern for common security vulnerability keywords & CVEs
const CVE_REGEX = /\bCVE-\d{4}-\d{4,7}\b/i;
const SECURITY_KEYWORDS_REGEX =
  /\b(cve-\d{4}-\d{4,7}|zero-day|0-day|0day|remote code execution|rce|privilege escalation|buffer overflow|arbitrary code execution|sql injection|sqli|cross-site scripting|xss|auth bypass|authentication bypass|security advisory|security flaw|vulnerability|vulnerabilities|exploit|patched in version|malware campaign|zero click|0-click)\b/i;

// Log file for persisted detections
const DETECTIONS_FILE = path.resolve(process.cwd(), 'vulnerabilities.jsonl');

interface JetstreamCommitEvent {
  did: string;
  time_us: number;
  kind: 'commit';
  commit: {
    rev: string;
    operation: 'create' | 'update' | 'delete';
    collection: string;
    rkey: string;
    record?: {
      $type?: string;
      text?: string;
      createdAt?: string;
      langs?: string[];
    };
    cid: string;
  };
}

interface VulnerabilityReport {
  timestamp: string;
  authorDid: string;
  postUrl: string;
  cve: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  affectedProduct: string | null;
  summary: string;
  postText: string;
}

// AI classification to verify and structure the detection
async function analyzeVulnerability(postText: string): Promise<{
  isVulnerability: boolean;
  report?: Omit<VulnerabilityReport, 'timestamp' | 'authorDid' | 'postUrl' | 'postText'>;
}> {
  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: `You are an automated Cyber Threat Intelligence analyzer.
Determine if the provided Bluesky post describes a genuine computer security vulnerability, exploit, advisory, or software patch.
Ignore metaphorical uses (e.g. "feeling emotionally vulnerable", "economic vulnerability") or purely unrelated chatter.

Respond ONLY with valid JSON in this exact structure:
{
  "isVulnerability": boolean,
  "cve": string or null,
  "severity": "low" | "medium" | "high" | "critical" | "unknown",
  "affectedProduct": string or null,
  "summary": "1-sentence summary of the security issue"
}`,
      prompt: `Analyze this post: "${postText}"`,
    });

    const cleaned = text
      .trim()
      .replace(/^```json/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.isVulnerability) {
      return {
        isVulnerability: true,
        report: {
          cve: parsed.cve || null,
          severity: parsed.severity || 'unknown',
          affectedProduct: parsed.affectedProduct || null,
          summary: parsed.summary || 'Security vulnerability reported',
        },
      };
    }
    return { isVulnerability: false };
  } catch (error) {
    // If AI classification fails or API key is absent, fallback to regex heuristics
    const cveMatch = postText.match(CVE_REGEX);
    return {
      isVulnerability: true,
      report: {
        cve: cveMatch ? cveMatch[0].toUpperCase() : null,
        severity: 'unknown',
        affectedProduct: null,
        summary: 'Detected via security keyword match',
      },
    };
  }
}

async function logVulnerability(report: VulnerabilityReport) {
  const line = JSON.stringify(report) + '\n';
  await fs.appendFile(DETECTIONS_FILE, line, 'utf-8');
}

export function startFirehoseListener() {
  console.log('='.repeat(70));
  console.log('  🛡️  BLUESKY SECURITY VULNERABILITY FIREHOSE MONITOR');
  console.log(`  📡 Streaming from: ${JETSTREAM_URL}`);
  console.log(`  💾 Detections saved to: ${DETECTIONS_FILE}`);
  console.log('='.repeat(70));

  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let processedPosts = 0;
  let detectedCount = 0;

  function connect() {
    console.log(`[${new Date().toLocaleTimeString()}] Connecting to Bluesky Jetstream...`);
    ws = new WebSocket(JETSTREAM_URL);

    ws.onopen = () => {
      console.log(
        `[${new Date().toLocaleTimeString()}] Connected to firehose! Listening for security posts...`,
      );
      reconnectAttempts = 0;
    };

    ws.onmessage = async (event: MessageEvent) => {
      try {
        const raw = typeof event.data === 'string' ? event.data : event.data.toString();
        const data: JetstreamCommitEvent = JSON.parse(raw);

        if (
          data.kind !== 'commit' ||
          data.commit?.operation !== 'create' ||
          data.commit?.collection !== 'app.bsky.feed.post' ||
          !data.commit.record?.text
        ) {
          return;
        }

        processedPosts++;
        const postText = data.commit.record.text;

        // Stage 1: Fast regex match
        if (SECURITY_KEYWORDS_REGEX.test(postText)) {
          const authorDid = data.did;
          const rkey = data.commit.rkey;
          const postUrl = `https://bsky.app/profile/${authorDid}/post/${rkey}`;

          // Stage 2: AI verification
          const analysis = await analyzeVulnerability(postText);
          if (analysis.isVulnerability && analysis.report) {
            detectedCount++;
            const report: VulnerabilityReport = {
              timestamp: new Date().toISOString(),
              authorDid,
              postUrl,
              postText,
              ...analysis.report,
            };

            await logVulnerability(report);

            console.log('\n' + '-'.repeat(70));
            console.log(`🚨 [VULNERABILITY DETECTED #${detectedCount}] ${report.timestamp}`);
            console.log(`🔗 Post: ${report.postUrl}`);
            if (report.cve) console.log(`🏷️  CVE: ${report.cve}`);
            if (report.affectedProduct) console.log(`📦 Product: ${report.affectedProduct}`);
            console.log(`⚠️  Severity: ${report.severity.toUpperCase()}`);
            console.log(`📝 Summary: ${report.summary}`);
            console.log(`💬 Text: "${postText.replace(/\n+/g, ' ')}"`);
            console.log('-'.repeat(70) + '\n');
          }
        }

        if (processedPosts % 1000 === 0) {
          console.log(
            `[${new Date().toLocaleTimeString()}] Processed ${processedPosts} posts (Security alerts: ${detectedCount})`,
          );
        }
      } catch (err) {
        // Silently skip malformed messages
      }
    };

    ws.onerror = (err) => {
      console.error(`[${new Date().toLocaleTimeString()}] Firehose WebSocket error:`, err);
    };

    ws.onclose = () => {
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      console.warn(
        `[${new Date().toLocaleTimeString()}] Firehose disconnected. Reconnecting in ${delay / 1000}s...`,
      );
      setTimeout(connect, delay);
    };
  }

  connect();
}

// If executed directly
if (process.argv[1]?.endsWith('security-firehose.ts')) {
  startFirehoseListener();
}
