import * as _mugen_sctrl from "./data/mugen-sctrl.json";
import * as _ikemen_sctrl from "./data/ikemen-sctrl.json";
import * as _mugen_trigger from "./data/mugen-trigger.json";
import * as _ikemen_trigger from "./data/ikemen-trigger.json";

export const mugen_sctrl:{[index:string]:{req:string[], opt:string[], doc:string}} = _mugen_sctrl;
export const ikemen_sctrl:{[index:string]:{req:string[], opt:string[], doc:string}} = _ikemen_sctrl;
export const mugen_trigger:{[index:string]:{fmt:string, doc:string}} = _mugen_trigger;
export const ikemen_trigger:{[index:string]:{fmt:string, doc:string}} = _ikemen_trigger;