import { useEffect, useMemo, useState } from 'react';
import type { HorizonContext } from '@netsapiens/horizon-sdk';

type AnyComp = React.ComponentType<any>;

type Location = {
  id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

const LOCATIONS: Location[] = [
  { id: 'san-diego', city: 'San Diego', country: 'USA', latitude: 32.7157, longitude: -117.1611, timezone: 'America/Los_Angeles' },
  { id: 'new-york', city: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
  { id: 'london', city: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { id: 'tokyo', city: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  { id: 'sydney', city: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { id: 'sao-paulo', city: 'São Paulo', country: 'Brazil', latitude: -23.5505, longitude: -46.6333, timezone: 'America/Sao_Paulo' },
  { id: 'reykjavik', city: 'Reykjavík', country: 'Iceland', latitude: 64.1466, longitude: -21.9426, timezone: 'Atlantic/Reykjavik' },
];

type CurrentWeather = {
  time: string;
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  is_day: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weather_code: number;
  cloud_cover: number;
  pressure_msl: number;
  surface_pressure: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
};

type WeatherResponse = {
  latitude: number;
  longitude: number;
  timezone: string;
  current: CurrentWeather;
  current_units: Record<string, string>;
};

// https://open-meteo.com/en/docs#weathervariables (WMO weather interpretation codes)
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snowfall',
  73: 'Moderate snowfall',
  75: 'Heavy snowfall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

function describeWeather(code: number): string {
  return WEATHER_CODES[code] ?? `code ${code}`;
}

function compassFromDegrees(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(((deg % 360) / 22.5)) % 16];
}

const CURRENT_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'is_day',
  'precipitation',
  'rain',
  'showers',
  'snowfall',
  'weather_code',
  'cloud_cover',
  'pressure_msl',
  'surface_pressure',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
].join(',');

async function fetchWeather(loc: Location): Promise<WeatherResponse> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=${CURRENT_VARS}&timezone=${encodeURIComponent(loc.timezone)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status} ${res.statusText}`);
  return res.json();
}

type ZipResponse = {
  'post code': string;
  country: string;
  'country abbreviation': string;
  places: Array<{
    'place name': string;
    latitude: string;
    longitude: string;
    state?: string;
    'state abbreviation'?: string;
  }>;
};

async function geocodeZip(zip: string, country: string = 'us'): Promise<Location> {
  const trimmed = zip.trim();
  if (!trimmed) throw new Error('ZIP code is required');
  const res = await fetch(`https://api.zippopotam.us/${country}/${encodeURIComponent(trimmed)}`);
  if (res.status === 404) throw new Error(`ZIP code "${trimmed}" not found`);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status} ${res.statusText}`);
  const data: ZipResponse = await res.json();
  const place = data.places?.[0];
  if (!place) throw new Error(`No place found for ZIP "${trimmed}"`);
  const lat = parseFloat(place.latitude);
  const lon = parseFloat(place.longitude);
  return {
    id: `zip-${data['country abbreviation']}-${data['post code']}`,
    city: `${place['place name']}${place['state abbreviation'] ? `, ${place['state abbreviation']}` : ''} (${data['post code']})`,
    country: data.country,
    latitude: lat,
    longitude: lon,
    // Open-Meteo accepts 'auto' to pick the timezone from the coordinates
    timezone: 'auto',
  };
}

type Row = Location & {
  status: 'loading' | 'ok' | 'error';
  error?: string;
  weather?: WeatherResponse;
};

export default function SamplePage(horizonContext: HorizonContext) {
  const { PageTemplate, DatagridTemplate, SideTrayTemplate, SideTrayComponents } =
    horizonContext.ui.templates as Record<string, AnyComp> & {
      SideTrayComponents?: Record<string, AnyComp>;
    };
  const ui = horizonContext.ui as Record<string, any>;
  const Stack: AnyComp = ui.Stack;
  const Box: AnyComp = ui.Box ?? Stack;
  const Paper: AnyComp = ui.Paper;
  const Typography: AnyComp = ui.Typography;
  const Button: AnyComp = ui.Button;
  const Chip: AnyComp = ui.Chip;
  const TextField: AnyComp = ui.TextField;
  const Icon: AnyComp = ui.Icon;

  const [rows, setRows] = useState<Row[]>(
    LOCATIONS.map((l) => ({ ...l, status: 'loading' as const })),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zipInput, setZipInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const handleAddZip = async () => {
    setAddError(null);
    const zip = zipInput.trim();
    if (!zip) {
      setAddError('Enter a ZIP code');
      return;
    }
    setAdding(true);
    try {
      const loc = await geocodeZip(zip);
      // Skip if we already have this exact ZIP
      if (rows.some((r) => r.id === loc.id)) {
        setAddError(`Already showing ${loc.city}`);
        return;
      }
      setRows((prev) => [...prev, { ...loc, status: 'loading' as const }]);
      try {
        const weather = await fetchWeather(loc);
        setRows((prev) =>
          prev.map((r) => (r.id === loc.id ? { ...r, status: 'ok' as const, weather } : r)),
        );
        setZipInput('');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setRows((prev) =>
          prev.map((r) => (r.id === loc.id ? { ...r, status: 'error' as const, error: msg } : r)),
        );
      }
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    LOCATIONS.forEach((loc) => {
      fetchWeather(loc)
        .then((weather) => {
          if (cancelled) return;
          setRows((prev) =>
            prev.map((r) => (r.id === loc.id ? { ...r, status: 'ok', weather } : r)),
          );
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const msg = err instanceof Error ? err.message : String(err);
          setRows((prev) =>
            prev.map((r) => (r.id === loc.id ? { ...r, status: 'error', error: msg } : r)),
          );
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const columns = [
    { field: 'city', headerName: 'City', flex: 1, minWidth: 140 },
    { field: 'country', headerName: 'Country', flex: 1, minWidth: 120 },
    {
      field: 'temperature',
      headerName: 'Temp',
      flex: 1,
      minWidth: 100,
      valueGetter: (_v: unknown, row: Row) =>
        row.weather ? row.weather.current.temperature_2m : null,
      renderCell: ({ row }: { row: Row }) => {
        if (row.status === 'loading') return <Chip size="small" label="loading…" />;
        if (row.status === 'error') return <Chip size="small" color="error" label="error" />;
        const w = row.weather!;
        const unit = w.current_units?.temperature_2m ?? '°C';
        return (
          <Typography variant="body2">
            {w.current.temperature_2m}
            {unit}
          </Typography>
        );
      },
    },
    {
      field: 'conditions',
      headerName: 'Conditions',
      flex: 1.4,
      minWidth: 180,
      renderCell: ({ row }: { row: Row }) => {
        if (row.status !== 'ok' || !row.weather) return null;
        return (
          <Typography variant="body2">{describeWeather(row.weather.current.weather_code)}</Typography>
        );
      },
    },
    {
      field: 'wind',
      headerName: 'Wind',
      flex: 1,
      minWidth: 140,
      renderCell: ({ row }: { row: Row }) => {
        if (row.status !== 'ok' || !row.weather) return null;
        const w = row.weather.current;
        const unit = row.weather.current_units?.wind_speed_10m ?? 'km/h';
        return (
          <Typography variant="body2">
            {w.wind_speed_10m} {unit} {compassFromDegrees(w.wind_direction_10m)}
          </Typography>
        );
      },
    },
    {
      field: 'actions',
      headerName: '',
      flex: 0.6,
      minWidth: 120,
      sortable: false,
      renderCell: ({ row }: { row: Row }) => (
        <Button
          size="small"
          variant="outlined"
          disabled={row.status !== 'ok'}
          onClick={() => setSelectedId(row.id)}
        >
          Details
        </Button>
      ),
    },
  ];

  const renderTray = () => {
    if (!SideTrayTemplate) return null;
    const open = !!selected;
    const title = selected ? `${selected.city}, ${selected.country}` : 'Weather details';
    const subtitle = selected?.weather
      ? `${describeWeather(selected.weather.current.weather_code)} • ${selected.weather.current.time}`
      : undefined;

    return (
      <SideTrayTemplate
        title={title}
        subtitle={subtitle}
        isOpen={open}
        onClose={() => setSelectedId(null)}
        width="md"
        actions={[
          {
            label: 'Close',
            variant: 'secondary',
            onClick: () => setSelectedId(null),
          },
        ]}
      >
        <Box sx={{ p: 3 }}>
          {selected?.weather ? (
            <Stack direction="column" spacing={2}>
              {SideTrayComponents?.Section ? (
                <>
                  <SideTrayComponents.Section title="Location">
                    {SideTrayComponents.Field && (
                      <>
                        <SideTrayComponents.Field label="City" value={selected.city} />
                        <SideTrayComponents.Field label="Country" value={selected.country} />
                        <SideTrayComponents.Field
                          label="Latitude"
                          value={selected.weather.latitude}
                        />
                        <SideTrayComponents.Field
                          label="Longitude"
                          value={selected.weather.longitude}
                        />
                        <SideTrayComponents.Field
                          label="Timezone"
                          value={selected.weather.timezone}
                        />
                        <SideTrayComponents.Field
                          label="Observed at"
                          value={selected.weather.current.time}
                        />
                      </>
                    )}
                  </SideTrayComponents.Section>
                  {SideTrayComponents.Divider && <SideTrayComponents.Divider />}
                  <SideTrayComponents.Section title="Current conditions">
                    {SideTrayComponents.Field && (
                      <CurrentFields
                        current={selected.weather.current}
                        units={selected.weather.current_units}
                        Field={SideTrayComponents.Field}
                      />
                    )}
                  </SideTrayComponents.Section>
                </>
              ) : (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{ m: 0, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}
                  >
                    {JSON.stringify(selected.weather, null, 2)}
                  </Typography>
                </Paper>
              )}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {selected?.error ?? 'No weather loaded.'}
            </Typography>
          )}
        </Box>
      </SideTrayTemplate>
    );
  };

  return (
    <PageTemplate
      title="Sample Page"
      breadcrumbs={[
        { label: 'Apps', url: '/apps' },
        { label: 'Demo App with Auth', url: '/apps/demo-app-with-auth' },
        { label: 'Sample Page' },
      ]}
    >
      <Stack direction="column" spacing={3}>
        <Typography variant="body2" color="text.secondary">
          Live weather pulled from the free{' '}
          <a href="https://open-meteo.com" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{' '}
          API (no key required). Click <strong>Details</strong> to inspect a city in the side tray.
        </Typography>

        <DatagridTemplate
          data={rows}
          columns={columns}
          getRowId={(row: Row) => row.id}
          defaultPageSize={25}
          height="auto"
          toolbar={{
            enableSearch: true,
            toolbarPosition: 'top',
            customControls: (
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  label="US ZIP code"
                  size="small"
                  value={zipInput}
                  onChange={(e: any) => {
                    setZipInput(e.target.value);
                    if (addError) setAddError(null);
                  }}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter' && !adding) handleAddZip();
                  }}
                  error={!!addError}
                  helperText={addError ?? undefined}
                  disabled={adding}
                  placeholder="e.g. 92101"
                  sx={{ minWidth: 200 }}
                />
                <Button
                  variant="contained"
                  disabled={adding || zipInput.trim().length === 0}
                  startIcon={Icon ? <Icon icon="mdi:plus" /> : undefined}
                  onClick={handleAddZip}
                >
                  {adding ? 'Adding…' : 'Add City'}
                </Button>
              </Stack>
            ),
          }}
        />

        {renderTray()}
      </Stack>
    </PageTemplate>
  );
}

function CurrentFields({
  current,
  units,
  Field,
}: {
  current: CurrentWeather;
  units: Record<string, string>;
  Field: AnyComp;
}) {
  const fmt = (key: keyof CurrentWeather, custom?: (v: number) => string) => {
    const raw = current[key];
    if (raw === undefined || raw === null) return '—';
    if (custom) return custom(raw as number);
    const unit = units?.[key as string] ?? '';
    return `${raw}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <>
      <Field label="Temperature" value={fmt('temperature_2m')} />
      <Field label="Feels like" value={fmt('apparent_temperature')} />
      <Field label="Humidity" value={fmt('relative_humidity_2m')} />
      <Field
        label="Conditions"
        value={`${describeWeather(current.weather_code)} (code ${current.weather_code})`}
      />
      <Field label="Cloud cover" value={fmt('cloud_cover')} />
      <Field label="Daylight" value={current.is_day ? 'Day' : 'Night'} />
      <Field label="Precipitation" value={fmt('precipitation')} />
      <Field label="Rain" value={fmt('rain')} />
      <Field label="Showers" value={fmt('showers')} />
      <Field label="Snowfall" value={fmt('snowfall')} />
      <Field label="Pressure (MSL)" value={fmt('pressure_msl')} />
      <Field label="Surface pressure" value={fmt('surface_pressure')} />
      <Field label="Wind speed" value={fmt('wind_speed_10m')} />
      <Field
        label="Wind direction"
        value={`${current.wind_direction_10m}° (${compassFromDegrees(current.wind_direction_10m)})`}
      />
      <Field label="Wind gusts" value={fmt('wind_gusts_10m')} />
    </>
  );
}
