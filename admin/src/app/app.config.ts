import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { en_US, provideNzI18n } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { IconDefinition } from '@ant-design/icons-angular';
import {
  StepForwardOutline,
  UserOutline,
  LeftOutline,
  PlusOutline,
  ShoppingOutline,
  MenuUnfoldOutline,
  MenuFoldOutline,
  DownOutline,
  LogoutOutline,
  PictureOutline,
  EditOutline,
  DeleteOutline,
  AppstoreOutline,
  CreditCardOutline,
  AlipayCircleOutline,
  AreaChartOutline,
  QrcodeOutline,
  EyeOutline,
  EyeInvisibleOutline,
  OrderedListOutline,
  HistoryOutline,
  DashboardOutline,
  ArrowUpOutline
} from '@ant-design/icons-angular/icons';
import { authInterceptor } from './core/interceptors/auth.interceptor';

registerLocaleData(en);

const icons: IconDefinition[] = [
  StepForwardOutline,
  UserOutline,
  LeftOutline,
  PlusOutline,
  ShoppingOutline,
  MenuUnfoldOutline,
  MenuFoldOutline,
  DownOutline,
  LogoutOutline,
  PictureOutline,
  EditOutline,
  DeleteOutline,
  AppstoreOutline,
  EyeOutline,
  EyeInvisibleOutline,
  CreditCardOutline,
  AlipayCircleOutline,
  AreaChartOutline,
  QrcodeOutline,
  OrderedListOutline,
  HistoryOutline,
  DashboardOutline,
  ArrowUpOutline
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideNzI18n(en_US),
    importProvidersFrom(FormsModule),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideNzIcons(icons),
    provideCharts(withDefaultRegisterables())
  ]
};

