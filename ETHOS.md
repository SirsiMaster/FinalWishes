# FinalWishes — Ethos

**This is not a product document. This is the soul of the application.**

Every engineer, designer, and contributor who touches this codebase should read this first. Before the architecture. Before the API spec. Before the sprint plan. This is why we build.

---

## The Promise

FinalWishes is not estate planning software. It is not a digital vault. It is not a checklist you fill out because a lawyer told you to.

FinalWishes is the place where your life lives.

It is the app that a 28-year-old soldier opens before deployment — not because they expect to die, but because they want their daughter to hear their voice reading her favorite bedtime story, no matter what happens. It is the app that a truck driver uses on a long haul to record the story of how he proposed to his wife at a rest stop in New Mexico, because he wants his grandchildren to know that moment existed. It is the app that a mother opens after her divorce to update who gets what — and while she's there, she records a video message for her son on his wedding day, whenever that comes.

It is not about death. It is about living with intention.

---

## The Experience

### For the person building their legacy

Using FinalWishes should feel like wrapping a present for someone you love dearly — knowing you will never see them open it, but you can't wait for them to receive it.

It should never feel like a chore. It should never feel like a gallows. It should feel like YOUR life — your memories, your voice, your stories, your wisdom, the things you saw and did and taught and learned. Not random posts on a feed. Not performative content for strangers. The real things. The quiet things. The things that only matter to the people who love you.

Every interaction should remind the user: you are not just leaving people things. You lived a life WITH them. This app is how you make sure they remember that.

The content is the life of the person — curated, intentional, positive. Unlike Facebook or Instagram or TikTok, where life is fragmented into disconnected posts for an audience of strangers, FinalWishes is YOU. The whole story. Organized not by algorithm but by meaning.

### For the person who receives it

The heir's first moment in this app is the most important screen we will ever build.

A parent is gone. The grief is fresh. The heir opens the app and sees — not a dashboard, not a completion percentage, not an asset list — but their parent's face, their parent's voice, their parent's words written specifically for them. "Dear Maya, if you're reading this..."

That moment must be sacred. The practical matters — the assets, the documents, the legal filings — they come after. First, the love. First, the voice. First, the letter that was sealed years ago, waiting for this exact moment.

If we get this moment right, nothing else matters. If we get this moment wrong, nothing else we build can save it.

---

## Who This Is For

FinalWishes is for anyone with a life and memories they want to share.

- The young couple who just had their first child and realize for the first time that they have something to protect.
- The single parent who carries everything alone and needs to know that if something happens, the kids will be okay.
- The retiree who wants to spend their afternoons recording stories for grandchildren who aren't born yet.
- The active duty service member who deploys knowing that their family has every document, every credential, every message — sealed and waiting.
- The first responder who runs toward danger every shift and wants their partner to know where everything is.
- The miner, the rig worker, the trucker — anyone whose work carries risk and whose family carries worry.
- The person going through divorce who needs to reorganize their life with clarity and intention.
- The spouse who just lost their partner and needs one place where everything is organized, protected, and accessible.

FinalWishes walks with all of them. Through youth, marriage, parenthood, career, old age, retirement. Through the hard parts — divorce, loss, illness, deployment. Through the beautiful parts — the birth of a grandchild, the story of how you met, the recipe your mother taught you, the song you sang at your wedding.

---

## The Soul Log

The Soul Log is the heartbeat of FinalWishes. It is your personal diary — video or audio, your choice — of thoughts, feelings, and experiences captured in the moment they happen.

Not a social media post. Not a performance for an audience. A private conversation with yourself and the people who matter to you. The entry you record at 2am when you can't sleep and you're thinking about your father. The video from the hospital room the day your child was born. The voice memo from the parking lot after your first day at a new job, still shaking, saying "I think this is going to be good."

The Soul Log is what makes someone open FinalWishes tomorrow. Not next year when they remember to update their will — tomorrow, because they had a thought worth preserving. It turns the app from a filing cabinet into a daily companion.

Each entry can be:
- **Video diary** — face-to-camera, capturing not just words but expression, emotion, the way you look right now
- **Audio diary** — voice-only, for the moments when you just need to talk
- **Written reflection** — for those who think in words on a page

Each entry can be private (for you alone), shared (tagged for specific people), or sealed (delivered on a future date or event). A Soul Log entry tagged for your daughter becomes part of her heir experience. A sealed entry becomes a time capsule. A private entry stays yours — a diary that nobody reads until you decide otherwise.

The Soul Log is the reason FinalWishes is not estate planning software. It is a life companion. Estate planning is something you do inside it. Living is what you do with it.

---

## The Companion Vision

FinalWishes is not an app you open once a year to update your will. It is a living companion.

In its fullest expression, it reads your life as you live it — with your permission and at your direction. It notices the Instagram post of your daughter's graduation and asks: "Want to save this to Maya's memory collection?" It sees the photo you took at the family reunion and suggests: "This would be a beautiful addition to the heirlooms gallery." It knows your anniversary is coming and offers: "Would you like to record a message for your spouse?"

It takes the scattered digital footprint of a modern life — the photos in iCloud, the posts on Instagram, the videos on YouTube, the documents in Google Drive — and weaves them into something coherent. Something intentional. Something that says: this was my life, and it mattered.

Not a social media archive. Not a data dump. A curated, living portrait of a human being, maintained by the person who knows that life best — the one who lived it.

---

## Design Principles

These principles govern every screen, every button, every workflow.

### 1. Life first, death second
The app should feel alive. The primary experience is building, recording, curating, celebrating. The estate mechanics (legal, financial, compliance) are important but secondary to the human experience. A user should be able to use this app for years before a single legal document is uploaded — and feel that every moment was valuable.

### 2. Warmth over efficiency
A clinical interface is the wrong answer for this domain. Every interaction should feel warm, personal, and human. The Shepherd AI should speak like a trusted friend, not a legal assistant. The empty states should inspire, not instruct. The success messages should celebrate, not confirm.

### 3. The gift-wrapping test
Before shipping any feature, ask: does this feel like wrapping a present for someone you love? If it feels like filling out a tax form, redesign it. The emotional weight of this product demands that every interaction carries intention.

### 4. Accessible to anyone, powerful for experts
A first-generation college student with no legal background should be able to use this app to protect their family. An estate attorney should be able to use it to manage complex multi-state trusts. The interface achieves this by progressive disclosure — simple by default, powerful on demand. Never gate basic protection behind complexity.

### 5. The sacred moment
Every feature we build should be evaluated against one question: does this make the heir's first moment better? The voice memo feature exists so that moment includes their parent's voice. The heirloom photos exist so that moment includes the ring their grandmother wore. The time capsule exists so that moment includes a letter written with love, years before it was needed. Everything leads to that screen.

### 6. Privacy as love
We encrypt not because compliance requires it, but because protecting someone's most intimate moments — their voice, their letters, their family's financial details — is an act of love. The security architecture should feel like a locked diary, not a bank vault. Safe because it matters, not because it's required.

### 7. Now and forever
The content in this app may be the last record of a human life. It must outlast trends, platforms, and business cycles. We do not depend on third-party services for core storage. We do not use formats that expire. We build for permanence because the people who depend on this app may not open it for decades — and when they do, everything must be there.

---

## The Words That Started This

_From the conversation where FinalWishes found its soul — April 15, 2026:_

> "FinalWishes can't be a chore or even worse a gallows. It has to be alive with YOUR life and your memories. It's not just for when you die — it's for you to record important things while you live and have agency. To remind people that you didn't only leave them things, but you lived a life with them."

> "It should be like wrapping a present for someone you love dearly, knowing that you will never get to see them open it — but you can't wait for them to receive it."

> "The content is the life of the person in a positive, curated way — unlike Facebook or Instagram or TikTok. FinalWishes is them. You and us. Now and forever."

---

**This document is permanent. It does not version. It does not get archived. It is the foundation everything else is built on.**
