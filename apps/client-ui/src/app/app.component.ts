import { Component, inject } from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
import { RouterOutlet } from '@angular/router'
import { AppInitService } from './core/services/app-init.service'
import { PwaInstallService } from './core/services/pwa-install.service'
import { PwaUpdateService } from './core/services/pwa-update.service'
import { SeoService } from './core/services/seo.service'
import { SiteFooterComponent } from './site-footer.component'
import { TPipe } from './shared/pipes/t.pipe'

@Component({
  selector: 'poker-root',
  standalone: true,
  imports: [RouterOutlet, NgComponentOutlet, TPipe],
  template: `
    <div class="app-shell">
      @if (pwaUpdate.isOffline()) {
        <div class="app-status-banner app-status-banner-offline">
          <span>{{ 'pwaOfflineMessage' | t }}</span>
        </div>
      }

      @if (pwaUpdate.updateAvailable()) {
        <div class="app-status-banner app-status-banner-update">
          <span>{{ 'pwaUpdateMessage' | t }}</span>
          <button
            type="button"
            class="btn btn-primary"
            (click)="activateUpdate()"
          >
            {{ 'pwaUpdateAction' | t }}
          </button>
        </div>
      }

      @if (showLocalModeBanner) {
        <div class="local-mode-banner" role="status" aria-live="polite">
          Local mode: This website is running locally for development testing.
        </div>
      }

      <main class="app-main">
        <router-outlet />
      </main>

      <ng-container *ngComponentOutlet="siteFooterComponent" />
    </div>
  `,
  styles: [
    `
      .app-status-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        border-bottom: 1px solid var(--border);
      }

      .app-status-banner-offline {
        background: rgb(127 29 29 / 0.35);
        color: #fecaca;
      }

      .app-status-banner-update {
        background: rgb(30 64 175 / 0.3);
        color: #dbeafe;
      }

      @media (max-width: 700px) {
        .app-status-banner {
          flex-direction: column;
          align-items: stretch;
        }
      }

      .local-mode-banner {
        width: min(1120px, calc(100% - 24px));
        margin: 12px auto 0;
        padding: 8px 12px;
        border: 1px solid rgb(245 158 11 / 0.45);
        border-radius: 10px;
        background: linear-gradient(
          180deg,
          rgb(120 53 15 / 0.82),
          rgb(146 64 14 / 0.78)
        );
        color: #fff8ea;
        font-size: 13px;
        font-weight: 700;
        text-align: center;
        letter-spacing: 0.01em;
        box-shadow: 0 8px 20px rgb(0 0 0 / 0.18);
      }
    `,
  ],
})
export class AppComponent {
  protected readonly siteFooterComponent = SiteFooterComponent
  protected readonly showLocalModeBanner = this.isLocalMode()
  protected readonly pwaUpdate = inject(PwaUpdateService)

  constructor(
    private readonly appInit: AppInitService,
    private readonly pwaInstall: PwaInstallService,
    private readonly seo: SeoService,
  ) {
    this.applyLocalModeTitlePrefix()
    this.appInit.init()
    this.pwaInstall.init()
    this.seo.init()
  }

  protected activateUpdate() {
    void this.pwaUpdate.activateUpdate()
  }

  private applyLocalModeTitlePrefix() {
    if (!this.showLocalModeBanner || typeof document === 'undefined') {
      return
    }

    const currentTitle = document.title.trim()
    if (currentTitle.startsWith('[Local]')) {
      return
    }

    document.title = `[Local] ${currentTitle}`
  }

  private isLocalMode() {
    if (typeof window === 'undefined') {
      return false
    }

    const host = window.location.hostname.toLowerCase()
    return host === 'localhost' || host === '127.0.0.1' || host === '::1'
  }
}
