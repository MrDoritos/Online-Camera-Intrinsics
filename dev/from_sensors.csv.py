#!/bin/python3

import json
import os
import sys
import csv
from typing import cast

dry_run = True
sensor_dir = 'sensors/'
sensor_table = 'sensors.csv'
sensor_header = 'sensors_header.csv'
sensor_template = 'sensors_template.json'

def create_data(sensors_csv_file, sensor_template_file, sensor_header_file, sensors_directory):
    print("directory:", sensors_directory)

    template_json = json.load(sensor_template_file)
    print("template:", json.dumps(template_json))

    sensors_csv = csv.reader(sensors_csv_file)
    outline_csv = next(sensors_csv)
    friendly_csv = next(sensors_csv)

    header_csv = csv.writer(sys.stdout)
    #if not dry_run:
    if True:
        header_csv = csv.writer(sensor_header_file)

    outline = []
    friendly = []

    for i in range(1, len(outline_csv)):
        if outline_csv[i] and len(outline_csv[i]):
            outline.append(outline_csv[i])
            friendly.append(friendly_csv[i])

    header_csv.writerow(outline)
    header_csv.writerow(friendly)

    print('outline:', outline)
    print('friendly:', friendly)

    is_preset = False

    for row in sensors_csv:
        if row[0] == 'presets':
            is_preset = True
            continue

        if not is_preset:
            continue

        #print(row) 

        sensor_json = json.loads('{}')

        cast_functions = {
            str: str,
            int: float,
            float: float,
            bool: bool,
            list: list,
            dict: dict
        }

        for x in template_json:
            i = outline_csv.index(x)
            data = row[i]
            key = x
            template_data = template_json[key]
            print(outline_csv[i], row[i], template_data, type(template_data))
            if not data or len(data) < 1 or data is 0:
                sensor_json[key] = template_data
            else:
                sensor_json[key] = cast_functions[type(template_data)](data)
                #sensor_json[key] = data

        #print(sensor_json)
        print(json.dumps(sensor_json))

        sensor_name_fs_safe = sensor_json['sensor-name']
        sensor_directory = sensors_directory + sensor_name_fs_safe + '/'
        
        if not os.path.exists(sensor_directory):
            if not dry_run:
                os.makedirs(sensor_directory, exist_ok=True)
            #print('make directory:', sensor_directory)
        #print('directory:', sensor_directory)

        sensor_json_file = sensor_directory + sensor_name_fs_safe + '.json'

        if not dry_run:
            with open(sensor_json_file, mode='w') as sensor_file:
                json.dump(sensor_json, sensor_file)

        print('write:', sensor_json_file)


if not os.path.exists(sensor_table):
    print('run in directory with "' + sensor_table + '"')
    sys.exit(-1)

if not os.path.exists(sensor_dir):
    print("make directory:", sensor_dir)
    if not dry_run:
        os.makedirs(sensor_dir, exist_ok=True)

with open(sensor_dir + sensor_template) as template_file:
    with open(sensor_dir + sensor_header, mode='w') as header_file:
        with open(sensor_table) as sensor_file:
            create_data(sensor_file, template_file, header_file, sensor_dir)
