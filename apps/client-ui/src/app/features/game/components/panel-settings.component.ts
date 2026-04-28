import { Component, EventEmitter, Input, Output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'poker-panel-settings',
  standalone: true,
  imports: [FormsModule, TPipe],
  template: `
    <div class="panel-settings">
      <button
        type="button"
        class="btn panel-settings-toggle"
        (click)="toggleOpen()"
        [attr.aria-expanded]="isOpen"
        aria-controls="panel-settings-content"
      >
        {{ 'panel.settings.label' | t }}
      </button>

      @if (isOpen) {
        <div
          id="panel-settings-content"
          class="panel panel-settings-content"
          role="group"
          [attr.aria-label]="'panel.settings.label' | t"
        >
          <label class="row">
            <input
              type="checkbox"
              [ngModel]="settingsVisible"
              (ngModelChange)="settingsChange.emit($event)"
            />
            <span>{{ 'settings.title' | t }}</span>
          </label>

          <label class="row" style="margin-top: 8px;">
            <input
              type="checkbox"
              [ngModel]="playersVisible"
              (ngModelChange)="playersChange.emit($event)"
            />
            <span>{{ 'player.plural' | t }}</span>
          </label>

          <label class="row" style="margin-top: 8px;">
            <input
              type="checkbox"
              [ngModel]="logVisible"
              (ngModelChange)="logChange.emit($event)"
            />
            <span>{{ 'panel.logs' | t }}</span>
          </label>

          <label class="row" style="margin-top: 8px;">
            <input
              type="checkbox"
              [ngModel]="previousVisible"
              (ngModelChange)="previousChange.emit($event)"
            />
            <span>{{ 'panel.previousRound' | t }}</span>
          </label>

          <label class="row" style="margin-top: 8px;">
            <input
              type="checkbox"
              [ngModel]="chatVisible"
              (ngModelChange)="chatChange.emit($event)"
            />
            <span>{{ 'panel.chat' | t }}</span>
          </label>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .panel-settings {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .panel-settings-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 64px;
        text-align: center;
        line-height: 1.2;
        white-space: normal;
      }

      .panel-settings-content {
        padding: 10px 12px;
        min-width: 180px;
      }

      @media (max-width: 900px) {
        .panel-settings {
          width: 100%;
          align-items: stretch;
        }

        .panel-settings-toggle {
          width: 100%;
          height: auto;
          min-height: 40px;
          padding-top: 10px;
          padding-bottom: 10px;
          justify-content: center;
        }

        .panel-settings-content {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
      }
    `,
  ],
})
export class PanelSettingsComponent {
  @Input({ required: true }) settingsVisible = true
  @Input({ required: true }) playersVisible = true
  @Input({ required: true }) logVisible = true
  @Input({ required: true }) previousVisible = true
  @Input({ required: true }) chatVisible = true

  @Output() readonly settingsChange = new EventEmitter<boolean>()
  @Output() readonly playersChange = new EventEmitter<boolean>()
  @Output() readonly logChange = new EventEmitter<boolean>()
  @Output() readonly previousChange = new EventEmitter<boolean>()
  @Output() readonly chatChange = new EventEmitter<boolean>()

  isOpen = false

  toggleOpen() {
    this.isOpen = !this.isOpen
  }
}
