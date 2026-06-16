import { useEffect, useMemo } from 'react';
import { useRemoteApp, type HorizonContext } from '@netsapiens/horizon-sdk';
import VariablesPage from './pages/VariablesPage';
import UiElementsPage from './pages/UiElementsPage';
import ApiCallsPage from './pages/ApiCallsPage';
import FunctionsPage from './pages/FunctionsPage';
import SamplePage from './pages/SamplePage';
import EventsPage from './pages/EventsPage';
import ExtensionPointsPage from './pages/ExtensionPointsPage';
import RemoteAuthDemo from './pages/RemoteAuthDemo';

export default function App(horizonContext: HorizonContext) {
  const { sdk } = useRemoteApp(horizonContext, 'demo-app-with-auth');

  const VariablesWithContext = useMemo(
    () => () => <VariablesPage {...horizonContext} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const UiElementsWithContext = useMemo(
    () => () => <UiElementsPage {...horizonContext} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const ApiCallsWithContext = useMemo(
    () => () => <ApiCallsPage {...horizonContext} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const FunctionsWithContext = useMemo(
    () => () => <FunctionsPage {...horizonContext} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const SampleWithContext = useMemo(
    () => () => <SamplePage {...horizonContext} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const EventsWithContext = useMemo(
    () => () => <EventsPage {...horizonContext} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const ExtensionPointsWithContext = useMemo(
    () => () => <ExtensionPointsPage {...horizonContext} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const RemoteAuthDemoWithContext = useMemo(
    () => () => <RemoteAuthDemo horizonContext={horizonContext} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    console.log('[demo-app-with-auth] registering routes');

    sdk.registerRoute({
      id: 'demo-app-with-auth.main',
      parentPath: '/apps',
      path: 'demo-app-with-auth',
      label: 'Demo App with Auth',
      icon: 'mdi:bug-outline',
      order: 200,
      component: VariablesWithContext,
    });

    sdk.registerRoute({
      id: 'demo-app-with-auth.variables',
      parentPath: '/apps/demo-app-with-auth',
      path: 'variables',
      label: 'Variables',
      icon: 'mdi:variable',
      order: 10,
      component: VariablesWithContext,
    });

    sdk.registerRoute({
      id: 'demo-app-with-auth.api-calls',
      parentPath: '/apps/demo-app-with-auth',
      path: 'api-calls',
      label: 'API Calls',
      icon: 'mdi:api',
      order: 15,
      component: ApiCallsWithContext,
    });

    sdk.registerRoute({
      id: 'demo-app-with-auth.functions',
      parentPath: '/apps/demo-app-with-auth',
      path: 'functions',
      label: 'Functions',
      icon: 'mdi:function-variant',
      order: 18,
      component: FunctionsWithContext,
    });

    sdk.registerRoute({
      id: 'demo-app-with-auth.ui-elements',
      parentPath: '/apps/demo-app-with-auth',
      path: 'ui-elements',
      label: 'UI Elements',
      icon: 'mdi:palette-outline',
      order: 20,
      component: UiElementsWithContext,
    });

    sdk.registerRoute({
      id: 'demo-app-with-auth.events',
      parentPath: '/apps/demo-app-with-auth',
      path: 'events',
      label: 'Events',
      icon: 'mdi:bell-ring-outline',
      order: 25,
      component: EventsWithContext,
    });

    sdk.registerRoute({
      id: 'demo-app-with-auth.extension-points',
      parentPath: '/apps/demo-app-with-auth',
      path: 'extension-points',
      label: 'Extension Points',
      icon: 'mdi:puzzle-outline',
      order: 28,
      component: ExtensionPointsWithContext,
    });

    sdk.registerRoute({
      id: 'demo-app-with-auth.sample',
      parentPath: '/apps/demo-app-with-auth',
      path: 'sample',
      label: 'Sample Page',
      icon: 'mdi:weather-partly-cloudy',
      order: 30,
      component: SampleWithContext,
    });

    sdk.registerRoute({
      id: 'demo-app-with-auth.remote-auth',
      parentPath: '/apps/demo-app-with-auth',
      path: 'remote-auth',
      label: 'Remote Auth',
      icon: 'mdi:shield-key-outline',
      order: 35,
      component: RemoteAuthDemoWithContext,
    });
  }, [sdk]);

  return null;
}
