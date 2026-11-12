import { test, expect } from "../fixtures/test.js";
import { PASSWORD, USERS } from "../helpers/auth.js";
import {
  E2E,
  customTenantOrigin,
  customTenantUrl,
  tenantOrigin,
  tenantUrl,
} from "../helpers/urls.js";

const apiOrigin = process.env.E2E_API_URL || "http://127.0.0.1:4311";
const publicSiteSettingsUrl = `${apiOrigin}/tenants/current/settings/public-site`;
const publicConfigUrl = (slug) => `${apiOrigin}/public/tenants/${slug}/config`;

async function authenticate(
  request,
  { slug, email, origin = tenantOrigin(slug) },
) {
  const response = await request.post(`${apiOrigin}/auth`, {
    headers: {
      Origin: origin,
    },
    data: {
      tenantSlug: slug,
      email,
      password: PASSWORD,
    },
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.accessToken).toEqual(expect.any(String));

  return {
    Authorization: `Bearer ${body.accessToken}`,
    Origin: origin,
  };
}

async function readPublishedConfig(request, slug) {
  const response = await request.get(publicConfigUrl(slug), {
    headers: {
      Origin: tenantOrigin(slug),
    },
  });

  expect(response.status()).toBe(200);
  return response.json();
}

test("keeps localized edits private until the owner publishes the exact draft", async ({
  page,
  request,
}) => {
  const headers = await authenticate(request, {
    slug: E2E.alphaSlug,
    email: USERS.owner,
    origin: customTenantOrigin(E2E.alphaCustomHostname),
  });
  const initialPublic = await readPublishedConfig(request, E2E.alphaSlug);
  const initialSettingsResponse = await request.get(publicSiteSettingsUrl, {
    headers,
  });

  expect(initialSettingsResponse.status()).toBe(200);
  const initialSettings = await initialSettingsResponse.json();
  const preservedDraftState = {
    logoUrl: initialSettings.draft.branding.logoUrl,
    accentColor: initialSettings.draft.branding.accentColor,
    secondaryColor: initialSettings.draft.branding.secondaryColor,
    backgroundColor: initialSettings.draft.branding.backgroundColor,
    textColor: initialSettings.draft.branding.textColor,
    pages: initialSettings.draft.pages,
    header: initialSettings.draft.header,
  };

  expect(initialSettings.draft.branding.stylePreset).toBe(
    "classic-editorial-v1",
  );
  expect(initialPublic.tenant.publicSite.branding.stylePreset).toBe(
    "classic-editorial-v1",
  );

  const updateResponse = await request.patch(publicSiteSettingsUrl, {
    headers,
    data: {
      revision: initialSettings.editor.draftRevision,
      patch: {
        branding: {
          displayName: "Alpha Draft Identity",
          fontPreset: "shario-sans-v1",
          stylePreset: "modern-minimal-v1",
          description: {
            cs: "Soukromý český koncept",
            en: "Private English concept",
          },
        },
        login: {
          headline: {
            cs: "Vítejte v návrhu",
            en: "Welcome to the draft",
          },
        },
        footer: {
          description: {
            cs: "Nepublikovaný popis",
            en: "Unpublished description",
          },
        },
      },
    },
  });

  expect(updateResponse.status()).toBe(200);
  const updated = await updateResponse.json();
  expect(updated.draft.branding.displayName).toBe("Alpha Draft Identity");
  expect(updated.draft.branding.fontPreset).toBe("shario-sans-v1");
  expect(updated.draft.branding.stylePreset).toBe("modern-minimal-v1");
  expect(updated.draft.branding).toMatchObject({
    logoUrl: preservedDraftState.logoUrl,
    accentColor: preservedDraftState.accentColor,
    secondaryColor: preservedDraftState.secondaryColor,
    backgroundColor: preservedDraftState.backgroundColor,
    textColor: preservedDraftState.textColor,
  });
  // Default homepage copy follows the edited display name/description. Other
  // page settings and explicitly stored layout choices must remain unchanged.
  const { home: originalHome, ...originalPages } = preservedDraftState.pages;
  const { home: updatedHome, ...updatedPages } = updated.draft.pages;
  expect(updatedPages).toEqual(originalPages);
  const {
    headline: _oldHeadline,
    description: _oldDescription,
    ...homeLayout
  } = originalHome;
  expect(updatedHome).toMatchObject(homeLayout);
  expect(updatedHome.headline).toMatchObject({
    cs: "Alpha Draft Identity",
    en: "Alpha Draft Identity",
  });
  expect(updatedHome.description).toMatchObject({
    cs: "Soukromý český koncept",
    en: "Private English concept",
  });
  expect(updated.draft.header).toEqual(preservedDraftState.header);
  expect(updated.editor.hasUnpublishedChanges).toBe(true);

  const stillPublished = await readPublishedConfig(request, E2E.alphaSlug);
  expect(stillPublished.tenant.publicSite).toEqual(
    initialPublic.tenant.publicSite,
  );
  expect(JSON.stringify(stillPublished)).not.toContain("Alpha Draft Identity");
  expect(JSON.stringify(stillPublished)).not.toContain(
    "Private English concept",
  );
  expect(JSON.stringify(stillPublished)).not.toContain(
    "Soukromý český koncept",
  );

  await page.goto(tenantUrl(E2E.alphaSlug), {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("[data-tenant-style]").first()).toHaveAttribute(
    "data-tenant-style",
    "classic-editorial-v1",
  );
  await expect(
    page.locator('[data-tenant-style="modern-minimal-v1"]'),
  ).toHaveCount(0);

  const previewResponse = await request.get(
    `${publicSiteSettingsUrl}/preview`,
    { headers },
  );
  expect(previewResponse.status()).toBe(200);
  const preview = await previewResponse.json();
  expect(preview.tenant.publicSite.branding.displayName).toBe(
    "Alpha Draft Identity",
  );
  expect(preview.tenant.publicSite.branding.stylePreset).toBe(
    "modern-minimal-v1",
  );
  expect(preview.tenant.publicSite.branding).toMatchObject({
    logoUrl: preservedDraftState.logoUrl,
    accentColor: preservedDraftState.accentColor,
    secondaryColor: preservedDraftState.secondaryColor,
    backgroundColor: preservedDraftState.backgroundColor,
    textColor: preservedDraftState.textColor,
  });
  expect(preview.tenant.publicSite.pages).toEqual(updated.draft.pages);
  expect(preview.tenant.publicSite.header).toEqual(preservedDraftState.header);
  expect(preview.tenant.publicSite.login.headline).toMatchObject({
    cs: "Vítejte v návrhu",
    en: "Welcome to the draft",
  });

  const publishResponse = await request.post(
    `${publicSiteSettingsUrl}/publish`,
    {
      headers,
      data: {
        revision: updated.editor.draftRevision,
      },
    },
  );

  expect(publishResponse.status()).toBe(200);
  const published = await publishResponse.json();
  expect(published.editor.hasUnpublishedChanges).toBe(false);
  expect(published.published.branding.displayName).toBe("Alpha Draft Identity");
  expect(published.published.branding.stylePreset).toBe("modern-minimal-v1");

  const publicAfterPublish = await readPublishedConfig(request, E2E.alphaSlug);
  expect(publicAfterPublish.tenant.publicSite.branding.displayName).toBe(
    "Alpha Draft Identity",
  );
  expect(publicAfterPublish.tenant.publicSite.branding.stylePreset).toBe(
    "modern-minimal-v1",
  );
  expect(publicAfterPublish.tenant.publicSite.branding).toMatchObject({
    logoUrl: preservedDraftState.logoUrl,
    accentColor: preservedDraftState.accentColor,
    secondaryColor: preservedDraftState.secondaryColor,
    backgroundColor: preservedDraftState.backgroundColor,
    textColor: preservedDraftState.textColor,
  });
  expect(publicAfterPublish.tenant.publicSite.pages).toEqual(
    updated.draft.pages,
  );
  expect(publicAfterPublish.tenant.publicSite.header).toEqual(
    preservedDraftState.header,
  );
  expect(
    publicAfterPublish.tenant.publicSite.branding.description,
  ).toMatchObject({
    cs: "Soukromý český koncept",
    en: "Private English concept",
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-tenant-style]").first()).toHaveAttribute(
    "data-tenant-style",
    "modern-minimal-v1",
  );

  const warmUpdateResponse = await request.patch(publicSiteSettingsUrl, {
    headers,
    data: {
      revision: published.editor.draftRevision,
      patch: {
        branding: {
          stylePreset: "warm-organic-v1",
        },
      },
    },
  });
  expect(warmUpdateResponse.status()).toBe(200);
  const warmUpdate = await warmUpdateResponse.json();
  expect(warmUpdate.draft.branding.stylePreset).toBe("warm-organic-v1");
  expect(warmUpdate.draft.branding).toMatchObject({
    displayName: "Alpha Draft Identity",
    logoUrl: preservedDraftState.logoUrl,
    accentColor: preservedDraftState.accentColor,
    secondaryColor: preservedDraftState.secondaryColor,
    backgroundColor: preservedDraftState.backgroundColor,
    textColor: preservedDraftState.textColor,
  });
  expect(warmUpdate.draft.pages).toEqual(updated.draft.pages);
  expect(warmUpdate.draft.header).toEqual(preservedDraftState.header);

  const publicBeforeWarmPublish = await readPublishedConfig(
    request,
    E2E.alphaSlug,
  );
  expect(publicBeforeWarmPublish.tenant.publicSite.branding.stylePreset).toBe(
    "modern-minimal-v1",
  );

  const warmPreviewResponse = await request.get(
    `${publicSiteSettingsUrl}/preview`,
    { headers },
  );
  expect(warmPreviewResponse.status()).toBe(200);
  const warmPreview = await warmPreviewResponse.json();
  expect(warmPreview.tenant.publicSite.branding.stylePreset).toBe(
    "warm-organic-v1",
  );
  expect(warmPreview.tenant.publicSite.branding).toMatchObject({
    logoUrl: preservedDraftState.logoUrl,
    accentColor: preservedDraftState.accentColor,
    secondaryColor: preservedDraftState.secondaryColor,
    backgroundColor: preservedDraftState.backgroundColor,
    textColor: preservedDraftState.textColor,
  });
  expect(warmPreview.tenant.publicSite.pages).toEqual(updated.draft.pages);
  expect(warmPreview.tenant.publicSite.header).toEqual(
    preservedDraftState.header,
  );

  const warmPublishResponse = await request.post(
    `${publicSiteSettingsUrl}/publish`,
    {
      headers,
      data: {
        revision: warmUpdate.editor.draftRevision,
      },
    },
  );
  expect(warmPublishResponse.status()).toBe(200);
  const warmPublished = await warmPublishResponse.json();
  expect(warmPublished.published.branding.stylePreset).toBe("warm-organic-v1");

  const publicAfterWarmPublish = await readPublishedConfig(
    request,
    E2E.alphaSlug,
  );
  expect(publicAfterWarmPublish.tenant.publicSite.branding.stylePreset).toBe(
    "warm-organic-v1",
  );
  expect(publicAfterWarmPublish.tenant.publicSite.branding).toMatchObject({
    displayName: "Alpha Draft Identity",
    logoUrl: preservedDraftState.logoUrl,
    accentColor: preservedDraftState.accentColor,
    secondaryColor: preservedDraftState.secondaryColor,
    backgroundColor: preservedDraftState.backgroundColor,
    textColor: preservedDraftState.textColor,
  });
  expect(publicAfterWarmPublish.tenant.publicSite.pages).toEqual(
    updated.draft.pages,
  );
  expect(publicAfterWarmPublish.tenant.publicSite.header).toEqual(
    preservedDraftState.header,
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-tenant-style]").first()).toHaveAttribute(
    "data-tenant-style",
    "warm-organic-v1",
  );
});

test("rejects stale revisions and leaves the winning draft intact", async ({
  request,
}) => {
  const headers = await authenticate(request, {
    slug: E2E.alphaSlug,
    email: USERS.owner,
  });
  const settingsResponse = await request.get(publicSiteSettingsUrl, {
    headers,
  });
  const settings = await settingsResponse.json();
  const revision = settings.editor.draftRevision;

  const winner = await request.patch(publicSiteSettingsUrl, {
    headers,
    data: {
      revision,
      patch: {
        branding: { displayName: "Winning draft" },
      },
    },
  });
  expect(winner.status()).toBe(200);

  const stale = await request.patch(publicSiteSettingsUrl, {
    headers,
    data: {
      revision,
      patch: {
        branding: { displayName: "Lost stale write" },
      },
    },
  });
  expect(stale.status()).toBe(409);
  await expect(stale.json()).resolves.toMatchObject({
    code: "PUBLIC_SITE_REVISION_CONFLICT",
  });

  const currentResponse = await request.get(publicSiteSettingsUrl, {
    headers,
  });
  const current = await currentResponse.json();
  expect(current.draft.branding.displayName).toBe("Winning draft");
});

test("enforces workspace permissions and tenant isolation", async ({
  request,
}) => {
  const viewerHeaders = await authenticate(request, {
    slug: E2E.alphaSlug,
    email: USERS.viewer,
  });
  const betaOwnerHeaders = await authenticate(request, {
    slug: E2E.betaSlug,
    email: USERS.betaOwner,
  });

  const viewerRead = await request.get(publicSiteSettingsUrl, {
    headers: viewerHeaders,
  });
  expect(viewerRead.status()).toBe(200);
  const viewerSettings = await viewerRead.json();

  const viewerWrite = await request.patch(publicSiteSettingsUrl, {
    headers: viewerHeaders,
    data: {
      revision: viewerSettings.editor.draftRevision,
      patch: {
        branding: { displayName: "Viewer takeover" },
      },
    },
  });
  expect(viewerWrite.status()).toBe(403);

  const viewerPublish = await request.post(`${publicSiteSettingsUrl}/publish`, {
    headers: viewerHeaders,
    data: {
      revision: viewerSettings.editor.draftRevision,
    },
  });
  expect(viewerPublish.status()).toBe(403);

  const betaSettingsResponse = await request.get(publicSiteSettingsUrl, {
    headers: betaOwnerHeaders,
  });
  expect(betaSettingsResponse.status()).toBe(200);
  const betaSettings = await betaSettingsResponse.json();
  expect(betaSettings.draft.branding.displayName).not.toBe("Viewer takeover");

  const betaPublic = await request.get(publicConfigUrl(E2E.betaSlug), {
    headers: {
      Origin: tenantOrigin(E2E.betaSlug),
    },
  });
  expect(betaPublic.status()).toBe(404);
});

test("rejects executable links, HTML and malformed colours", async ({
  request,
}) => {
  const headers = await authenticate(request, {
    slug: E2E.alphaSlug,
    email: USERS.owner,
  });
  const settingsResponse = await request.get(publicSiteSettingsUrl, {
    headers,
  });
  const settings = await settingsResponse.json();

  const unsafePayloads = [
    {
      branding: {
        logoUrl: "javascript:alert(document.domain)",
      },
    },
    {
      branding: {
        accentColor: "#fff;background:url(https://evil.test)",
      },
    },
    {
      login: {
        headline: {
          en: "<img src=x onerror=alert(1)>",
        },
      },
    },
    {
      footer: {
        legal: {
          privacy: "//evil.test/privacy",
        },
      },
    },
  ];

  for (const patch of unsafePayloads) {
    const response = await request.patch(publicSiteSettingsUrl, {
      headers,
      data: {
        revision: settings.editor.draftRevision,
        patch,
      },
    });
    expect(response.status()).toBe(400);
  }

  const unchangedResponse = await request.get(publicSiteSettingsUrl, {
    headers,
  });
  const unchanged = await unchangedResponse.json();
  expect(unchanged.editor.draftRevision).toBe(settings.editor.draftRevision);
});

test("serves the published identity on both the tenant subdomain and custom domain", async ({
  page,
  request,
}) => {
  const headers = await authenticate(request, {
    slug: E2E.alphaSlug,
    email: USERS.owner,
  });
  const settingsResponse = await request.get(publicSiteSettingsUrl, {
    headers,
  });
  const settings = await settingsResponse.json();

  const updateResponse = await request.patch(publicSiteSettingsUrl, {
    headers,
    data: {
      revision: settings.editor.draftRevision,
      patch: {
        branding: {
          displayName: "Alpha Across Domains",
          stylePreset: "modern-minimal-v1",
        },
      },
    },
  });
  expect(updateResponse.status()).toBe(200);
  const updated = await updateResponse.json();

  const publishResponse = await request.post(
    `${publicSiteSettingsUrl}/publish`,
    {
      headers,
      data: {
        revision: updated.editor.draftRevision,
      },
    },
  );
  expect(publishResponse.status()).toBe(200);

  await page.goto(tenantUrl(E2E.alphaSlug), {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByText("Alpha Across Domains", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator("[data-tenant-style]").first()).toHaveAttribute(
    "data-tenant-style",
    "modern-minimal-v1",
  );

  await page.goto(customTenantUrl(E2E.alphaCustomHostname), {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByText("Alpha Across Domains", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator("[data-tenant-style]").first()).toHaveAttribute(
    "data-tenant-style",
    "modern-minimal-v1",
  );
});
