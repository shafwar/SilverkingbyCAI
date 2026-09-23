import { getTranslations } from "next-intl/server";

function isRealMessage(value?: string | null): value is string {
  if (!value?.trim()) return false;
  if (/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+){2,}$/.test(value.trim())) return false;
  return true;
}

function stripRichTags(value: string): string {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export type ServerHeroSeoProps = {
  locale: string;
  namespace: string;
  titleKey?: string;
  titleBoldKey?: string;
  subtitleKey?: string;
  secondarySubtitleKey?: string;
  /** Pass empty string to omit tagline line */
  taglineKey?: string;
  /** Home: combine headline1–6 into one h1 */
  homeHeadlines?: boolean;
};

/**
 * Server-rendered hero copy for crawlers & first HTML paint (sr-only; visible UI stays client-animated).
 */
export async function ServerHeroSeo({
  locale,
  namespace,
  titleKey = "hero.title",
  titleBoldKey,
  subtitleKey = "hero.subtitle",
  secondarySubtitleKey = "hero.secondarySubtitle",
  taglineKey = "hero.tagline",
  homeHeadlines = false,
}: ServerHeroSeoProps) {
  const t = await getTranslations({ locale, namespace });

  let title: string | null = null;
  if (homeHeadlines) {
    const parts = [1, 2, 3, 4, 5, 6]
      .map((n) => t(`hero.headline${n}` as "hero.headline1"))
      .filter(isRealMessage);
    title = parts.length > 0 ? parts.join(" ") : isRealMessage(t("title")) ? t("title") : null;
  } else {
    const primary = t(titleKey);
    title = isRealMessage(primary) ? primary : null;
  }

  const titleBold = titleBoldKey ? t(titleBoldKey) : null;
  const subtitle = subtitleKey ? stripRichTags(t(subtitleKey)) : null;
  const secondary = secondarySubtitleKey ? t(secondarySubtitleKey) : null;
  const tagline = taglineKey ? t(taglineKey) : null;

  if (!title && !isRealMessage(subtitle) && !isRealMessage(tagline)) {
    return null;
  }

  return (
    <header className="sr-only" aria-label="Page introduction">
      {title ? (
        <h1>
          {title}
          {isRealMessage(titleBold) ? ` ${titleBold}` : null}
        </h1>
      ) : null}
      {isRealMessage(subtitle) ? <p>{subtitle}</p> : null}
      {isRealMessage(secondary) ? <p>{secondary}</p> : null}
      {isRealMessage(tagline) ? <p>{tagline}</p> : null}
    </header>
  );
}
