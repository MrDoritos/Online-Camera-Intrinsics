#!/bin/python3

import json
import csv
import os
import sys
import html

dry_run = False
sensors_directory_filepath = 'sensors/'
sensors_csv_all_filename = 'sensors_all.csv'
sensor_template_filename = 'sensors_template.json'
sensors_header_filename = 'sensors_header.csv'
sensors_cache_filename = 'sensors_cache.csv'
sensors_page_filename = 'sensors_page.html'
image_filetypes = ['bmp', 'png', 'webp', 'jpg', 'jpeg', 'gif']

#sensors_csv_all_fp, sensor_template_fp, sensors_header_fp, sensors_cache_fp, 

def create_data(sensors_header_fp, sensors_directory, sensors_page_fp):
    print('using directory:', sensors_directory)

    page_data = sensors_page_fp.read()
    sensors_header_csv = csv.reader(sensors_header_fp)
    sensors_header = [x for x in sensors_header_csv]

    for _, dirs, _ in os.walk(sensors_directory):
        for dir in dirs:
            n_dir = sensors_directory + dir + '/'
            for _, _, files in os.walk(n_dir):

                json_filepath = None
                image_filepaths = []
                

                for file in files:
                    if file.endswith('.json'):
                        json_filepath = file
                    elif file.endswith('.html'):
                        continue
                    elif sum(1 for x in image_filetypes if file.endswith(x)):
                        image_filepaths.append(file)
                    
                if not json_filepath or not len(json_filepath):
                    continue

                n_file = n_dir + json_filepath
                print('from:', n_file)

                with open(n_file) as sensor_json_fp:
                    sensor_json = json.load(sensor_json_fp)

                    page_tmp = page_data

                    sensor_properties = ''
                    sensor_images = ''

                    sensor_html_filepath = n_dir + 'index.html' #sensor_json['sensor-name']

                    for x in sensor_json:
                        key_esc = html.escape(str(x))
                        value_esc = html.escape(str(sensor_json[x]))

                        if x in sensors_header[0]:
                            h_i = sensors_header[0].index(x)
                            key_esc = html.escape(str(sensors_header[1][h_i]))
                        
                        page_tmp = page_tmp.replace(f'${x}', html.escape(str(sensor_json[x])))
                        
                        sensor_properties = sensor_properties + \
                        f'<div><b>{key_esc}:</b><span>{value_esc}</span></div>'

                    for x in image_filepaths:
                        sensor_images = sensor_images + \
                        f'<div><img src="{x}" /></div>'

                    page_tmp = page_tmp.replace('$sensor_properties', sensor_properties)
                    page_tmp = page_tmp.replace('$sensor_images', sensor_images)

                    with open(sensor_html_filepath, mode='w') as sensor_html_fp:
                        sensor_html_fp.write(page_tmp)

if not os.path.exists(sensors_directory_filepath):
    print('no sensor directory or bad directory:', sensors_directory_filepath)
    sys.exit(-1)

#with open(sensors_directory_filepath + sensor_template_filename) as sensor_template_file:
#    with open(sensors_directory_filepath + sensors_csv_all_filename, mode='w') as sensors_csv_all_file:
#        with open(sensors_directory_filepath + sensors_cache_filename, mode='w') as sensors_cache_file:
with open(sensors_directory_filepath + sensors_header_filename) as sensor_header_file:
    with open(sensors_directory_filepath + sensors_page_filename) as sensors_page_file:
        create_data(sensor_header_file, sensors_directory_filepath, sensors_page_file)

#sensors_csv_all_file, sensor_template_file, sensor_header_file, sensors_cache_file, 