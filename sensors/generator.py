#!/bin/python3

import json
import os
import sys
import csv
from typing import cast

dry_run = False
limit_generation = False
debug_mode = True

directory_filepath = 'sensors/'
all_csv_filename = 'sensors_all.csv'
template_filename = 'sensors_template.json'
header_filename = 'sensors_header.csv'
cache_filename = 'sensors_cache.csv'
format_filename = 'sensors_format.csv'
page_filename = 'sensors_page.html'
sensor_path = 'sensors.csv'

image_filetypes = ['bmp', 'png', 'webp', 'jpg', 'jpeg', 'gif']

#from_sensors.csv.py

def generate_sensors(sensor_fp, template_fp, header_fp, format_fp):
    template_json = json.load(template_fp)
    sensors_csv = csv.reader(sensor_fp)
    outline_csv = next(sensors_csv)
    friendly_csv = next(sensors_csv)
    values_csv = next(sensors_csv)
    step_csv = next(sensors_csv)
    calc_csv = next(sensors_csv)

    header_csv = csv.writer(sys.stdout)
    format_csv = csv.writer(sys.stdout)

    if not dry_run:
        header_csv = csv.writer(header_fp)
        format_csv = csv.writer(format_fp)

    outline = []
    friendly = []
    values = []
    steps = []
    calcs = []

    format_outline = []
    format_csv = []

#generate_all.csv.py

def generate_allcsv(all_csv_fp, template_fp, header_fp, cache_fp):
    template_json = json.load(template_fp)
    all_csv = csv.writer(sys.stdout)
    header_csv = csv.reader(header_fp)
    cache_csv = csv.writer(sys.stdout)

    if not dry_run:
        all_csv = csv.writer(all_csv_fp)
        cache_csv = csv.writer(cache_fp)

    header = next(header_csv)

    cache_csv.writerow(header[0:2])
    all_csv.writerow(header)
    all_csv.writerows(header_csv)

#generate_pages.py

def generate_pages(header_fp, page_fp):
    page_data = page_fp.read()
    header_csv = csv.reader(header_fp)
    header = [x for x in header_csv]

def run_sensors():
    template_path = directory_filepath + template_filename
    header_path = directory_filepath + header_filename
    format_path = directory_filepath + format_filename

    with open(template_path, mode='r') as template_fp:
        with open(header_path, mode='w') as header_fp:
            with open(format_path, mode='w') as format_fp:
                with open(sensor_path, mode='r') as sensor_fp:
                    generate_sensors(sensor_fp, template_fp, header_fp, format_fp)

def run_allcsv():
    template_path = directory_filepath + template_filename
    header_path = directory_filepath + header_filename
    cache_path = directory_filepath + cache_filename
    all_csv_path = directory_filepath + all_csv_filename

    with open(template_path, 'r') as template_fp:
        with open(header_path, 'w') as header_fp:
            with open(cache_path, 'w') as cache_fp:
                with open(all_csv_path, 'r') as all_csv_fp:
                    generate_allcsv(all_csv_fp, template_fp, header_fp, cache_fp)

def run_pages():
    header_path = directory_filepath + header_filename
    page_path = directory_filepath + page_filename

    with open(header_path, 'r') as header_fp:
        with open(page_path, 'r') as page_fp:
            generate_pages(header_fp, page_fp)

def compile_site():
    run_sensors()
    run_allcsv()
    run_pages()

compile_site()
