<template>
  <section class="space-y-10">
    <div class="space-y-3">
      <p class="text-sm font-semibold uppercase tracking-wide text-brand">Why this starter?</p>
      <h1 class="text-3xl font-semibold text-slate-900">Practical defaults for modern Vue teams</h1>
      <p class="text-base text-slate-600">
        Every dependency in this template is production-proven and configured with sensible defaults so you can scale
        the same way in development, preview and CI.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <article class="card space-y-2">
        <h2 class="text-xl font-semibold text-slate-900">DX focused</h2>
        <p class="text-sm text-slate-600">
          Script setup, TypeScript strict mode, alias imports and hot-module reloading offer immediate feedback.
        </p>
      </article>
      <article class="card space-y-2">
        <h2 class="text-xl font-semibold text-slate-900">UI ready</h2>
        <p class="text-sm text-slate-600">
          Tailwind CSS, shared component classes, responsive container rules and Font Awesome icons speed up design
          work.
        </p>
      </article>
      <article class="card space-y-2">
        <h2 class="text-xl font-semibold text-slate-900">Quality gates</h2>
        <p class="text-sm text-slate-600">
          ESLint, Prettier, Vitest and Cypress are wired into npm scripts, making it easy to hook into any CI runner.
        </p>
      </article>
    </div>

    <div class="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6">
      <h3 class="text-lg font-semibold text-slate-900">Next steps</h3>
      <ol class="mt-4 list-decimal space-y-2 pl-4 text-sm text-slate-600">
        <li>Run <code class="rounded bg-slate-100 px-2 py-0.5 text-xs">npm run dev</code> to start local development.
        </li>
        <li>Add modules inside <code class="rounded bg-slate-100 px-2 py-0.5 text-xs">src/</code>, following the router,
          stores and components folders.</li>
        <li>Ship confidently by running <code
            class="rounded bg-slate-100 px-2 py-0.5 text-xs">npm run lint && npm run test:unit</code> before every
          commit.</li>
      </ol>
    </div>
  </section>
</template>
