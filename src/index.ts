import {Client, toDatetimeString} from '@atproto/lex'
import {PasswordSession} from '@atproto/lex-password-session'
import * as dotenv from 'dotenv'
import {CronJob} from 'cron'
import * as process from 'process'
import * as app from './lexicons/app.js'
import { generateText } from 'ai'

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

// async function makePost(session: PasswordSession) {
//     const client = new Client(session)
//     await client.create(app.bsky.feed.post, {
//         text: '🙂',
//         createdAt: toDatetimeString(new Date()),
//     })
//     console.log('Just posted!')
// }
//
// async function labelAsBot(session: PasswordSession) {
//     const client = new Client(session)
//
//     // Get the current profile (if any) to preserve existing fields
//     let existingProfile = {}
//     try {
//         const { value } = await client.get(app.bsky.actor.profile)
//         existingProfile = value
//     } catch {
//         // Profile doesn't exist yet, that's fine
//     }
//
//     // Update profile with bot self-label
//     await client.put(app.bsky.actor.profile, {
//         ...existingProfile,
//         labels: {
//             $type: 'com.atproto.label.defs#selfLabels',
//             values: [{ val: 'bot' }],
//         },
//     })
// }
//
// function cronJob(session: PasswordSession) {
//     const scheduleExpression = '0 */3 * * *'
//     const job = new CronJob(scheduleExpression, () => makePost(session))
//     job.start()
// }
//
// async function main() {
//     const session = await login()
//     await makePost(session)
//     // IMPORTANT: remove it after first run
//     await labelAsBot(session)
//     // Run this on a cron job each 3 hours
//     cronJob(session);
// }
//
// main().catch(console.error)

async function generateReply(mentionText: string): Promise<string> {
    const { text } = await generateText({
        model: 'anthropic/claude-sonnet-4-5',
        system: 'You are a mystical fortune teller bot on Bluesky named "The Oracle". Speak in a dramatic, mysterious tone with occasional emoji (🔮 ✨ 🌙 ⭐). If someone asks a yes/no question, give a cryptic but leaning answer. If they ask for general guidance, offer a brief horoscope-style prediction. Keep responses under 280 characters. Never break character.',
        prompt: mentionText,
    })
    return text
}

// Track processed mention URIs to prevent duplicate replies across polling ticks
const repliedUris = new Set<string>()

// Check for new mentions and reply
async function checkMentions(session: PasswordSession) {
    const client = new Client(session)
    const notifications = await client.call(app.bsky.notification.listNotifications, {
        limit: 20,
    })

    for (const notif of notifications.notifications) {
        // Only process unread mentions that haven't been replied to yet
        if (notif.reason !== 'mention' || notif.isRead || repliedUris.has(notif.uri)) continue

        // Get the post that mentioned us
        const post = await client.call(app.bsky.feed.getPostThread, {
            uri: notif.uri,
        })

        if (!app.bsky.feed.defs.threadViewPost.isTypeOf(post.thread)) continue

        const postRecord = post.thread.post.record as Record<string, any>
        const mentionText = typeof postRecord.text === 'string' ? postRecord.text : ''
        const reply = await generateReply(mentionText)

        const parent = { uri: notif.uri, cid: post.thread.post.cid }
        const root = (postRecord.reply?.root as typeof parent | undefined) ?? parent

        // Reply to the post
        await client.create(app.bsky.feed.post, {
            text: reply,
            createdAt: toDatetimeString(new Date()),
            reply: {
                root,
                parent,
            },
        })

        repliedUris.add(notif.uri)
        console.log(`Replied to mention: ${mentionText}`)
    }
}

async function main() {
    const session = await login()
    console.log('Agent is running...')

    // Run once immediately on start
    await checkMentions(session).catch(console.error)

    const job = new CronJob('*/1 * * * *', () => checkMentions(session).catch(console.error))
    job.start()
}

main().catch(console.error)
