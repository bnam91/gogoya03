import * as databaseUtils from './databaseUtils.js';
import * as calloutUtils from './calloutUtils.js';

const utils = {
    ...databaseUtils,
    ...calloutUtils
};

export default utils; 