import { useEffect, useMemo, useState } from 'react';
import {
  type ExtensionComponentProps,
  type HorizonContext,
  useRemoteApp,
} from '@netsapiens/horizon-sdk';
import CodeBlock from '../components/CodeBlock';

type AnyComp = React.ComponentType<any>;

const PAGE_PATH = '/apps/demo-app-with-auth/extension-points';

// Route added live when the user clicks "Add to Demo Apps menu". Registering it
// makes a new nav item appear under the Demo App; unregistering removes it.
const DYNAMIC_ROUTE_ID = 'demo-app-with-auth.dynamic-injected';
const DYNAMIC_ROUTE_PATH = 'injected-page';
const DYNAMIC_ROUTE_FULL_PATH = `/apps/demo-app-with-auth/${DYNAMIC_ROUTE_PATH}`;

// Real header-zone extensions. PageTemplateWithExtensions renders these into the
// page header automatically — they show up as a real button + chip in the host
// chrome above this page, not a preview.
function HeaderActionExtension({ context }: ExtensionComponentProps) {
  const ui = context.ui as Record<string, AnyComp>;
  const Button = ui.Button;
  const Icon = ui.Icon;
  return (
    <Button
      variant="contained"
      startIcon={Icon ? <Icon icon="mdi:rocket-launch-outline" /> : undefined}
      onClick={() => alert('Header action clicked — injected into page-header-actions')}
    >
      Injected Action
    </Button>
  );
}

// Button injected into the global top app bar, next to the call widget. Matches
// the soft circular style of the host's native top-bar buttons (phone, video…).
function TopbarExtension({ context }: ExtensionComponentProps) {
  const ui = context.ui as Record<string, AnyComp>;
  const Button = ui.Button;
  const Icon = ui.Icon;
  const Tooltip = ui.Tooltip;
  const btn = (
    <Button
      color="primary"
      variant="soft"
      shape="circle"
      size="medium"
      aria-label="demo-app-with-auth extension"
      onClick={() => alert('Top bar button clicked — injected into topbar-actions')}
    >
      {Icon ? <Icon icon="mdi:puzzle-outline" sx={{ fontSize: 22 }} /> : 'Debug'}
    </Button>
  );
  return Tooltip ? <Tooltip title="Injected by demo-app-with-auth">{btn}</Tooltip> : btn;
}

// Real page footer — page-content-after renders below the page body.
function FooterExtension({ context }: ExtensionComponentProps) {
  const ui = context.ui as Record<string, AnyComp>;
  const Paper = ui.Paper;
  const Typography = ui.Typography;
  return (
    <Paper variant="outlined" sx={{ p: 2, borderColor: 'info.main' }}>
      <Typography variant="body2">
        <strong>Injected footer</strong> — rendered into <code>page-content-after</code>, below
        the page body.
      </Typography>
    </Paper>
  );
}

export default function ExtensionPointsPage(horizonContext: HorizonContext) {
  const { sdk } = useRemoteApp(horizonContext, 'demo-app-with-auth');

  const templates = horizonContext.ui.templates as Record<string, AnyComp>;
  const PageTemplateWithExtensions = templates.PageTemplateWithExtensions;
  const PageTemplate = templates.PageTemplate;
  const ui = horizonContext.ui as Record<string, any>;
  const Stack: AnyComp = ui.Stack;
  const Paper: AnyComp = ui.Paper;
  const Typography: AnyComp = ui.Typography;
  const Button: AnyComp = ui.Button;
  const Chip: AnyComp = ui.Chip;
  const Divider: AnyComp = ui.Divider;
  const Alert: AnyComp = ui.Alert;

  const [menuItemAdded, setMenuItemAdded] = useState(false);
  const [topbarAdded, setTopbarAdded] = useState(false);
  const [headerAdded, setHeaderAdded] = useState(false);
  const [footerAdded, setFooterAdded] = useState(false);

  // The page component rendered when the dynamically-added menu item is opened.
  const InjectedPage = useMemo(
    () => () => {
      const P: AnyComp = (horizonContext.ui.templates as Record<string, AnyComp>).PageTemplate;
      const T: AnyComp = (horizonContext.ui as Record<string, AnyComp>).Typography;
      return (
        <P
          title="Injected Page"
          breadcrumbs={[
            { label: 'Apps', url: '/apps' },
            { label: 'Demo App with Auth', url: '/apps/demo-app-with-auth' },
            { label: 'Injected Page' },
          ]}
        >
          <T variant="body1">
            This page and its menu item were added at runtime by clicking a button on the
            Extension Points page. Removing the menu item unregisters this route.
          </T>
        </P>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Register the real header extension for this page only, toggled on demand.
  useEffect(() => {
    if (!sdk || !headerAdded) return;
    sdk.registerDynamicExtension({
      id: 'demo-app-with-auth.demo.header-action',
      zone: 'page-header-actions',
      routes: [{ pattern: PAGE_PATH, exact: true }],
      priority: 50,
      component: HeaderActionExtension,
    });
    return () => {
      sdk.unregisterDynamicExtension('demo-app-with-auth.demo.header-action');
    };
  }, [sdk, headerAdded]);

  // Register the real footer extension for this page only, toggled on demand.
  useEffect(() => {
    if (!sdk || !footerAdded) return;
    sdk.registerDynamicExtension({
      id: 'demo-app-with-auth.demo.content-after',
      zone: 'page-content-after',
      routes: [{ pattern: PAGE_PATH, exact: true }],
      priority: 50,
      component: FooterExtension,
    });
    return () => {
      sdk.unregisterDynamicExtension('demo-app-with-auth.demo.content-after');
    };
  }, [sdk, footerAdded]);

  // Clean up the dynamic menu item + top bar button if still registered on unmount.
  useEffect(() => {
    return () => {
      if (!sdk) return;
      sdk.unregisterRoute(DYNAMIC_ROUTE_ID);
      sdk.unregisterDynamicExtension('demo-app-with-auth.demo.topbar');
    };
  }, [sdk]);

  const addMenuItem = () => {
    if (!sdk) return;
    sdk.registerRoute({
      id: DYNAMIC_ROUTE_ID,
      parentPath: '/apps/demo-app-with-auth',
      path: DYNAMIC_ROUTE_PATH,
      label: 'Injected Page',
      icon: 'mdi:plus-box-outline',
      order: 40,
      component: InjectedPage,
    });
    setMenuItemAdded(true);
  };

  const removeMenuItem = () => {
    if (!sdk) return;
    sdk.unregisterRoute(DYNAMIC_ROUTE_ID);
    setMenuItemAdded(false);
  };

  // Registers a global (all-routes) extension into the top app bar's
  // topbar-actions zone, so the button shows next to the call widget everywhere.
  const addTopbarButton = () => {
    if (!sdk) return;
    sdk.registerDynamicExtension({
      id: 'demo-app-with-auth.demo.topbar',
      zone: 'topbar-actions',
      routes: [{ pattern: '/*' }],
      priority: 50,
      component: TopbarExtension,
    });
    setTopbarAdded(true);
  };

  const removeTopbarButton = () => {
    if (!sdk) return;
    sdk.unregisterDynamicExtension('demo-app-with-auth.demo.topbar');
    setTopbarAdded(false);
  };

  const Body = (
    <Stack direction="column" spacing={3}>
      {Alert && (
        <Alert
          type="info"
          title="Real injection, on demand"
          message={
            "These controls inject real UI into the host — not previews. Buttons below add a live item to the Demo Apps menu (sdk.registerRoute) and a button to the global top bar next to the phone (topbar-actions). The header button and footer come from sdk.registerDynamicExtension into the page-header-actions and page-content-after zones."
          }
        />
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="column" spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Chip size="small" color="primary" label="sdk.registerRoute" />
            <Typography variant="subtitle2">Add an item to the Demo Apps menu</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Clicking Add registers a route under <code>/apps/demo-app-with-auth</code>. A new{' '}
            <strong>Injected Page</strong> item appears in the Demo App's left nav and is
            immediately navigable. Remove unregisters it.
          </Typography>
          <Divider />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="contained" disabled={menuItemAdded} onClick={addMenuItem}>
              Add to Demo Apps menu
            </Button>
            <Button variant="outlined" disabled={!menuItemAdded} onClick={removeMenuItem}>
              Remove
            </Button>
            {menuItemAdded && (
              <Button
                variant="text"
                onClick={() => horizonContext.navigate(DYNAMIC_ROUTE_FULL_PATH)}
              >
                Open injected page
              </Button>
            )}
          </Stack>
          {menuItemAdded && (
            <Typography variant="caption" color="success.main">
              Added — check the Demo App nav for "Injected Page".
            </Typography>
          )}
          <CodeBlock
            ui={ui}
            code={`sdk.registerRoute({\n  id: 'demo-app-with-auth.dynamic-injected',\n  parentPath: '/apps/demo-app-with-auth',\n  path: 'injected-page',\n  label: 'Injected Page',\n  icon: 'mdi:plus-box-outline',\n  component: InjectedPage,\n});\n// later: sdk.unregisterRoute('demo-app-with-auth.dynamic-injected');`}
          />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="column" spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Chip size="small" color="primary" label="topbar-actions" />
            <Typography variant="subtitle2">Add a button to the top bar (next to the phone)</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Registers a global extension into the <code>topbar-actions</code> zone. A bug-icon
            button appears in the top app bar next to the call widget, on every page, until removed.
          </Typography>
          <Divider />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="contained" disabled={topbarAdded} onClick={addTopbarButton}>
              Add top bar button
            </Button>
            <Button variant="outlined" disabled={!topbarAdded} onClick={removeTopbarButton}>
              Remove
            </Button>
          </Stack>
          {topbarAdded && (
            <Typography variant="caption" color="success.main">
              Added — look at the top app bar next to the phone icon.
            </Typography>
          )}
          <CodeBlock
            ui={ui}
            code={`sdk.registerDynamicExtension({\n  id: 'demo-app-with-auth.demo.topbar',\n  zone: 'topbar-actions',\n  routes: [{ pattern: '/*' }], // show on every route\n  component: TopbarButton,\n});`}
          />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="column" spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Chip size="small" color="primary" label="page-header-actions" />
            <Typography variant="subtitle2">Header button</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            The <strong>Injected Action</strong> button in this page's header is rendered from an
            extension registered into <code>page-header-actions</code>.
          </Typography>
          <Divider />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="contained" disabled={headerAdded} onClick={() => setHeaderAdded(true)}>
              Add header button
            </Button>
            <Button variant="outlined" disabled={!headerAdded} onClick={() => setHeaderAdded(false)}>
              Remove
            </Button>
          </Stack>
          {headerAdded && (
            <Typography variant="caption" color="success.main">
              Added — look in this page's header for "Injected Action".
            </Typography>
          )}
          <CodeBlock
            ui={ui}
            code={`sdk.registerDynamicExtension({\n  id: 'demo-app-with-auth.demo.header-action',\n  zone: 'page-header-actions',\n  routes: [{ pattern: '${PAGE_PATH}', exact: true }],\n  component: HeaderActionButton,\n});`}
          />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="column" spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Chip size="small" color="primary" label="page-content-after" />
            <Typography variant="subtitle2">Footer</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            The bordered footer below this page body is injected into{' '}
            <code>page-content-after</code>.
          </Typography>
          <Divider />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="contained" disabled={footerAdded} onClick={() => setFooterAdded(true)}>
              Add footer
            </Button>
            <Button variant="outlined" disabled={!footerAdded} onClick={() => setFooterAdded(false)}>
              Remove
            </Button>
          </Stack>
          {footerAdded && (
            <Typography variant="caption" color="success.main">
              Added — see the bordered footer below this page body.
            </Typography>
          )}
          <CodeBlock
            ui={ui}
            code={`sdk.registerDynamicExtension({\n  id: 'demo-app-with-auth.demo.content-after',\n  zone: 'page-content-after',\n  routes: [{ pattern: '${PAGE_PATH}', exact: true }],\n  component: FooterPanel,\n});`}
          />
        </Stack>
      </Paper>
    </Stack>
  );

  if (PageTemplateWithExtensions) {
    return (
      <PageTemplateWithExtensions
        title="Extension Points"
        subtitle="Inject real UI into the host on demand"
        breadcrumbs={[
          { label: 'Apps', url: '/apps' },
          { label: 'Demo App with Auth', url: '/apps/demo-app-with-auth' },
          { label: 'Extension Points' },
        ]}
      >
        {Body}
      </PageTemplateWithExtensions>
    );
  }

  return (
    <PageTemplate
      title="Extension Points"
      breadcrumbs={[
        { label: 'Apps', url: '/apps' },
        { label: 'Demo App with Auth', url: '/apps/demo-app-with-auth' },
        { label: 'Extension Points' },
      ]}
    >
      {Body}
    </PageTemplate>
  );
}
