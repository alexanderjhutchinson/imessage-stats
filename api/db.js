import pg from "pg";
import { PG_CONFIG } from "../import/config.js";

export const pool = new pg.Pool(PG_CONFIG);
