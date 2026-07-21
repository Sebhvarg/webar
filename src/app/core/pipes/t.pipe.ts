import { ChangeDetectorRef, Pipe, PipeTransform, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { I18nService } from '../services/i18n.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false
})
export class TPipe implements PipeTransform, OnDestroy {
  private readonly subscription: Subscription;

  constructor(private i18n: I18nService, private cdr: ChangeDetectorRef) {
    this.subscription = this.i18n.language$.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  transform(key: string | null | undefined): string {
    if (!key) {
      return '';
    }
    return this.i18n.t(key);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
