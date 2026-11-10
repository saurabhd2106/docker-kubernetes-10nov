import { Component, inject, VERSION } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { catchError, map, of } from 'rxjs';

type Runtime =
  | { state: 'loading' }
  | { state: 'loaded'; hostname: string; port: string }
  | { state: 'dev' };

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  protected readonly angularVersion = VERSION.full;

  /** nginx serves /runtime.json in the container; `ng serve` has no such file, so a failure means dev mode. */
  protected readonly runtime = toSignal(
    inject(HttpClient)
      .get<{ hostname: string; port: string }>('/runtime.json')
      .pipe(
        map((info): Runtime => ({ state: 'loaded', ...info })),
        catchError(() => of<Runtime>({ state: 'dev' })),
      ),
    { initialValue: { state: 'loading' } as Runtime },
  );
}
