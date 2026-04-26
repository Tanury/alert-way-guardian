import pandas as pd, json, math

df  = pd.read_csv('awg_dataset_jan2025_apr2026.csv')
emg = df[df['Emergency_Flag'] == 1]

def fix_nans(obj):
    if isinstance(obj, float) and math.isnan(obj): return None
    if isinstance(obj, dict):  return {k: fix_nans(v) for k, v in obj.items()}
    if isinstance(obj, list):  return [fix_nans(i) for i in obj]
    return obj

DOW_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

# ── KPIs ──────────────────────────────────────────────────────
kpis = {
    'total_records':      int(len(df)),
    'total_devices':      int(df['Device_ID'].nunique()),
    'total_emergencies':  int(len(emg)),
    'avg_response_sec':   round(float(emg['Response_Time_Sec'].mean()), 1),
    'avg_battery':        round(float(df['Battery_Pct'].mean()), 1),
    'total_zones':        int(df['Zone'].nunique()),
    'night_emergency_pct':round(float(emg['Is_Night'].mean()*100), 1),
    'violent_events':     int(df[df['Motion_Type']=='Violent'].shape[0]),
}

# ── Monthly trend ─────────────────────────────────────────────
monthly_emg  = emg.groupby('Month').size().reset_index(name='emergencies')
monthly_resp = df.groupby('Month')['Response_Time_Sec'].mean().round(1).reset_index(name='avg_response')
monthly_all  = df.groupby('Month').size().reset_index(name='total')
monthly = (monthly_all
    .merge(monthly_emg,  on='Month', how='left')
    .merge(monthly_resp, on='Month', how='left'))
monthly['emergencies'] = monthly['emergencies'].fillna(0).astype(int)
monthly_list = monthly.to_dict('records')

# ── Motion type per month ─────────────────────────────────────
motion_monthly = (df.groupby(['Month','Motion_Type'])
    .size().unstack(fill_value=0).reset_index())
motion_monthly.columns = [str(c) for c in motion_monthly.columns]
motion_monthly_list = motion_monthly.to_dict('records')

# ── Day-of-week pattern ───────────────────────────────────────
dow_emg = emg.groupby('Day_of_Week').size().reindex(DOW_ORDER).fillna(0).reset_index(name='emergencies')
dow_all = df.groupby('Day_of_Week').size().reindex(DOW_ORDER).fillna(0).reset_index(name='total')
dow = dow_all.merge(dow_emg, on='Day_of_Week').rename(columns={'Day_of_Week':'day'})
dow['day'] = dow['day'].str[:3]
dow_list = dow.to_dict('records')

# ── Hourly pattern ────────────────────────────────────────────
hourly_emg = emg.groupby('Hour').size().reset_index(name='emergencies')
hourly_all = df.groupby('Hour').size().reset_index(name='total')
hourly = hourly_all.merge(hourly_emg, on='Hour', how='left').fillna(0)
hourly['emergencies'] = hourly['emergencies'].astype(int)
hourly['hour_label'] = hourly['Hour'].apply(lambda h: f"{str(h).zfill(2)}:00")
hourly_list = hourly.to_dict('records')

# ── Day × Hour heatmap ────────────────────────────────────────
heatmap_raw = emg.groupby(['Day_of_Week','Hour']).size().reset_index(name='count')
heatmap_list = heatmap_raw.to_dict('records')

# ── Night vs Day ──────────────────────────────────────────────
night_day = {
    'night_emergencies': int(emg[emg['Is_Night']==1].shape[0]),
    'day_emergencies':   int(emg[emg['Is_Night']==0].shape[0]),
    'night_total':       int(df[df['Is_Night']==1].shape[0]),
    'day_total':         int(df[df['Is_Night']==0].shape[0]),
}

# ── Zone breakdown ────────────────────────────────────────────
zone_emg     = emg.groupby('Zone').size().reset_index(name='emergencies')
zone_all     = df.groupby('Zone').size().reset_index(name='total')
zone_resp    = emg.groupby('Zone')['Response_Time_Sec'].mean().round(1).reset_index(name='avg_response')
zone_sensors = df.groupby('Zone').agg(
    avg_accel   = ('Accel_Magnitude_ms2','mean'),
    avg_sound   = ('Sound_Level_dB',     'mean'),
    avg_lux     = ('Ambient_Lux',        'mean'),
    avg_battery = ('Battery_Pct',        'mean'),
    violent     = ('Motion_Type',        lambda x: (x=='Violent').sum()),
    abnormal    = ('Motion_Type',        lambda x: (x=='Abnormal').sum()),
).round(2).reset_index()
zones = (zone_all
    .merge(zone_emg,     on='Zone', how='left')
    .merge(zone_resp,    on='Zone', how='left')
    .merge(zone_sensors, on='Zone', how='left')
    .fillna(0))
zones_list = zones.to_dict('records')

# ── Severity / dispatch / response ────────────────────────────
severity_counts   = emg['Severity_Level'].value_counts().to_dict()
dispatch_df       = emg['Dispatch_Status'].value_counts().reset_index()
dispatch_df.columns = ['status','count']
dispatch_list     = dispatch_df.to_dict('records')
resp_severity     = (emg.groupby('Severity_Level')['Response_Time_Sec']
    .mean().round(1).reset_index())
resp_severity.columns = ['severity','avg_response_sec']
resp_severity_list = resp_severity.to_dict('records')

# ── User / motion / device state ──────────────────────────────
def vc(col): 
    t = df[col].value_counts().reset_index()
    t.columns = ['name','count']
    return t.to_dict('records')

user_type_list   = vc('User_Type')
motion_dist_list = vc('Motion_Type')
device_state_list= vc('Device_State')

# ── Device summary ────────────────────────────────────────────
device_summary = (df.groupby('Device_ID').agg(
    zone         = ('Zone',               'first'),
    user_type    = ('User_Type',          'first'),
    avg_battery  = ('Battery_Pct',        'mean'),
    emergencies  = ('Emergency_Flag',     'sum'),
    records      = ('Record_ID',          'count'),
    avg_accel    = ('Accel_Magnitude_ms2','mean'),
    avg_sound    = ('Sound_Level_dB',     'mean'),
).round(2).reset_index().to_dict('records'))

# ── Emergency log (30 most recent) ────────────────────────────
emg_cols = ['Device_ID','Date','Month','Hour','Day_of_Week','Is_Night',
            'Zone','User_Type','Severity_Level','Motion_Type',
            'Dispatch_Status','Response_Time_Sec','GPS_Lat','GPS_Long']
emg_log = (emg[emg_cols]
    .sort_values('Date', ascending=False)
    .head(30).to_dict('records'))

# ── Sensor stats ──────────────────────────────────────────────
sensor_stats = {}
for col, key in [('Accel_Magnitude_ms2','accel'),('Gyro_Magnitude_dps','gyro'),
                 ('Ambient_Lux','lux'),('Sound_Level_dB','sound'),
                 ('Battery_Pct','battery'),('Response_Time_Sec','response')]:
    sensor_stats[key] = {
        'min':  round(float(df[col].min()),2),
        'max':  round(float(df[col].max()),2),
        'mean': round(float(df[col].mean()),2),
    }

# ── Map points (all emergency + 400 normal) ───────────────────
gps = df[df['GPS_Fix']==1][['Device_ID','GPS_Lat','GPS_Long','Zone',
    'User_Type','Emergency_Flag','Severity_Level','Motion_Type','Is_Night']]
emg_pts  = gps[gps['Emergency_Flag']==1]
norm_pts = gps[gps['Emergency_Flag']==0].sample(min(400, len(gps[gps['Emergency_Flag']==0])), random_state=42)
map_points = pd.concat([emg_pts, norm_pts]).to_dict('records')

# ── Abnormal events ───────────────────────────────────────────
abnormal_events = (df[df['Motion_Type']!='Normal'][
    ['Device_ID','Date','Hour','Zone','Motion_Type',
     'Accel_Magnitude_ms2','Gyro_Magnitude_dps','Emergency_Flag','Severity_Level']
].head(40).to_dict('records'))

# ── Assemble & write ──────────────────────────────────────────
data = {
    'kpis':             kpis,
    'monthly_trend':    monthly_list,
    'motion_monthly':   motion_monthly_list,
    'dow_pattern':      dow_list,
    'hourly_pattern':   hourly_list,
    'heatmap':          heatmap_list,
    'night_day':        night_day,
    'zones':            zones_list,
    'severity_counts':  severity_counts,
    'dispatch':         dispatch_list,
    'resp_severity':    resp_severity_list,
    'user_type':        user_type_list,
    'motion_dist':      motion_dist_list,
    'device_state':     device_state_list,
    'device_summary':   device_summary,
    'emg_log':          emg_log,
    'sensor_stats':     sensor_stats,
    'map_points':       map_points,
    'abnormal_events':  abnormal_events,
}

data = fix_nans(data)

import os
os.makedirs('src/data', exist_ok=True)
with open('src/data/dataset.json','w') as f:
    json.dump(data, f, indent=2)

print(f' dataset.json written')
print(f'    {len(df):,} records · {kpis["total_devices"]} devices · {kpis["total_emergencies"]:,} emergencies')
print(f'    {len(map_points):,} map points · {len(monthly_list)} months · {len(heatmap_list)} heatmap cells')