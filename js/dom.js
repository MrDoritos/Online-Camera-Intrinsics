class DOMUtil {
    static add_events = (element, events, callback) => events.forEach(event => element.addEventListener(event, callback));
};