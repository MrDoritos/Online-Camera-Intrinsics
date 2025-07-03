## Online Camera Intrinsics Calculator

### View live site at https://iansweb.org/

Calculate and test different camera parameters to get a better understanding of some of the values. Will extrapolate as best it can with any given parameters. Has some presets.

- Effective lens focal length (real mm) & lens focal length (35mm)
- Lens angle of view / field of view (horizontal, vertical, diagonal)
- View distortion (only 3 radial coefficients and principal point xy right now, more to come)
- Crop factor / Focal length multiplier
- Sensor size, sensor pixel size, sensor MP, sensor diagonal, sensor area, sensor aspect ratio
- View additional information about the sensor

### To Do

- [ ] Import exif from loaded image
- [X] Undistort an image and save it
- [ ] Import/export custom presets
- [X] Finish sensor format table
- [ ] Add more distortion functions
- [X] Change page layout for mobile users
- [X] Modify sitemap to use canonical paths

### Note

Bear in mind some values don't relate well at all to other values and the calculations become multivariate (when the important variables are missing) and better suited for discrete software.

The important thing to note are that the physical sensor size alters effective focal length wrt 35mm equivalent.

The calculations are in script.js but if there is enough noise I'll move them here for ease of understanding.

### Motivation

Severe lack of a single good calculator online. Sellers/manufacturers/documentation listing incorrect intrinsic values for the camera they are selling/involved with. I want more clarity to preview one sensor vs another especially when e-waste tier sensors advertise as "something good". I also do a ton of photogrammetry and understanding your rig/camera/environment/lighting is 95% of it.

### Usage / Contributions

The site is generated to be a static site in regards to the server doesn't need to write to anything once the site is deployed. It's simple to update the files with running `./generator.py` in the site root and it has arguments if you need to do something extra.

For now I use the `dev/sensors.ods` file as the source for the site files with the sensor images in their respective sensor directory. Eventually the source will change such that a centralized source and a binary format for the formats and sensors isn't used. This will most likely become the sensor directories because the site is generated from the directories, not the `dev/sensors.ods` or `sensors.csv`.

With that said, I am comfortable with a contribution in multiple ways. The first is to create a sensor directory with the sensor json (see other sensors as the example, with `sensors/sensors_template.json` used as the template). Second are additions to `sensors.csv`, I can easily take your changes and move them into `dev/sensors.ods`. Third is a change to `dev/sensors.ods`, with it being a binary format the line based tools don't work and I think it will be fine just could possibly be strange.

push
