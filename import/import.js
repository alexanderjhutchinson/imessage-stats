import { extract } from "./extract.js";
import { transform } from "./transform.js";
import { load } from "./load.js";

const result = extract();
const transformed = transform(result);
await load(transformed);
