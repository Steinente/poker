import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
} from '@angular/core'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'poker-device-switch-confirmation',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="device-switch-confirm-overlay">
      <div
        class="device-switch-confirm-dialog panel"
        role="dialog"
        aria-modal="true"
      >
        <h3>{{ 'deviceSwitch.confirmTitle' | t }}</h3>
        <p class="muted">{{ 'deviceSwitch.confirmMessage' | t }}</p>
        <div class="device-switch-confirm-actions">
          <button class="btn" type="button" (click)="cancel.emit()">
            {{ 'cancel' | t }}
          </button>
          <button
            class="btn btn-primary"
            type="button"
            (click)="confirm.emit()"
          >
            {{ 'deviceSwitch.confirmAction' | t }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .device-switch-confirm-overlay {
        position: fixed;
        inset: 0;
        z-index: 90;
        display: grid;
        place-items: center;
        background: rgb(2 6 23 / 0.78);
        padding: 20px;
      }

      .device-switch-confirm-dialog {
        width: min(420px, 100%);
        display: grid;
        gap: 12px;
      }

      .device-switch-confirm-dialog h3 {
        margin: 0;
      }

      .device-switch-confirm-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceSwitchConfirmationComponent {
  @Output() readonly confirm = new EventEmitter<void>()
  @Output() readonly cancel = new EventEmitter<void>()
}
