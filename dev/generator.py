#!/bin/python3

import os
import sys
import html
import time
import csv
import argparse
import importlib
import shutil

class SensorParser:
    def __init__(self, sensor_path):
        self.sensor_path = sensor_path
        self.parsed = False

    def open(self):
        if self.parsed:
            return
        
        with open(self.sensor_path) as file:
            self.reader = csv.reader(file)
            self.parse()
        
        self.parsed = True
        
    def get(self, i):
        if i == 0:
            raise ValueError("0")
        if i == 1:
            return next(self.reader)
        if i == -1:
            return [row for row in self.reader]
        return [next(self.reader) for _ in range(i)]

    def skip(self, i):
        self.get(i)

    def dbvalue(value:str, delim:str=':'):
        if delim in value:
            index = value.index(delim)
            return (value[:index], value[index+1:])
        return value

    def dbfield(value:str, delim:str=';'):
        if delim in value:
            return list(map(SensorParser.dbvalue, value.split(delim)))
        return SensorParser.dbvalue(value)

    def dbparse(header:list[str], rows:list[list[str]], holdout:str="hold"):
        objs = []

        for row in rows:
            obj = {}
            for i in range(min(len(header), len(row))):
                field = header[i]
                if field is None or len(field) < 1:
                    continue
                value = row[i]
                if holdout is not None and value == holdout:
                    obj = None
                    break
                obj[field] = SensorParser.dbfield(value)
            if obj is not None:
                objs.append(obj)
        return objs

    def empty_outline(self):
        obj = {}
        for i in range(len(self.header)):
            field = self.header[i]
            if field is None or len(field) < 1:
                continue
            obj[field] = {}
            for j in range(len(self.outline)-1):
                obj[field][self.outline[len(self.outline)-1][j]] = self.outline[j+1][i]
        return obj

    def parse(self):
        self.outline = self.get(6)
        self.header = self.outline[0]
        self.skip(2)
        sensors = self.get(-1)
        self.sensors = []

        dbsensors = SensorParser.dbparse(self.header, sensors)
        for dbsensor in dbsensors:
            sensor = self.empty_outline()
            for field in dbsensor:
                sensor[field]['value'] = dbsensor[field]
            self.sensors.append(sensor)

parser = argparse.ArgumentParser(
    prog="generator.py",
    description="Create site files",
    epilog="https://iansweb.org/",
    formatter_class=argparse.ArgumentDefaultsHelpFormatter
)

dry_run = False
limit_generation = False
debug_mode = False
extra_verbosity = False
clean_sensor_dirs = False

directory_filepath = 'sensors/'
site_filepath = '.'

sensor_filename = 'sensors.csv'
page_filename = 'sensors_page.html'

sitemap_filename = 'sitemap.xml'
robots_filename = 'robots.txt'
cname_filename = 'CNAME'

image_filetypes = ['bmp', 'png', 'webp', 'jpg', 'jpeg', 'gif']
sitemap_ignore = [sitemap_filename, cname_filename, './dev', './.gitignore', './.git', './README.md', '*.py', '*./__pycache__']

sensors_target = 'sensors'
pages_target = 'pages'
sitemap_target = 'sitemap'
robots_target = 'robots'
clean_target = 'clean'

generator_targets = [sensors_target, pages_target, sitemap_target, robots_target]
all_targets = generator_targets + [clean_target]
generator_skips = []

protocol = 'https://'
cname = 'localhost'

parser.add_argument('--site-path', default=site_filepath, dest='site_filepath', help='Site root directory')
parser.add_argument('--data-path', default=directory_filepath, dest='data_filepath', help='Data path relative to site root')
parser.add_argument('-v', '--verbose', default=debug_mode, action='store_true', dest='debug_mode', help='Debug mode')
parser.add_argument('--extra-verbose', default=extra_verbosity, action='store_true', dest='extra_verbosity', help='Extra verbosity')
parser.add_argument('-n', '--dry-run', default=dry_run, action='store_true', dest='dry_run', help="Don't make any changes on disk")
parser.add_argument('--target', default=generator_targets, action='extend', nargs='+', choices=all_targets, dest='generator_targets', help='Override list of targets in pipeline')
parser.add_argument('--skip', default=generator_skips, action='extend', nargs='+', choices=all_targets, dest='generator_skips', help='Skip a pipeline target')
parser.add_argument('--image-types', default=image_filetypes, action='extend', nargs='+', dest='image_filetypes', help='Set image extensions')
parser.add_argument('--sitemap-ignore', default=sitemap_ignore, action='extend', nargs='+', dest='sitemap_ignore', help='Set paths to be ignored by crawlers')
parser.add_argument('--cname-path', default=cname_filename, dest='cname_filename', help='Set cname with a file')
parser.add_argument('--cname', dest='cname', help='Ignores cname-path to set cname directly')
parser.add_argument('--protocol', default=protocol, dest='protocol', help='Set protocol')
parser.add_argument('--robots', default=robots_filename, dest='robots_filename', help='Set robots filename')
parser.add_argument('--clean', default=clean_sensor_dirs, action='store_true', dest='clean_sensor_dirs', help='Clean sensor directory of any stale sensors without altered data')

args = parser.parse_args()

site_filepath = args.site_filepath
directory_filepath = args.data_filepath
debug_mode = args.debug_mode
extra_verbosity = args.extra_verbosity
dry_run = args.dry_run
clean_sensor_dirs = args.clean_sensor_dirs
generator_targets = args.generator_targets
generator_skips = args.generator_skips
image_filetypes = args.image_filetypes
sitemap_ignore = args.sitemap_ignore
cname_filename = args.cname_filename
cname_arg = args.cname
protocol = args.protocol
robots_filename = args.robots_filename

directory_path = os.path.join(site_filepath, directory_filepath)

page_path = os.path.join(directory_path, page_filename)
sensor_path = os.path.join(directory_filepath, sensor_filename)
sensordb = SensorParser(sensor_path)

cname_path = os.path.join(site_filepath, cname_filename)
sitemap_path = os.path.join(site_filepath, sitemap_filename)
robots_path = os.path.join(site_filepath, robots_filename)

wildcards = [x.replace('*', '') for x in sitemap_ignore if '*' in x]
non_wildcards = [x for x in sitemap_ignore if '*' not in x]

sensor_names = []

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

def foreach(iter, func):
    return [func(x) for x in iter]

def select(iter, attr:str):
    return [getattr(x, attr) for x in iter]

def any(iter, func):
    return sum([func(x) for x in iter])>0

def where(iter, func, neg:bool=False):
    return [x for x in iter if neg ^ func(x)]

def get_pages():
    pages = []
    for path, dirs, files in os.walk(site_filepath):
        if 'index.html' in files:
            pages.append(path)
    return pages

def get_generators():
    packages = []
    for path, subdir, files in os.walk(site_filepath):
        if '__init__.py' in files:
            module_name = os.path.basename(path)
            packages.append({
                path, 
                importlib.import_module(module_name)
            })
    return packages

def get_dirs(dir):
    dirs = [x for x in os.scandir(dir) if x.is_dir()]
    return sorted(dirs, key=lambda x: x.name)

def get_files(dir):
    files = [x for x in os.scandir(dir) if x.is_file()]
    return sorted(files, key=lambda x: x.name)

def get_sensor_dirs():
    return select(get_dirs(directory_filepath), 'name')

def get_server_filepath(path, is_file):
    return ('/' + os.path.relpath(path).lstrip('.')).rstrip('/')+('' if is_file else '/')

def get_server_path(path):
    return get_server_filepath(path, not path.endswith('index.html'))

def is_ignored_path(path):
    return any(wildcards, path.count) or any(non_wildcards, path.count)

def is_sensor_dir_altered(dir):
    if not os.path.exists(dir):
        return 1
    return len([x for x in os.listdir(dir) if x not in ['index.html', 'description.html'] and not x.endswith('.json')]) > 0

def is_target_scheduled(target):
    return target in generator_targets and target not in generator_skips

def schedule_target(target, force:bool=False):
    if target in generator_skips:
        if not force:
            return
        generator_skips.remove(target)
    if target not in generator_targets:
        generator_targets.append(target)

def clean_sensor_dir(sensors):
    print('cleaning sensor dirs')

    to_clean = where(get_sensor_dirs(), lambda x: x not in sensors and not is_sensor_dir_altered(x))

    if to_clean:
        print(fmt_dry('removing'), ','.join(to_clean))

        if not dry_run:
            for sensor in sensors:
                shutil.rmtree(os.path.join(directory_filepath, sensor), ignore_errors=False)

def generate_header():
    pass

def generate_footer():
    pass

def generate_sidebar():
    pass

def generate_landing(modules, landing_fp):
    pass

def generate_sensor_page(sensor, directory, page_data):
    html_filepath = os.path.join(directory, 'index.html')

    sensor_properties = sensor_images = image_filepaths = ''
    
    if os.path.exists(directory):
        image_filepaths = where(sorted(os.listdir(directory)),
            lambda filename: any(image_filetypes, filename.endswith))

    for field in sensor:
        key_esc = html.escape(str(sensor[field]['text']))
        value_esc = html.escape(str(sensor[field]['value']))
        page_data = page_data.replace(f'${field}', value_esc)
        sensor_properties += f'<div><b>{key_esc}:</b><span>{value_esc}</span></div>'

    for path in image_filepaths:
        sensor_images += f'<div><img src="{path}" /></div>'

    page_data = page_data.replace('$sensor_properties', sensor_properties)
    page_data = page_data.replace('$sensor_images', sensor_images)

    if debug_mode:
        print(fmt_dry('writing'), html_filepath)

    if debug_mode and extra_verbosity:
        print(page_data)

    if not dry_run:
        with open(html_filepath, mode='w') as file:
            file.write(page_data)

def generate_sensors(page_fp):
    sensordb.open()
    print('reading sensordb', sensor_path)

    page_data = page_fp.read()

    for sensor in sensordb.sensors:
        if debug_mode and extra_verbosity:
            print(sensor)

        sensor_name_fs_safe = sensor['sensor-name']['value']
        sensor_directory = directory_filepath + sensor_name_fs_safe + '/'

        sensor_names.append(sensor_name_fs_safe)

        if not os.path.exists(sensor_directory):
            if debug_mode:
                print(fmt_dry('create directory'), sensor_directory)

            if not dry_run:
                os.makedirs(sensor_directory, exist_ok=True) 

        if is_target_scheduled(pages_target):
            generate_sensor_page(sensor, sensor_directory, page_data)

        if limit_generation:
            return

def add_to_sitemap(dir):
    locs = []
    files = get_files(dir)
    subs = get_dirs(dir)

    if any(files, lambda x: x.name.endswith('index.html')):
        loc = {
            'loc': get_server_filepath(dir, False),
            'images': foreach(where(select(files, 'path'), lambda x: any(image_filetypes, x.endswith)), get_server_path),
            'lastmod': time.gmtime(os.stat(dir).st_mtime),
            'changefreq': 'monthly',
            'priority':0.5
        }
        locs.append(loc)

    for sub in subs:
        if is_ignored_path(sub.path):
            continue

        locs.extend(add_to_sitemap(sub.path))

    return locs

def generate_sitemap(sitemap_fp):
    print('generate', sitemap_filename, 'using site root')

    sitemap_fp.write('<?xml version="1.0" encoding="UTF-8"?>\n')
    sitemap_fp.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'+
                     '\txmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n')

    locs = add_to_sitemap(site_filepath)

    for loc in locs:
        sitemap_fp.write('\t<url>\n')
        sitemap_fp.write(f'\t\t<loc>{protocol}{cname}{loc['loc']}</loc>\n')
        if len(loc['images']):
            sitemap_fp.write('\t\t<image:image>\n')
            for image in loc['images']:
                sitemap_fp.write(f'\t\t\t<image:loc>{protocol}{cname}{image}</image:loc>\n')
            sitemap_fp.write('\t\t</image:image>\n')
        sitemap_fp.write(f'\t\t<lastmod>{time.strftime('%Y-%m-%d', loc['lastmod'])}</lastmod>\n')
        sitemap_fp.write(f'\t\t<changefreq>{loc['changefreq']}</changefreq>\n')
        sitemap_fp.write(f'\t\t<priority>{loc['priority']}</priority>\n')
        sitemap_fp.write('\t</url>\n')

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
    check_or_terminate(page_path, 'page_path', sensors_target)

    with open(page_path, mode='r') as page_fp:
        generate_sensors(page_fp)

def run_clean_sensor_dir():
    if not is_target_scheduled(sensors_target):
        if debug_mode:
            print('skip target:', clean_target, f' ({sensors_target} not run)')
        return
    clean_sensor_dir(sensor_names)

def run_sitemap():
    with open(sitemap_path, 'w') as sitemap_fp:
        generate_sitemap(sitemap_fp)

def run_robots():
    with open(robots_path, 'w') as robots_fp:
        generate_robots(robots_fp)

generator_target_items = [
    [sensors_target, run_sensors],
    [clean_target, run_clean_sensor_dir],
    [sitemap_target, run_sitemap],
    [robots_target, run_robots],
]

def compile_site():
    for target,func in generator_target_items:
        if is_target_scheduled(target):
            func()
        else:
            if debug_mode:
                print('skip target:', target)

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

    if clean_sensor_dirs:
        schedule_target(clean_target)

if __name__ == "__main__":
    init()
    compile_site()