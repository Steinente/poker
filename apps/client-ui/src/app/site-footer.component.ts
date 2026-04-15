import { Component, ElementRef, HostListener, signal } from '@angular/core'
import { marked } from 'marked'
import { I18nService } from './core/i18n/i18n.service'
import type { TranslationLanguage } from './core/i18n/translations'
import { TPipe } from './shared/pipes/t.pipe'

@Component({
  selector: 'poker-site-footer',
  standalone: true,
  imports: [TPipe],
  template: `
    <footer class="site-legal" [attr.aria-label]="'legalFooterLabel' | t">
      <div class="site-legal-inner">
        <div class="site-rules">
          @if (rulesOpen()) {
            <div class="site-rules-popover">
              <h4 class="site-rules-title">{{ 'rulesPopoverTitle' | t }}</h4>

              @if (rulesLoading()) {
                <p class="site-rules-loading">{{ 'loading' | t }}...</p>
              } @else {
                <article
                  class="site-rules-markdown"
                  [innerHTML]="rulesHtml()"
                ></article>
              }
            </div>
          }

          <button
            type="button"
            class="site-rules-trigger"
            [attr.aria-expanded]="rulesOpen()"
            [attr.aria-label]="'rulesButtonLabel' | t"
            (click)="toggleRules()"
          >
            <img
              src="/icons/book-closed-brown.svg"
              alt=""
              aria-hidden="true"
              class="site-rules-logo"
            />
            <span class="site-rules-trigger-text">
              {{ 'rulesFooterTrigger' | t }}
            </span>
          </button>
        </div>

        <div class="site-legal-links">
          <a href="https://steinente.de/" class="site-legal-link">
            {{ 'mainPageTitle' | t }}
          </a>

          <a
            href="https://steinente.de/imprint?game=poker"
            class="site-legal-link"
          >
            {{ 'legalImprintTitle' | t }}
          </a>

          <a
            href="https://steinente.de/privacy?game=poker"
            class="site-legal-link"
          >
            {{ 'legalPrivacyTitle' | t }}
          </a>
        </div>

        <div class="site-donate">
          @if (donationOpen()) {
            <div class="site-donate-popover">
              <p class="site-donate-text">{{ 'donationPopoverText' | t }}</p>
              <a
                href="https://paypal.me/steinente"
                target="_blank"
                rel="noreferrer noopener"
                class="site-donate-link"
              >
                {{ 'donationLinkLabel' | t }}
              </a>
            </div>
          }

          <button
            type="button"
            class="site-donate-trigger"
            [attr.aria-expanded]="donationOpen()"
            [attr.aria-label]="'donationButtonLabel' | t"
            (click)="toggleDonation()"
          >
            <img
              src="/icons/paypal-logo.svg"
              alt=""
              aria-hidden="true"
              class="site-donate-logo"
            />
            <span class="site-donate-trigger-text">PayPal</span>
          </button>
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      .site-legal {
        flex: 0 0 auto;
        padding: 0 16px 18px;
      }

      .site-legal-inner {
        max-width: 1440px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 16px 24px;
      }

      .site-legal-links {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px 18px;
        flex-wrap: wrap;
        grid-column: 2;
      }

      .site-rules {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        grid-column: 1;
        justify-self: start;
      }

      .site-rules-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: 38px;
        padding: 8px 14px;
        border: 1px solid rgb(181 132 88 / 0.42);
        border-radius: 999px;
        background:
          linear-gradient(135deg, rgb(64 35 18 / 0.96), rgb(130 80 42 / 0.9)),
          linear-gradient(180deg, rgb(255 255 255 / 0.04), transparent);
        color: #fff4e6;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.02em;
        box-shadow: 0 10px 30px rgb(0 0 0 / 0.18);
      }

      .site-rules-trigger:focus-visible {
        outline: 2px solid rgb(255 199 142 / 0.95);
        outline-offset: 3px;
      }

      .site-rules-trigger:hover {
        border-color: rgb(232 176 122 / 0.68);
        box-shadow: 0 14px 34px rgb(0 0 0 / 0.24);
      }

      .site-rules-logo {
        display: block;
        width: 22px;
        height: 22px;
        flex: 0 0 auto;
        filter: drop-shadow(0 2px 8px rgb(0 0 0 / 0.28));
      }

      .site-rules-trigger-text {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .site-rules-popover {
        position: absolute;
        left: 0;
        bottom: calc(100% + 12px);
        width: min(560px, calc(100vw - 24px));
        max-height: min(70vh, 560px);
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        touch-action: pan-x pan-y;
        padding: 14px;
        border: 1px solid rgb(170 118 79 / 0.4);
        border-radius: 16px;
        background: linear-gradient(
          180deg,
          rgb(52 30 17 / 0.97),
          rgb(82 49 28 / 0.96)
        );
        box-shadow: 0 22px 48px rgb(0 0 0 / 0.28);
        backdrop-filter: blur(12px);
        z-index: 1002;
      }

      .site-rules-title {
        margin: 0;
        font-size: 15px;
      }

      .site-rules-loading {
        margin: 10px 0 2px;
        color: rgb(255 240 226 / 0.95);
        font-size: 12px;
        line-height: 1.45;
      }

      .site-rules-markdown {
        margin-top: 12px;
        color: rgb(255 238 221 / 0.95);
        font-size: 12px;
        line-height: 1.48;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      :host ::ng-deep .site-rules-markdown h1,
      :host ::ng-deep .site-rules-markdown h2,
      :host ::ng-deep .site-rules-markdown h3,
      :host ::ng-deep .site-rules-markdown h4 {
        margin: 14px 0 6px;
        line-height: 1.3;
      }

      :host ::ng-deep .site-rules-markdown h1 {
        font-size: 16px;
      }

      :host ::ng-deep .site-rules-markdown h2 {
        font-size: 14px;
      }

      :host ::ng-deep .site-rules-markdown h3,
      :host ::ng-deep .site-rules-markdown h4 {
        font-size: 13px;
      }

      :host ::ng-deep .site-rules-markdown p {
        margin: 7px 0;
      }

      :host ::ng-deep .site-rules-markdown ul,
      :host ::ng-deep .site-rules-markdown ol {
        margin: 6px 0 8px;
        padding-left: 18px;
      }

      :host ::ng-deep .site-rules-markdown li {
        margin: 3px 0;
      }

      :host ::ng-deep .site-rules-markdown a {
        color: #ffe1bf;
      }

      :host ::ng-deep .site-rules-markdown table {
        width: max-content;
        min-width: 100%;
        border-collapse: collapse;
        margin: 8px 0;
        font-size: 11px;
      }

      :host ::ng-deep .site-rules-markdown th,
      :host ::ng-deep .site-rules-markdown td {
        border: 1px solid rgb(236 187 137 / 0.25);
        padding: 6px;
        text-align: left;
        vertical-align: top;
      }

      :host ::ng-deep .site-rules-markdown th {
        background: rgb(255 220 185 / 0.08);
      }

      /* Visuelle Darstellung aller Bilder im Regeltext.
         width/height werden global in styles.css gesetzt. */
      :host ::ng-deep .site-rules-markdown img {
        border-radius: 4px;
        vertical-align: middle;
      }

      :host ::ng-deep .site-rules-markdown .rules-hand-ranking {
        display: grid;
        gap: 12px;
        padding-left: 22px;
      }

      :host ::ng-deep .site-rules-markdown .rules-hand-ranking > li {
        padding-left: 2px;
      }

      :host ::ng-deep .site-rules-markdown .rules-card-row {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 6px;
      }

      :host ::ng-deep .site-rules-markdown .rules-card {
        position: relative;
        display: inline-flex;
        flex-direction: column;
        justify-content: space-between;
        width: 44px;
        height: 66px;
        overflow: hidden;
        border: 2px solid #1e293b;
        border-radius: 8px;
        padding: 5px;
        background: #f8fafc;
        color: #111827;
        box-shadow: 0 3px 8px rgb(0 0 0 / 0.2);
        line-height: 1;
        user-select: none;
        -webkit-user-select: none;
      }

      :host ::ng-deep .site-rules-markdown .rules-card.hearts,
      :host ::ng-deep .site-rules-markdown .rules-card.diamonds {
        border-color: #dc2626;
        color: #dc2626;
      }

      :host ::ng-deep .site-rules-markdown .rules-card.clubs,
      :host ::ng-deep .site-rules-markdown .rules-card.spades {
        border-color: #1e293b;
        color: #111827;
      }

      :host ::ng-deep .site-rules-markdown .rules-card-value {
        position: relative;
        z-index: 1;
        font-size: 15px;
        font-weight: 800;
      }

      :host ::ng-deep .site-rules-markdown .rules-card-suit {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: 28px;
        opacity: 0.24;
      }

      :host ::ng-deep .site-rules-markdown .rules-card-title {
        display: none;
      }

      @media (max-width: 520px) {
        :host ::ng-deep .site-rules-markdown .rules-card {
          width: 39px;
          height: 58px;
          padding: 4px;
        }

        :host ::ng-deep .site-rules-markdown .rules-card-value {
          font-size: 13px;
        }

        :host ::ng-deep .site-rules-markdown .rules-card-suit {
          font-size: 24px;
        }

      }

      :host ::ng-deep .site-rules-markdown hr {
        border: 0;
        border-top: 1px solid rgb(236 187 137 / 0.25);
        margin: 10px 0;
      }

      .site-legal-link {
        text-decoration: none;
        color: rgb(159 176 201 / 0.82);
        font-size: 12px;
        line-height: 1.4;
        border-bottom: 1px solid transparent;
      }

      .site-legal-link:hover {
        color: var(--text);
        border-color: rgb(229 238 252 / 0.35);
      }

      .site-donate {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        grid-column: 3;
        justify-self: end;
      }

      .site-donate-trigger {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 42px;
        padding: 8px 14px 8px 10px;
        border: 1px solid rgb(109 145 198 / 0.24);
        border-radius: 999px;
        background:
          linear-gradient(135deg, rgb(14 38 74 / 0.96), rgb(28 92 182 / 0.85)),
          linear-gradient(180deg, rgb(255 255 255 / 0.04), transparent);
        color: #eff6ff;
        box-shadow: 0 10px 30px rgb(0 0 0 / 0.18);
      }

      .site-donate-trigger:focus-visible {
        outline: 2px solid rgb(255 221 115 / 0.9);
        outline-offset: 3px;
      }

      .site-donate-trigger:hover {
        border-color: rgb(160 198 255 / 0.45);
        box-shadow: 0 14px 34px rgb(0 0 0 / 0.24);
      }

      .site-donate-logo {
        display: block;
        width: auto;
        height: 20px;
        max-width: 72px;
        filter: drop-shadow(0 2px 8px rgb(0 0 0 / 0.24));
      }

      .site-donate-trigger-text {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .site-donate-popover {
        position: absolute;
        right: 0;
        bottom: calc(100% + 12px);
        width: min(340px, calc(100vw - 24px));
        padding: 14px;
        border: 1px solid rgb(84 136 214 / 0.34);
        border-radius: 16px;
        background: linear-gradient(
          180deg,
          rgb(13 24 42 / 0.97),
          rgb(18 39 73 / 0.96)
        );
        box-shadow: 0 22px 48px rgb(0 0 0 / 0.28);
        backdrop-filter: blur(12px);
        z-index: 1002;
      }

      .site-donate-text {
        margin: 0;
        color: rgb(229 238 252 / 0.94);
        font-size: 13px;
        line-height: 1.5;
      }

      .site-donate-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-top: 12px;
        padding: 9px 14px;
        border-radius: 999px;
        background: linear-gradient(135deg, #f6c44b, #ffdd73);
        color: #14213d;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
        box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.45);
      }

      .site-donate-link:hover {
        filter: brightness(1.04);
      }

      @media (max-width: 900px) {
        .site-legal {
          padding: 0 10px 16px;
        }
      }

      @media (max-width: 480px) {
        .site-legal {
          padding: 0 8px 14px;
        }

        .site-legal-inner {
          display: grid;
          grid-template-columns: 1fr auto;
          grid-template-areas:
            'rules donate'
            'links links';
          align-items: center;
          gap: 10px 12px;
        }

        .site-legal-links,
        .site-rules,
        .site-donate {
          width: auto;
          grid-column: auto;
        }

        .site-rules {
          grid-area: rules;
          justify-self: start;
        }

        .site-legal-links {
          grid-area: links;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px 12px;
          width: 100%;
        }

        .site-donate {
          grid-area: donate;
          justify-content: flex-end;
          flex: 0 0 auto;
          justify-self: end;
        }

        .site-rules-popover {
          left: 0;
          right: auto;
        }

        .site-donate-popover {
          left: auto;
          right: 0;
        }

        .site-legal-link {
          width: auto;
          white-space: nowrap;
        }
      }
    `,
  ],
})
export class SiteFooterComponent {
  protected readonly donationOpen = signal(false)
  protected readonly rulesOpen = signal(false)
  protected readonly rulesHtml = signal('')
  protected readonly rulesLoading = signal(false)

  private readonly rulesDocumentCache: Partial<
    Record<TranslationLanguage, string>
  > = {}
  private rulesContextLoaded: TranslationLanguage | null = null

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly i18n: I18nService,
  ) {}

  @HostListener('document:pointerdown', ['$event'])
  handleDocumentPointerDown(event: PointerEvent) {
    if (!this.donationOpen() && !this.rulesOpen()) {
      return
    }

    const eventTarget = event.target
    if (!(eventTarget instanceof Node)) {
      return
    }

    if (!this.elementRef.nativeElement.contains(eventTarget)) {
      this.donationOpen.set(false)
      this.rulesOpen.set(false)
    }
  }

  @HostListener('window:scroll')
  handleWindowScroll() {
    if (this.donationOpen() || this.rulesOpen()) {
      this.donationOpen.set(false)
      this.rulesOpen.set(false)
    }
  }

  @HostListener('document:touchmove', ['$event'])
  handleDocumentTouchMove(event: TouchEvent) {
    if (this.donationOpen() || this.rulesOpen()) {
      const eventTarget = event.target
      if (eventTarget instanceof Node && this.isInsidePopover(eventTarget)) {
        return
      }

      this.donationOpen.set(false)
      this.rulesOpen.set(false)
    }
  }

  private isInsidePopover(target: Node) {
    const element =
      target instanceof HTMLElement ? target : target.parentElement

    if (!element) {
      return false
    }

    return !!element.closest('.site-rules-popover, .site-donate-popover')
  }

  toggleDonation() {
    this.rulesOpen.set(false)
    this.donationOpen.update((currentValue) => !currentValue)
  }

  toggleRules() {
    this.donationOpen.set(false)
    const opening = !this.rulesOpen()
    this.rulesOpen.set(opening)

    if (opening) {
      void this.loadRulesDocument()
    }
  }

  private async loadRulesDocument() {
    const language = this.i18n.language()

    if (this.rulesContextLoaded === language && this.rulesHtml()) {
      return
    }

    const cachedForLanguage = this.rulesDocumentCache[language]
    if (cachedForLanguage) {
      this.rulesHtml.set(cachedForLanguage)
      this.rulesContextLoaded = language
      return
    }

    this.rulesLoading.set(true)

    try {
      const loaded = await this.fetchRulesForLanguage(language)
      const rendered = this.renderMarkdown(loaded)

      this.rulesDocumentCache[language] = rendered
      this.rulesHtml.set(rendered)
      this.rulesContextLoaded = language
    } catch {
      this.rulesHtml.set(this.i18n.t('rulesLoadFailed'))
      this.rulesContextLoaded = language
    } finally {
      this.rulesLoading.set(false)
    }
  }

  private renderMarkdown(markdown: string) {
    const renderer = new marked.Renderer()

    renderer.link = ({ href, title, tokens }) => {
      const text = this.parseInlineMarkdownTokens(tokens)
      const titleAttribute = title ? ` title="${title}"` : ''

      return `<a href="${href}" target="_blank" rel="noreferrer noopener"${titleAttribute}>${text}</a>`
    }

    const html = marked.parse(markdown, {
      gfm: true,
      breaks: true,
      renderer,
    }) as string

    return this.enhanceRuleCards(html)
  }

  private parseInlineMarkdownTokens(tokens: unknown[]) {
    return marked.parser(tokens as Parameters<typeof marked.parser>[0])
  }

  private enhanceRuleCards(html: string) {
    return html.replace(
      /<span class="rules-card ([^"]+)"><span class="rules-card-value">([^<]+)<\/span><span class="rules-card-suit">([^<]+)<\/span><span class="rules-card-title">([^<]+)<\/span><\/span>/g,
      (_match, suitClass: string, value: string, suitSymbol: string, suit: string) => {
        const label = this.buildRuleCardLabel(suit, value)

        return `<span class="rules-card ${suitClass}" role="img" aria-label="${this.escapeHtmlAttribute(
          label,
        )}"><span class="rules-card-value" aria-hidden="true">${value}</span><span class="rules-card-suit" aria-hidden="true">${suitSymbol}</span><span class="rules-card-title" aria-hidden="true">${suit}</span></span>`
      },
    )
  }

  private buildRuleCardLabel(suit: string, value: string) {
    return `${suit} ${this.ruleCardValueLabel(value)}`
  }

  private ruleCardValueLabel(value: string) {
    const faceCardLabels: Record<string, string> = {
      A: this.i18n.t('card.value.14'),
      K: this.i18n.t('card.value.13'),
      Q: this.i18n.t('card.value.12'),
      J: this.i18n.t('card.value.11'),
    }

    return faceCardLabels[value] ?? value
  }

  private escapeHtmlAttribute(value: string) {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  }

  private async fetchRulesForLanguage(language: TranslationLanguage) {
    const primaryUrl = `/content/rules.${language}.md`
    const fallbackUrl = '/content/rules.de.md'

    const primaryResponse = await fetch(primaryUrl)
    if (primaryResponse.ok) {
      return primaryResponse.text()
    }

    const fallbackResponse = await fetch(fallbackUrl)
    if (fallbackResponse.ok) {
      return fallbackResponse.text()
    }

    throw new Error('rules-fetch-failed')
  }
}
