import { extract } from "./extract.js";
import { transform } from "./transform.js";

const result = extract();
const transformed = transform(result);
