import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'poker-device-switch-modal',
  standalone: true,
  imports: [TPipe],
  templateUrl: './device-switch-modal.component.html',
  styleUrl: './device-switch-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceSwitchModalComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) switchUrl = ''
  @Input({ required: true }) expiresAt = ''
  @Input() expiresInSeconds = 0
  @Output() readonly close = new EventEmitter<void>()

  readonly copied = signal(false)
  readonly secondsRemaining = signal(0)
  readonly qrLoading = signal(true)
  readonly qrLoadFailed = signal(false)

  get qrCodeUrl() {
    return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(this.switchUrl)}`
  }

  private countdownId: ReturnType<typeof setInterval> | null = null
  private copiedResetId: ReturnType<typeof setTimeout> | null = null

  ngOnChanges(changes: SimpleChanges) {
    if (changes['switchUrl']) {
      this.qrLoading.set(true)
      this.qrLoadFailed.set(false)
    }

    if (changes['expiresAt'] || changes['expiresInSeconds']) {
      this.restartCountdown()
    }
  }

  ngOnDestroy() {
    this.clearCountdown()
    if (this.copiedResetId) {
      clearTimeout(this.copiedResetId)
      this.copiedResetId = null
    }
  }

  onOverlayClick() {
    this.close.emit()
  }

  onDialogClick(event: MouseEvent) {
    event.stopPropagation()
  }

  onQrCodeLoaded() {
    this.qrLoading.set(false)
    this.qrLoadFailed.set(false)
  }

  onQrCodeError() {
    this.qrLoading.set(false)
    this.qrLoadFailed.set(true)
  }

  async copyUrl() {
    if (!this.switchUrl.trim()) {
      return
    }

    try {
      await navigator.clipboard.writeText(this.switchUrl)
      this.copied.set(true)
      if (this.copiedResetId) {
        clearTimeout(this.copiedResetId)
      }
      this.copiedResetId = setTimeout(() => {
        this.copied.set(false)
        this.copiedResetId = null
      }, 2000)
    } catch {
      this.copied.set(false)
    }
  }

  formatCountdown() {
    const total = this.secondsRemaining()
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  private restartCountdown() {
    this.clearCountdown()

    if (this.expiresInSeconds > 0) {
      this.secondsRemaining.set(this.expiresInSeconds)
      this.countdownId = setInterval(() => {
        const next = Math.max(0, this.secondsRemaining() - 1)
        this.secondsRemaining.set(next)
        if (next <= 0) {
          this.clearCountdown()
        }
      }, 1000)
      return
    }

    this.updateCountdown()
    this.countdownId = setInterval(() => {
      this.updateCountdown()
    }, 1000)
  }

  private clearCountdown() {
    if (this.countdownId) {
      clearInterval(this.countdownId)
      this.countdownId = null
    }
  }

  private updateCountdown() {
    const expiresAtMs = new Date(this.expiresAt).getTime()
    const nowMs = Date.now()
    const remaining = Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000))
    this.secondsRemaining.set(remaining)

    if (remaining <= 0) {
      this.clearCountdown()
    }
  }
}
