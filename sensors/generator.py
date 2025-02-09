#!/bin/python3

import json
import os
import sys
import csv
import html
import time
import argparse
from typing import cast

parser = argparse.ArgumentParser(
    prog="generator.py",
    description="Create site files",
    epilog="https://iansweb.org/",
    formatter_class=argparse.ArgumentDefaultsHelpFormatter
)

dry_run = False
limit_generation = False
debug_mode = True
extra_verbosity = False

directory_filepath = 'sensors/'
site_filepath = '.'

all_csv_filename = 'sensors_all.csv'
template_filename = 'sensors_template.json'
header_filename = 'sensors_header.csv'
cache_filename = 'sensors_cache.csv'
format_filename = 'sensors_format.csv'
page_filename = 'sensors_page.html'

sitemap_filename = 'sitemap.xml'
sensor_filename = 'sensors.csv'
robots_filename = 'robots.txt'
cname_filename = 'CNAME'

image_filetypes = ['bmp', 'png', 'webp', 'jpg', 'jpeg', 'gif']
sitemap_ignore = [sitemap_filename, cname_filename, './dev', './.gitignore', './.git', './README.md', '*.py']

sensors_target = 'sensors'
all_csv_target = 'all_csv'
pages_target = 'pages'
sitemap_target = 'sitemap'
robots_target = 'robots'

generator_targets = [sensors_target, all_csv_target, pages_target, sitemap_target, robots_target]
generator_skips = []

protocol = 'https://'
cname = 'localhost'

parser.add_argument('--site-path', default=site_filepath, dest='site_filepath', help='Site root directory')
parser.add_argument('--data-path', default=directory_filepath, dest='data_filepath', help='Data path relative to site root')
parser.add_argument('-v', '--verbose', default=debug_mode, action='store_true', dest='debug_mode', help='Debug mode')
parser.add_argument('--extra-verbose', default=extra_verbosity, action='store_true', dest='extra_verbosity', help='Extra verbosity')
parser.add_argument('-n', '--dry-run', default=dry_run, action='store_true', dest='dry_run', help="Don't make any changes on disk")
parser.add_argument('--target', default=generator_targets, action='extend', nargs='+', choices=generator_targets, dest='generator_targets', help='Override list of targets in pipeline')
parser.add_argument('--skip', default=generator_skips, action='extend', nargs='+', choices=generator_targets, dest='generator_skips', help='Skip a pipeline target')
parser.add_argument('--image-types', default=image_filetypes, action='extend', nargs='+', dest='image_filetypes', help='Set image extensions')
parser.add_argument('--sitemap-ignore', default=sitemap_ignore, action='extend', nargs='+', dest='sitemap_ignore', help='Set paths to be ignored by crawlers')
parser.add_argument('--cname-path', default=cname_filename, dest='cname_filename', help='Set cname with a file')
parser.add_argument('--cname', dest='cname', help='Ignores cname-path to set cname directly')
parser.add_argument('--protocol', default=protocol, dest='protocol', help='Set protocol')
parser.add_argument('--robots', default=robots_filename, dest='robots_filename', help='Set robots filename')

args = parser.parse_args()

site_filepath = args.site_filepath
directory_filepath = args.data_filepath
debug_mode = args.debug_mode
extra_verbosity = args.extra_verbosity
dry_run = args.dry_run
generator_targets = args.generator_targets
generator_skips = args.generator_skips
image_filetypes = args.image_filetypes
sitemap_ignore = args.sitemap_ignore
cname_filename = args.cname_filename
cname_arg = args.cname
protocol = args.protocol
robots_filename = args.robots_filename

directory_path = os.path.join(site_filepath, directory_filepath)

all_csv_path = os.path.join(directory_path, all_csv_filename)
template_path = os.path.join(directory_path, template_filename)
header_path = os.path.join(directory_path, header_filename)
cache_path = os.path.join(directory_path, cache_filename)
format_path = os.path.join(directory_path, format_filename)
page_path = os.path.join(directory_path, page_filename)

sensor_path = os.path.join(site_filepath, sensor_filename)
cname_path = os.path.join(site_filepath, cname_filename)
sitemap_path = os.path.join(site_filepath, sitemap_filename)
robots_path = os.path.join(site_filepath, robots_filename)

def fmt_dry(msg):
    if dry_run:
        return msg + ' (dry):'
    else:
        return msg + ':'

def check_or_terminate(file, name, target='', code=-1):
    if not os.path.exists(file):
        print(f'{name} is expected', end='')

        if target and len(target):
            print(f' for target "{target}"', end='')

        print(f' (given "{file}")')
        sys.exit(code)

def generate_sensors(sensor_fp, template_fp, header_fp, format_fp):
    print('dissolving', sensor_path)

    template_json = json.load(template_fp)
    sensors_csv = csv.reader(sensor_fp)
    outline_csv = next(sensors_csv)
    friendly_csv = next(sensors_csv)
    values_csv = next(sensors_csv)
    step_csv = next(sensors_csv)
    calc_csv = next(sensors_csv)

    dummy_file = open(os.devnull, mode='w')

    if extra_verbosity:
        dummy_file = sys.stdout

    header_csv = csv.writer(dummy_file)
    formats_csv = csv.writer(dummy_file)

    if not dry_run:
        header_csv = csv.writer(header_fp)
        formats_csv = csv.writer(format_fp)

    outline = []
    friendly = []
    values = []
    steps = []
    calcs = []

    format_outline = []
    format_csv = []

    for i in range(1, len(outline_csv)):
        if outline_csv[i] and len(outline_csv[i]):
            outline.append(outline_csv[i])
            friendly.append(friendly_csv[i])
            values.append(values_csv[i])
            steps.append(step_csv[i])
            calcs.append(calc_csv[i])

    header_csv.writerow(outline)
    header_csv.writerow(friendly)
    header_csv.writerow(values)
    header_csv.writerow(steps)
    header_csv.writerow(calcs)

    if debug_mode and extra_verbosity:
        print('directory:', directory_filepath)
        print('template:', json.dumps(template_json))
        print('outline:', outline)
        print('friendly:', friendly)

    is_preset = False

    if debug_mode:
        print('reading formats')

    for row in sensors_csv:
        if debug_mode and extra_verbosity:
            print(row)

        if row[0] == 'formats':
            is_preset = True
            format_outline = [x for x in row[1:] if len(x) > 0]
            formats_csv.writerow(format_outline)
            format_csv = row
            continue

        if row[0] == 'presets':
            is_preset = True
            break
    
        if not is_preset or len(row[1]) < 1:
            continue

        formats_csv.writerow([row[format_csv.index(x)] for x in format_outline])

    if debug_mode:
        print('reading presets')

    for row in sensors_csv:
        if debug_mode and extra_verbosity:
            print(row)

        if row[0] == 'presets':
            is_preset = True
            continue
        
        if not is_preset:
            continue

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

            if debug_mode and extra_verbosity:
                print(outline_csv[i], row[i], template_data, type(template_data))

            if not data or len(data) < 1 or data == 0:
                sensor_json[key] = template_data
            else:
                sensor_json[key] = cast_functions[type(template_data)](data)

        sensor_name_fs_safe = sensor_json['sensor-name']
        sensor_directory = directory_filepath + sensor_name_fs_safe + '/'
        sensor_json_file = sensor_directory + sensor_name_fs_safe + '.json'

        if not os.path.exists(sensor_directory):
            if debug_mode:
                print(fmt_dry('create directory'), sensor_directory)

            if not dry_run:
                os.makedirs(sensor_directory, exist_ok=True) 

        if debug_mode:
            print(fmt_dry('generating'), sensor_json_file)

        if not dry_run:
            with open(sensor_json_file, mode='w') as sensor_file:
                json.dump(sensor_json, sensor_file)

        if limit_generation:
            return

def generate_allcsv(all_csv_fp, template_fp, header_fp, cache_fp):
    print('compile', all_csv_filename, 'from sensor directories')

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

    for _, dirs, _ in os.walk(directory_filepath):
        for dir in dirs:
            n_dir = directory_filepath + dir + '/'
            for _, _, files in os.walk(n_dir):
                for file in files:
                    if not file.endswith('.json'):
                        continue

                    n_file = n_dir + file
                    
                    if debug_mode:
                        print('reading:', n_file)

                    with open(n_file, mode='r') as sensor_json_fp:
                        sensor_json = json.load(sensor_json_fp)

                        values = [sensor_json[x] for x in header]
                        
                        for i in range(len(values)):
                            if values[i] == 0:
                                values[i] = ''

                        all_csv.writerow(values)
                        cache_csv.writerow(values[0:2])

                    if limit_generation:
                        return

def generate_pages(header_fp, page_fp):
    print('generate pages using the API header file', header_filename)
    
    page_data = page_fp.read()
    header_csv = csv.reader(header_fp)
    header = [x for x in header_csv]

    for _, dirs, _ in os.walk(directory_filepath):
        for dir in dirs:
            n_dir = directory_filepath + dir + '/'
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

                if debug_mode:
                    print('reading:', n_file)

                with open(n_file, mode='r') as sensor_json_fp:
                    sensor_json = json.load(sensor_json_fp)

                    page_tmp = page_data

                    sensor_properties = ''
                    sensor_images = ''

                    sensor_html_filepath = n_dir + 'index.html'

                    for x in sensor_json:
                        key_esc = html.escape(str(x))
                        value_esc = html.escape(str(sensor_json[x]))

                        if x in header[0]:
                            h_i = header[0].index(x)
                            key_esc = html.escape(str(header[1][h_i]))

                        page_tmp = page_tmp.replace(f'${x}', html.escape(str(sensor_json[x])))

                        sensor_properties = sensor_properties + \
                        f'<div><b>{key_esc}:</b><span>{value_esc}</span></div>'

                    for x in image_filepaths:
                        sensor_images = sensor_images + \
                        f'<div><img src="{x}" /></div>'

                    page_tmp = page_tmp.replace('$sensor_properties', sensor_properties)
                    page_tmp = page_tmp.replace('$sensor_images', sensor_images)

                    if debug_mode:
                        print(fmt_dry('writing'), sensor_html_filepath)

                    if not dry_run:
                        with open(sensor_html_filepath, mode='w') as sensor_html_fp:
                            sensor_html_fp.write(page_tmp)

                    if limit_generation:
                        return

def generate_sitemap(sitemap_fp):
    print('generate', sitemap_filename, 'using site root')

    site_realpath = os.path.realpath(site_filepath)

    wildcards = [x for x in sitemap_ignore if '*' in x]
    realpaths = [os.path.realpath(os.path.join(site_realpath, x)) for x in sitemap_ignore if x not in wildcards]

    if debug_mode:
        print('wildcards:', wildcards)
        print('excluded paths:', realpaths)

    sitemap_fp.write(f'<?xml version="1.0" encoding="UTF-8"?>\n')
    sitemap_fp.write(f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')

    for path, _, files in os.walk(site_realpath):
        for file in files:
            filepath_real = os.path.realpath(os.path.join(path, file))
            filepath_rel = os.path.relpath(os.path.join(path, file))

            sitemap_entry_path = '/' + filepath_rel.lstrip('/')

            if sum(1 for x in wildcards if x.replace('*', '') in filepath_real):
                continue

            if filepath_real in realpaths or sum(1 for x in realpaths if x in filepath_real) > 0:
                continue

            if debug_mode:
                print('sitemap path:', filepath_rel)
                print('filesystem path:', filepath_real)

            last_modified = time.gmtime(os.stat(filepath_real).st_mtime)

            change_frequency = 'monthly'

            priority = 0.5 # default value

            sitemap_entry = \
f'''    <url>
        <loc>{protocol}{cname}{sitemap_entry_path}</loc>
        <lastmod>{time.strftime('%Y-%m-%d', last_modified)}</lastmod>
        <changefreq>{change_frequency}</changefreq>
        <priority>{priority}</priority>
    </url>\n'''
            sitemap_fp.write(sitemap_entry)

            if limit_generation:
                break
        if limit_generation:
            break
    
    sitemap_fp.write('</urlset>')

def generate_robots(robots_fp):
    print('generate',robots_filename)

    sitemap_sitepath = '/' + sitemap_filename.lstrip('/')

    robots_fp.write( \
f'''User-agent: *
Allow: /

Sitemap: {protocol}{cname}{sitemap_sitepath}''')

def run_sensors():
    check_or_terminate(sensor_path, 'sensor_path', sensors_target)
    check_or_terminate(template_path, 'template_path', sensors_target)

    with open(template_path, mode='r') as template_fp:
        with open(header_path, mode='w') as header_fp:
            with open(format_path, mode='w') as format_fp:
                with open(sensor_path, mode='r') as sensor_fp:
                    generate_sensors(sensor_fp, template_fp, header_fp, format_fp)

def run_allcsv():
    check_or_terminate(template_path, 'template_path', all_csv_target)
    check_or_terminate(header_path, 'header_path', all_csv_target)

    with open(template_path, 'r') as template_fp:
        with open(header_path, 'r') as header_fp:
            with open(cache_path, 'w') as cache_fp:
                with open(all_csv_path, 'w') as all_csv_fp:
                    generate_allcsv(all_csv_fp, template_fp, header_fp, cache_fp)

def run_pages():
    check_or_terminate(header_path, 'header_path', pages_target)
    check_or_terminate(page_path, 'page_path', pages_target)

    with open(header_path, 'r') as header_fp:
        with open(page_path, 'r') as page_fp:
            generate_pages(header_fp, page_fp)

def run_sitemap():
    with open(sitemap_path, 'w') as sitemap_fp:
        generate_sitemap(sitemap_fp)

def run_robots():
    with open(robots_path, 'w') as robots_fp:
        generate_robots(robots_fp)

generator_target_items = [
    [sensors_target, run_sensors],
    [all_csv_target, run_allcsv],
    [pages_target, run_pages],
    [sitemap_target, run_sitemap],
    [robots_target, run_robots]
]

def compile_site():
    for x in generator_target_items:
        target_name = x[0]

        if target_name in generator_targets and target_name not in generator_skips:
            x[1]()
        else:
            if debug_mode:
                print('skip target:', x[0])

def init():
    global cname

    if debug_mode:
        print(args)

    if not os.path.exists(site_filepath):
        print(f'can\'t continue without valid site root (given "{site_filepath}")')
        sys.exit(-1)

    if not os.path.exists(directory_path):
        if debug_mode:
            print(fmt_dry('create directory'), directory_path)

        if not dry_run:
            os.makedirs(directory_path, exist_ok=True)

    if cname_arg:
        cname = cname_arg
    else:
        if os.path.exists(cname_path):
            cname = open(cname_path, 'r').read().strip()
        else:
            print(f'cname_path is expected if cname is not defined (given "{cname_path}")')

    if debug_mode:
        print('using cname:', cname)

init()
compile_site()