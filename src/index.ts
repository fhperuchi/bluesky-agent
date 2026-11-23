import {Client, toDatetimeString} from '@atproto/lex'
import {PasswordSession} from '@atproto/lex-password-session'
import * as dotenv from 'dotenv'
import {CronJob} from 'cron'
import * as process from 'process'
import * as app from './lexicons/app.js'

dotenv.config()

// Create a session
async function login() {
    const service = process.env.BOT_PDS!
    const identifier = process.env.BOT_HANDLE!
    const password = process.env.BOT_PASSWORD!
    return await PasswordSession.login({
        service, // eg 'https://bsky.social'
        identifier, // eg 'fhperuchi.bsky.social'
        password,
    })
}

// Posting logic
async function makePost(session: PasswordSession) {
    const client = new Client(session)
    await client.create(app.bsky.feed.post, {
        text: '🙂',
        createdAt: toDatetimeString(new Date()),
    })
    console.log('Just posted!')
}

async function labelAsBot(session: PasswordSession) {
    const client = new Client(session)

    // Get the current profile (if any) to preserve existing fields
    let existingProfile = {}
    try {
        const { value } = await client.get(app.bsky.actor.profile)
        existingProfile = value
    } catch {
        // Profile doesn't exist yet, that's fine
    }

    // Update profile with bot self-label
    await client.put(app.bsky.actor.profile, {
        ...existingProfile,
        labels: {
            $type: 'com.atproto.label.defs#selfLabels',
            values: [{ val: 'bot' }],
        },
    })
}

function cronJob(session: PasswordSession) {
    const scheduleExpression = '0 */3 * * *'
    const job = new CronJob(scheduleExpression, () => makePost(session))
    job.start()
}

async function main() {
    const session = await login()
    await makePost(session)
    // IMPORTANT: remove it after first run
    await labelAsBot(session)
    // Run this on a cron job each 3 hours
    cronJob(session);
}

main().catch(console.error)
