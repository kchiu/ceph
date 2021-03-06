import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { PopoverModule } from 'ngx-bootstrap/popover';
import { ProgressbarModule } from 'ngx-bootstrap/progressbar';
import { ToastrModule } from 'ngx-toastr';

import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { configureTestBed, i18nProviders } from '../../../../testing/unit-test-helper';
import { PrometheusService } from '../../api/prometheus.service';
import { SettingsService } from '../../api/settings.service';
import { NotificationType } from '../../enum/notification-type.enum';
import { ExecutingTask } from '../../models/executing-task';
import { PipesModule } from '../../pipes/pipes.module';
import { AuthStorageService } from '../../services/auth-storage.service';
import { NotificationService } from '../../services/notification.service';
import { PrometheusAlertService } from '../../services/prometheus-alert.service';
import { PrometheusNotificationService } from '../../services/prometheus-notification.service';
import { SummaryService } from '../../services/summary.service';
import { NotificationsSidebarComponent } from './notifications-sidebar.component';

describe('NotificationsSidebarComponent', () => {
  let component: NotificationsSidebarComponent;
  let fixture: ComponentFixture<NotificationsSidebarComponent>;

  configureTestBed({
    imports: [
      HttpClientTestingModule,
      PipesModule,
      PopoverModule.forRoot(),
      ProgressbarModule.forRoot(),
      RouterTestingModule,
      ToastrModule.forRoot(),
      NoopAnimationsModule
    ],
    declarations: [NotificationsSidebarComponent],
    providers: [
      i18nProviders,
      PrometheusService,
      SettingsService,
      SummaryService,
      NotificationService
    ]
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NotificationsSidebarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('prometheus alert handling', () => {
    let prometheusAlertService: PrometheusAlertService;
    let prometheusNotificationService: PrometheusNotificationService;
    let prometheusAccessAllowed: boolean;

    const expectPrometheusServicesToBeCalledTimes = (n: number) => {
      expect(prometheusNotificationService.refresh).toHaveBeenCalledTimes(n);
      expect(prometheusAlertService.refresh).toHaveBeenCalledTimes(n);
    };

    beforeEach(() => {
      prometheusAccessAllowed = true;
      spyOn(TestBed.get(AuthStorageService), 'getPermissions').and.callFake(() => ({
        prometheus: { read: prometheusAccessAllowed }
      }));

      spyOn(TestBed.get(PrometheusService), 'ifAlertmanagerConfigured').and.callFake((fn) => fn());

      prometheusAlertService = TestBed.get(PrometheusAlertService);
      spyOn(prometheusAlertService, 'refresh').and.stub();

      prometheusNotificationService = TestBed.get(PrometheusNotificationService);
      spyOn(prometheusNotificationService, 'refresh').and.stub();
    });

    it('should not refresh prometheus services if not allowed', () => {
      prometheusAccessAllowed = false;
      fixture.detectChanges();

      expectPrometheusServicesToBeCalledTimes(0);
    });
    it('should first refresh prometheus notifications and alerts during init', () => {
      fixture.detectChanges();

      expect(prometheusAlertService.refresh).toHaveBeenCalledTimes(1);
      expectPrometheusServicesToBeCalledTimes(1);
    });

    it('should refresh prometheus services every 5s', fakeAsync(() => {
      fixture.detectChanges();

      expectPrometheusServicesToBeCalledTimes(1);
      tick(5000);
      expectPrometheusServicesToBeCalledTimes(2);
      tick(15000);
      expectPrometheusServicesToBeCalledTimes(5);
      component.ngOnDestroy();
    }));
  });

  describe('Running Tasks', () => {
    let summaryService: SummaryService;

    beforeEach(() => {
      fixture.detectChanges();
      summaryService = TestBed.get(SummaryService);

      spyOn(component, '_handleTasks').and.callThrough();
    });

    it('should handle executing tasks', () => {
      const running_tasks = new ExecutingTask('rbd/delete', {
        pool_name: 'somePool',
        image_name: 'someImage'
      });

      summaryService['summaryDataSource'].next({ executing_tasks: [running_tasks] });

      expect(component._handleTasks).toHaveBeenCalled();
      expect(component.executingTasks.length).toBe(1);
      expect(component.executingTasks[0].description).toBe(`Deleting RBD 'somePool/someImage'`);
    });
  });

  describe('Notifications', () => {
    it('should fetch latest notifications', fakeAsync(() => {
      const notificationService: NotificationService = TestBed.get(NotificationService);
      fixture.detectChanges();

      expect(component.notifications.length).toBe(0);

      notificationService.show(NotificationType.success, 'Sample title', 'Sample message');
      tick(6000);
      expect(component.notifications.length).toBe(1);
      expect(component.notifications[0].title).toBe('Sample title');
    }));
  });
});
