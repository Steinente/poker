import { isPlatformBrowser, DOCUMENT } from '@angular/common'
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core'
import { SwUpdate } from '@angular/service-worker'
import { interval } from 'rxjs'
import { startWith } from 'rxjs/operators'

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly swUpdate = inject(SwUpdate)
  private readonly document = inject(DOCUMENT)

  readonly isOffline = signal(false)
  readonly updateAvailable = signal(false)

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return
    }

    this.isOffline.set(!navigator.onLine)

    window.addEventListener('online', () => this.isOffline.set(false))
    window.addEventListener('offline', () => this.isOffline.set(true))

    if (!this.swUpdate.isEnabled) {
      return
    }

    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.updateAvailable.set(true)
      }
    })

    interval(6 * 60 * 60 * 1000)
      .pipe(startWith(0))
      .subscribe(() => {
        void this.checkForUpdate()
      })
  }

  async activateUpdate() {
    if (!this.swUpdate.isEnabled) {
      return
    }

    await this.swUpdate.activateUpdate()
    this.document.location.reload()
  }

  private async checkForUpdate() {
    try {
      await this.swUpdate.checkForUpdate()
    } catch {
      // Ignore transient network/update check errors.
    }
  }
}
