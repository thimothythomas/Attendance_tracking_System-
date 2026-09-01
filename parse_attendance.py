import pandas as pd
import json
import math

df = pd.read_excel('Daily Attendance Report_20260831.xls')

data = []
current_date = None

for index, row in df.iterrows():
    val5 = str(row['Unnamed: 5'])
    if '-2026' in val5 or '-26' in val5 or val5.startswith('0') or val5.startswith('1') or val5.startswith('2') or val5.startswith('3'):
        if len(val5.split('-')) == 3:
            current_date = val5
            continue
    
    name = row['Unnamed: 3']
    status = row['Unnamed: 17']
    emp_id = row['Unnamed: 2']
    
    if pd.notna(name) and pd.notna(status) and name != 'Name' and name != 'Company:':
        # Valid row
        data.append({
            'date': current_date,
            'emp_id': emp_id,
            'name': name,
            'shift': row['Unnamed: 5'] if pd.notna(row['Unnamed: 5']) else None,
            's_in_time': row['Unnamed: 6'] if pd.notna(row['Unnamed: 6']) else None,
            's_out_time': row['Unnamed: 8'] if pd.notna(row['Unnamed: 8']) else None,
            'in_time': row['Unnamed: 10'] if pd.notna(row['Unnamed: 10']) else None,
            'out_time': row['Unnamed: 11'] if pd.notna(row['Unnamed: 11']) else None,
            'work_duration': row['Unnamed: 12'] if pd.notna(row['Unnamed: 12']) else None,
            'overtime': row['Unnamed: 13'] if pd.notna(row['Unnamed: 13']) else None,
            'total_duration': row['Unnamed: 14'] if pd.notna(row['Unnamed: 14']) else None,
            'late_by': row['Unnamed: 15'] if pd.notna(row['Unnamed: 15']) else None,
            'early_going_by': row['Unnamed: 16'] if pd.notna(row['Unnamed: 16']) else None,
            'status': status.strip() if isinstance(status, str) else status,
            'punch_records': row['Unnamed: 19'] if pd.notna(row['Unnamed: 19']) else None
        })

print(f"Parsed {len(data)} records.")
with open('attendance_data.json', 'w') as f:
    json.dump(data, f, indent=2)
