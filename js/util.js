const lerp = (v1, v2, factor) => v1 * (1 - factor) + v2 * factor;

const async_wait = async (millis) => new Promise((resolve) => setTimeout(resolve, millis));