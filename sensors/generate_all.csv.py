#!/bin/python3

import json
import os
import sys
import csv
from typing import cast

dry_run = True
sensors_directory_filepath = 'sensors/'
sensors_csv_all_filename = 'sensors_all.csv'
sensor_template_filename = 'sensors_template.json'
sensors_header_filename = 'sensors_header.csv'
sensors_cache_filename = 'sensors_cache.csv'

def create_data(sensors_csv_all_fp, sensor_template_fp, sensors_header_fp, sensors_cache_fp, sensors_directory):
    print('using directory:', sensors_directory)

    template_json = json.load(sensor_template_fp)
    sensors_csv_all = csv.writer(sys.stdout)
    sensors_header = csv.reader(sensors_header_fp)
    sensors_cache = csv.writer(sys.stdout)

    if not dry_run:
        sensors_csv_all = csv.writer(sensors_csv_all_fp)
        sensors_cache = csv.writer(sensors_cache_fp)

    header = next(sensors_header)

    sensors_cache.writerow(header[0:2])
    sensors_csv_all.writerow(header)
    sensors_csv_all.writerows(sensors_header)

    for _, dirs, _ in os.walk(sensors_directory):
        for dir in dirs:
            n_dir = sensors_directory + dir + '/'
            for _, _, files in os.walk(n_dir):
                for file in files:
                    n_file = n_dir + file
                    print('from:', n_file)

                    with open(n_file) as sensor_json_fp:
                        sensor_json = json.load(sensor_json_fp)

                        values = [sensor_json[x] for x in header]
                        for i in range(len(values)):
                            if values[i] == 0:
                                values[i] = ''

                        sensors_csv_all.writerow(values)
                        sensors_cache.writerow(values[0:2])


if not os.path.exists(sensors_directory_filepath):
    print('no sensor directory or bad directory:', sensors_directory_filepath)
    sys.exit(-1)

with open(sensors_directory_filepath + sensor_template_filename) as sensor_template_file:
    with open(sensors_directory_filepath + sensors_csv_all_filename, mode='w') as sensors_csv_all_file:
        with open(sensors_directory_filepath + sensors_cache_filename, mode='w') as sensors_cache_file:
            with open(sensors_directory_filepath + sensors_header_filename) as sensor_header_file:
                create_data(sensors_csv_all_file, sensor_template_file, sensor_header_file, sensors_cache_file, sensors_directory_filepath)