# IG Visual Generator

Instagram visual generator (square, 4:5, story) built with Next.js + TypeScript and Pollinations.
The message input is adaptive: one main message is enough, a secondary version is optional.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Set your Pollinations key in `.env.local`:

```bash
POLLINATIONS_API_KEY=your_real_key
```

4. Start development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Main files

- `pages/index.tsx`: UI, form, bilingual labels, preview logic
- `pages/api/generate-instagram-image.ts`: request validation + prompt construction
- `lib/pollinationsService.ts`: Pollinations integration (model/mode/format handling)
