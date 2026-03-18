import { routes } from './app.routes';
import { AdminComponent } from './features/admin/admin.component';

describe('app.routes', () => {
  it('defines default path that loads AdminComponent', () => {
    const defaultRoute = routes.find((r) => r.path === '');
    expect(defaultRoute).toBeDefined();
    expect(defaultRoute?.loadComponent).toBeDefined();
    return (defaultRoute!.loadComponent! as () => Promise<typeof AdminComponent>)().then((component) => {
      expect(component).toBe(AdminComponent);
    });
  });

  it('defines wildcard redirect to empty path', () => {
    const wildcard = routes.find((r) => r.path === '**');
    expect(wildcard).toBeDefined();
    expect(wildcard?.redirectTo).toBe('');
  });
});
