## Online Camera Intrinsics Calculator

### View live site at https://iansweb.org/

Calculate and test different camera parameters to get a better understanding of some of the values. Will extrapolate as best it can with any given parameters. Has some presets.

- Effective lens focal length (real mm) & lens focal length (35mm)
- Lens angle of view / field of view (horizontal, vertical, diagonal)
- View distortion (only 3 radial coefficients and principal point xy right now, more to come)
- Crop factor / Focal length multiplier
- Sensor size, sensor pixel size, sensor MP, sensor diagonal, sensor area, sensor aspect ratio

### To Do

- [ ] Import exif from loaded image
- [X] Undistort an image and save it
- [ ] Import/export custom presets
- [ ] Finish sensor format table
- [ ] Add more distortion functions
- [ ] Change page layout for mobile users

### Note

Bear in mind some values don't relate well at all to other values and the calculations become multivariate (when the important variables are missing) and better suited for discrete software.

The important thing to note are that the physical sensor size alters effective focal length wrt 35mm equivalent.

The calculations are in script.js but if there is enough noise I'll move them here for ease of understanding.

### Motivation

Severe lack of a single good calculator online. Sellers/manufacturers/documentation listing incorrect intrinsic values for the camera they are selling/involved with. I want more clarity to preview one sensor vs another especially when e-waste tier sensors advertise as "something good". I also do a ton of photogrammetry and understanding your rig/camera/environment/lighting is 95% of it.