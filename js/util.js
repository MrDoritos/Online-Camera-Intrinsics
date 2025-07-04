const lerp = (v1, v2, factor) => v1 * (1 - factor) + v2 * factor;

const async_wait = async (millis) => new Promise((resolve) => setTimeout(resolve, millis));

const get_degrees = (radians) => (radians * 180) / Math.PI;

const get_radians = (degrees) => (degrees * Math.PI) / 180;