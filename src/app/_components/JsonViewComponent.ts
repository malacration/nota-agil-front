import { Component, Input } from '@angular/core';
import { HighlightModule } from 'ngx-highlightjs';

@Component({
  standalone: true,
  selector: 'json-view',
  imports: [HighlightModule],
  template: `
    <pre><code [highlight]="jsonText" [language]="'json'"></code></pre>
  `
})
export class JsonViewComponent {
  @Input() set data(v: unknown) {
    this.jsonText = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  }
  jsonText = '';
}