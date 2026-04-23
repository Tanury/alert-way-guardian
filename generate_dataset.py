import pandas as pd
import json
import math
from collections import Counter

# ── Load datasets ──────────────────────────────────────────────
df1 = pd.read_csv('fake_crime_reports.csv')
df2 = pd.read_csv('safecity_reports_07082019.csv')

# ── Preprocess crime reports ───────────────────────────────────
df1['Date'] = pd.to_datetime(df1['Date'])
df1['Month'] = df1['Date'].dt.to_period('M').astype(str)
df1['Year']  = df1['Date'].dt.year

# Monthly trend per category
monthly = df1.groupby(['Month', 'Category']).size().reset_index(name='count')
monthly_dict = {}
for m in sorted(df1['Month'].unique()):
    monthly_dict[m] = {}
    sub = monthly[monthly['Month'] == m]
    for _, row in sub.iterrows():
        monthly_dict[m][row['Category']] = int(row['count'])

# Demographic breakdown
demo_list = (
    df1.groupby(['Category', 'Demographic'])
    .size()
    .reset_index(name='count')
    .to_dict('records')
)

# Victim age distribution
age_bins = pd.cut(
    df1['Victim Age'],
    bins=[0, 18, 25, 35, 50, 100],
    labels=['<18', '18-25', '26-35', '36-50', '50+']
)
age_dist = age_bins.value_counts().sort_index().to_dict()

# Weather vs category
weather_cat = (
    df1.groupby(['Weather', 'Category'])
    .size()
    .reset_index(name='count')
    .to_dict('records')
)

# Gender breakdown
gender = (
    df1.groupby(['Category', 'Victim Gender'])
    .size()
    .reset_index(name='count')
    .to_dict('records')
)

# KPIs
total            = len(df1)
assault_count    = int(df1[df1['Category'] == 'assault'].shape[0])
female_victims   = int(df1[df1['Victim Gender'] == 'female'].shape[0])

# ── Preprocess SafeCity ────────────────────────────────────────

# Category counts (multi-label, comma-separated)
cat_counter = Counter()
for cats in df2['CATEGORY'].dropna():
    for c in cats.split(','):
        c = c.strip()
        if c:
            cat_counter[c] += 1
sc_categories = [{'name': k, 'count': v} for k, v in cat_counter.most_common(12)]

# Hourly pattern
sc_hourly = (
    df2.groupby('HOUR')
    .size()
    .reset_index(name='count')
    .to_dict('records')
)

# Day-of-week pattern (preserve order)
dow_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
sc_dow = (
    df2.groupby('DAYOFWEEK')
    .size()
    .reindex(dow_order)
    .fillna(0)
    .reset_index(name='count')
    .to_dict('records')
)

# Country totals
sc_countries = (
    df2.groupby('COUNTRY')
    .size()
    .reset_index(name='count')
    .sort_values('count', ascending=False)
    .head(8)
    .to_dict('records')
)

# Map points — crime (grouped by location)
map_pts_crime = (
    df1.dropna(subset=['Latitude', 'Longitude'])
    .groupby(['Latitude', 'Longitude', 'Location Name'])
    .size()
    .reset_index(name='count')
    .head(50)
    .to_dict('records')
)

# Map points — SafeCity (sample 200)
map_pts_sc = (
    df2.dropna(subset=['LATITUDE', 'LONGITUDE'])
    .sample(min(200, len(df2)), random_state=42)
    [['LATITUDE', 'LONGITUDE', 'CATEGORY', 'CITY', 'COUNTRY']]
    .to_dict('records')
)

# Top cities
city_counts = (
    df2.groupby('CITY')
    .size()
    .reset_index(name='count')
    .sort_values('count', ascending=False)
    .head(10)
    .to_dict('records')
)

# ── Assemble output ────────────────────────────────────────────
data = {
    'kpis': {
        'total_incidents':  total,
        'assault_count':    assault_count,
        'female_victims':   female_victims,
        'female_pct':       round(female_victims / total * 100, 1),
        'safecity_total':   len(df2),
    },
    'monthly_trend':    monthly_dict,
    'demo_breakdown':   demo_list,
    'age_distribution': {str(k): int(v) for k, v in age_dist.items()},
    'weather_category': weather_cat,
    'gender_breakdown': gender,
    'sc_categories':    sc_categories,
    'sc_hourly':        sc_hourly,
    'sc_dow':           sc_dow,
    'sc_countries':     sc_countries,
    'map_crime':        map_pts_crime,
    'map_safecity':     map_pts_sc[:200],
    'sc_cities':        city_counts,
}

# ── Fix NaN / None values (JSON doesn't support NaN) ──────────
def fix_nans(obj):
    if isinstance(obj, float) and math.isnan(obj):
        return None
    elif isinstance(obj, dict):
        return {k: fix_nans(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [fix_nans(i) for i in obj]
    return obj

data = fix_nans(data)

# Remove city entries where CITY is None
data['sc_cities'] = [c for c in data['sc_cities'] if c.get('CITY') is not None]

# ── Write output ───────────────────────────────────────────────
output_path = 'src/data/dataset.json'
with open(output_path, 'w') as f:
    json.dump(data, f, indent=2)

print(f"✅  dataset.json written to {output_path}")
print(f"    Keys: {list(data.keys())}")
print(f"    Crime incidents : {total:,}")
print(f"    SafeCity reports: {len(df2):,}")