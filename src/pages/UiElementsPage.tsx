import { useState } from 'react';
import type { HorizonContext } from '@netsapiens/horizon-sdk';

type AnyComp = React.ComponentType<any>;

export default function UiElementsPage(horizonContext: HorizonContext) {
  const ui = horizonContext.ui as Record<string, any>;
  const {
    PageTemplate,
    DatagridTemplate,
    FormTemplate,
    SideTrayTemplate,
    SideTrayComponents,
    PageComponents,
    Icon: TplIcon,
  } = ui.templates as Record<string, AnyComp> & {
    PageComponents: Record<string, AnyComp>;
    SideTrayComponents: Record<string, AnyComp>;
  };

  const Stack: AnyComp = ui.Stack;
  const Box: AnyComp = ui.Box ?? Stack;
  const Paper: AnyComp = ui.Paper;
  const Typography: AnyComp = ui.Typography;
  const Divider: AnyComp = ui.Divider;
  const Chip: AnyComp = ui.Chip;
  const Avatar: AnyComp = ui.Avatar;
  const Alert: AnyComp = ui.Alert;
  const Button: AnyComp = ui.Button;
  const IconButton: AnyComp = ui.IconButton;
  const TextField: AnyComp = ui.TextField;
  const Select: AnyComp = ui.Select;
  const Checkbox: AnyComp = ui.Checkbox;
  const Radio: AnyComp = ui.Radio;
  const RadioGroup: AnyComp = ui.RadioGroup;
  const Switch: AnyComp = ui.Switch;
  const ToggleButton: AnyComp = ui.ToggleButton;
  const ToggleButtonGroup: AnyComp = ui.ToggleButtonGroup;
  const FormLabel: AnyComp = ui.FormLabel;
  const Tooltip: AnyComp = ui.Tooltip;
  const Icon: AnyComp = ui.Icon ?? TplIcon;

  const [text, setText] = useState('hello');
  const [checked, setChecked] = useState(true);
  const [switched, setSwitched] = useState(false);
  const [radio, setRadio] = useState('a');
  const [toggle, setToggle] = useState<string | null>('left');
  const [select, setSelect] = useState('one');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<unknown>('user');
  const [formActive, setFormActive] = useState<unknown>(true);
  const [trayOpen, setTrayOpen] = useState(false);
  const [trayInput, setTrayInput] = useState('');
  const [openCode, setOpenCode] = useState<Record<string, boolean>>({});

  const CodeBlock = ({ id, code }: { id: string; code: string }) => {
    const isOpen = !!openCode[id];
    const [copied, setCopied] = useState(false);
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } catch {
        /* ignore */
      }
    };
    return (
      <Stack direction="column" spacing={1} sx={{ mt: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant="text"
            onClick={() => setOpenCode((s) => ({ ...s, [id]: !isOpen }))}
            startIcon={
              Icon ? (
                <Icon icon={isOpen ? 'mdi:chevron-down' : 'mdi:chevron-right'} />
              ) : undefined
            }
          >
            {isOpen ? 'Hide source' : 'Show source'}
          </Button>
          {isOpen && (
            <Button size="small" variant="text" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          )}
        </Stack>
        {isOpen && (
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              bgcolor: 'action.hover',
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: 12,
              overflow: 'auto',
            }}
          >
            <pre style={{ margin: 0, whiteSpace: 'pre' }}>{code}</pre>
          </Paper>
        )}
      </Stack>
    );
  };

  const Section = ({
    id,
    title,
    available,
    code,
    children,
  }: {
    id: string;
    title: string;
    available: boolean;
    code?: string;
    children: React.ReactNode;
  }) => (
    <Stack direction="column" spacing={1}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h6">{title}</Typography>
        <Chip
          size="small"
          color={available ? 'success' : 'default'}
          label={available ? 'available' : 'not in SDK'}
        />
      </Stack>
      <Paper variant="outlined" sx={{ p: 2 }}>
        {available ? (
          children
        ) : (
          <Typography variant="body2" color="text.secondary">
            Not exposed on horizonContext.ui at runtime.
          </Typography>
        )}
      </Paper>
      {available && code && <CodeBlock id={id} code={code} />}
    </Stack>
  );

  const pageComponentNames = Object.keys(PageComponents ?? {});

  // Sample datagrid data
  const gridRows = [
    { id: 1, name: 'Alice', role: 'admin', status: 'active' },
    { id: 2, name: 'Bob', role: 'user', status: 'invited' },
    { id: 3, name: 'Carol', role: 'user', status: 'active' },
  ];
  const gridCols = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 120 },
    { field: 'role', headerName: 'Role', flex: 1, minWidth: 120 },
    { field: 'status', headerName: 'Status', flex: 1, minWidth: 120 },
  ];

  const codeTypography = `<Typography variant="h3">h3 heading</Typography>
<Typography variant="h4">h4 heading</Typography>
<Typography variant="h5">h5 heading</Typography>
<Typography variant="h6">h6 heading</Typography>
<Typography variant="subtitle1">subtitle1</Typography>
<Typography variant="subtitle2">subtitle2</Typography>
<Typography variant="body1">body1 — quick brown fox</Typography>
<Typography variant="body2">body2 — quick brown fox</Typography>
<Typography variant="caption">caption</Typography>
<Typography variant="overline">overline</Typography>
<Typography color="text.secondary">color=text.secondary</Typography>
<Typography color="error">color=error</Typography>`;

  const codeButton = `<Button variant="contained">contained</Button>
<Button variant="outlined">outlined</Button>
<Button variant="text">text</Button>
<Button variant="contained" color="primary">primary</Button>
<Button variant="contained" color="secondary">secondary</Button>
<Button variant="contained" color="success">success</Button>
<Button variant="contained" color="error">error</Button>
<Button variant="contained" disabled>disabled</Button>
<Button variant="contained" size="small">small</Button>
<Button variant="contained" size="large">large</Button>`;

  const codeIconButton = `<Icon icon="mdi:bug-outline" />
<Icon icon="mdi:bell-outline" />
<Icon icon="mdi:cog" />
<IconButton icon="mdi:pencil" size="small" />
<IconButton icon="mdi:delete" color="primary" />`;

  const codeTextField = `const [text, setText] = useState('hello');

<TextField
  label="Standard"
  value={text}
  onChange={(e) => setText(e.target.value)}
  size="small"
/>
<TextField label="With helper" helperText="some hint" size="small" />
<TextField label="Error" error helperText="bad value" size="small" />
<TextField label="Disabled" disabled size="small" defaultValue="x" />
<TextField label="Multiline" multiline rows={3} size="small" />`;

  const codeSelect = `const [select, setSelect] = useState('one');

<Select
  value={select}
  onChange={(e) => setSelect(e.target.value)}
  size="small"
  label="Pick one"
  options={[
    { value: 'one', label: 'One' },
    { value: 'two', label: 'Two' },
    { value: 'three', label: 'Three' },
  ]}
/>`;

  const codeCheckbox = `const [checked, setChecked] = useState(true);

<Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />
<Checkbox defaultChecked />
<Checkbox disabled />
<Checkbox disabled checked />`;

  const codeRadio = `const [radio, setRadio] = useState('a');

<RadioGroup
  row
  value={radio}
  onChange={(e) => setRadio(e.target.value)}
  label="Pick one"
  options={[
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C' },
  ]}
/>`;

  const codeSwitch = `const [switched, setSwitched] = useState(false);

<Switch checked={switched} onChange={(e) => setSwitched(e.target.checked)} />
<Switch defaultChecked />
<Switch disabled />
<Switch disabled checked />`;

  const codeToggle = `const [toggle, setToggle] = useState<string | null>('left');

<ToggleButtonGroup
  value={toggle}
  exclusive
  onChange={(_, v) => setToggle(v)}
  size="small"
  options={[
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
  ]}
/>`;

  const codeFormLabel = `<FormLabel>Form label text</FormLabel>`;

  const codeChip = `<Chip label="default" />
<Chip label="primary" color="primary" />
<Chip label="success" color="success" />
<Chip label="error" color="error" />
<Chip label="outlined" variant="outlined" />
<Chip size="small" label="small" />
<Chip label="deletable" onDelete={() => undefined} />`;

  const codeAvatar = `<Avatar>A</Avatar>
<Avatar sx={{ bgcolor: 'primary.main' }}>B</Avatar>
<Avatar sx={{ bgcolor: 'success.main' }}>C</Avatar>`;

  const codeTooltip = `<Tooltip title="I am a tooltip">
  <span>
    <Button variant="outlined">hover me</Button>
  </span>
</Tooltip>`;

  const codeAlert = `<Alert severity="info">info alert</Alert>
<Alert severity="success">success alert</Alert>
<Alert severity="warning">warning alert</Alert>
<Alert severity="error">error alert</Alert>`;

  const codeDivider = `<Typography variant="body2">above</Typography>
<Divider />
<Typography variant="body2">below</Typography>`;

  const codePaper = `<Paper sx={{ p: 1 }}>elevation default</Paper>
<Paper variant="outlined" sx={{ p: 1 }}>outlined</Paper>
<Paper elevation={4} sx={{ p: 1 }}>elevation 4</Paper>`;

  const codeStack = `<Stack direction="row" spacing={1}>
  <Paper sx={{ p: 1 }}>a</Paper>
  <Paper sx={{ p: 1 }}>b</Paper>
  <Paper sx={{ p: 1 }}>c</Paper>
</Stack>`;

  const codeBox = `<Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
  <Typography variant="body2">Box with sx styling</Typography>
</Box>`;

  const codeSideTray = `const [trayOpen, setTrayOpen] = useState(false);
const [trayInput, setTrayInput] = useState('');

<Button
  variant="contained"
  startIcon={<Icon icon="mdi:dock-right" />}
  onClick={() => setTrayOpen(true)}
>
  Open Side Tray
</Button>

<SideTrayTemplate
  title="Sample side tray"
  subtitle="Built with ui.templates.SideTrayTemplate"
  isOpen={trayOpen}
  onClose={() => setTrayOpen(false)}
  width="md"
  actions={[
    { label: 'Cancel', variant: 'secondary', onClick: () => setTrayOpen(false) },
    { label: 'Save', variant: 'primary', onClick: () => setTrayOpen(false) },
  ]}
>
  <Stack direction="column" spacing={2} sx={{ p: 3 }}>
    <SideTrayComponents.Section title="User">
      <SideTrayComponents.UserCard name="Alice Example" subtitle="alice@example.com" />
    </SideTrayComponents.Section>
    <SideTrayComponents.Section title="Details">
      <SideTrayComponents.Field label="Role" value="Admin" />
      <SideTrayComponents.Field label="Status" value="Active" />
      <SideTrayComponents.Field label="Created" value="2026-05-20" />
    </SideTrayComponents.Section>
    <SideTrayComponents.Divider />
    <SideTrayComponents.Section title="Notes">
      <SideTrayComponents.Input
        label="Comment"
        placeholder="Type something…"
        value={trayInput}
        onChange={(v) => setTrayInput(v)}
        multiline
        rows={3}
      />
    </SideTrayComponents.Section>
  </Stack>
</SideTrayTemplate>`;

  const codeDatagrid = `const rows = [
  { id: 1, name: 'Alice', role: 'admin', status: 'active' },
  { id: 2, name: 'Bob', role: 'user', status: 'invited' },
  { id: 3, name: 'Carol', role: 'user', status: 'active' },
];
const cols = [
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 120 },
  { field: 'role', headerName: 'Role', flex: 1, minWidth: 120 },
  { field: 'status', headerName: 'Status', flex: 1, minWidth: 120 },
];

<DatagridTemplate
  data={rows}
  columns={cols}
  getRowId={(r) => r.id}
  defaultPageSize={5}
  height="auto"
  toolbar={{ enableSearch: true }}
/>`;

  const codeForm = `const [formName, setFormName] = useState('');
const [formEmail, setFormEmail] = useState('');
const [formRole, setFormRole] = useState('user');
const [formActive, setFormActive] = useState(true);

<FormTemplate
  title="Sample form"
  subtitle="Driven entirely by the fields[] config"
  submitLabel="Save"
  cancelLabel="Cancel"
  onSubmit={() => undefined}
  onCancel={() => undefined}
  fields={[
    {
      name: 'name', label: 'Name', type: 'text',
      value: formName, onChange: (v) => setFormName(String(v ?? '')),
      required: true,
    },
    {
      name: 'email', label: 'Email', type: 'email',
      value: formEmail, onChange: (v) => setFormEmail(String(v ?? '')),
      placeholder: 'you@example.com',
    },
    {
      name: 'role', label: 'Role', type: 'select',
      value: formRole, onChange: (v) => setFormRole(v),
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'User', value: 'user' },
      ],
    },
    {
      name: 'active', label: 'Active', type: 'toggle',
      value: formActive, onChange: (v) => setFormActive(v),
    },
  ]}
/>`;

  const codePageComponents = `const { PageComponents } = ui.templates;

<PageComponents.StyledTextField
  placeholder="StyledTextField sample"
  size="small"
  fullWidth
/>`;

  return (
    <PageTemplate
      title="UI Elements"
      breadcrumbs={[
        { label: 'Apps', url: '/apps' },
        { label: 'Debug', url: '/apps/demo-app-with-auth' },
        { label: 'UI Elements' },
      ]}
    >
      <Stack direction="column" spacing={4}>
        <Typography variant="body2" color="text.secondary">
          Live showcase of every component exposed on{' '}
          <code>horizonContext.ui</code>. Click <strong>Show source</strong>{' '}
          below any example to see the code used to render it.
        </Typography>

        {SideTrayTemplate && (
          <Stack direction="column" spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="contained"
                startIcon={Icon ? <Icon icon="mdi:dock-right" /> : undefined}
                onClick={() => setTrayOpen(true)}
              >
                Open Side Tray
              </Button>
              <Typography variant="body2" color="text.secondary">
                Demo of <code>ui.templates.SideTrayTemplate</code>
              </Typography>
            </Stack>
            <CodeBlock id="sidetray" code={codeSideTray} />
          </Stack>
        )}

        {SideTrayTemplate && (
          <SideTrayTemplate
            title="Sample side tray"
            subtitle="Built with ui.templates.SideTrayTemplate"
            isOpen={trayOpen}
            onClose={() => setTrayOpen(false)}
            width="md"
            actions={[
              {
                label: 'Cancel',
                variant: 'secondary',
                onClick: () => setTrayOpen(false),
              },
              {
                label: 'Save',
                variant: 'primary',
                onClick: () => setTrayOpen(false),
              },
            ]}
          >
            {SideTrayComponents ? (
              <Stack direction="column" spacing={2} sx={{ p: 3 }}>
                {SideTrayComponents.Section && (
                  <SideTrayComponents.Section title="User">
                    {SideTrayComponents.UserCard && (
                      <SideTrayComponents.UserCard
                        name="Alice Example"
                        subtitle="alice@example.com"
                      />
                    )}
                  </SideTrayComponents.Section>
                )}
                {SideTrayComponents.Section && (
                  <SideTrayComponents.Section title="Details">
                    {SideTrayComponents.Field && (
                      <SideTrayComponents.Field label="Role" value="Admin" />
                    )}
                    {SideTrayComponents.Field && (
                      <SideTrayComponents.Field label="Status" value="Active" />
                    )}
                    {SideTrayComponents.Field && (
                      <SideTrayComponents.Field label="Created" value="2026-05-20" />
                    )}
                  </SideTrayComponents.Section>
                )}
                {SideTrayComponents.Divider && <SideTrayComponents.Divider />}
                {SideTrayComponents.Section && (
                  <SideTrayComponents.Section title="Notes">
                    {SideTrayComponents.Input && (
                      <SideTrayComponents.Input
                        label="Comment"
                        placeholder="Type something…"
                        value={trayInput}
                        onChange={(v: string) => setTrayInput(v)}
                        multiline
                        rows={3}
                      />
                    )}
                  </SideTrayComponents.Section>
                )}
              </Stack>
            ) : (
              <Box sx={{ p: 3 }}>
                <Typography variant="body2">
                  SideTrayComponents not exposed on this host.
                </Typography>
              </Box>
            )}
          </SideTrayTemplate>
        )}

        <Section
          id="typography"
          title="Typography"
          available={!!Typography}
          code={codeTypography}
        >
          <Stack direction="column" spacing={0.5}>
            <Typography variant="h3">h3 heading</Typography>
            <Typography variant="h4">h4 heading</Typography>
            <Typography variant="h5">h5 heading</Typography>
            <Typography variant="h6">h6 heading</Typography>
            <Typography variant="subtitle1">subtitle1</Typography>
            <Typography variant="subtitle2">subtitle2</Typography>
            <Typography variant="body1">body1 — quick brown fox</Typography>
            <Typography variant="body2">body2 — quick brown fox</Typography>
            <Typography variant="caption">caption</Typography>
            <Typography variant="overline">overline</Typography>
            <Typography color="text.secondary">color=text.secondary</Typography>
            <Typography color="error">color=error</Typography>
          </Stack>
        </Section>

        <Section id="button" title="Button" available={!!Button} code={codeButton}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="contained">contained</Button>
            <Button variant="outlined">outlined</Button>
            <Button variant="text">text</Button>
            <Button variant="contained" color="primary">primary</Button>
            <Button variant="contained" color="secondary">secondary</Button>
            <Button variant="contained" color="success">success</Button>
            <Button variant="contained" color="error">error</Button>
            <Button variant="contained" disabled>disabled</Button>
            <Button variant="contained" size="small">small</Button>
            <Button variant="contained" size="large">large</Button>
          </Stack>
        </Section>

        <Section
          id="iconbutton"
          title="IconButton + Icon"
          available={!!IconButton || !!Icon}
          code={codeIconButton}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            {Icon && <Icon icon="mdi:bug-outline" />}
            {Icon && <Icon icon="mdi:bell-outline" />}
            {Icon && <Icon icon="mdi:cog" />}
            {IconButton && <IconButton icon="mdi:pencil" size="small" />}
            {IconButton && <IconButton icon="mdi:delete" color="primary" />}
          </Stack>
        </Section>

        <Section
          id="textfield"
          title="TextField"
          available={!!TextField}
          code={codeTextField}
        >
          <Stack direction="column" spacing={1.5}>
            <TextField
              label="Standard"
              value={text}
              onChange={(e: any) => setText(e.target.value)}
              size="small"
            />
            <TextField label="With helper" helperText="some hint" size="small" />
            <TextField label="Error" error helperText="bad value" size="small" />
            <TextField label="Disabled" disabled size="small" defaultValue="x" />
            <TextField label="Multiline" multiline rows={3} size="small" />
          </Stack>
        </Section>

        <Section id="select" title="Select" available={!!Select} code={codeSelect}>
          <Select
            value={select}
            onChange={(e: any) => setSelect(e.target.value)}
            size="small"
            label="Pick one"
            options={[
              { value: 'one', label: 'One' },
              { value: 'two', label: 'Two' },
              { value: 'three', label: 'Three' },
            ]}
          />
        </Section>

        <Section
          id="checkbox"
          title="Checkbox"
          available={!!Checkbox}
          code={codeCheckbox}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Checkbox checked={checked} onChange={(e: any) => setChecked(e.target.checked)} />
            <Checkbox defaultChecked />
            <Checkbox disabled />
            <Checkbox disabled checked />
          </Stack>
        </Section>

        <Section
          id="radio"
          title="Radio / RadioGroup"
          available={!!Radio || !!RadioGroup}
          code={codeRadio}
        >
          {RadioGroup ? (
            <RadioGroup
              row
              value={radio}
              onChange={(e: any) => setRadio(e.target.value)}
              label="Pick one"
              options={[
                { value: 'a', label: 'Option A' },
                { value: 'b', label: 'Option B' },
                { value: 'c', label: 'Option C' },
              ]}
            />
          ) : (
            <Stack direction="row" spacing={1}>
              <Radio checked />
              <Radio />
            </Stack>
          )}
        </Section>

        <Section
          id="switch"
          title="Switch"
          available={!!Switch}
          code={codeSwitch}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Switch checked={switched} onChange={(e: any) => setSwitched(e.target.checked)} />
            <Switch defaultChecked />
            <Switch disabled />
            <Switch disabled checked />
          </Stack>
        </Section>

        <Section
          id="toggle"
          title="ToggleButton / ToggleButtonGroup"
          available={!!ToggleButton || !!ToggleButtonGroup}
          code={codeToggle}
        >
          {ToggleButtonGroup ? (
            <ToggleButtonGroup
              value={toggle}
              exclusive
              onChange={(_: any, v: string | null) => setToggle(v)}
              size="small"
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
              ]}
            />
          ) : (
            <ToggleButton value="x">solo</ToggleButton>
          )}
        </Section>

        <Section
          id="formlabel"
          title="FormLabel"
          available={!!FormLabel}
          code={codeFormLabel}
        >
          <FormLabel>Form label text</FormLabel>
        </Section>

        <Section id="chip" title="Chip" available={!!Chip} code={codeChip}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label="default" />
            <Chip label="primary" color="primary" />
            <Chip label="success" color="success" />
            <Chip label="error" color="error" />
            <Chip label="outlined" variant="outlined" />
            <Chip size="small" label="small" />
            <Chip label="deletable" onDelete={() => undefined} />
          </Stack>
        </Section>

        <Section id="avatar" title="Avatar" available={!!Avatar} code={codeAvatar}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar>A</Avatar>
            <Avatar sx={{ bgcolor: 'primary.main' }}>B</Avatar>
            <Avatar sx={{ bgcolor: 'success.main' }}>C</Avatar>
          </Stack>
        </Section>

        <Section
          id="tooltip"
          title="Tooltip"
          available={!!Tooltip}
          code={codeTooltip}
        >
          <Tooltip title="I am a tooltip">
            <span>
              {Button ? <Button variant="outlined">hover me</Button> : 'hover me'}
            </span>
          </Tooltip>
        </Section>

        <Section id="alert" title="Alert" available={!!Alert} code={codeAlert}>
          <Stack direction="column" spacing={1}>
            <Alert severity="info">info alert</Alert>
            <Alert severity="success">success alert</Alert>
            <Alert severity="warning">warning alert</Alert>
            <Alert severity="error">error alert</Alert>
          </Stack>
        </Section>

        <Section
          id="divider"
          title="Divider"
          available={!!Divider}
          code={codeDivider}
        >
          <Stack direction="column" spacing={1}>
            <Typography variant="body2">above</Typography>
            <Divider />
            <Typography variant="body2">below</Typography>
          </Stack>
        </Section>

        <Section id="paper" title="Paper" available={!!Paper} code={codePaper}>
          <Stack direction="row" spacing={1}>
            <Paper sx={{ p: 1 }}>elevation default</Paper>
            <Paper variant="outlined" sx={{ p: 1 }}>outlined</Paper>
            <Paper elevation={4} sx={{ p: 1 }}>elevation 4</Paper>
          </Stack>
        </Section>

        <Section id="stack" title="Stack" available={!!Stack} code={codeStack}>
          <Stack direction="row" spacing={1}>
            <Paper sx={{ p: 1 }}>a</Paper>
            <Paper sx={{ p: 1 }}>b</Paper>
            <Paper sx={{ p: 1 }}>c</Paper>
          </Stack>
        </Section>

        <Section id="box" title="Box" available={!!ui.Box} code={codeBox}>
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2">Box with sx styling</Typography>
          </Box>
        </Section>

        <Divider />

        <Stack direction="column" spacing={1}>
          <Typography variant="h6">Templates</Typography>
          <Typography variant="body2" color="text.secondary">
            Higher-level layout templates from{' '}
            <code>ui.templates</code>.
          </Typography>
        </Stack>

        <Section
          id="datagrid"
          title="DatagridTemplate"
          available={!!DatagridTemplate}
          code={codeDatagrid}
        >
          <DatagridTemplate
            data={gridRows}
            columns={gridCols}
            getRowId={(r: any) => r.id}
            defaultPageSize={5}
            height="auto"
            toolbar={{ enableSearch: true }}
          />
        </Section>

        <Section
          id="form"
          title="FormTemplate"
          available={!!FormTemplate}
          code={codeForm}
        >
          <FormTemplate
            title="Sample form"
            subtitle="Driven entirely by the fields[] config"
            submitLabel="Save"
            cancelLabel="Cancel"
            onSubmit={() => undefined}
            onCancel={() => undefined}
            fields={[
              {
                name: 'name',
                label: 'Name',
                type: 'text',
                value: formName,
                onChange: (v: unknown) => setFormName(String(v ?? '')),
                required: true,
              },
              {
                name: 'email',
                label: 'Email',
                type: 'email',
                value: formEmail,
                onChange: (v: unknown) => setFormEmail(String(v ?? '')),
                placeholder: 'you@example.com',
              },
              {
                name: 'role',
                label: 'Role',
                type: 'select',
                value: formRole,
                onChange: (v: unknown) => setFormRole(v),
                options: [
                  { label: 'Admin', value: 'admin' },
                  { label: 'User', value: 'user' },
                ],
              },
              {
                name: 'active',
                label: 'Active',
                type: 'toggle',
                value: formActive,
                onChange: (v: unknown) => setFormActive(v),
              },
            ]}
          />
        </Section>

        <Section
          id="pagecomponents"
          title={`PageComponents (${pageComponentNames.length})`}
          available={pageComponentNames.length > 0}
          code={codePageComponents}
        >
          <Stack direction="column" spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Host-provided page-level components. Only{' '}
              <code>StyledTextField</code> is rendered here — others vary by
              host and may need specific props.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {pageComponentNames.map((n) => (
                <Chip key={n} size="small" label={n} />
              ))}
            </Stack>
            {PageComponents?.StyledTextField && (
              <Box sx={{ maxWidth: 320, pt: 1 }}>
                <PageComponents.StyledTextField
                  placeholder="StyledTextField sample"
                  size="small"
                  fullWidth
                />
              </Box>
            )}
          </Stack>
        </Section>
      </Stack>
    </PageTemplate>
  );
}
